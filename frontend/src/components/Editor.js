import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress, Snackbar, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ file, content, onSave, darkMode }) => {
  const [value, setValue] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [isSaving, setIsSaving] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    setValue(content);
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      setLanguageFromExtension(extension);
    }
  }, [file, content]);
  
  const handleSave = async () => {
    if (!file) return;
    
    setIsSaving(true);
    try {
      await onSave(value);
      setSnackbarMessage('File saved successfully');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error saving file:', error);
      setSnackbarMessage('Error saving file');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(value)
      .then(() => {
        setSnackbarMessage('Code copied to clipboard');
        setSnackbarSeverity('success');
        setShowSnackbar(true);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setSnackbarMessage('Failed to copy code');
        setSnackbarSeverity('error');
        setShowSnackbar(true);
      });
  };
  
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setShowSnackbar(false);
  };

  const setLanguageFromExtension = (extension) => {
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'rs': 'rust',
      'sh': 'shell',
      'sql': 'sql',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
    };

    setLanguage(languageMap[extension] || 'plaintext');
  };

  const handleSave = () => {
    onSave(value);
  };

  const handleEditorChange = (newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5'
      }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {file ? file.name : 'No file selected'}
        </Typography>
        {file && (
          <>
            <Tooltip title="Copy to Clipboard">
              <IconButton 
                size="small" 
                onClick={handleCopyToClipboard}
                sx={{
                  mr: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(63, 81, 181, 0.08)',
                  },
                  transition: 'all 0.2s'
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save File">
              <IconButton 
                size="small" 
                onClick={handleSave}
                disabled={isSaving}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(63, 81, 181, 0.08)',
                  },
                  transition: 'all 0.2s'
                }}
              >
                {isSaving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </>
        )}
        </Box>
      
      {file ? (
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={darkMode ? 'vs-dark' : 'light'}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      ) : (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5'
        }}>
          <Typography variant="body1" color="text.secondary">
            Select a file to edit
          </Typography>
        </Box>
      )}
      
      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CodeEditor;