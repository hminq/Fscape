/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  function login(accessToken, userData) {
    localStorage.setItem("token", accessToken);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }
    setToken(accessToken);
    setUser(userData || null);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    function handler(e) {
      if (e.key === "token") {
        setToken(e.newValue);
      }
      if (e.key === "user") {
        try {
          setUser(JSON.parse(e.newValue || "null"));
        } catch {
          setUser(null);
        }
      }
    }
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isLoggedIn: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
