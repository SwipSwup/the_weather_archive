const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const { createClient } = require("redis");

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1"
});
const RAW_BUCKET = process.env.RAW_BUCKET_NAME;

// Initialize Redis Client
let redisClient;

if (process.env.REDIS_URL) {
    redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
            connectTimeout: 500, // Fail fast
            reconnectStrategy: (retries) => {
                if (retries > 3) return new Error('Retry limit exceeded');
                return Math.min(retries * 50, 2000);
            }
        }
    });

    redisClient.on('error', (err) => {
        console.warn('Redis Client Error:', err.message);
    });
}

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    // 1. API Key Validation
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (apiKey !== process.env.API_KEY) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Unauthorized: Invalid API Key" })
        };
    }

    try {
        // Ensure Redis is connected
        if (redisClient && !redisClient.isOpen) {
            try {
                await redisClient.connect();
            } catch (err) {
                console.warn("Failed to connect to Redis:", err.message);
            }
        }

        // Only allow GET method to request a URL
        // (Ideally, this lambda sits behind GET /upload-url)

        // 1. Parse Query Parameters
        const query = (event.queryStringParameters) || {};
        const city = query.city || "unknown";
        const deviceId = query.deviceId || "unknown";
        const timestamp = query.timestamp || new Date().toISOString();
        const fileType = query.fileType || "image/jpeg"; // Default to jpg
        const countryCode = query.countryCode || null;

        const temp = query.temp;
        const humidity = query.humidity;
        const pressure = query.pressure;

        // Validate file type (basic)
        if (!fileType.startsWith("image/")) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Only image uploads are allowed via this URL." })
            };
        }

        // 2. Generate Unique Key with Folder Structure: City/YYYY/MM/DD/filename.jpg
        const extension = fileType.split("/")[1] || "jpg";
        const now = new Date(timestamp);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        // Sanitize city: lowercase, remove special chars
        const safeCity = (city || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "");

        const filename = `${uuidv4()}.${extension}`;
        const key = `${safeCity}/${year}/${month}/${day}/${filename}`;

        // 3. Prepare PutObjectCommand with Metadata

        // 3. Store Metadata in DB
        const client = new Client(dbConfig);
        await client.connect();

        try {
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
            `);

            // Ensure columns exist
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS temperature DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS humidity DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS pressure DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS country_code TEXT;`);

            await client.query(
                "INSERT INTO weather_captures (filename, city, country_code, device_id, timestamp, temperature, humidity, pressure) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [key, city, countryCode, deviceId, timestamp, temp ? parseFloat(temp) : null, humidity ? parseFloat(humidity) : null, pressure ? parseFloat(pressure) : null]
            );
            console.log(`DB Entry created for ${key} (${city}, ${countryCode})`);

            // --- Cache Invalidation ---
            // Invalidate keys that might be affected by this new upload
            if (redisClient && redisClient.isOpen) {
                try {
                    const keysToDelete = [
                        `weather:latest`,                 // General latest feed
                        `weather:city:${city}:latest`,    // Specific city latest feed
                        `weather:dates:${city}`           // List of dates (if new date added)
                    ];

                    // Also invalidate the specific date if we can easily construct it
                    // The timestamp is ISO, so we can extract YYYY-MM-DD
                    if (timestamp) {
                        const datePart = timestamp.split('T')[0];
                        keysToDelete.push(`weather:city:${city}:date:${datePart}`);
                    }

                    await redisClient.del(keysToDelete);
                    console.log(`Invalidated Redis keys: ${keysToDelete.join(', ')}`);
                } catch (redisErr) {
                    console.warn("Failed to invalidate Redis cache:", redisErr.message);
                }
            }

        } finally {
            await client.end();
        }

        // 4. Prepare PutObjectCommand (Only technical metadata in S3)
        const metadata = {
            city: city,
            "device-id": deviceId,
            "original-timestamp": timestamp
            // Note: S3 metadata keys are lowercased by AWS. country-code could be added if needed in S3 too.
        };
        if (countryCode) metadata["country-code"] = countryCode;

        const command = new PutObjectCommand({
            Bucket: RAW_BUCKET,
            Key: key,
            ContentType: fileType,
            Metadata: metadata
        });

        // 4. Generate Presigned URL
        // Expires in 5 minutes (300 seconds)
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // CORS
            },
            body: JSON.stringify({
                uploadUrl: uploadUrl,
                filename: filename,
                key: key,
                requiredHeaders: {
                    "Content-Type": fileType
                }
            })
        };

    } catch (err) {
        console.error("Error generating upload URL:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
