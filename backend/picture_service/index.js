const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client();
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    for (const record of event.Records) {
        const rawBucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

        try {
            // 1. Get raw image
            const getObjectParams = {
                Bucket: rawBucket,
                Key: key,
            };
            const response = await s3.send(new GetObjectCommand(getObjectParams));

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
            const outputBuffer = await sharp(inputBuffer)
                .resize(1920, 1080, { fit: 'inside' })
                .jpeg({ quality: 80 })
                .toBuffer();

            // 3. Save to Processed Bucket
            const putObjectParams = {
                Bucket: PROCESSED_BUCKET,
                Key: key, // Keep same filename
                Body: outputBuffer,
                ContentType: "image/jpeg"
            };

            await s3.send(new PutObjectCommand(putObjectParams));
            console.log(`Processed ${key} and saved to ${PROCESSED_BUCKET}`);

        } catch (error) {
            console.error(`Error processing ${key}:`, error);
            // Don't throw if you want to partial success, but usually throw to retry
            throw error;
        }
    }
};
