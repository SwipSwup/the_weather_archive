const { Client } = require('pg');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

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

    const client = new Client(dbConfig);

    try {
        await client.connect();

        // Get DISTINCT city/country combos
        const query = `
            SELECT DISTINCT city, country_code 
            FROM weather_captures 
            ORDER BY city ASC
        `;

        const res = await client.query(query);

        // Transform results
        const cities = res.rows
            .filter(r => r.city) // Filter out nulls
            .map(r => ({
                name: r.city,
                country_code: r.country_code || null
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
