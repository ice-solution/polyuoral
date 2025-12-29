import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Stack,
} from '@mui/material';
import {
  HealthAndSafety as HealthIcon,
  PhotoCamera as PhotoIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportIcon,
  AdminPanelSettings as AdminIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ApplicationForm from '../components/ApplicationForm';

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = [useRef(null), useRef(null), useRef(null)];

  const videoIds = ['KcB4-sK4vrQ', 'IgJcKznNrGs', 'XKzcwcGRwGY'];

  // 監聽視頻結束事件並切換到下一個
  useEffect(() => {
    const handleMessage = (event) => {
      // 確保消息來自YouTube
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = JSON.parse(event.data);
        // data.info === 0 表示視頻結束
        if (data.event === 'onStateChange' && data.info === 0) {
          // 視頻結束，切換到下一個（循環：0→1→2→0）
          setCurrentVideoIndex((prev) => (prev + 1) % 3);
        }
      } catch (e) {
        // 忽略解析錯誤
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 當視頻索引改變時，切換視頻
  useEffect(() => {
    // 停止所有視頻
    videoRefs.forEach((ref, index) => {
      if (ref.current && index !== currentVideoIndex) {
        try {
          ref.current.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            'https://www.youtube.com'
          );
        } catch (e) {
          // 忽略錯誤
        }
      }
    });

    // 播放當前視頻
    if (videoRefs[currentVideoIndex].current) {
      // 延遲一下確保iframe已加載
      setTimeout(() => {
        try {
          videoRefs[currentVideoIndex].current.contentWindow.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            'https://www.youtube.com'
          );
        } catch (e) {
          // 忽略錯誤
        }
      }, 100);
    }
  }, [currentVideoIndex]);

  const features = [
    {
      icon: <PhotoIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: '照片上傳',
      description: '上傳面部、舌頭和牙齒照片，進行口腔健康分析',
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: '生理數據記錄',
      description: '記錄 HRV、GSR、脈搏等生理數據，全面監測健康狀況',
    },
    {
      icon: <ReportIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: '智能報告生成',
      description: 'AI 分析生成個人化健康報告，提供專業建議',
    },
    {
      icon: <HealthIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: '健康記錄管理',
      description: '查看和管理您的所有健康記錄，追蹤健康趨勢',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.dark}05 100%)`,
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
              mb: 2,
            }}
          >
            PolyU 口腔健康管理系統
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}
          >
            整合照片分析、生理數據監測與 AI 智能報告的綜合健康管理平台
          </Typography>
          
          {/* YouTube Videos Section - Sequential Playback (1→2→3→1) */}
          <Box sx={{ mb: 4, mt: 4, maxWidth: '1200px', mx: 'auto' }}>
            <Box
              sx={{
                position: 'relative',
                paddingBottom: '56.25%', // 16:9 aspect ratio
                height: 0,
                overflow: 'hidden',
                borderRadius: 3,
                boxShadow: 6,
                maxWidth: '1000px',
                mx: 'auto',
              }}
            >
              {videoIds.map((videoId, index) => (
                <iframe
                  key={videoId}
                  ref={videoRefs[index]}
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${index === 0 ? 1 : 0}&mute=1&controls=1&rel=0&modestbranding=1`}
                  title={`YouTube video ${index + 1}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: currentVideoIndex === index ? 'block' : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2,
              }}
            >
              用戶登入
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AdminIcon />}
              onClick={() => navigate('/admin/login')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              管理員登入
            </Button>
          </Stack>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h4"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.dark,
              mb: 4,
            }}
          >
            系統功能
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* System Overview */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.dark,
              mb: 3,
            }}
          >
            系統簡介
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                <strong>用戶功能：</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    上傳口腔照片（面部、舌頭、牙齒）進行健康分析
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    記錄和查看 HRV、GSR、脈搏等生理數據
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    查看個人健康記錄和詳細數據
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    生成 AI 智能健康報告，獲得專業建議
                  </Typography>
                </li>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                <strong>管理員功能：</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    管理用戶帳戶（新增、編輯、刪除）
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    查看所有用戶的健康記錄
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    依用戶篩選和搜尋記錄
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    查看詳細記錄數據和報告
                  </Typography>
                </li>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Application Form Section */}
        <Box sx={{ mt: 8, mb: 6 }}>
          <ApplicationForm />
        </Box>

        {/* Call to Action */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            準備開始使用？
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              立即登入
            </Button>
            <Button
              variant="text"
              size="large"
              startIcon={<AdminIcon />}
              onClick={() => navigate('/admin/login')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              管理員入口
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;

