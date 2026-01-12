const { Client } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    // Basic CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { queryStringParameters } = event;
    const rawCity = queryStringParameters?.city;
    const city = rawCity ? rawCity.toLowerCase() : null; // Normalize for DB Query
    const dateStr = queryStringParameters?.date;
    const listDates = queryStringParameters?.list_dates;

    console.log(`Processing request for city: ${city}, date: ${dateStr}, list: ${listDates}`);

    const client = new Client(dbConfig);
    try {
        await client.connect();

        // Ensure tables exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS weather_captures (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                city TEXT,
                device_id TEXT,
                temperature DECIMAL,
                humidity DECIMAL,
                pressure DECIMAL
            );
            CREATE TABLE IF NOT EXISTS daily_videos (
                id SERIAL PRIMARY KEY,
                city TEXT,
                date DATE,
                video_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        let responseData = { images: [], video: null };

        if (listDates && city) {
            // New Mode: List available dates for a city
            const dateQuery = `
                SELECT DISTINCT DATE(timestamp) as date 
                FROM weather_captures 
                WHERE city ILIKE $1 
                ORDER BY date DESC
            `;
            const dateRes = await client.query(dateQuery, [city]);
            // Return raw array of strings [ "2024-01-01", "2024-01-02" ]
            responseData = dateRes.rows.map(r => {
                // Format as YYYY-MM-DD
                const d = new Date(r.date);
                return d.toISOString().split('T')[0];
            });
        } else if (!city) {
            // Default "all" query (legacy)
            const res = await client.query('SELECT * FROM weather_captures ORDER BY timestamp DESC LIMIT 50');
            responseData = res.rows;
        } else {
            // Specific City Query
            let imageQuery = 'SELECT * FROM weather_captures WHERE city ILIKE $1';
            const imageParams = [city];

            if (dateStr) {
                // Filter by date
                imageQuery += ' AND DATE(timestamp) = $2 ORDER BY timestamp ASC';
                imageParams.push(dateStr);

                // Fetch Video
                const videoRes = await client.query('SELECT video_url FROM daily_videos WHERE city ILIKE $1 AND date = $2', [city, dateStr]);
                if (videoRes.rows.length > 0) {
                    const videoKey = videoRes.rows[0].video_url;

                    // Generate Presigned URL
                    if (videoKey && process.env.VIDEOS_BUCKET_NAME) {
                        try {
                            const command = new GetObjectCommand({
                                Bucket: process.env.VIDEOS_BUCKET_NAME,
                                Key: videoKey
                            });
                            // Expires in 1 hour
                            const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
                            responseData.video = signedUrl;
                        } catch (s3Err) {
                            console.error("Failed to sign video URL:", s3Err);
                            responseData.video = null;
                        }
                    } else {
                        responseData.video = videoKey; // Fallback
                    }
                }
            } else {
                // Latest 50
                imageQuery += ' ORDER BY timestamp DESC LIMIT 50';
            }

            const imageRes = await client.query(imageQuery, imageParams);
            responseData.images = imageRes.rows;

            // Generate Thumbnail (First Frame)
            if (responseData.images.length > 0 && process.env.PROCESSED_BUCKET_NAME) {
                try {
                    const firstImg = responseData.images[0];
                    const cmd = new GetObjectCommand({
                        Bucket: process.env.PROCESSED_BUCKET_NAME,
                        Key: firstImg.filename
                    });
                    const thumbUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
                    responseData.thumbnail = thumbUrl;
                } catch (err) {
                    console.warn("Failed to sign thumbnail:", err);
                }
            }
        }

        const resultBody = JSON.stringify(responseData);

        return {
            statusCode: 200,
            headers,
            body: resultBody
        };
    } catch (err) {
        console.error("Database Query Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    } finally {
        await client.end();
    }
};
