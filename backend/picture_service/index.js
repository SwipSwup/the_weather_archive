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
            // We need to fetch the object to process it, and also get metadata.
            // GetObject returns Body and Metadata.
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
            // Using Jimp (pure JS) to avoid native dependency issues on Lambda
            const image = await Jimp.read(inputBuffer);

            // Resize to cover 1920x1080 (like fit: 'inside' but Jimp is simpler, scaleToFit)
            // Resize to cover 1920x1080 (like fit: 'inside' but Jimp is simpler, scaleToFit)
            // .scaleToFit(1920, 1080) scales keeping aspect ratio so it fits inside
            image.scaleToFit({ w: 1920, h: 1080 });

            // getBuffer is async in v1 and accepts options
            const outputBuffer = await image.getBuffer("image/jpeg", { quality: 80 });

            // 3. Fetch Weather Data (Open-Meteo)
            let weatherData = { temp: null, humidity: null, pressure: null };
            try {
                const coords = CITY_COORDS[city.toLowerCase()];
                if (coords) {
                    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,pressure_msl`;
                    const weatherRes = await fetch(apiUrl);
                    if (weatherRes.ok) {
                        const data = await weatherRes.json();
                        weatherData = {
                            temp: data.current.temperature_2m,
                            humidity: data.current.relative_humidity_2m,
                            pressure: data.current.pressure_msl
                        };
                        console.log(`Weather fetched for ${city}:`, weatherData);
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

            // Ensure table exists with new columns
            // Using logic to check/add columns would be better for migration, but for this project we'll just CREATE IF NOT EXISTS with full schema.
            // CAUTION: If table exists without columns, this won't add them. 
            // We will do a quick ALTER hack to ensure they exist.
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

            // Alter to ensure columns exist (Idempotent-ish relative to "error if exists"?)
            // Postgres "ADD COLUMN IF NOT EXISTS" is version 9.6+. We assume 13+.
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS temperature DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS humidity DECIMAL;`);
            await client.query(`ALTER TABLE weather_captures ADD COLUMN IF NOT EXISTS pressure DECIMAL;`);

            // Check if entry already exists (idempotency for retries)
            // S3 events can be delivered multiple times.
            // Using filename as unique constraint would be good, but for now just check select.
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
