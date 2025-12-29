import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  // 檢查是否為 admin
  const isAdmin = user.loginid && (
    user.loginid.toLowerCase() === 'admin' || 
    user.loginid.toLowerCase().includes('admin')
  );

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AdminRoute;


