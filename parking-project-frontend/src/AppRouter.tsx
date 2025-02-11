import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import UserProfile from "./pages/UserProfile";
import MyReservationsPage from "./pages/MyReservationPage.tsx";

const AppRouter: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
                path="/user/profile"
                element={
                    <ProtectedRoute requiredRole="ROLE_USER">
                        <UserProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requiredRole="ROLE_ADMIN">
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/user"
                element={
                    <ProtectedRoute requiredRole="ROLE_USER">
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/user/my-reservations"
                element={
                    <ProtectedRoute requiredRole="ROLE_USER">
                        <MyReservationsPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Login />} />
        </Routes>
    );
};

export default AppRouter;
