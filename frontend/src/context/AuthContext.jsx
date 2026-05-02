import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("healthup_user");
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      localStorage.removeItem("healthup_token");
      localStorage.removeItem("healthup_user");
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("healthup_token", data.token);
    localStorage.setItem("healthup_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const registerPatient = async (payload) => {
    const { data } = await api.post("/auth/register/patient", payload);
    localStorage.setItem("healthup_token", data.token);
    localStorage.setItem("healthup_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("healthup_token");
    localStorage.removeItem("healthup_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, registerPatient, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
