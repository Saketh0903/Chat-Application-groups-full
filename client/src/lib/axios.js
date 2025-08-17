import axios from "axios";

// Prefer explicit VITE_API_URL for production; otherwise keep previous behavior
const resolvedBaseUrl = import.meta.env.VITE_API_URL
    ?? (import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api");

const axiosInstance = axios.create({
        baseURL: resolvedBaseUrl,
        withCredentials: true
});

export default axiosInstance