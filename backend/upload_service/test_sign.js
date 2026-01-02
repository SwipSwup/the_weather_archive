const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Init S3 (Mock region)
const s3 = new S3Client({ region: "us-east-1" });

async function testSign() {
    const command = new PutObjectCommand({
        Bucket: "test-bucket",
        Key: "test-key.jpg",
        ContentType: "image/jpeg",
        Metadata: {
            city: "vienna",
            "device-id": "123",
            "original-timestamp": "2024"
        }
    });

    try {
        const url = await getSignedUrl(s3, command, { expiresIn: 300 });
        console.log("Generated URL:", url);

        const urlObj = new URL(url);
        const signedHeaders = urlObj.searchParams.get("X-Amz-SignedHeaders");
        console.log("Signed Headers:", signedHeaders);

    } catch (e) {
        console.error("Error:", e);
    }
}

testSign();
