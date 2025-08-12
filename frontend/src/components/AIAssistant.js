import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Divider,
  Tooltip,
  CircularProgress,
  Fade,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const AIAssistant = ({ onToggle, darkMode, currentFile, projectContext }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [availableModels, setAvailableModels] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const messagesEndRef = useRef(null);

  // Quick action prompts
  const quickActions = [
    {
      icon: <CodeIcon />,
      label: "Generate Code",
      prompt: "Help me write code for: "
    },
    {
      icon: <BugReportIcon />,
      label: "Debug Issue",
      prompt: "Help me debug this issue: "
    },
    {
      icon: <AutoFixHighIcon />,
      label: "Optimize Code",
      prompt: "How can I optimize this code: "
    }
  ];

  useEffect(() => {
    // Generate session ID
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    // Fetch available models
    fetchAvailableModels();
    
    // Load conversation history
    loadConversationHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get('http://localhost:8001/api/models');
      setAvailableModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const loadConversationHistory = async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`http://localhost:8001/api/conversations/${sessionId}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Prepare context
      const context = {
        currentFile: currentFile ? {
          name: currentFile.name,
          path: currentFile.path,
          type: currentFile.type
        } : null,
        projectContext: projectContext,
        conversationLength: messages.length
      };

      const response = await axios.post('http://localhost:8001/api/chat', {
        message: messageText,
        model: selectedModel,
        provider: selectedProvider,
        session_id: sessionId,
        context: context,
        temperature: temperature,
        max_tokens: maxTokens
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        model: selectedModel,
        provider: selectedProvider
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt) => {
    setInputMessage(prompt);
  };

  const handleCopyMessage = (content, id) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
      })
      .catch(err => console.error('Failed to copy message: ', err));
  };

  const handleClearConversation = () => {
    setMessages([]);
    setSettingsAnchor(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProviderColor = (provider) => {
    const colors = {
      openai: '#10a37f',
      anthropic: '#d97706',
      gemini: '#4285f4',
      emergent: '#8b5cf6'
    };
    return colors[provider] || '#6b7280';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5'
      }}>
        <Avatar sx={{ bgcolor: getProviderColor(selectedProvider), mr: 2, width: 32, height: 32 }}>
          <SmartToyIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            AI Assistant
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedProvider} • {selectedModel}
          </Typography>
        </Box>
        <Tooltip title="Settings">
          <IconButton 
            size="small" 
            onClick={(e) => setSettingsAnchor(e.currentTarget)}
            sx={{ mr: 1 }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close Assistant">
          <IconButton size="small" onClick={onToggle}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        PaperProps={{ sx: { minWidth: 300 } }}
      >
        <Box sx={{ p: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              label="Provider"
            >
              {Object.keys(availableModels).map(provider => (
                <MenuItem key={provider} value={provider}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: getProviderColor(provider),
                        mr: 1 
                      }} 
                    />
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              label="Model"
            >
              {(availableModels[selectedProvider] || []).map(model => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Temperature"
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            inputProps={{ min: 0, max: 2, step: 0.1 }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            size="small"
            label="Max Tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            inputProps={{ min: 100, max: 4000, step: 100 }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <IconButton onClick={handleClearConversation} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </Menu>

      {/* Quick Actions */}
      <Box sx={{ p: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickActions.map((action, index) => (
            <Chip
              key={index}
              icon={action.icon}
              label={action.label}
              size="small"
              onClick={() => handleQuickAction(action.prompt)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white'
                }
              }}
            />
          ))}
        </Box>
      </Box>
      
      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column',
            textAlign: 'center'
          }}>
            <SmartToyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              AI Assistant Ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask me anything about your code, get help with debugging, or generate new features.
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((msg, index) => (
              <Paper 
                key={index} 
                elevation={1} 
                sx={{
                  p: 2,
                  maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' 
                    ? (darkMode ? '#3f51b5' : '#e3f2fd') 
                    : msg.error
                    ? (darkMode ? '#d32f2f' : '#ffebee')
                    : (darkMode ? '#333333' : '#f5f5f5'),
                  color: msg.role === 'user' && darkMode ? '#ffffff' : 'inherit',
                  position: 'relative',
                  '&:hover .message-actions': {
                    opacity: 1,
                  }
                }}
              >
                <Box 
                  className="message-actions" 
                  sx={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    gap: '4px'
                  }}
                >
                  <Tooltip title={copiedMessageId === index ? "Copied!" : "Copy message"}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopyMessage(msg.content, index)}
                      sx={{ 
                        padding: '2px',
                        color: copiedMessageId === index ? '#4caf50' : 'inherit'
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'AI'}
                  </Typography>
                  {msg.provider && (
                    <Chip 
                      label={msg.provider} 
                      size="small" 
                      sx={{ 
                        ml: 1, 
                        height: 16, 
                        fontSize: '0.7rem',
                        bgcolor: getProviderColor(msg.provider),
                        color: 'white'
                      }} 
                    />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatTimestamp(msg.timestamp)}
                  </Typography>
                </Box>
                
                {msg.role === 'user' || msg.role === 'system' ? (
                  <Typography variant="body1">{msg.content}</Typography>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={darkMode ? tomorrow : prism}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </Paper>
            ))}
            {isTyping && (
              <Fade in={isTyping}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                  <CircularProgress size={20} sx={{ mr: 2 }} />
                  <Typography variant="body2">AI is thinking...</Typography>
                </Box>
              </Fade>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
      
      <Divider />
      
      {/* Input */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask the AI assistant..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          disabled={isTyping}
          InputProps={{
            endAdornment: (
              <IconButton 
                color="primary" 
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)'
                  }
                }}
              >
                {isTyping ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
};

export default AIAssistant;