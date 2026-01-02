const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambda = new LambdaClient();

exports.handler = async (event) => {
    console.log("Test Trigger Event:", JSON.stringify(event));

    try {
        let body = event.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const date = body?.date;
        if (!date) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing 'date' parameter" })
            };
        }

        const payload = { date: date };

        const command = new InvokeCommand({
            FunctionName: process.env.VIDEO_SERVICE_ARN,
            InvocationType: "Event", // Async invocation
            Payload: JSON.stringify(payload)
        });

        await lambda.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Video generation triggered for ${date}` })
        };
    } catch (error) {
        console.error("Error triggering video service:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message })
        };
    }
};
