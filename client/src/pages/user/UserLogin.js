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
  Link,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { authAPI } from '../../services/api';

const UserLogin = () => {
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
      const response = await authAPI.login(loginid, password);
      const { token, patient } = response.data;

      // 檢查是否為 admin
      if (patient.loginid && patient.loginid.toLowerCase().includes('admin')) {
        // 如果是 admin，導向管理後台
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...patient, role: 'admin' }));
        navigate('/admin/dashboard');
      } else {
        // 普通用戶
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...patient, role: 'user' }));
        // 將密碼暫時存儲到 sessionStorage（僅用於生成 QR code，關閉瀏覽器後會清除）
        sessionStorage.setItem('loginPassword', password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || '登入失敗，請檢查帳號密碼');
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
              用戶登入
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

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              href="/admin/login"
              variant="body2"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              管理員登入
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UserLogin;



