import React, { useState } from "react";
import { Container, Box, Typography, TextField, Button, Paper, styled } from "@mui/material";
import API from "../api";

const Card = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    borderRadius: theme.spacing(1.5),
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0'
}));

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const response = await API.post("/auth/forgot-password?email=" + encodeURIComponent(email));
            setMessage(response.data.message || "Check your email for reset instructions");
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
                    Forgot Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Enter your email address to receive a password reset link.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
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
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Email"}
                    </Button>
                </Box>
            </Card>
        </Container>
    );
};

export default ForgotPassword;
