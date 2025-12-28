import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { authAPI } from '../../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loginid, setLoginid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('嘗試登入:', { loginid, password: '***' });
      const response = await authAPI.login(loginid, password);
      console.log('登入響應:', response.data);
      
      const { token, patient } = response.data;

      if (!patient) {
        setError('登入響應中沒有用戶資訊');
        return;
      }

      // 檢查是否為 admin
      // admin 帳號的 loginid 應該是 'admin'（完全匹配或包含 'admin'）
      const isAdmin = patient.loginid && (
        patient.loginid.toLowerCase() === 'admin' || 
        patient.loginid.toLowerCase().includes('admin')
      );

      console.log('是否為 admin:', isAdmin, 'loginid:', patient.loginid);

      if (isAdmin) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...patient, role: 'admin' }));
        navigate('/admin/dashboard');
      } else {
        setError('此帳號沒有管理員權限');
        console.log('登入的帳號:', patient.loginid);
      }
    } catch (err) {
      console.error('登入錯誤:', err);
      console.error('錯誤詳情:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || '登入失敗，請檢查帳號密碼';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              管理員登入
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PolyU Oral Health Management System
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="登入帳號"
              variant="outlined"
              value={loginid}
              onChange={(e) => setLoginid(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="密碼"
              type="password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '登入'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminLogin;


