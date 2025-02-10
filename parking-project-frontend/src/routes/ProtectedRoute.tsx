// src/routes/ProtectedRoute.tsx
import React, {JSX} from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
    children: JSX.Element;
    requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, token } = useAuth();

    if (!token || !user) {
        return <div>Loading...</div>;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;
