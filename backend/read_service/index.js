const { Client } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require("redis");

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Initialize Redis Client lazily
let redisClient;

const getRedisClient = async () => {
    if (!process.env.REDIS_URL) return null;

    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 500,
                reconnectStrategy: (retries) => {
                    if (retries > 3) return new Error('Retry limit exceeded');
                    return Math.min(retries * 50, 2000);
                }
            }
        });
        redisClient.on('error', (err) => console.warn('Redis Client Error:', err.message));
        await redisClient.connect();
    } else if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
};

const getCacheKey = (city, date) => {
    if (!city) return 'weather:latest';
    if (date) return `weather:city:${city}:date:${date}`;
    return `weather:city:${city}:latest`;
};

const getSignedS3Url = async (bucket, key) => {
    if (!key || !bucket) return null;
    try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        return await getSignedUrl(s3, command, { expiresIn: 3600 });
    } catch (err) {
        console.warn(`Failed to sign URL for ${key}:`, err.message);
        return null;
    }
};

const fetchWeatherData = async (client, city, date) => {
    // 1. Latest Data (No City)
    if (!city) {
        const res = await client.query('SELECT * FROM weather_captures ORDER BY timestamp DESC LIMIT 50');
        return { images: res.rows || [], video: null };
    }

    // 2. Specific City Data
    let query = 'SELECT * FROM weather_captures WHERE city ILIKE $1';
    const params = [city];
    let videoUrl = null;

    if (date) {
        query += ' AND DATE(timestamp) = $2 ORDER BY timestamp ASC';
        params.push(date);

        // Fetch Video for date
        const videoRes = await client.query('SELECT video_url FROM daily_videos WHERE city ILIKE $1 AND date = $2', [city, date]);
        if (videoRes.rows.length > 0) {
            const videoKey = videoRes.rows[0].video_url;
            videoUrl = await getSignedS3Url(process.env.VIDEOS_BUCKET_NAME, videoKey) || videoKey;
        }
    } else {
        query += ' ORDER BY timestamp DESC LIMIT 50';
    }

    const res = await client.query(query, params);

    // Generate Thumbnail for first image if exists
    let thumbnail = null;
    if (res.rows.length > 0) {
        thumbnail = await getSignedS3Url(process.env.PROCESSED_BUCKET_NAME, res.rows[0].filename);
    }

    return {
        images: res.rows || [],
        video: videoUrl,
        thumbnail
    };
};

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { queryStringParameters } = event;
    const city = queryStringParameters?.city?.toLowerCase() || null;
    const date = queryStringParameters?.date;

    console.log(`Processing request for city: ${city}, date: ${date}`);

    // --- Redis Cache Check ---
    let redis = null;
    try {
        redis = await getRedisClient();
        if (redis) {
            const cacheKey = getCacheKey(city, date);
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`Cache Hit for ${cacheKey}`);
                return { statusCode: 200, headers, body: cachedData };
            }
        }
    } catch (err) {
        console.warn("Redis Error (Non-fatal):", err.message);
    }

    // --- DB Query ---
    const client = new Client(dbConfig);
    try {
        await client.connect();

        // Ensure tables exist (Consider moving this to migration script in production)
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

        const data = await fetchWeatherData(client, city, date);
        const body = JSON.stringify(data);

        // --- Cache Store ---
        if (redis && redis.isOpen) {
            const cacheKey = getCacheKey(city, date);
            // Fire and forget cache set
            redis.set(cacheKey, body, { EX: 3500 })
                .catch(err => console.warn("Redis Set Error:", err.message));
        }

        return { statusCode: 200, headers, body };

    } catch (err) {
        console.error("Handler Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    } finally {
        await client.end();
    }
};
