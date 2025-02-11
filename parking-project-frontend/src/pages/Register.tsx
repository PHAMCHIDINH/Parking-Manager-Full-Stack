import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";
import BackgroundLoader from "../components/BackgroundLoader";

const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!formData.email || !formData.password) {
            setError("All fields are required.");
            setLoading(false);
            return;
        }

        try {
            await register(formData.email, formData.password);
            navigate("/dashboard"); // Redirect after successful registration
        } catch (err) {
            setError("Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BackgroundLoader imageUrl="/bg.jpg">
            <div className="auth-page">
                <div className="wrapper">
                    <form onSubmit={handleSubmit}>
                        <h1>Register</h1>
                        <div className="input-box">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <i className="bx bxs-user"></i>
                        </div>
                        <div className="input-box">
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <i className="bx bxs-lock-alt"></i>
                        </div>
                        {error && <p style={{ color: "red" }}>{error}</p>}
                        <button type="submit" className="btn" disabled={loading}>
                            {loading ? "Registering..." : "Register"}
                        </button>
                        <div className="register-link">
                            <p>
                                Already have an account? <Link to="/login">Login</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </BackgroundLoader>
    );
};

export default Register;
