const { Client } = require('pg');
const { createClient } = require("redis");

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

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

    if (!city) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "City parameter is required to list dates." })
        };
    }

    // Connect to Redis if needed
    if (redisClient && !redisClient.isOpen) {
        try {
            await redisClient.connect();
        } catch (err) {
            console.warn("Failed to connect to Redis:", err.message);
        }
    }

    // --- Redis Cache Check ---
    const cacheKey = `weather:dates:${city}`;
    if (redisClient && redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`Cache Hit for ${cacheKey}`);
                return {
                    statusCode: 200,
                    headers,
                    body: cachedData
                };
            }
        } catch (err) {
            console.warn("Redis Get Error:", err.message);
        }
    }

    console.log(`Processing date list request for city: ${city}`);

    const client = new Client(dbConfig);
    try {
        await client.connect();

        // New Mode: List available dates for a city
        const dateQuery = `
            SELECT DISTINCT DATE(timestamp) as date 
            FROM weather_captures 
            WHERE city ILIKE $1 
            ORDER BY date DESC
        `;
        const dateRes = await client.query(dateQuery, [city]);

        // Return raw array of strings [ "2024-01-01", "2024-01-02" ]
        const responseData = dateRes.rows.map(r => {
            // Format as YYYY-MM-DD
            const d = new Date(r.date);
            return d.toISOString().split('T')[0];
        });

        const resultBody = JSON.stringify(responseData);

        // --- Store in Redis ---
        if (redisClient && redisClient.isOpen) {
            // Fire and forget
            redisClient.set(cacheKey, resultBody, { EX: 3500 })
                .then(() => console.log(`Cached ${cacheKey}`))
                .catch(err => console.warn("Redis Set Error:", err.message));
        }

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
