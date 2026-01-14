const { Client } = require('pg');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { pipeline } = require('stream/promises');
const { createClient } = require("redis");

// --- Configuration ---
// FFmpeg path setup for Lambda Layer
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    ffmpeg.setFfmpegPath('/opt/bin/ffmpeg');
    ffmpeg.setFfprobePath('/opt/bin/ffprobe');
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

// --- Helpers ---

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

const invalidateRedis = async (city, date) => {
    const redis = await getRedisClient();
    if (!redis || !redis.isOpen) return;

    const lowerCity = city.toLowerCase();
    const keys = [
        `weather:city:${lowerCity}:date:${date}`,
        `weather:city:${lowerCity}:latest`
    ];

    try {
        await redis.del(keys);
        console.log(`Invalidated keys for ${city}`);
    } catch (err) {
        console.warn("Redis Invalidation Failure:", err.message);
    }
};

const downloadImages = async (bucket, images, workDir) => {
    const downloadPromises = images.map(async (imgName, index) => {
        const localPath = path.join(workDir, `img-${index.toString().padStart(4, '0')}.jpg`);
        try {
            const data = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: imgName }));
            await pipeline(data.Body, fs.createWriteStream(localPath));
            return localPath;
        } catch (err) {
            console.warn(`Failed to download ${imgName}: ${err.message}`);
            return null;
        }
    });

    const results = await Promise.all(downloadPromises);
    return results.filter(p => p !== null);
};

const generateVideo = async (workDir, outputParam) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(path.join(workDir, 'img-%04d.jpg'))
            .inputFPS(2) // 2 FPS
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p', // Web compatibility
                '-r 30'
            ])
            .save(outputParam)
            .on('end', resolve)
            .on('error', reject);
    });
};

// --- Main Handler ---
exports.handler = async (event) => {
    console.log("Video Service Triggered");

    const client = new Client(dbConfig);

    try {
        await client.connect();

        // 1. Determine Target Date (Yesterday by default)
        let dateStr = event.date;
        if (!dateStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateStr = yesterday.toISOString().split('T')[0];
        }
        console.log(`Target Date: ${dateStr}`);

        // 2. Identify Cities with Activity
        const citiesRes = await client.query('SELECT DISTINCT city FROM weather_captures WHERE DATE(timestamp) = $1', [dateStr]);
        const cities = citiesRes.rows.map(r => r.city);

        if (cities.length === 0) {
            console.log("No activity found.");
            return;
        }

        // 3. Process Each City
        for (const city of cities) {
            console.log(`Processing ${city}...`);
            const tmpDir = fs.mkdtempSync(path.join('/tmp', 'video-'));

            try {
                // Check if video already exists
                const existing = await client.query('SELECT id FROM daily_videos WHERE city = $1 AND date = $2', [city, dateStr]);
                if (existing.rows.length > 0) {
                    console.log(`Video already exists for ${city}. Skipping.`);
                    continue;
                }

                // Get Images
                const imagesRes = await client.query(
                    'SELECT filename FROM weather_captures WHERE city = $1 AND DATE(timestamp) = $2 ORDER BY timestamp ASC',
                    [city, dateStr]
                );
                if (imagesRes.rows.length === 0) continue;

                // Download
                const imageFiles = await downloadImages(process.env.PROCESSED_BUCKET_NAME, imagesRes.rows.map(r => r.filename), tmpDir);
                if (imageFiles.length === 0) continue;

                // Render
                const outputVideoPath = path.join(tmpDir, 'output.mp4');
                await generateVideo(tmpDir, outputVideoPath);

                // Upload
                const videoKey = `${city}/${dateStr}_daily_summary.mp4`;
                const videoBuffer = fs.readFileSync(outputVideoPath);

                await s3.send(new PutObjectCommand({
                    Bucket: process.env.VIDEOS_BUCKET_NAME,
                    Key: videoKey,
                    Body: videoBuffer,
                    ContentType: 'video/mp4'
                }));

                // Record in DB
                await client.query(
                    'INSERT INTO daily_videos (city, date, video_url) VALUES ($1, $2, $3)',
                    [city, dateStr, videoKey]
                );

                // Invalidate Cache
                await invalidateRedis(city, dateStr);

                console.log(`Video completed for ${city}`);

            } catch (err) {
                console.error(`Failed to process ${city}:`, err);
            } finally {
                // Cleanup /tmp for this city
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        }

    } catch (err) {
        console.error("Critical Video Service Error:", err);
    } finally {
        await client.end();
        const redis = await getRedisClient();
        if (redis && redis.isOpen) await redis.quit();
    }
};
