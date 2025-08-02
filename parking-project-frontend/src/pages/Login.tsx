import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
    Container,
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    FormControlLabel,
    Checkbox,
    Divider,
    IconButton,
    InputAdornment,
    Fade,
    CircularProgress,
    styled,
} from "@mui/material";
import {
    Email,
    Lock,
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    PersonAdd,
    DirectionsCar,
} from "@mui/icons-material";
import BackgroundLoader from "../components/BackgroundLoader";

// Styled Components - Đơn giản và clean
const LoginContainer = styled(Container)(({ theme }) => ({
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
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Overlay trắng nhẹ
        zIndex: 1,
    }
}));

const LoginCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    borderRadius: theme.spacing(1), // Bo góc ít hơn
    background: '#ffffff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', // Shadow nhẹ
    border: '1px solid #e0e0e0',
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    zIndex: 2,
}));

const BrandSection = styled(Box)(({ theme }) => ({
    textAlign: 'center',
    marginBottom: theme.spacing(3),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
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

const SimpleButton = styled(Button)(({ theme }) => ({
    padding: theme.spacing(1.5, 0),
    fontSize: '1rem',
    fontWeight: '500',
    textTransform: 'none',
    backgroundColor: '#1976d2',
    color: '#ffffff',
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: '#1565c0',
        boxShadow: 'none',
    },
    '&:disabled': {
        backgroundColor: '#e0e0e0',
        color: '#9e9e9e',
    }
}));

const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(email, password);
        } catch (err) {
            setError("Invalid email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <BackgroundLoader imageUrl="/backgroud.jpg">
            <LoginContainer maxWidth={false}>
                <Fade in timeout={800}>
                    <LoginCard elevation={0}>
                        {/* Brand Section */}
                        <BrandSection>
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
                                Sign in to your account
                            </Typography>
                        </BrandSection>

                        {/* Login Form */}
                        <Box component="form" onSubmit={handleSubmit}>
                            {/* Error Alert */}
                            {error && (
                                <Alert 
                                    severity="error" 
                                    sx={{ 
                                        mb: 2,
                                        backgroundColor: '#ffebee',
                                        color: '#c62828',
                                        '& .MuiAlert-icon': {
                                            color: '#c62828'
                                        }
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {/* Email Field */}
                            <StyledTextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
                                size="medium"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: '#666666', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Password Field */}
                            <StyledTextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                required
                                disabled={loading}
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
                                                onClick={togglePasswordVisibility}
                                                edge="end"
                                                disabled={loading}
                                                size="small"
                                            >
                                                {showPassword ? 
                                                    <VisibilityOff sx={{ fontSize: 20 }} /> : 
                                                    <Visibility sx={{ fontSize: 20 }} />
                                                }
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Remember Me & Forgot Password */}
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mt: 2,
                                mb: 3
                            }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            color="primary"
                                            disabled={loading}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                            Remember me
                                        </Typography>
                                    }
                                />
                                <Button
                                    component={Link}
                                    to="/forgot-password"
                                    variant="text"
                                    size="small"
                                    disabled={loading}
                                    sx={{ 
                                        textTransform: 'none',
                                        fontSize: '0.85rem',
                                        color: '#1976d2',
                                        minWidth: 'auto',
                                        padding: '4px 8px'
                                    }}
                                >
                                    Forgot password?
                                </Button>
                            </Box>

                            {/* Login Button */}
                            <SimpleButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                sx={{ mb: 3 }}
                            >
                                {loading ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : (
                                    'Sign In'
                                )}
                            </SimpleButton>

                            {/* Divider */}
                            <Divider sx={{ my: 2, borderColor: '#e0e0e0' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                    or
                                </Typography>
                            </Divider>

                            {/* Register Link */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                    Don't have an account?{' '}
                                    <Button
                                        component={Link}
                                        to="/register"
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
                                        Sign up
                                    </Button>
                                </Typography>
                            </Box>
                        </Box>
                    </LoginCard>
                </Fade>
            </LoginContainer>
        </BackgroundLoader>
    );
};

export default Login;
