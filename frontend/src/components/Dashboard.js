import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, Divider, Snackbar, Alert, Tooltip, Fade, Tab, Tabs } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CodeIcon from '@mui/icons-material/Code';
import TerminalIcon from '@mui/icons-material/Terminal';
import ChatIcon from '@mui/icons-material/Chat';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FileExplorer from './FileExplorer';
import Editor from './Editor';
import AIAssistant from './AIAssistant';
import CodeGenerator from './CodeGenerator';
import ProjectAnalyzer from './ProjectAnalyzer';
import Terminal from './Terminal';
import axios from 'axios';

const Dashboard = ({ darkMode, toggleDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isLoading, setIsLoading] = useState(false);
  const [projectContext, setProjectContext] = useState(null);

  useEffect(() => {
    // Generate a session ID when the component mounts
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    // Fetch files from the backend
    fetchFiles();
    
    // Load project context
    loadProjectContext();
  }, []);

  const loadProjectContext = async () => {
    try {
      const response = await axios.post('http://localhost:8001/api/analyze-project', {
        project_path: '.',
        analysis_type: 'structure'
      });
      setProjectContext(response.data);
    } catch (error) {
      console.error('Error loading project context:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8001/api/file-operation', {
        operation: 'list',
        path: './',
        recursive: true
      });
      
      if (response.data && response.data.success) {
        setFiles(response.data.items || []);
        setShowSnackbar(true);
        setSnackbarMessage('Files refreshed successfully');
        setSnackbarSeverity('success');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setShowSnackbar(true);
      setSnackbarMessage('Error fetching files');
      setSnackbarSeverity('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file) => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8001/api/file-operation', {
        operation: 'read',
        path: file.path
      });
      
      if (response.data && response.data.success) {
        setCurrentFile(file);
        setFileContent(response.data.content || '');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      setShowSnackbar(true);
      setSnackbarMessage(`Error reading file: ${file.name}`);
      setSnackbarSeverity('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSave = async (content) => {
    if (!currentFile) return;
    
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8001/api/file-operation', {
        operation: 'write',
        path: currentFile.path,
        content: content
      });
      
      if (response.data && response.data.success) {
        setFileContent(content);
        setShowSnackbar(true);
        setSnackbarMessage(`File ${currentFile.name} saved successfully`);
        setSnackbarSeverity('success');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setShowSnackbar(true);
      setSnackbarMessage(`Error saving file: ${currentFile.name}`);
      setSnackbarSeverity('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneratedCode = async (filename, content) => {
    try {
      const response = await axios.post('http://localhost:8001/api/file-operation', {
        operation: 'create',
        path: filename,
        content: content
      });
      
      if (response.data && response.data.success) {
        setShowSnackbar(true);
        setSnackbarMessage(`Generated code saved as ${filename}`);
        setSnackbarSeverity('success');
        
        // Refresh files to show the new file
        fetchFiles();
      }
    } catch (error) {
      console.error('Error saving generated code:', error);
      setShowSnackbar(true);
      setSnackbarMessage('Error saving generated code');
      setSnackbarSeverity('error');
    }
  };
  
  // Handle closing snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  return (
    <Box className="dashboard-container">
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            edge="start"
            sx={{
              mr: 2,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.05)'
              }
            }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CodeIcon sx={{ mr: 1 }} /> AI Engineer
          </Typography>
          
          <Tooltip title="Toggle Terminal">
            <IconButton 
              color="inherit" 
              onClick={() => setTerminalOpen(!terminalOpen)}
              sx={{
                mx: 1,
                transition: 'all 0.2s',
                color: terminalOpen ? 'primary.light' : 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <TerminalIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Toggle AI Panel">
            <IconButton 
              color="inherit" 
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              sx={{
                mx: 1,
                transition: 'all 0.2s',
                color: rightPanelOpen ? 'primary.light' : 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              {rightPanelTab === 0 ? <ChatIcon /> : 
               rightPanelTab === 1 ? <AutoFixHighIcon /> : 
               <AnalyticsIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode}
              sx={{
                transition: 'all 0.3s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'rotate(30deg)'
                }
              }}
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      <Box className="main-content">
        <Drawer
          variant="persistent"
          anchor="left"
          open={sidebarOpen}
          className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}
          sx={{
            width: sidebarOpen ? 250 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 250,
              boxSizing: 'border-box',
              position: 'relative',
              height: '100%'
            },
          }}
        >
          <FileExplorer 
            files={files} 
            onFileSelect={handleFileSelect} 
            currentFile={currentFile}
            onRefresh={fetchFiles}
          />
        </Drawer>
        
        <Box className="workspace">
          <Box className="editor-container">
            <Editor 
              file={currentFile} 
              content={fileContent} 
              onSave={handleFileSave}
              darkMode={darkMode}
            />
            
            <Box className={`terminal-container ${!terminalOpen ? 'collapsed' : ''}`}>
              <Terminal 
                darkMode={darkMode} 
                onToggle={() => setTerminalOpen(!terminalOpen)}
              />
            </Box>
          </Box>
          
          <Box className={`chat-panel ${!rightPanelOpen ? 'collapsed' : ''}`}>
            {rightPanelOpen && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Tabs
                  value={rightPanelTab}
                  onChange={(e, newValue) => setRightPanelTab(newValue)}
                  variant="fullWidth"
                  sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}
                >
                  <Tab icon={<ChatIcon />} label="AI Chat" />
                  <Tab icon={<AutoFixHighIcon />} label="Code Gen" />
                  <Tab icon={<AnalyticsIcon />} label="Analysis" />
                </Tabs>
                
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {rightPanelTab === 0 && (
                    <AIAssistant
                      onToggle={() => setRightPanelOpen(!rightPanelOpen)}
                      darkMode={darkMode}
                      currentFile={currentFile}
                      projectContext={projectContext}
                    />
                  )}
                  {rightPanelTab === 1 && (
                    <CodeGenerator
                      darkMode={darkMode}
                      onSaveCode={handleSaveGeneratedCode}
                    />
                  )}
                  {rightPanelTab === 2 && (
                    <ProjectAnalyzer
                      darkMode={darkMode}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      
      <Snackbar 
        open={showSnackbar} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;