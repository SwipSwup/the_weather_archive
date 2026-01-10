const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
    // Basic CORS
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Updated query to include country_code
        // We use DISTINCT on the tuple (city, country_code) to get unique combinations
        const query = `
            SELECT DISTINCT city, country_code 
            FROM weather_captures 
            ORDER BY city ASC
        `;

        const res = await client.query(query);

        // Map to structured objects
        const cities = res.rows
            .filter(r => r.city) // Ensure city name exists
            .map(r => ({
                name: r.city,
                country_code: r.country_code || null // Explicitly handle null
            }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(cities)
        };
    } catch (err) {
        console.error("City Service Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    } finally {
        await client.end();
    }
};
