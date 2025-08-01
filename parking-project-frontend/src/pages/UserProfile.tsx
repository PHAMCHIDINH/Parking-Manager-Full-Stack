import React, { useState, useEffect } from "react";
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    Stack,
    Paper,
    Card,
    CardContent,
    CardActions,
    Divider,
    IconButton,
    Chip,
    Alert,
    LinearProgress,
    Fade,
    styled,
    alpha,
} from "@mui/material";
import {
    PhotoCamera,
    CameraAlt,
    Person,
    DirectionsCar,
    Edit,
    Save,
    ArrowBack,
    CheckCircle,
    Error,
    Upload,
    Badge,
} from "@mui/icons-material";
import API from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const vehicleOptions = ["Car", "Van", "Taxi", "Bus", "Police", "Government"];
const baseURL = "http://localhost:8080";

// Styled Components - Sửa lại cho responsive đẹp hơn
const ProfileContainer = styled(Container)(({ theme }) => ({
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: theme.spacing(2, 1), // Giảm padding để có nhiều không gian hơn
    display: 'flex',
    alignItems: 'flex-start', // Căn lên trên thay vì center
    justifyContent: 'center',
    [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4, 2),
    }
}));

const ProfileCard = styled(Paper)(({ theme }) => ({
    borderRadius: theme.spacing(3),
    padding: theme.spacing(3), // Giảm padding
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%', // Sử dụng toàn bộ chiều rộng
    [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4),
        maxWidth: '900px', // Tăng maxWidth cho desktop
    },
    [theme.breakpoints.up('lg')]: {
        maxWidth: '1000px', // Còn rộng hơn cho màn hình lớn
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    }
}));

const HeaderSection = styled(Box)(({ theme }) => ({
    textAlign: 'center',
    marginBottom: theme.spacing(3), // Giảm margin
    position: 'relative',
}));

