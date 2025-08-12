import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, Divider, Snackbar, Alert, Tooltip, Fade } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CodeIcon from '@mui/icons-material/Code';
import TerminalIcon from '@mui/icons-material/Terminal';
import ChatIcon from '@mui/icons-material/Chat';
import FileExplorer from './FileExplorer';
import Editor from './Editor';
import ChatPanel from './ChatPanel';
import Terminal from './Terminal';
import axios from 'axios';

const Dashboard = ({ darkMode, toggleDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Generate a session ID when the component mounts
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    // Fetch files from the backend
    fetchFiles();
  }, []);

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

  const handleSendMessage = async (message) => {
    // Add user message to chat history
    const userMessage = { role: 'user', content: message, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const response = await axios.post('http://localhost:8001/api/chat', {
        message: message,
        session_id: sessionId,
        model: 'gpt-4o' // Default model
      });
      
      if (response.data && response.data.response) {
        // Add AI response to chat history
        const aiMessage = { role: 'assistant', content: response.data.response, timestamp: new Date() };
        setChatHistory(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat history
      const errorMessage = { 
        role: 'system', 
        content: 'Error: Could not get a response from the AI. Please try again.', 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
      
      setShowSnackbar(true);
      setSnackbarMessage('Error sending message to AI');
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
          
          <Tooltip title="Toggle Chat Panel">
            <IconButton 
              color="inherit" 
              onClick={() => setChatOpen(!chatOpen)}
              sx={{
                mx: 1,
                transition: 'all 0.2s',
                color: chatOpen ? 'primary.light' : 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <ChatIcon />
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
          
          <Box className={`chat-panel ${!chatOpen ? 'collapsed' : ''}`}>
            <ChatPanel 
              chatHistory={chatHistory} 
              onSendMessage={handleSendMessage}
              onToggle={() => setChatOpen(!chatOpen)}
              darkMode={darkMode}
            />
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