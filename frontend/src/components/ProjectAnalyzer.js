import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FolderIcon from '@mui/icons-material/Folder';
import CodeIcon from '@mui/icons-material/Code';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import RecommendIcon from '@mui/icons-material/Recommend';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const ProjectAnalyzer = ({ darkMode }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const analyzeProject = async (analysisType = 'full') => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8001/api/analyze-project', {
        project_path: '.',
        analysis_type: analysisType
      });

      setAnalysis(response.data);
    } catch (error) {
      console.error('Project analysis error:', error);
      setError('Failed to analyze project. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeProject();
  }, []);

  const getFileTypeColor = (extension) => {
    const colors = {
      '.js': '#f7df1e',
      '.jsx': '#61dafb',
      '.ts': '#3178c6',
      '.tsx': '#3178c6',
      '.py': '#3776ab',
      '.css': '#1572b6',
      '.html': '#e34f26',
      '.json': '#000000',
      '.md': '#083fa1'
    };
    return colors[extension] || '#6b7280';
  };

  const getTechnologyIcon = (tech) => {
    if (tech.includes('React')) return '⚛️';
    if (tech.includes('Python')) return '🐍';
    if (tech.includes('JavaScript')) return '🟨';
    if (tech.includes('TypeScript')) return '🔷';
    if (tech.includes('CSS')) return '🎨';
    if (tech.includes('Node')) return '🟢';
    return '📦';
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <AnalyticsIcon sx={{ mr: 1 }} />
          Project Analysis
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => analyzeProject()}
          disabled={isAnalyzing}
        >
          Refresh Analysis
        </Button>
      </Box>

      {isAnalyzing && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Analyzing project structure and dependencies...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {analysis && (
        <Grid container spacing={3}>
          {/* Project Overview */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <FolderIcon sx={{ mr: 1 }} />
                  Project Overview
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Files: {analysis.structure.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Analyzed: {new Date(analysis.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                  Technologies Detected:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysis.technologies.map((tech, index) => (
                    <Chip
                      key={index}
                      label={`${getTechnologyIcon(tech)} ${tech}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* File Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CodeIcon sx={{ mr: 1 }} />
                  File Distribution
                </Typography>
                <List dense>
                  {Object.entries(analysis.structure.by_extension)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([ext, count]) => (
                    <ListItem key={ext}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: getFileTypeColor(ext)
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={ext || 'No extension'}
                        secondary={`${count} files`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Recommendations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <RecommendIcon sx={{ mr: 1 }} />
                  Recommendations
                </Typography>
                {analysis.recommendations.length > 0 ? (
                  <List>
                    {analysis.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <RecommendIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No specific recommendations at this time. Your project structure looks good!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Analysis Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    startIcon={<SecurityIcon />}
                    onClick={() => analyzeProject('security')}
                    disabled={isAnalyzing}
                  >
                    Security Analysis
                  </Button>
                  <Button
                    startIcon={<SpeedIcon />}
                    onClick={() => analyzeProject('performance')}
                    disabled={isAnalyzing}
                  >
                    Performance Analysis
                  </Button>
                  <Button
                    startIcon={<FolderIcon />}
                    onClick={() => analyzeProject('structure')}
                    disabled={isAnalyzing}
                  >
                    Structure Analysis
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ProjectAnalyzer;