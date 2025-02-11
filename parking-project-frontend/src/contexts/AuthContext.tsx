import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface AuthUser {
    id: string;
    email: string;
    role: string;   // "ROLE_ADMIN", "ROLE_USER", ...
    name?: string;
    profileImageUrl?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const navigate = useNavigate();

    /** Fetch the user’s profile from /api/user/profile and store it in context. */
    const refreshUserProfile = async () => {
        try {
            const resp = await API.get("/user/profile");
            const profileData = resp.data;
            setUser((prev) =>
                prev
                    ? { ...prev, ...profileData, id: String(profileData.id) }
                    : {
                        id: String(profileData.id),
                        email: profileData.email,
                        role: profileData.role,
                        name: profileData.name,
                        profileImageUrl: profileData.profileImageUrl,
                    }
            );
        } catch (err) {
            console.error("Failed to refresh user profile", err);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const resp = await API.post("/auth/login", { email, password });
            const { accessToken } = resp.data; // The backend returns { accessToken, tokenType }
            localStorage.setItem("token", accessToken);
            setToken(accessToken);

            API.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
            await refreshUserProfile();

            // Navigate based on role
            if (user?.role === "ROLE_ADMIN") {
                navigate("/admin");
            } else {
                navigate("/user");
            }
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const register = async (email: string, password: string) => {
        try {
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
            setToken(storedToken);
            // Attempt to refresh user profile
            API.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
            refreshUserProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, token, login, register, logout, refreshUserProfile }}
        >
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
