import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const INTERNAL_ROLES = ["ADMIN", "BUILDING_MANAGER", "STAFF"];

const isClientRole = (userData) =>
  userData?.role && !INTERNAL_ROLES.includes(userData.role);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("token");
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (storedUser && !isClientRole(storedUser)) return null;
    } catch { /* ignore */ }
    return stored;
  });
  const [user, setUser] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (storedUser && !isClientRole(storedUser)) return null;
      return storedUser;
    } catch {
      return null;
    }
  });

  const login = (accessToken, userData) => {
    if (userData && !isClientRole(userData)) {
      throw new Error("Tài khoản nội bộ không được phép đăng nhập tại đây");
    }
    localStorage.setItem("token", accessToken);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }
    setToken(accessToken);
    setUser(userData || null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "user") {
        try {
          const newUser = JSON.parse(e.newValue || "null");
          if (newUser && !isClientRole(newUser)) {
            setToken(null);
            setUser(null);
            return;
          }
          setUser(newUser);
          setToken(localStorage.getItem("token"));
        } catch {
          setUser(null);
        }
      }
      if (e.key === "token") {
        setToken(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoggedIn: !!token, login, logout }}>
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
