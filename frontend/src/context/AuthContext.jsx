import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = "healthup_token";
const USER_KEY = "healthup_user";

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore localStorage cleanup failures in restricted contexts
    }
    return null;
  }
}

function persistAuth(data) {
  if (!data?.token || !data?.user) {
    throw new Error("Invalid authentication response");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistAuth(data);
    setUser(data.user);
    return data.user;
  };

  const registerPatient = async (payload) => {
    const { data } = await api.post("/auth/register/patient", payload);
    persistAuth(data);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, registerPatient, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
