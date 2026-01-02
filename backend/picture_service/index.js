const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Jimp } = require("jimp");
const { Client } = require("pg");

const s3 = new S3Client();
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;

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

    for (const record of event.Records) {
        const rawBucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

        try {
            // 1. Get raw image and Metadata
            const getObjectParams = {
                Bucket: rawBucket,
                Key: key,
            };
            const response = await s3.send(new GetObjectCommand(getObjectParams));

            // Metadata keys are lowercased by S3
            const metadata = response.Metadata || {};
            console.log("Metadata:", metadata);

            const city = metadata['city'] || 'unknown';
            const deviceId = metadata['device-id'] || 'unknown';
            const originalTimestamp = metadata['original-timestamp'] || new Date().toISOString();

            // Convert stream to buffer
            const streamToBuffer = (stream) =>
                new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks)));
                });

            const inputBuffer = await streamToBuffer(response.Body);

            // 2. Process image (Resize to HD 1920x1080 fit, compress)
            const image = await Jimp.read(inputBuffer);
            image.scaleToFit({ w: 1920, h: 1080 });

            // getBuffer is async in v1 and accepts options
            const outputBuffer = await image.getBuffer("image/jpeg", { quality: 80 });

            // 3. Fetch Weather Data (Open-Meteo)
            let weatherData = { temp: null, humidity: null, pressure: null };
            try {
                const coords = CITY_COORDS[city.toLowerCase()];
                if (coords) {
                    const dateObj = new Date(originalTimestamp);
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const hour = dateObj.getHours();

                    // Fetch hourly data for that specific day
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const diffDays = (new Date() - dateObj) / msPerDay;

                    // If older than 5 days (safe margin for Forecast API vs Archive), use Archive API
                    const baseUrl = diffDays > 5
                        ? 'https://archive-api.open-meteo.com/v1/archive'
                        : 'https://api.open-meteo.com/v1/forecast';

                    const apiUrl = `${baseUrl}?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,relative_humidity_2m,pressure_msl`;

                    console.log(`Fetching weather from: ${baseUrl} for date: ${dateStr} (Age: ${diffDays.toFixed(1)} days)`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                    const weatherRes = await fetch(apiUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (weatherRes.ok) {
                        const data = await weatherRes.json();
                        const items = data.hourly;
                        const targetIndex = dateObj.getUTCHours(); // Assumes data.hourly.time is UTC and aligned

                        if (items.temperature_2m && items.temperature_2m[targetIndex] !== undefined) {
                            weatherData = {
                                temp: items.temperature_2m[targetIndex],
                                humidity: items.relative_humidity_2m[targetIndex],
                                pressure: items.pressure_msl[targetIndex]
                            };
                            console.log(`Weather fetched for ${city} at ${originalTimestamp}:`, weatherData);
                        } else {
                            console.log("Weather data found but specific hour missing.");
                        }
                    } else {
                        console.error(`Weather API Error: ${weatherRes.statusText}`);
                    }
                } else {
                    console.log(`No coordinates found for city: ${city}`);
                }
            } catch (wErr) {
                console.error("Failed to fetch weather data:", wErr);
            }

            // 4. Save to Processed Bucket
            const putObjectParams = {
                Bucket: PROCESSED_BUCKET,
                Key: key, // Keep same filename
                Body: outputBuffer,
                ContentType: "image/jpeg",
                Metadata: metadata
            };

            await s3.send(new PutObjectCommand(putObjectParams));
            console.log(`Processed ${key} and saved to ${PROCESSED_BUCKET}`);

            // 5. Write to RDS
            const client = new Client(dbConfig);
            await client.connect();

            // Ensure table exists
            // CAUTION: If table exists without columns, this won't add them. 
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

            // Alter to ensure columns exist
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS temperature DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS humidity DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS pressure DECIMAL;`);

            // Check if entry already exists (idempotency for retries)
            const checkRes = await client.query("SELECT id FROM weather_captures WHERE filename = $1", [key]);

            if (checkRes.rows.length === 0) {
                await client.query(
                    "INSERT INTO weather_captures (filename, city, device_id, timestamp, temperature, humidity, pressure) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [key, city, deviceId, originalTimestamp, weatherData.temp, weatherData.humidity, weatherData.pressure]
                );
                console.log(`DB Entry created for ${key}`);
            } else {
                console.log(`DB Entry already exists for ${key}, skipping insert.`);
            }

            await client.end();

        } catch (error) {
            console.error(`Error processing ${key}:`, error);
            throw error; // Throw to retry
        }
    }
};

const CITY_COORDS = {
    "vienna": { lat: 48.2082, lon: 16.3738 },
    "berlin": { lat: 52.5200, lon: 13.4050 },
    "paris": { lat: 48.8566, lon: 2.3522 },
    "london": { lat: 51.5074, lon: -0.1278 },
    "rome": { lat: 41.9028, lon: 12.4964 },
    "amsterdam": { lat: 52.3676, lon: 4.9041 },
    "madrid": { lat: 40.4168, lon: -3.7038 }
};
