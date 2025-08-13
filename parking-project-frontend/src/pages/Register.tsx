import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import API from "../api";
import {
    Container,
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    IconButton,
    InputAdornment,
    Fade,
    CircularProgress,
    styled,
    Divider,
} from "@mui/material";
import {
    Email,
    Lock,
    Person,
    Visibility,
    VisibilityOff,
    DirectionsCar,
} from "@mui/icons-material";
import BackgroundLoader from "../components/BackgroundLoader";

// Reuse styled components từ Login
const RegisterContainer = styled(Container)(({ theme }) => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 1,
    }
}));

const RegisterCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    borderRadius: theme.spacing(1),
    background: '#ffffff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0e0e0',
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    zIndex: 2,
}));

const StyledTextField = styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#ffffff',
        '& fieldset': {
            borderColor: '#e0e0e0',
        },
        '&:hover fieldset': {
            borderColor: '#1976d2',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#1976d2',
        }
    }
}));

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const redirectTimer = useRef<number | undefined>(undefined);

    // Basic client-side validations
    const isEmailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email.trim());
    const isPasswordStrong = password.length >= 6; // adjust policy if needed
    const doPasswordsMatch = password === confirmPassword;
    const isFormValid = username.trim().length > 0 && isEmailValid && isPasswordStrong && doPasswordsMatch;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        const mail = email.trim();
        const pass = password;
        const cpass = confirmPassword;

        if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(mail)) {
            setError("Email không hợp lệ.");
            return;
        }
        if (pass.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (pass !== cpass) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            await API.post("/auth/signup", { email: mail, password: pass });
            setMessage("Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.");
            setUsername("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            // Auto redirect to login after short delay
            redirectTimer.current = window.setTimeout(() => navigate("/login"), 1500);
        } catch (err: unknown) {
            let msg = "Đăng ký thất bại. Vui lòng thử lại.";
            if (axios.isAxiosError(err)) {
                const axErr = err as AxiosError<{ message?: string }>; 
                msg = axErr.response?.data?.message ?? axErr.message ?? msg;
            } else if (err instanceof Error) {
                msg = err.message || msg;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (redirectTimer.current) {
                clearTimeout(redirectTimer.current);
            }
        };
    }, []);

    return (
        <BackgroundLoader imageUrl="/backgroud.jpg">
            <RegisterContainer maxWidth={false}>
                <Fade in timeout={800}>
                    <RegisterCard elevation={0}>
                        {/* Brand Section */}
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                mb: 1 
                            }}>
                                <DirectionsCar sx={{ 
                                    fontSize: 32, 
                                    color: '#1976d2',
                                    mr: 1 
                                }} />
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        fontWeight: '600',
                                        color: '#333333',
                                    }}
                                >
                                    ParkSmart
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                Create your account
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit}>
                            {/* Alerts */}
                            {error && (
                                <Alert 
                                    severity="error" 
                                    sx={{ 
                                        mb: 2,
                                        backgroundColor: '#ffebee',
                                        color: '#c62828'
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {message && (
                                <Alert 
                                    severity="success" 
                                    sx={{ 
                                        mb: 2,
                                        backgroundColor: '#e8f5e8',
                                        color: '#2e7d32'
                                    }}
                                >
                                    {message}
                                </Alert>
                            )}

                            {/* Form Fields */}
                            <StyledTextField
                                fullWidth
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
                                size="medium"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Person sx={{ color: '#666666', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <StyledTextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
                                error={email.length > 0 && !isEmailValid}
                                helperText={email.length > 0 && !isEmailValid ? 'Email không hợp lệ' : ' '}
                                size="medium"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: '#666666', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <StyledTextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
                                error={password.length > 0 && !isPasswordStrong}
                                helperText={password.length > 0 && !isPasswordStrong ? 'Ít nhất 6 ký tự' : ' '}
                                size="medium"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: '#666666', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                disabled={loading}
                                                size="small"
                                            >
                                                {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <StyledTextField
                                fullWidth
                                label="Confirm Password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
                                error={confirmPassword.length > 0 && !doPasswordsMatch}
                                helperText={confirmPassword.length > 0 && !doPasswordsMatch ? 'Mật khẩu xác nhận không khớp' : ' '}
                                size="medium"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: '#666666', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                edge="end"
                                                disabled={loading}
                                                size="small"
                                            >
                                                {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Register Button */}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading || !isFormValid}
                                sx={{
                                    mt: 3,
                                    mb: 3,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    textTransform: 'none',
                                    backgroundColor: '#1976d2',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        backgroundColor: '#1565c0',
                                        boxShadow: 'none',
                                    },
                                    '&:disabled': {
                                        backgroundColor: '#e0e0e0',
                                        color: '#9e9e9e',
                                    }
                                }}
                            >
                                {loading ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : (
                                    'Create Account'
                                )}
                            </Button>

                            {/* Login Link */}
                            <Divider sx={{ my: 2, borderColor: '#e0e0e0' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                    or
                                </Typography>
                            </Divider>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                    Already have an account?{' '}
                                    <Button
                                        component={Link}
                                        to="/login"
                                        variant="text"
                                        disabled={loading}
                                        sx={{ 
                                            textTransform: 'none',
                                            fontWeight: '500',
                                            color: '#1976d2',
                                            fontSize: '0.9rem',
                                            minWidth: 'auto',
                                            padding: '2px 4px'
                                        }}
                                    >
                                        Sign in
                                    </Button>
                                </Typography>
                            </Box>
                        </Box>
                    </RegisterCard>
                </Fade>
            </RegisterContainer>
        </BackgroundLoader>
    );
};

export default Register;
