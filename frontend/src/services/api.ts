import { config } from "@/config";

export const WeatherApi = {
    async getWeatherData(city?: string, date?: string) {
        let url = `${config.apiBaseUrl}/data`;
        const params = new URLSearchParams();

        if (city) params.append("city", city);
        if (date) params.append("date", date);

        if (Array.from(params).length > 0) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        return response.json();
    },

    async getAvailableDates(city: string) {
        const url = `${config.apiBaseUrl}/data?city=${encodeURIComponent(city)}&list_dates=true`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch dates: ${response.statusText}`);
        }
        return response.json(); // Returns string[]
    },

    async uploadImage(file: File, metadata?: { city: string; deviceId: string; timestamp: string }) {
        // 1. Get Presigned URL
        const params = new URLSearchParams();
        if (metadata?.city) params.append("city", metadata.city);
        if (metadata?.deviceId) params.append("deviceId", metadata.deviceId);
        if (metadata?.timestamp) params.append("timestamp", metadata.timestamp);
        params.append("fileType", file.type);

        const urlRes = await fetch(`${config.apiBaseUrl}/upload-url?${params.toString()}`);
        if (!urlRes.ok) throw new Error(`Failed to get upload URL: ${urlRes.statusText}`);

        const { uploadUrl, requiredHeaders } = await urlRes.json();

        // 2. Upload to S3
        // S3 Presigned URL PUT requires exact headers if signed with them
        const response = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: requiredHeaders || { "Content-Type": file.type }
        });

        if (!response.ok) {
            throw new Error(`Failed to upload to S3: ${response.statusText}`);
        }

        return { success: true };
    },

    async triggerVideoGeneration(date: string) {
        const response = await fetch(`${config.apiBaseUrl}/video/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date })
        });

        if (!response.ok) {
            throw new Error(`Failed to trigger video: ${response.statusText}`);
        }
        return response.json();
    }
};
