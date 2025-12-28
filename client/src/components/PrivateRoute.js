import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 如果是 admin，重定向到 admin 後台
  const isAdmin = user.loginid && (
    user.loginid.toLowerCase() === 'admin' || 
    user.loginid.toLowerCase().includes('admin')
  );

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;


