import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import PatientManagement from './PatientManagement';
import RecordsManagement from './RecordsManagement';
import AdminRecordDetail from './AdminRecordDetail';
import { authAPI } from '../../services/api';

const drawerWidth = 240;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/admin/login');
    }
  };

  const menuItems = [
    { text: '儀表板', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: '用戶管理', icon: <PeopleIcon />, path: '/admin/patients' },
    { text: '記錄管理', icon: <AssignmentIcon />, path: '/admin/records' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            PolyU Oral Health - 管理後台
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

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
          <Routes>
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="patients" element={<PatientManagement />} />
            <Route path="records" element={<RecordsManagement />} />
            <Route path="record/:id" element={<AdminRecordDetail />} />
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};

const DashboardOverview = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        儀表板
      </Typography>
      <Typography variant="body1" color="text.secondary">
        歡迎使用 PolyU Oral Health 管理系統
      </Typography>
    </Box>
  );
};

export default AdminDashboard;


