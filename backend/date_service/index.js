const { Client } = require('pg');
const { createClient } = require("redis");

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
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

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const city = event.queryStringParameters?.city?.toLowerCase();

    if (!city) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "City parameter is required." }) };
    }

    // Check Redis
    let redis = null;
    const cacheKey = `weather:dates:${city}`;
    try {
        redis = await getRedisClient();
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`Cache Hit: ${cacheKey}`);
                return { statusCode: 200, headers, body: cached };
            }
        }
    } catch (err) {
        console.warn("Redis Error:", err.message);
    }

    console.log(`Fetching dates for: ${city}`);

    const client = new Client(dbConfig);
    try {
        await client.connect();

        const dateQuery = `
            SELECT DISTINCT DATE(timestamp) as date 
            FROM weather_captures 
            WHERE city ILIKE $1 
            ORDER BY date DESC
        `;
        const res = await client.query(dateQuery, [city]);

        // Format dates as YYYY-MM-DD
        const responseData = res.rows.map(r => {
            // PG returns Date objects, convert safely to ISO date string
            const d = new Date(r.date);
            return d.toISOString().split('T')[0];
        });

        const body = JSON.stringify(responseData);

        // Cache result
        if (redis && redis.isOpen) {
            redis.set(cacheKey, body, { EX: 3500 }).catch(e => console.warn("Redis Set Error:", e.message));
        }

        return { statusCode: 200, headers, body };

    } catch (err) {
        console.error("Date Service Error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.end();
    }
};
