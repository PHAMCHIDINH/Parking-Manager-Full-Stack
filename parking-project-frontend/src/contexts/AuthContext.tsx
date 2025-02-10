import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import API from "../api";

interface DecodedToken {
    sub: string;
    email: string;
    role: string;
    exp: number;
}

interface AuthUser {
    id: string;
    email: string;
    role: string;   // "ROLE_ADMIN", "ROLE_USER", etc.
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const navigate = useNavigate();

    const decodeAndSetUser = (accessToken: string) => {
        try {
            const decoded = jwtDecode<DecodedToken>(accessToken);
            setUser({
                id: decoded.sub,
                email: decoded.email,
                role: decoded.role,
            });
        } catch (error) {
            console.error("Failed to decode token:", error);
            setUser(null);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const resp = await API.post("/auth/login", { email, password });
            const { accessToken } = resp.data; // The backend returns {accessToken, tokenType}
            localStorage.setItem("token", accessToken);
            setToken(accessToken);
            decodeAndSetUser(accessToken);

            const decoded = jwtDecode<DecodedToken>(accessToken);
            // If user is admin => go /admin, else /user
            if (decoded.role === "ROLE_ADMIN") {
                navigate("/admin");
            } else {
                navigate("/user");
            }
        } catch (error) {
            console.error("Login error:", error);
            throw error; // let caller show user-friendly message
        }
    };

    const register = async (email: string, password: string) => {
        try {
            // Sign up => automatically login
            await API.post("/auth/signup", { email, password });
            await login(email, password);
        } catch (err) {
            console.error("Registration error:", err);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        navigate("/login");
    };

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            try {
                decodeAndSetUser(storedToken);
                setToken(storedToken);
            } catch (err) {
                console.error("Invalid stored token => logging out", err);
                logout();
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
};
