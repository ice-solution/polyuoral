import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  ImageList,
  ImageListItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { patientRecordAPI, reportAPI } from '../../services/api';

// 從環境變數讀取 API URL，移除 /api 後綴用於圖片路徑
const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:3000';

const RecordDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await patientRecordAPI.getById(id);
      setRecord(response.data);
      
      // 檢查報告是否可以生成
      if (response.data && response.data.patientId) {
        checkReportStatus(response.data.patientId._id, id);
      }
    } catch (err) {
      console.error('載入記錄失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkReportStatus = async (patientId, recordId) => {
    try {
      const response = await reportAPI.checkStatus(patientId, recordId);
      if (response.data.exists && response.data.hasFacePhoto) {
        // 可以生成報告，設置報告 URL
        const reportUrl = reportAPI.getReportUrl(patientId, recordId, 'zh_tw');
        setReportUrl(reportUrl);
      }
    } catch (err) {
      console.error('檢查報告狀態失敗:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!record || !record.patientId) return;
    
    try {
      setReportGenerating(true);
      const patientId = record.patientId._id || record.patientId;
      const recordId = record._id;
      
      // 使用 API 下載報告（會自動包含 token）
      const response = await reportAPI.download(patientId, recordId, 'zh_tw');
      
      // 創建 blob URL 並在新窗口打開
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // 如果彈出窗口被阻止，則下載文件
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${recordId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // 清理 blob URL
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      const reportUrl = reportAPI.getReportUrl(patientId, recordId, 'zh_tw');
      setReportUrl(reportUrl);
    } catch (err) {
      console.error('生成報告失敗:', err);
      const errorMessage = err.response?.data?.message || err.message || '生成報告失敗，請稍後再試';
      alert(errorMessage);
    } finally {
      setReportGenerating(false);
    }
  };

  const renderPhotos = () => {
    if (!record.Photos) return null;

    const photos = Object.entries(record.Photos).filter(([_, url]) => url);
    if (photos.length === 0) {
      return <Typography>沒有照片</Typography>;
    }

    return (
      <ImageList cols={2} gap={16}>
        {photos.map(([name, url]) => (
          <ImageListItem key={name}>
            <img
              src={`${API_BASE_URL}${url}`}
              alt={name}
              loading="lazy"
              style={{ width: '100%', height: 'auto', borderRadius: 8 }}
            />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              {name}
            </Typography>
          </ImageListItem>
        ))}
      </ImageList>
    );
  };

  const renderHRV = () => {
    if (!record.HRV) {
      return <Typography>沒有 HRV 數據</Typography>;
    }

    // HRV 的所有可能欄位
    const hrvFields = ['RMSSD', 'SDNN', 'pNN50', 'SD1', 'SD2', 'HeartBeat', 'Times', 'IBIms'];

    return (
      <TableContainer>
        <Table>
          <TableBody>
            {hrvFields.map((key) => {
              const value = record.HRV[key];
              
              // 處理數組欄位
              if (['HeartBeat', 'Times', 'IBIms'].includes(key)) {
                if (Array.isArray(value)) {
                  return (
                    <TableRow key={key}>
                      <TableCell><strong>{key}</strong></TableCell>
                      <TableCell>{value.length} 個數據點</TableCell>
                    </TableRow>
                  );
                } else {
                  return (
                    <TableRow key={key}>
                      <TableCell><strong>{key}</strong></TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  );
                }
              }
              
              // 顯示數字值，如果是 null/undefined 顯示 "-"
              return (
                <TableRow key={key}>
                  <TableCell><strong>{key}</strong></TableCell>
                  <TableCell>{value !== null && value !== undefined ? value : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderGSR = () => {
    if (!record.GSR) {
      return <Typography>沒有 GSR 數據</Typography>;
    }

    // GSR 的所有可能欄位
    const gsrFields = ['RawIndex', 'RawValue', 'RawTime', 'SCL'];

    return (
      <TableContainer>
        <Table>
          <TableBody>
            {gsrFields.map((key) => {
              const value = record.GSR[key];
              
              if (Array.isArray(value)) {
                return (
                  <TableRow key={key}>
                    <TableCell><strong>{key}</strong></TableCell>
                    <TableCell>{value.length} 個數據點</TableCell>
                  </TableRow>
                );
              }
              
              // 顯示數字值，如果是 null/undefined 顯示 "-"
              return (
                <TableRow key={key}>
                  <TableCell><strong>{key}</strong></TableCell>
                  <TableCell>{value !== null && value !== undefined ? value : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderHRV2 = () => {
    if (!record.HRV2) {
      return <Typography>沒有 HRV2 數據</Typography>;
    }

    // HRV2 的所有可能欄位
    const hrvFields = ['RMSSD', 'SDNN', 'pNN50', 'SD1', 'SD2', 'HeartBeat', 'Times', 'IBIms'];

    return (
      <TableContainer>
        <Table>
          <TableBody>
            {hrvFields.map((key) => {
              const value = record.HRV2[key];
              
              // 處理數組欄位
              if (['HeartBeat', 'Times', 'IBIms'].includes(key)) {
                if (Array.isArray(value)) {
                  return (
                    <TableRow key={key}>
                      <TableCell><strong>{key}</strong></TableCell>
                      <TableCell>{value.length} 個數據點</TableCell>
                    </TableRow>
                  );
                } else {
                  return (
                    <TableRow key={key}>
                      <TableCell><strong>{key}</strong></TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  );
                }
              }
              
              // 顯示數字值，如果是 null/undefined 顯示 "-"
              return (
                <TableRow key={key}>
                  <TableCell><strong>{key}</strong></TableCell>
                  <TableCell>{value !== null && value !== undefined ? value : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderGSR2 = () => {
    if (!record.GSR2) {
      return <Typography>沒有 GSR2 數據</Typography>;
    }

    // GSR2 的所有可能欄位
    const gsrFields = ['RawIndex', 'RawValue', 'RawTime', 'SCL'];

    return (
      <TableContainer>
        <Table>
          <TableBody>
            {gsrFields.map((key) => {
              const value = record.GSR2[key];
              
              if (Array.isArray(value)) {
                return (
                  <TableRow key={key}>
                    <TableCell><strong>{key}</strong></TableCell>
                    <TableCell>{value.length} 個數據點</TableCell>
                  </TableRow>
                );
              }
              
              // 顯示數字值，如果是 null/undefined 顯示 "-"
              return (
                <TableRow key={key}>
                  <TableCell><strong>{key}</strong></TableCell>
                  <TableCell>{value !== null && value !== undefined ? value : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderPulse = () => {
    if (!record.Pulse) {
      return <Typography>沒有 Pulse 數據</Typography>;
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>項目</strong></TableCell>
              <TableCell><strong>左側</strong></TableCell>
              <TableCell><strong>右側</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <TableRow key={num}>
                <TableCell><strong>Data_{num}</strong></TableCell>
                <TableCell>{record.Pulse[`Data_${num}_L`] || '-'}</TableCell>
                <TableCell>{record.Pulse[`Data_${num}_R`] || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderDataOverview = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>HRV 數據</Typography>
              {record.HRV ? (
                <Typography variant="body2" color="success.main">✓ 有數據</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無數據</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>GSR 數據</Typography>
              {record.GSR ? (
                <Typography variant="body2" color="success.main">✓ 有數據</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無數據</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>HRV2 數據</Typography>
              {record.HRV2 ? (
                <Typography variant="body2" color="success.main">✓ 有數據</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無數據</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>GSR2 數據</Typography>
              {record.GSR2 ? (
                <Typography variant="body2" color="success.main">✓ 有數據</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無數據</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pulse 數據</Typography>
              {record.Pulse ? (
                <Typography variant="body2" color="success.main">✓ 有數據</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無數據</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>照片</Typography>
              {record.Photos && Object.values(record.Photos).some(url => url) ? (
                <Typography variant="body2" color="success.main">
                  ✓ {Object.values(record.Photos).filter(url => url).length} 張照片
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">無照片</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!record) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>記錄不存在</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 3 }}
      >
        返回
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">
            記錄詳情
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PdfIcon />}
            onClick={handleGenerateReport}
            disabled={reportGenerating || !record?.Photos?.FacePhoto}
            sx={{ ml: 2 }}
          >
            {reportGenerating ? '生成中...' : reportUrl ? '查看報告' : '生成報告'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          記錄 ID: {record._id}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          上傳時間: {new Date(record.UploadDateTime).toLocaleString('zh-TW')}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3, mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="數據總覽" />
            <Tab label="照片" />
            <Tab label="HRV 數據" />
            <Tab label="GSR 數據" />
            <Tab label="HRV2 數據" />
            <Tab label="GSR2 數據" />
            <Tab label="Pulse 數據" />
          </Tabs>
        </Box>

        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderDataOverview()}
          {tabValue === 1 && renderPhotos()}
          {tabValue === 2 && renderHRV()}
          {tabValue === 3 && renderGSR()}
          {tabValue === 4 && renderHRV2()}
          {tabValue === 5 && renderGSR2()}
          {tabValue === 6 && renderPulse()}
        </Box>
      </Paper>
    </Container>
  );
};

export default RecordDetail;


