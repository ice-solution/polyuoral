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
  TextField,
  CircularProgress,
  Chip,
  Link as MuiLink,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { patientRecordAPI, patientAPI } from '../../services/api';

const RecordsManagement = () => {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoginId, setFilterLoginId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, patientsRes] = await Promise.all([
        patientRecordAPI.getAll(),
        patientAPI.getAll(),
      ]);
      setRecords(recordsRes.data);
      setPatients(patientsRes.data);
    } catch (err) {
      console.error('載入數據失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = (loginid) => {
    if (!loginid) return '未知用戶';
    const patient = patients.find((p) => p.loginid === loginid);
    return patient ? `${patient.Name_CN || ''} (${patient.Name_EN || ''})` : loginid;
  };

  // 檢查數據是否真的存在（不是空對象或空數組）
  const hasData = (data) => {
    if (!data) return false;
    if (typeof data === 'object' && !Array.isArray(data)) {
      // 檢查對象是否有任何非空值
      return Object.keys(data).length > 0 && Object.values(data).some(v => v !== null && v !== undefined && v !== '');
    }
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    return true;
  };

  // 檢查照片是否存在
  const hasPhotos = (photos) => {
    if (!photos) return false;
    return Object.values(photos).some(url => url && url.trim() !== '');
  };

  // 獲取所有唯一的 loginid（用於下拉選單），過濾掉 undefined 和 null
  const uniqueLoginIds = [...new Set(records.map(r => r.loginid).filter(id => id))].sort();

  // 過濾記錄
  let filteredRecords = records;
  
  if (filterLoginId) {
    filteredRecords = filteredRecords.filter((r) => {
      const loginid = r.loginid;
      if (!loginid) return false; // 如果 loginid 不存在，不顯示
      return loginid.toLowerCase().includes(filterLoginId.toLowerCase());
    });
  }
  
  if (selectedPatient) {
    filteredRecords = filteredRecords.filter((r) => r.loginid === selectedPatient);
  }

  // 分頁
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // 按用戶分組的記錄（用於分組視圖）
  const groupedByPatient = filteredRecords.reduce((acc, record) => {
    const loginid = record.loginid;
    if (!acc[loginid]) {
      acc[loginid] = [];
    }
    acc[loginid].push(record);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        記錄管理
      </Typography>

      <Box mb={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField
          label="搜尋登入帳號"
          value={filterLoginId}
          onChange={(e) => {
            setFilterLoginId(e.target.value);
            setPage(1); // 重置到第一頁
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>依用戶篩選</InputLabel>
          <Select
            value={selectedPatient}
            label="依用戶篩選"
            onChange={(e) => {
              setSelectedPatient(e.target.value);
              setPage(1); // 重置到第一頁
            }}
          >
            <MenuItem value="">全部用戶</MenuItem>
            {uniqueLoginIds.map((loginid) => (
              <MenuItem key={loginid} value={loginid}>
                {getPatientName(loginid)} ({loginid})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          共 {filteredRecords.length} 筆記錄
        </Typography>
      </Box>

      {/* 分組視圖（當選擇了特定用戶時） */}
      {selectedPatient ? (
        <Box mb={2}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                {getPatientName(selectedPatient)} 的記錄 ({groupedByPatient[selectedPatient]?.length || 0} 筆)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>記錄 ID</TableCell>
                      <TableCell>上傳時間</TableCell>
                      <TableCell>照片</TableCell>
                      <TableCell>HRV</TableCell>
                      <TableCell>GSR</TableCell>
                      <TableCell>HRV2</TableCell>
                      <TableCell>GSR2</TableCell>
                      <TableCell>Pulse</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedByPatient[selectedPatient]?.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <MuiLink component={Link} to={`/admin/record/${record._id}`} underline="hover">
                            {record._id.substring(0, 8)}...
                          </MuiLink>
                        </TableCell>
                        <TableCell>
                          {new Date(record.UploadDateTime).toLocaleString('zh-TW')}
                        </TableCell>
                        <TableCell>
                          {hasPhotos(record.Photos) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasData(record.HRV) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasData(record.GSR) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasData(record.HRV2) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasData(record.GSR2) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasData(record.Pulse) ? (
                            <Chip label="有" color="success" size="small" />
                          ) : (
                            <Chip label="無" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : null}

      {/* 完整列表視圖 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>記錄 ID</TableCell>
              <TableCell>用戶</TableCell>
              <TableCell>登入帳號</TableCell>
              <TableCell>上傳時間</TableCell>
              <TableCell>照片</TableCell>
              <TableCell>HRV</TableCell>
              <TableCell>GSR</TableCell>
              <TableCell>HRV2</TableCell>
              <TableCell>GSR2</TableCell>
              <TableCell>Pulse</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.map((record) => (
              <TableRow key={record._id}>
                <TableCell>
                  <MuiLink component={Link} to={`/admin/record/${record._id}`} underline="hover">
                    {record._id.substring(0, 8)}...
                  </MuiLink>
                </TableCell>
                <TableCell>{getPatientName(record.loginid)}</TableCell>
                <TableCell>{record.loginid || '無'}</TableCell>
                <TableCell>
                  {new Date(record.UploadDateTime).toLocaleString('zh-TW')}
                </TableCell>
                <TableCell>
                  {hasPhotos(record.Photos) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {hasData(record.HRV) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {hasData(record.GSR) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {hasData(record.HRV2) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {hasData(record.GSR2) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {hasData(record.Pulse) ? (
                    <Chip label="有" color="success" size="small" />
                  ) : (
                    <Chip label="無" size="small" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default RecordsManagement;


