import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";
import BackgroundLoader from "../components/BackgroundLoader";

const Login: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err) {
            setError("Login failed. Please check your credentials.");
        }
    };

    return (
        <BackgroundLoader imageUrl="/bg.jpg">
            <div className="auth-page">
                <div className="wrapper">
                    <form onSubmit={handleSubmit}>
                        <h1>Login</h1>
                        <div className="input-box">
                            <input
                                type="text"
                                placeholder="Email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <i className="bx bxs-user"></i>
                        </div>
                        <div className="input-box">
                            <input
                                type="password"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <i className="bx bxs-lock-alt"></i>
                        </div>
                        <div className="remember-forgot">
                            <label>
                                <input type="checkbox" /> Remember Me
                            </label>
                            <Link to="/forgot-password">Forgot Password</Link>
                        </div>
                        {error && <p style={{ color: "red" }}>{error}</p>}
                        <button type="submit" className="btn">
                            Login
                        </button>
                        <div className="register-link">
                            <p>
                                Don't have an account? <Link to="/register">Register</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </BackgroundLoader>
    );
};

export default Login;
