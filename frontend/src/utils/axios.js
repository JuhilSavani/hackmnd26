import axios from "axios";

export const BASE_API_ENDPOINT = (import.meta.env.VITE_BASE_API_ENDPOINT || "http://localhost:4000/api")

export default axios.create({
  baseURL: BASE_API_ENDPOINT,
  withCredentials: true,
});