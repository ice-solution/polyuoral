import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { patientAPI } from '../../services/api';

const UserProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    if (userData) {
      fetchUserData(userData.loginid);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchUserData = async (loginid) => {
    try {
      setLoading(true);
      const response = await patientAPI.getByLoginId(loginid);
      setUser(response.data);
    } catch (err) {
      console.error('載入用戶資料失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>載入中...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: 'primary.main',
              mx: 'auto',
              mb: 2,
            }}
          >
            <PersonIcon sx={{ fontSize: 50 }} />
          </Avatar>
          <Typography variant="h4" gutterBottom>
            {user.Name_CN}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user.Name_EN}
          </Typography>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="登入帳號"
              value={user.loginid}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="電子郵件"
              value={user.Email}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="中文姓名"
              value={user.Name_CN}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="英文姓名"
              value={user.Name_EN}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="年齡"
              value={user.Age}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="月份"
              value={user.Month}
              disabled
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="電話"
              value={user.PhoneNumber}
              disabled
              variant="outlined"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
          >
            返回
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserProfile;


