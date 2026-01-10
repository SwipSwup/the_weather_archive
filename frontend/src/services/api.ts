import { config } from "@/config";

// Types
export interface CityEntry {
    name: string;
    country_code: string | null;
}

export const WeatherApi = {
    async getWeatherData(city?: string, date?: string, skipCache: boolean = false) {
        let url = `${config.apiBaseUrl}/data`;
        const params = new URLSearchParams();

        if (city) params.append("city", city);
        if (date) params.append("date", date);
        if (skipCache) params.append("nocache", "true");

        if (Array.from(params).length > 0) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            headers: {
                "x-api-key": config.apiKey
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        return response.json();
    },

    async getAvailableDates(city: string) {
        const url = `${config.apiBaseUrl}/data?city=${encodeURIComponent(city)}&list_dates=true`;
        const response = await fetch(url, {
            headers: {
                "x-api-key": config.apiKey
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch dates: ${response.statusText}`);
        }
        return response.json(); // Returns string[]
    },

    async getAvailableCities(): Promise<CityEntry[]> {
        const url = `${config.apiBaseUrl}/cities`;
        const response = await fetch(url, {
            headers: {
                "x-api-key": config.apiKey
            }
        });
        if (!response.ok) {
            console.error("Failed to fetch cities", response.status, response.statusText);
            return [];
        }
        return response.json();
    },

    async uploadImage(file: File, metadata?: {
        city: string;
        countryCode?: string; // New Optional Field
        deviceId: string;
        timestamp: string;
        weather?: { temp: number; humidity: number; pressure: number } | null;
    }) {
        // 1. Get Presigned URL
        const params = new URLSearchParams();
        if (metadata?.city) params.append("city", metadata.city);
        if (metadata?.countryCode) params.append("countryCode", metadata.countryCode);
        if (metadata?.deviceId) params.append("deviceId", metadata.deviceId);
        if (metadata?.timestamp) params.append("timestamp", metadata.timestamp);

        if (metadata?.weather) {
            if (metadata.weather.temp !== undefined) params.append("temp", metadata.weather.temp.toString());
            if (metadata.weather.humidity !== undefined) params.append("humidity", metadata.weather.humidity.toString());
            if (metadata.weather.pressure !== undefined) params.append("pressure", metadata.weather.pressure.toString());
        }

        params.append("fileType", file.type);

        const urlRes = await fetch(`${config.apiBaseUrl}/upload-url?${params.toString()}`, {
            headers: {
                "x-api-key": config.apiKey
            }
        });
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
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey
            },
            body: JSON.stringify({ date })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Video trigger failed:', response.status, text);
            throw new Error(`Failed to trigger video: ${response.status} ${response.statusText} - ${text}`);
        }
        return response.json();
    }
};
