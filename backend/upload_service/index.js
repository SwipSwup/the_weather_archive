const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const { createClient } = require("redis");

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const RAW_BUCKET = process.env.RAW_BUCKET_NAME;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

// Lazy Redis
let redisClient;
const getRedisClient = async () => {
    if (!process.env.REDIS_URL) return null;
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 500,
                reconnectStrategy: (retries) => (retries > 3 ? new Error('Retry limit exceeded') : Math.min(retries * 50, 2000))
            }
        });
        redisClient.on('error', (err) => console.warn('Redis Client Error:', err.message));
        await redisClient.connect();
    } else if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
};

// Helper: Invalidate Cache
const invalidateCache = async (redis, city, timestamp) => {
    if (!redis || !redis.isOpen) return;

    const keysToDelete = [
        `weather:latest`,
        `weather:city:${city}:latest`,
        `weather:dates:${city}`
    ];

    if (timestamp) {
        const datePart = timestamp.split('T')[0];
        keysToDelete.push(`weather:city:${city}:date:${datePart}`);
    }

    try {
        await redis.del(keysToDelete);
        console.log(`Invalidated keys: ${keysToDelete.join(', ')}`);
    } catch (err) {
        console.warn("Redis Invalidation Error:", err.message);
    }
};

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    // Headers
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    // 1. Auth Check
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (apiKey !== process.env.API_KEY) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        // 2. Parse Input
        const query = event.queryStringParameters || {};
        const city = (query.city || "unknown").toLowerCase().replace(/[^a-z0-9]/g, ""); // Determine safe city
        const rawCity = query.city || "unknown"; // Preserve original casing for metadata if needed, but DB usually standardizes
        const deviceId = query.deviceId || "unknown";
        const timestamp = query.timestamp || new Date().toISOString();
        const fileType = query.fileType || "image/jpeg";
        const countryCode = query.countryCode || null;

        if (!fileType.startsWith("image/")) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Only images allowed." }) };
        }

        // 3. Generate Key
        const extension = fileType.split("/")[1] || "jpg";
        const now = new Date(timestamp);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const filename = `${uuidv4()}.${extension}`;
        const key = `${city}/${year}/${month}/${day}/${filename}`;

        // 4. DB Insert
        const client = new Client(dbConfig);
        try {
            await client.connect();

            // Ensure Schema
            await client.query(`
                CREATE TABLE IF NOT EXISTS weather_captures (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    city TEXT,
                    device_id TEXT,
                    temperature DECIMAL,
                    humidity DECIMAL,
                    pressure DECIMAL,
                    country_code TEXT
                );
            `);

            // Insert Metadata
            await client.query(
                `INSERT INTO weather_captures 
                (filename, city, country_code, device_id, timestamp, temperature, humidity, pressure) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    key,
                    rawCity,
                    countryCode,
                    deviceId,
                    timestamp,
                    query.temp ? parseFloat(query.temp) : null,
                    query.humidity ? parseFloat(query.humidity) : null,
                    query.pressure ? parseFloat(query.pressure) : null
                ]
            );
            console.log(`DB Entry: ${key}`);

            // Invalidate Cache
            const redis = await getRedisClient();
            await invalidateCache(redis, city, timestamp);

        } finally {
            await client.end();
        }

        // 5. Generate Signed URL
        const metadata = {
            city: rawCity,
            "device-id": deviceId,
            "original-timestamp": timestamp
        };
        if (countryCode) metadata["country-code"] = countryCode;

        const command = new PutObjectCommand({
            Bucket: RAW_BUCKET,
            Key: key,
            ContentType: fileType,
            Metadata: metadata
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                uploadUrl,
                filename,
                key,
                requiredHeaders: { "Content-Type": fileType }
            })
        };

    } catch (err) {
        console.error("Upload Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
