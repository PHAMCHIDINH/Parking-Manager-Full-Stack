import React, { useState } from "react";
import { Container, Box, Typography, TextField, Button } from "@mui/material";
import API from "../api";
import { useNavigate } from "react-router-dom";

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const response = await API.post("/auth/forgot-password?email=" + encodeURIComponent(email));
            setMessage(response.data.message || "Check your email for reset instructions");
        } catch (err: any) {
            setError(err.response?.data || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h4">Forgot Password</Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Enter your email address to receive a password reset link.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: "100%" }}>
                    <TextField
                        label="Email"
                        variant="outlined"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    {error && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                    {message && (
                        <Typography color="primary" sx={{ mt: 2 }}>
                            {message}
                        </Typography>
                    )}
                    <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Email"}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default ForgotPassword;
