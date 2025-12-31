import { config } from "@/config";

export const WeatherApi = {
    async getWeatherData() {
        const response = await fetch(`${config.apiBaseUrl}/data`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        return response.json();
    },

    async uploadImage(file: File) {
        // API Gateway / Lambda URL might accept raw body or special handling
        // For now, assuming direct binary POST
        const response = await fetch(`${config.apiBaseUrl}/image`, {
            method: "POST",
            body: file,
            headers: {
                "Content-Type": file.type
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
        }
        return response.json();
    }
};
