const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const { Readable } = require("stream");

// IMPORTANT: Requires 'ffmpeg' binary in PATH or via Layer at /opt/bin/ffmpeg
// If using a layer, uncomment and set path:
// ffmpeg.setFfmpegPath("/opt/bin/ffmpeg");

const s3 = new S3Client();
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;
const VIDEOS_BUCKET = process.env.VIDEOS_BUCKET_NAME;
const TMP_DIR = "/tmp/video-processing";

exports.handler = async (event) => {
    console.log("Starting Video Service", event);

    await fs.ensureDir(TMP_DIR);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const videoName = `timelapse-${date}.mp4`;
    const outputFilePath = path.join(TMP_DIR, videoName);

    try {
        // 1. List images in Processed Bucket
        // Optimally, filter by prefix if folder structure permits (e.g. YYYY/MM/DD/)
        // Here we'll just take the last 50 images for demo to avoid timeouts
        const listResponse = await s3.send(new ListObjectsV2Command({
            Bucket: PROCESSED_BUCKET,
            MaxKeys: 100 // Limit for lambda demo
        }));

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log("No images found to process.");
            return;
        }

        // Sort by LastModified
        const images = listResponse.Contents
            .sort((a, b) => a.LastModified - b.LastModified);

        // 2. Download images to /tmp
        console.log(`Downloading ${images.length} images...`);
        let fileListContent = "";

        for (let i = 0; i < images.length; i++) {
            const key = images[i].Key;
            const localPath = path.join(TMP_DIR, `img-${i}.jpg`);

            const getObj = await s3.send(new GetObjectCommand({ Bucket: PROCESSED_BUCKET, Key: key }));
            const buffer = await streamToBuffer(getObj.Body);
            await fs.writeFile(localPath, buffer);

            // Add to ffmpeg list
            // duration 0.1s per frame (10 fps)
            fileListContent += `file '${localPath}'\nduration 0.1\n`;
        }

        // Fix last file duration issue in some ffmpeg versions (add last file again without duration or just close)
        // Actually standard concat format:
        const listPath = path.join(TMP_DIR, "images.txt");
        await fs.writeFile(listPath, fileListContent);

        // 3. Generate Video
        console.log("Encoding video...");
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(listPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
                .save(outputFilePath)
                .on('end', resolve)
                .on('error', reject);
        });

        // 4. Upload Video
        console.log("Uploading video...");
        const videoBuffer = await fs.readFile(outputFilePath);
        await s3.send(new PutObjectCommand({
            Bucket: VIDEOS_BUCKET,
            Key: videoName,
            Body: videoBuffer,
            ContentType: "video/mp4"
        }));

        console.log("Video uploaded successfully:", videoName);

        // Cleanup
        await fs.remove(TMP_DIR);
        return { statusCode: 200, body: "Video created" };

    } catch (error) {
        console.error("Video processing failed:", error);
        await fs.remove(TMP_DIR); // cleanup
        throw error;
    }
};

const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
