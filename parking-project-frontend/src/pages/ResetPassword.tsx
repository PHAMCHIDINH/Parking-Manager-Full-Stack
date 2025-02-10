import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button } from "@mui/material";
import API from "../api";

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const response = await API.post("/auth/reset-password", { token, newPassword, confirmPassword });
            setMessage(response.data.message || "Password reset successfully");
            // Redirect to login page after a short delay
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h4">Reset Password</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: "100%" }}>
                    <TextField
                        label="New Password"
                        type="password"
                        variant="outlined"
                        fullWidth
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Confirm Password"
                        type="password"
                        variant="outlined"
                        fullWidth
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    {message && (
                        <Typography color="primary" sx={{ mb: 2 }}>
                            {message}
                        </Typography>
                    )}
                    <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default ResetPassword;
