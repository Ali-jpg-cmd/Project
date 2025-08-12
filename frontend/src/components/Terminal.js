import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress, Fade, Snackbar, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const Terminal = ({ darkMode, onToggle }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    // Initialize terminal
    if (terminalRef.current && !xtermRef.current) {
      // Create terminal instance
      xtermRef.current = new XTerm({
        cursorBlink: true,
        theme: darkMode ? {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#f0f0f0',
          selection: 'rgba(255, 255, 255, 0.3)',
        } : {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#333333',
          selection: 'rgba(0, 0, 0, 0.3)',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.2,
      });

      // Create fit addon
      fitAddonRef.current = new FitAddon();
      xtermRef.current.loadAddon(fitAddonRef.current);

      // Open terminal
      xtermRef.current.open(terminalRef.current);
      fitAddonRef.current.fit();

      // Connect to WebSocket for terminal communication
      try {
        setIsConnecting(true);
        socketRef.current = new WebSocket('ws://localhost:8001/api/terminal');

        socketRef.current.onopen = () => {
          setIsConnecting(false);
          xtermRef.current.writeln('Connected to terminal server');
          xtermRef.current.writeln('Type commands to interact with the system');
          xtermRef.current.writeln('');
        };

        socketRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.output) {
            xtermRef.current.write(data.output);
            // Store terminal output for copy functionality
            setTerminalOutput(prev => prev + data.output);
          }
        };

        socketRef.current.onclose = () => {
          xtermRef.current.writeln('\r\nDisconnected from terminal server');
        };

        socketRef.current.onerror = (error) => {
          xtermRef.current.writeln('\r\nError connecting to terminal server');
          console.error('WebSocket error:', error);
        };

        // Handle user input
        xtermRef.current.onData(data => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ input: data }));
          }
        });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnecting(false);
        xtermRef.current.writeln('Terminal server not available - demo mode');
        xtermRef.current.writeln('$ ');
        
        // Store demo output for copy functionality
        setTerminalOutput('Terminal server not available - demo mode\n$ ');
        
        // Demo mode - echo input
        xtermRef.current.onData(data => {
          if (data === '\r') {
            xtermRef.current.writeln('');
            xtermRef.current.write('$ ');
            setTerminalOutput(prev => prev + '\n$ ');
          } else {
            xtermRef.current.write(data);
            setTerminalOutput(prev => prev + data);
          }
        });
      }

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (socketRef.current) {
          socketRef.current.close();
        }
        if (xtermRef.current) {
          xtermRef.current.dispose();
        }
      };
    }
  }, [darkMode]);

  // Update terminal theme when dark mode changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.setOption('theme', darkMode ? {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
        selection: 'rgba(255, 255, 255, 0.3)',
      } : {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selection: 'rgba(0, 0, 0, 0.3)',
      });
    }
  }, [darkMode]);

  // Handle copying terminal output to clipboard
  const handleCopyTerminal = () => {
    if (terminalOutput) {
      navigator.clipboard.writeText(terminalOutput)
        .then(() => {
          setIsCopied(true);
          setShowSnackbar(true);
          setSnackbarMessage('Terminal output copied to clipboard');
          setSnackbarSeverity('success');
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy terminal output:', err);
          setShowSnackbar(true);
          setSnackbarMessage('Failed to copy terminal output');
          setSnackbarSeverity('error');
        });
    }
  };

  // Handle clearing terminal
  const handleClearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      setTerminalOutput('');
      setShowSnackbar(true);
      setSnackbarMessage('Terminal cleared');
      setSnackbarSeverity('info');
    }
  };
  
  // Handle reconnecting to terminal server
  const handleReconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    if (xtermRef.current) {
      xtermRef.current.clear();
      setTerminalOutput('');
      setIsConnecting(true);
      
      try {
        socketRef.current = new WebSocket('ws://localhost:8001/api/terminal');
        
        socketRef.current.onopen = () => {
          setIsConnecting(false);
          xtermRef.current.writeln('Reconnected to terminal server');
          xtermRef.current.writeln('Type commands to interact with the system');
          xtermRef.current.writeln('');
          
          setShowSnackbar(true);
          setSnackbarMessage('Successfully reconnected to terminal server');
          setSnackbarSeverity('success');
        };
        
        socketRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.output) {
            xtermRef.current.write(data.output);
            setTerminalOutput(prev => prev + data.output);
          }
        };
        
        socketRef.current.onclose = () => {
          xtermRef.current.writeln('\r\nDisconnected from terminal server');
          setIsConnecting(false);
        };
        
        socketRef.current.onerror = (error) => {
          xtermRef.current.writeln('\r\nError connecting to terminal server');
          console.error('WebSocket error:', error);
          setIsConnecting(false);
          
          setShowSnackbar(true);
          setSnackbarMessage('Failed to connect to terminal server');
          setSnackbarSeverity('error');
        };
      } catch (error) {
        console.error('Failed to reconnect to WebSocket:', error);
        setIsConnecting(false);
        xtermRef.current.writeln('Terminal server not available - demo mode');
        xtermRef.current.writeln('$ ');
        
        setTerminalOutput('Terminal server not available - demo mode\n$ ');
      }
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
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderTop: '1px solid rgba(0, 0, 0, 0.12)',
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 0.5, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5'
      }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1, ml: 1 }}>
          Terminal
        </Typography>
        {isConnecting && (
          <Fade in={isConnecting}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
          </Fade>
        )}
        <Tooltip title="Reconnect Terminal">
          <IconButton 
            size="small" 
            onClick={handleReconnect}
            sx={{
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'rotate(180deg)',
                color: 'primary.main'
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isCopied ? 'Copied!' : 'Copy Terminal Output'}>
          <IconButton 
            size="small" 
            onClick={handleCopyTerminal}
            sx={{
              color: isCopied ? 'success.main' : 'inherit',
              transition: 'all 0.2s',
              '&:hover': {
                color: 'primary.main'
              }
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear Terminal">
          <IconButton 
            size="small" 
            onClick={handleClearTerminal}
            sx={{
              transition: 'all 0.2s',
              '&:hover': {
                color: 'error.main'
              }
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close Terminal">
          <IconButton 
            size="small" 
            onClick={onToggle}
            sx={{
              transition: 'all 0.2s',
              '&:hover': {
                color: 'error.main'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box 
        ref={terminalRef} 
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          '& .xterm': {
            height: '100%',
            width: '100%',
            padding: '4px'
          },
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.1)',
            zIndex: 1
          }
        }} 
      />
      
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

export default Terminal;