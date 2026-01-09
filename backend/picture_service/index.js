const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Jimp } = require("jimp");

const s3 = new S3Client();
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;

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

            // 3. Save to Processed Bucket
            const putObjectParams = {
                Bucket: PROCESSED_BUCKET,
                Key: key, // Keep same filename
                Body: outputBuffer,
                ContentType: "image/jpeg",
                Metadata: metadata
            };

            await s3.send(new PutObjectCommand(putObjectParams));
            console.log(`Processed ${key} and saved to ${PROCESSED_BUCKET}`);

        } catch (error) {
            console.error(`Error processing ${key}:`, error);
            throw error; // Throw to retry
        }
    }
};


