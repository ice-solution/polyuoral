import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Link as MuiLink,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [originalLoginid, setOriginalLoginid] = useState(null); // 保存原始的 loginid
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    loginid: '',
    Password: '',
    Name_CN: '',
    Name_EN: '',
    Age: '',
    Month: '',
    Email: '',
    PhoneNumber: '',
    status: 'active',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getAll();
      setPatients(response.data);
    } catch (err) {
      setError('載入用戶列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError('');
      
      // 驗證必填欄位
      if (!formData.loginid || !formData.Password || !formData.Name_CN || !formData.Name_EN || !formData.Age || !formData.Month || !formData.Email || !formData.PhoneNumber) {
        setError('請填寫所有必填欄位');
        return;
      }

      await patientAPI.register(formData);
      setOpen(false);
      setFormData({
        loginid: '',
        Password: '',
        Name_CN: '',
        Name_EN: '',
        Age: '',
        Month: '',
        Email: '',
        PhoneNumber: '',
      });
      fetchPatients();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || '創建用戶失敗';
      setError(errorMessage);
      console.error('創建用戶錯誤:', err);
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    // 保存原始的標識符：如果有 loginid 則使用 loginid，否則使用 _id
    const identifier = (patient.loginid && patient.loginid.trim() !== '') 
      ? patient.loginid 
      : patient._id;
    setOriginalLoginid(identifier);
    console.log('編輯用戶:', { patient, identifier, loginid: patient.loginid, _id: patient._id });
    setFormData({
      loginid: patient.loginid || '',
      Password: '', // 編輯時不顯示密碼，留空表示不修改
      Name_CN: patient.Name_CN || '',
      status: patient.status || 'active',
      Name_EN: patient.Name_EN || '',
      Age: patient.Age !== undefined && patient.Age !== null ? String(patient.Age) : '',
      Month: patient.Month !== undefined && patient.Month !== null ? String(patient.Month) : '',
      Email: patient.Email || '',
      PhoneNumber: patient.PhoneNumber || '',
    });
    setOpen(true);
  };

  const handleUpdate = async () => {
    try {
      setError('');
      
      // 驗證必填欄位（編輯時密碼可選）
      if (!formData.loginid || !formData.Name_CN || !formData.Name_EN || !formData.Age || !formData.Month || !formData.Email || !formData.PhoneNumber) {
        setError('請填寫所有必填欄位');
        return;
      }

      // 準備更新數據，如果密碼為空則不更新密碼
      const updateData = { ...formData };
      if (!updateData.Password) {
        delete updateData.Password;
      }

      // 使用原始的 loginid（編輯前的 loginid）來查找用戶
      if (!originalLoginid) {
        setError('無法找到要更新的用戶信息');
        console.error('originalLoginid 為空');
        return;
      }
      
      console.log('更新用戶:', { originalLoginid, updateData });
      await patientAPI.update(originalLoginid, updateData);
      setOpen(false);
      setEditingPatient(null);
      setOriginalLoginid(null);
      setFormData({
        loginid: '',
        Password: '',
        Name_CN: '',
        Name_EN: '',
        Age: '',
        Month: '',
        Email: '',
        PhoneNumber: '',
      });
      fetchPatients();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || '更新用戶失敗';
      setError(errorMessage);
      console.error('更新用戶錯誤:', err);
    }
  };

  const handleDelete = async (loginid) => {
    if (window.confirm('確定要刪除此用戶嗎？')) {
      try {
        await patientAPI.delete(loginid);
        fetchPatients();
      } catch (err) {
        setError('刪除用戶失敗');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">用戶管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          添加用戶
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>登入帳號</TableCell>
              <TableCell>中文姓名</TableCell>
              <TableCell>英文姓名</TableCell>
              <TableCell>年齡</TableCell>
              <TableCell>月份</TableCell>
              <TableCell>電子郵件</TableCell>
              <TableCell>電話</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient._id}>
                <TableCell>
                  {patient.loginid ? (
                    <MuiLink
                      component={Link}
                      to={`/admin/records?loginid=${encodeURIComponent(patient.loginid)}`}
                      underline="hover"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.dark',
                        },
                      }}
                    >
                      {patient.loginid}
                    </MuiLink>
                  ) : (
                    patient.loginid || '無'
                  )}
                </TableCell>
                <TableCell>{patient.Name_CN}</TableCell>
                <TableCell>{patient.Name_EN}</TableCell>
                <TableCell>{patient.Age}</TableCell>
                <TableCell>{patient.Month}</TableCell>
                <TableCell>{patient.Email}</TableCell>
                <TableCell>{patient.PhoneNumber}</TableCell>
                <TableCell>
                  <Chip
                    label={patient.status === 'active' ? '啟用' : '停用'}
                    color={patient.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(patient)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(patient.loginid)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false);
          setEditingPatient(null);
          setOriginalLoginid(null);
          setFormData({
            loginid: '',
            Password: '',
            Name_CN: '',
            Name_EN: '',
            Age: '',
            Month: '',
            Email: '',
            PhoneNumber: '',
            status: 'active',
          });
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>{editingPatient ? '編輯用戶' : '添加用戶'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="登入帳號"
              value={formData.loginid || ''}
              onChange={(e) => setFormData({ ...formData, loginid: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="密碼"
              type="password"
              value={formData.Password || ''}
              onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
              required={!editingPatient} // 編輯時密碼為可選
              fullWidth
              helperText={editingPatient ? '留空則不修改密碼' : ''}
            />
            <TextField
              label="中文姓名"
              value={formData.Name_CN || ''}
              onChange={(e) => setFormData({ ...formData, Name_CN: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="英文姓名"
              value={formData.Name_EN || ''}
              onChange={(e) => setFormData({ ...formData, Name_EN: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="年齡"
              type="number"
              value={formData.Age || ''}
              onChange={(e) => setFormData({ ...formData, Age: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="月份"
              type="number"
              value={formData.Month || ''}
              onChange={(e) => setFormData({ ...formData, Month: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="電子郵件"
              type="email"
              value={formData.Email || ''}
              onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="電話"
              value={formData.PhoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>狀態</InputLabel>
              <Select
                value={formData.status || 'active'}
                label="狀態"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">啟用</MenuItem>
                <MenuItem value="inactive">停用</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpen(false);
            setEditingPatient(null);
            setOriginalLoginid(null);
            setFormData({
              loginid: '',
              Password: '',
              Name_CN: '',
              Name_EN: '',
              status: 'active',
              Age: '',
              Month: '',
              Email: '',
              PhoneNumber: '',
            });
          }}>取消</Button>
          <Button 
            onClick={editingPatient ? handleUpdate : handleCreate} 
            variant="contained"
          >
            {editingPatient ? '更新' : '創建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientManagement;


