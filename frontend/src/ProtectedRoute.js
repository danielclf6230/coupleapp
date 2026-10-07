// src/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    let user;
    try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
    const location = useLocation();

    if (!user?.token) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
