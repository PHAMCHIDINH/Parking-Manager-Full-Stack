import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button, Paper, styled } from "@mui/material";
import API from "../api";

const Card = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    borderRadius: theme.spacing(1.5),
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0'
}));

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
            setTimeout(() => navigate("/login"), 1500);
        } catch {
            setError("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card elevation={0}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 700, textAlign: 'center' }}>
                    Reset Password
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
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
                    <Button type="submit" variant="contained" fullWidth disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                </Box>
            </Card>
        </Container>
    );
};

export default ResetPassword;
