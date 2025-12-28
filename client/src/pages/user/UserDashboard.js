import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { authAPI, patientRecordAPI } from '../../services/api';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    if (userData) {
      fetchRecords(userData.loginid);
    }
  }, []);

  const fetchRecords = async (loginid) => {
    try {
      setLoading(true);
      const response = await patientRecordAPI.getByLoginId(loginid);
      setRecords(response.data);
    } catch (err) {
      console.error('載入記錄失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            PolyU Oral Health
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user?.Name_CN || user?.loginid}</Typography>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ p: 0 }}
            >
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <PersonIcon />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => navigate('/profile')}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                個人資料
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                登出
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          我的記錄
        </Typography>

        {records.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              目前沒有任何記錄
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {records.map((record) => (
              <Grid item xs={12} md={6} lg={4} key={record._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">
                        記錄 #{record._id.substring(0, 8)}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={2}>
                      <CalendarIcon sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(record.UploadDateTime).toLocaleString('zh-TW')}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {record.Photos?.FacePhoto && (
                        <Chip label="照片" color="primary" size="small" />
                      )}
                      {record.HRV && (
                        <Chip label="HRV" color="secondary" size="small" />
                      )}
                      {record.GSR && (
                        <Chip label="GSR" color="secondary" size="small" />
                      )}
                      {record.HRV2 && (
                        <Chip label="HRV2" color="secondary" size="small" />
                      )}
                      {record.GSR2 && (
                        <Chip label="GSR2" color="secondary" size="small" />
                      )}
                      {record.Pulse && (
                        <Chip label="Pulse" color="secondary" size="small" />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={Link}
                      to={`/record/${record._id}`}
                      variant="contained"
                    >
                      查看詳情
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default UserDashboard;


