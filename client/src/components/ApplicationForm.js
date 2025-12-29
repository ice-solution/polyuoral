import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { patientAPI } from '../services/api';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    Name_CN: '',
    Name_EN: '',
    Age: '',
    Month: '',
    Email: '',
    PhoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 清除錯誤和成功訊息
    if (error) setError('');
    if (success) setSuccess(false);
  };

  const validateForm = () => {
    if (!formData.Name_CN.trim()) {
      setError('請填寫中文姓名');
      return false;
    }
    if (!formData.Name_EN.trim()) {
      setError('請填寫英文姓名');
      return false;
    }
    if (!formData.Age || isNaN(formData.Age) || Number(formData.Age) <= 0) {
      setError('請填寫有效的年齡');
      return false;
    }
    if (!formData.Month || isNaN(formData.Month) || Number(formData.Month) < 1 || Number(formData.Month) > 12) {
      setError('請填寫有效的月份（1-12）');
      return false;
    }
    if (!formData.Email.trim() || !formData.Email.includes('@')) {
      setError('請填寫有效的電子郵件地址');
      return false;
    }
    if (!formData.PhoneNumber.trim()) {
      setError('請填寫電話號碼');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3101/api';
      const response = await fetch(`${API_BASE_URL}/patients/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '提交申請失敗');
      }

      setSuccess(true);
      setFormData({
        Name_CN: '',
        Name_EN: '',
        Age: '',
        Month: '',
        Email: '',
        PhoneNumber: '',
      });
    } catch (err) {
      console.error('提交申請錯誤:', err);
      setError(err.message || '提交申請失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 2,
        maxWidth: 800,
        mx: 'auto',
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
        申請帳號
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          申請已成功提交！我們會盡快處理您的申請。
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="中文姓名"
              name="Name_CN"
              value={formData.Name_CN}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="英文姓名"
              name="Name_EN"
              value={formData.Name_EN}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="年齡"
              name="Age"
              type="number"
              value={formData.Age}
              onChange={handleChange}
              required
              variant="outlined"
              inputProps={{ min: 1, max: 150 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="月份"
              name="Month"
              type="number"
              value={formData.Month}
              onChange={handleChange}
              required
              variant="outlined"
              inputProps={{ min: 1, max: 12 }}
              helperText="請輸入月份（1-12）"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="電子郵件"
              name="Email"
              type="email"
              value={formData.Email}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="電話號碼"
              name="PhoneNumber"
              value={formData.PhoneNumber}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              {loading ? '提交中...' : '提交申請'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default ApplicationForm;

