import axios from "../axios.js";
import { useAuth } from "./useAuth";
import { useState } from "react";

function useLogout() {
  const { setAuth } = useAuth();

  const [logoutError, setLogoutError] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const logout = async () => {
    setLogoutLoading(true);
    setLogoutError(null);
    try {
      await axios.post("/auth/logout", { withCredentials: true });
      setAuth({
        isAuthenticated: false,
        user: null
      });
    } catch (error) {
      console.error(error.stack);
      setLogoutError("Logout failed. Please try again.");
    }finally {
      setLogoutLoading(false);
    }
  };
  return { logout, logoutError, logoutLoading };
}

export default useLogout;