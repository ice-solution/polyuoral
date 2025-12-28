import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserLogin from './pages/user/UserLogin';
import UserDashboard from './pages/user/UserDashboard';
import UserProfile from './pages/user/UserProfile';
import RecordDetail from './pages/user/RecordDetail';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* User Routes */}
        <Route path="/login" element={<UserLogin />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <UserDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <UserProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/record/:id"
          element={
            <PrivateRoute>
              <RecordDetail />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Box>
  );
}

export default App;


