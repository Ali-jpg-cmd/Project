import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Test the API key
      const response = await axios.post('http://localhost:8001/api/test-key', {
        provider: 'openai',
        model: 'gpt-4o',
        api_key: apiKey
      });
      
      if (response.data && response.data.success) {
        // Store API key in local storage
        localStorage.setItem('openai_api_key', apiKey);
        
        // Redirect to dashboard
        navigate('/');
      } else {
        setError('Invalid API key. Please check and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Error testing API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          AI Engineer
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 4 }}>
          Sign in with your OpenAI API key to continue
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="OpenAI API Key"
            variant="outlined"
            fullWidth
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            margin="normal"
            required
            type="password"
            placeholder="sk-..."
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Don't have an API key? Get one from the{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            OpenAI platform
          </a>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;