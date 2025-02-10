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
} from "@mui/material";
import API from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Define your vehicle options
const vehicleOptions = ["Car", "Van", "Taxi", "Bus", "Police", "Government"];
// Define the backend base URL for static resources
const baseURL = "http://localhost:8080";

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

    // Fetch profile data from backend when component mounts
    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await API.get("/user/profile");
                const profileData = response.data;
                setName(profileData.name || "");
                setVehicleType(profileData.vehicleType || "");
                setCarInfo(profileData.carInfo || "");
                // If the returned URL is relative, prepend the base URL.
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
            }
        }
        fetchProfile();
    }, []);

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setProfileImage(file);
            // Show local preview immediately
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleLicensePlateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setLicensePlateImage(file);
            // Show local preview immediately
            setLicensePlateImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

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
            // Optionally, you can refresh the profile data from the server here
        } catch (err: any) {
            setError(err.response?.data || "An error occurred");
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4">Edit Profile</Typography>
                    <Button variant="outlined" onClick={() => navigate("/user")}>
                        Back to Dashboard
                    </Button>
                </Stack>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Name"
                            variant="outlined"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <FormControl fullWidth variant="outlined">
                            <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                            <Select
                                labelId="vehicle-type-label"
                                value={vehicleType}
                                label="Vehicle Type"
                                onChange={(e) => setVehicleType(e.target.value)}
                            >
                                {vehicleOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Car Information"
                            variant="outlined"
                            fullWidth
                            multiline
                            rows={3}
                            value={carInfo}
                            onChange={(e) => setCarInfo(e.target.value)}
                        />
                        <Box>
                            <Typography variant="subtitle1">Profile Image</Typography>
                            <Button variant="contained" component="label" sx={{ mt: 1 }}>
                                Upload Profile Image
                                <input type="file" hidden accept="image/*" onChange={handleProfileImageChange} />
                            </Button>
                            {profileImagePreview && (
                                <Avatar src={profileImagePreview} sx={{ width: 80, height: 80, mt: 1 }} />
                            )}
                        </Box>
                        <Box>
                            <Typography variant="subtitle1">License Plate Image</Typography>
                            <Button variant="contained" component="label" sx={{ mt: 1 }}>
                                Capture License Plate
                                <input type="file" hidden accept="image/*" capture="environment" onChange={handleLicensePlateImageChange} />
                            </Button>
                            {licensePlateImagePreview && (
                                <Avatar src={licensePlateImagePreview} sx={{ width: 80, height: 80, mt: 1 }} />
                            )}
                        </Box>
                        {error && <Typography color="error">{error}</Typography>}
                        {message && <Typography color="primary">{message}</Typography>}
                        <Button type="submit" variant="contained" color="primary">
                            Save Profile
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </Container>
    );
};

export default UserProfile;