const ImageUploadCard = styled(Card)(({ theme }) => ({
    borderRadius: theme.spacing(2),
    border: `2px dashed ${theme.palette.primary.light}`,
    background: alpha(theme.palette.primary.light, 0.05),
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    minHeight: '120px', // Đặt chiều cao tối thiểu
    display: 'flex',
    alignItems: 'center',
    flex: 1, // Cho phép mở rộng
    '&:hover': {
        borderColor: theme.palette.primary.main,
        background: alpha(theme.palette.primary.light, 0.1),
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[8],
    }
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
    width: 120,
    height: 120,
    margin: '0 auto',
    border: `4px solid ${theme.palette.common.white}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'scale(1.05)',
    }
}));

const VehicleTypeChip = styled(Chip)(({ theme }) => ({
    borderRadius: theme.spacing(3),
    padding: theme.spacing(1, 2),
    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
    color: 'white',
    fontWeight: 'bold',
    '& .MuiChip-icon': {
        color: 'white',
    }
}));

const UserProfile: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [vehicleType, setVehicleType] = useState("");
    const [carInfo, setCarInfo] = useState("");
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [licensePlateImage, setLicensePlateImage] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string>("");
    const [licensePlateImagePreview, setLicensePlateImagePreview] = useState<string>("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            setInitialLoading(true);
            try {
                const response = await API.get("/user/profile");
                const profileData = response.data;
                setName(profileData.name || "");
                setVehicleType(profileData.vehicleType || "");
                setCarInfo(profileData.carInfo || "");
                setProfileImagePreview(
                    profileData.profileImageUrl
                        ? profileData.profileImageUrl.startsWith("http")
                            ? profileData.profileImageUrl
                            : baseURL + profileData.profileImageUrl
                        : ""
                );
                setLicensePlateImagePreview(
                    profileData.licensePlateImageUrl
                        ? profileData.licensePlateImageUrl.startsWith("http")
                            ? profileData.licensePlateImageUrl
                            : baseURL + profileData.licensePlateImageUrl
                        : ""
                );
            } catch (err) {
                console.error("Failed to fetch profile", err);
                setError("Failed to load profile data");
            } finally {
                setInitialLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setProfileImage(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleLicensePlateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setLicensePlateImage(file);
            setLicensePlateImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("vehicleType", vehicleType);
        formData.append("carInfo", carInfo);
        if (profileImage) {
            formData.append("profileImage", profileImage);
        }
        if (licensePlateImage) {
            formData.append("licensePlateImage", licensePlateImage);
        }

        try {
            const response = await API.put("/user/profile", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setMessage(response.data.message || "Profile updated successfully");
            
            // Reset file inputs
            setProfileImage(null);
            setLicensePlateImage(null);
            
            setTimeout(() => setMessage(null), 5000);
        } catch (err: any) {
            setError(err.response?.data || "An error occurred");
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <ProfileContainer maxWidth="sm">
                <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
                    <Typography variant="h6">Loading profile...</Typography>
                </Box>
            </ProfileContainer>
        );
    }

    return (
        <ProfileContainer maxWidth="md">
            <ProfileCard elevation={24}>
                {loading && (
                    <LinearProgress 
                        sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0,
                            borderRadius: '12px 12px 0 0' 
                        }} 
                    />
                )}

                <HeaderSection>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <IconButton 
                            onClick={() => navigate("/user")}
                            sx={{ 
                                background: alpha('#667eea', 0.1),
                                '&:hover': { background: alpha('#667eea', 0.2) }
                            }}
                        >
                            <ArrowBack sx={{ color: '#667eea' }} />
                        </IconButton>
                        
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                fontWeight: 'bold',
                                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                                backgroundClip: 'text',
                                textFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Edit Profile
                        </Typography>
                        
                        <Box sx={{ width: 48 }} /> {/* Spacer for center alignment */}
                    </Box>

                    {vehicleType && (
                        <VehicleTypeChip 
                            icon={<DirectionsCar />} 
                            label={vehicleType} 
                            size="medium"
                        />
                    )}
                </HeaderSection>

                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        {/* Alerts */}
                        <Fade in={!!error}>
                            <div>
                                {error && (
                                    <Alert 
                                        severity="error" 
                                        icon={<Error />}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {error}
                                    </Alert>
                                )}
                            </div>
                        </Fade>

                        <Fade in={!!message}>
                            <div>
                                {message && (
                                    <Alert 
                                        severity="success" 
                                        icon={<CheckCircle />}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {message}
                                    </Alert>
                                )}
                            </div>
                        </Fade>

                        {/* Basic Information */}
                        <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                                    <Edit sx={{ mr: 1 }} />
                                    Basic Information
                                </Typography>
                                
                                <Stack spacing={3}>
                                    <TextField
                                        label="Full Name"
                                        variant="outlined"
                                        fullWidth
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        InputProps={{
                                            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            }
                                        }}
                                    />
                                    
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                                        <Select
                                            labelId="vehicle-type-label"
                                            value={vehicleType}
                                            label="Vehicle Type"
                                            onChange={(e) => setVehicleType(e.target.value)}
                                            startAdornment={<DirectionsCar sx={{ mr: 1, color: 'text.secondary' }} />}
                                            sx={{
                                                borderRadius: 2,
                                            }}
                                        >
                                            {vehicleOptions.map((option) => (
                                                <MenuItem key={option} value={option}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <DirectionsCar sx={{ mr: 1, fontSize: 20 }} />
                                                        {option}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    <TextField
                                        label="Vehicle Details"
                                        variant="outlined"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={carInfo}
                                        onChange={(e) => setCarInfo(e.target.value)}
                                        placeholder="Enter vehicle make, model, color, license plate, etc."
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            }
                                        }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Images Section */}
                        <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                                    <PhotoCamera sx={{ mr: 1 }} />
                                    Photos
                                </Typography>

                                <Stack spacing={4}>
                                    {/* Profile Image */}
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                                            Profile Picture
                                        </Typography>
                                        
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                                            {profileImagePreview && (
                                                <StyledAvatar 
                                                    src={profileImagePreview} 
                                                    sx={{ width: 100, height: 100 }}
                                                />
                                            )}
                                            
                                            <ImageUploadCard>
                                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                                    <input
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        id="profile-image-upload"
                                                        type="file"
                                                        onChange={handleProfileImageChange}
                                                    />
                                                    <label htmlFor="profile-image-upload">
                                                        <Button
                                                            variant="contained"
                                                            component="span"
                                                            startIcon={<Upload />}
                                                            sx={{
                                                                borderRadius: 3,
                                                                textTransform: 'none',
                                                                px: 3,
                                                            }}
                                                        >
                                                            {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                                                        </Button>
                                                    </label>
                                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                                        PNG, JPG up to 5MB
                                                    </Typography>
                                                </CardContent>
                                            </ImageUploadCard>
                                        </Stack>
                                    </Box>

                                    <Divider />

                                    {/* License Plate Image */}
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                                            License Plate
                                        </Typography>
                                        
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                                            {licensePlateImagePreview && (
                                                <Box
                                                    component="img"
                                                    src={licensePlateImagePreview}
                                                    sx={{
                                                        width: 200,
                                                        height: 100,
                                                        objectFit: 'cover',
                                                        borderRadius: 2,
                                                        border: '2px solid',
                                                        borderColor: 'divider',
                                                        boxShadow: 2,
                                                    }}
                                                />
                                            )}
                                            
                                            <ImageUploadCard>
                                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                                    <input
                                                        accept="image/*"
                                                        capture="environment"
                                                        style={{ display: 'none' }}
                                                        id="license-plate-upload"
                                                        type="file"
                                                        onChange={handleLicensePlateImageChange}
                                                    />
                                                    <label htmlFor="license-plate-upload">
                                                        <Button
                                                            variant="contained"
                                                            component="span"
                                                            startIcon={<CameraAlt />}
                                                            sx={{
                                                                borderRadius: 3,
                                                                textTransform: 'none',
                                                                px: 3,
                                                            }}
                                                        >
                                                            {licensePlateImagePreview ? 'Retake Photo' : 'Capture Plate'}
                                                        </Button>
                                                    </label>
                                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                                        Use camera to capture license plate
                                                    </Typography>
                                                </CardContent>
                                            </ImageUploadCard>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Submit Button */}
                        <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                            <CardActions sx={{ p: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    disabled={loading}
                                    startIcon={loading ? null : <Save />}
                                    sx={{
                                        borderRadius: 3,
                                        py: 1.5,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                                        },
                                        '&:disabled': {
                                            background: 'rgba(0, 0, 0, 0.12)',
                                        }
                                    }}
                                >
                                    {loading ? 'Saving Profile...' : 'Save Profile'}
                                </Button>
                            </CardActions>
                        </Card>
                    </Stack>
                </Box>
            </ProfileCard>
        </ProfileContainer>
    );
};

export default UserProfile;
