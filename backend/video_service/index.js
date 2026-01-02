const { Client } = require('pg');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { pipeline } = require('stream/promises');

// Set ffmpeg path assuming Lambda Layer places it in /opt/bin
// Usage of public layers typically puts binaries in /opt/bin
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    ffmpeg.setFfmpegPath('/opt/bin/ffmpeg');
    ffmpeg.setFfprobePath('/opt/bin/ffprobe');
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
    console.log("Video Service Triggered");

    if (!client._connected) {
        await client.connect();
        client._connected = true;
    }

    try {
        // 1. Determine Target Date
        // Default: Yesterday (unless overridden by event.date for testing/backfilling)
        const now = new Date();
        let dateStr;

        if (event.date) {
            dateStr = event.date; // Expecting YYYY-MM-DD
            console.log(`Date override received: ${dateStr}`);
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        console.log(`Generating video for date: ${dateStr}`);

        // 2. Fetch Cities (In a real app, iterate all cities. Here, 'Vienna' is hardcoded or fetch distinct)
        const citiesRes = await client.query('SELECT DISTINCT city FROM weather_captures WHERE DATE(timestamp) = $1', [dateStr]);
        const cities = citiesRes.rows.map(r => r.city);

        if (cities.length === 0) {
            console.log("No activity found for yesterday.");
            return;
        }

        for (const city of cities) {
            console.log(`Processing city: ${city}`);

            // Check if video already exists
            const existingVideo = await client.query('SELECT id FROM daily_videos WHERE city = $1 AND date = $2', [city, dateStr]);
            if (existingVideo.rows.length > 0) {
                console.log(`Video already exists for ${city} on ${dateStr}. Skipping.`);
                continue;
            }

            // Get Images
            const imagesRes = await client.query(
                'SELECT filename FROM weather_captures WHERE city = $1 AND DATE(timestamp) = $2 ORDER BY timestamp ASC',
                [city, dateStr]
            );

            if (imagesRes.rows.length === 0) continue;

            console.log(`Found ${imagesRes.rows.length} images for ${city}.`);

            // 3. Download Images to /tmp
            const tmpDir = fs.mkdtempSync(path.join('/tmp', 'video-'));
            const imagePaths = [];

            for (let i = 0; i < imagesRes.rows.length; i++) {
                const imgName = imagesRes.rows[i].filename;

                const key = imgName;

                const getParams = {
                    Bucket: process.env.PROCESSED_BUCKET_NAME, // or RAW_BUCKET_NAME if accessible
                    Key: key
                };

                const localPath = path.join(tmpDir, `img-${i.toString().padStart(4, '0')}.jpg`);

                try {
                    const data = await s3.send(new GetObjectCommand(getParams));
                    await pipeline(data.Body, fs.createWriteStream(localPath));
                    imagePaths.push(localPath);
                } catch (err) {
                    console.warn(`Failed to download ${key}:`, err.message);
                }
            }

            if (imagePaths.length === 0) {
                console.warn("No images successfully downloaded. Skipping.");
                continue;
            }

            // 4. Generate Video with FFmpeg
            const outputVideoPath = path.join(tmpDir, 'output.mp4');

            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(path.join(tmpDir, 'img-%04d.jpg'))
                    .inputFPS(2) // Slow down to 2 fps for sparse data (approx 0.5s per image)
                    // User story says "time period". Timelapse is common.
                    // If we have 24 images (hourly), 1 fps = 24 seconds. 
                    // Let's default to a timelapse feel (e.g. 5 fps).
                    .outputOptions([
                        '-c:v libx264',
                        '-pix_fmt yuv420p', // Important for browser compatibility
                        '-r 30'
                    ])
                    .save(outputVideoPath)
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error('FFmpeg Error:', err);
                        reject(err);
                    });
            });

            console.log("Video generated successfully.");

            // 5. Upload Video
            const videoFileName = `${city}/${dateStr}_daily_summary.mp4`;
            const videoBuffer = fs.readFileSync(outputVideoPath);

            await s3.send(new PutObjectCommand({
                Bucket: process.env.VIDEOS_BUCKET_NAME,
                Key: videoFileName,
                Body: videoBuffer,
                ContentType: 'video/mp4'
            }));

            // 6. Save to DB
            const videoUrl = `https://${process.env.VIDEOS_BUCKET_NAME}.s3.amazonaws.com/${videoFileName}`; // Or presigned, but public/private?


            await client.query(
                'INSERT INTO daily_videos (city, date, video_url) VALUES ($1, $2, $3)',
                [city, dateStr, videoFileName]
            );

            console.log(`Video saved for ${city}`);

            // Cleanup
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }

    } catch (err) {
        console.error("Error in video service:", err);
        // Don't throw, so we can process other cities if loop was outside try/catch
        // Here try/catch wraps everything.
        throw err;
    }
};
