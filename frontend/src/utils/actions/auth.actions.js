import axios from "../axios.js";
import handleAxiosError from "../handleAxiosError.js";

export async function registerAction(data) {
  try {
    const response = await axios.post("/auth/register", data);
    return response.data;  // { isAuthenticated: true, user: {...} }
  } catch (e) {
    return handleAxiosError(e, "Registration failed!");
  }
}

export async function loginAction(data) {
  try {
    const response = await axios.post("/auth/login", data);
    return response.data;  // { isAuthenticated: true, user: {...} }
  } catch (e) {
    return handleAxiosError(e, "Login failed!");
  }
}