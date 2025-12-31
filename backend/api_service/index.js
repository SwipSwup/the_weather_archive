const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Client } = require("pg");
const { createClient } = require("redis");
const { v4: uuidv4 } = require("uuid");

const s3 = new S3Client();
const RAW_BUCKET = process.env.RAW_BUCKET_NAME;

// Database Config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false } // Required for AWS RDS sometimes
};

// Redis Config
const redisUrl = process.env.REDIS_URL;

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    const method = event.requestContext && event.requestContext.http ? event.requestContext.http.method : event.httpMethod;
    // Simplify path handling for function URL

    if (method === "POST") {
        return handlePost(event);
    } else if (method === "GET") {
        return handleGet(event);
    } else {
        return { statusCode: 405, body: "Method Not Allowed" };
    }
};

async function handlePost(event) {
    // Assume body is base64 encoded image or multipart
    // For simplicity, let's assume the body IS the image content (binary) or base64 wrapped.
    // Real world: Multipart parsing. Here: Simple binary body in API Gateway/Function URL.

    try {
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
        const filename = `${uuidv4()}.jpg`;

        // 1. Upload to S3
        await s3.send(new PutObjectCommand({
            Bucket: RAW_BUCKET,
            Key: filename,
            Body: body
        }));

        // 2. Write Metadata to RDS
        const client = new Client(dbConfig);
        await client.connect();

        // Ensure table exists (simple migration check)
        await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query("INSERT INTO images (filename) VALUES ($1)", [filename]);
        await client.end();

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Image uploaded", filename })
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
}

async function handleGet(event) {
    // Logic: Check Redis cache for "latest_weather", else DB? 
    // Requirement: "user GET (from Cache/DB)"

    try {
        const redis = createClient({ url: redisUrl });
        await redis.connect();

        // Try Cache
        const cachedData = await redis.get("weather_data");
        if (cachedData) {
            await redis.disconnect();
            return {
                statusCode: 200,
                headers: { "X-Cache": "HIT" },
                body: cachedData
            };
        }

        // Fallback to DB (Mock logic: fetch latest 5 images)
        const client = new Client(dbConfig);
        await client.connect();
        const res = await client.query("SELECT * FROM images ORDER BY timestamp DESC LIMIT 5");
        await client.end();

        const data = JSON.stringify(res.rows);

        // Set Cache
        await redis.set("weather_data", data, { EX: 60 }); // Cache for 60s
        await redis.disconnect();

        return {
            statusCode: 200,
            headers: { "X-Cache": "MISS" },
            body: data
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
}
