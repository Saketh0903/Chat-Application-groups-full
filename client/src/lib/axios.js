import axios from "axios";

// Prefer explicit VITE_API_URL for production; otherwise keep previous behavior
const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";

const axiosInstance = axios.create({
        baseURL: BASE_URL,
        withCredentials: true
});

export default axiosInstance