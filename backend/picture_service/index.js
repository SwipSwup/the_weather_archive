const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Jimp } = require("jimp");

const s3 = new S3Client();
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;

// Helper: Stream to Buffer
const streamToBuffer = async (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
};

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    // Process all S3 records
    const promises = event.Records.map(async (record) => {
        const rawBucket = record.s3.bucket.name;
        // Decode key (handle spaces/pluses)
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

        try {
            console.log(`Processing ${key} from ${rawBucket}`);

            // 1. Fetch Object
            const getCmd = new GetObjectCommand({ Bucket: rawBucket, Key: key });
            const response = await s3.send(getCmd);
            const bodyBuffer = await streamToBuffer(response.Body);

            // Preserve Metadata
            const metadata = response.Metadata || {};

            // 2. Process Image (Resize to FHD)
            const image = await Jimp.read(bodyBuffer);
            image.scaleToFit({ w: 1920, h: 1080 });
            const processedBuffer = await image.getBuffer("image/jpeg", { quality: 80 });

            // 3. Upload Processed Image
            const putCmd = new PutObjectCommand({
                Bucket: PROCESSED_BUCKET,
                Key: key,
                Body: processedBuffer,
                ContentType: "image/jpeg",
                Metadata: metadata
            });

            await s3.send(putCmd);
            console.log(`Successfully processed and saved to ${PROCESSED_BUCKET}/${key}`);

        } catch (error) {
            console.error(`Error processing ${key}:`, error);
            throw error; // Rethrow to trigger Lambda retry behavior
        }
    });

    await Promise.all(promises);
};


