import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Paper, Divider, Tooltip, CircularProgress, Fade } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const ChatPanel = ({ chatHistory, onSendMessage, onToggle, darkMode }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      setIsTyping(true);
      
      // Simulate AI typing response (would be replaced by actual API response handling)
      setTimeout(() => {
        setIsTyping(false);
      }, 1500);
    }
  };
  
  const handleCopyMessage = (content, id) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
      })
      .catch(err => console.error('Failed to copy message: ', err));
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

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          AI Assistant
        </Typography>
        <Tooltip title="Close Chat">
          <IconButton size="small" onClick={onToggle}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box className="chat-messages" sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {chatHistory.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <Typography variant="body2" color="text.secondary">
              Start a conversation with the AI
            </Typography>
          </Box>
        ) : (
          <>
            {chatHistory.map((msg, index) => (
              <Paper 
                key={index} 
                elevation={1} 
                sx={{
                  p: 2,
                  maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' 
                    ? (darkMode ? '#3f51b5' : '#e3f2fd') 
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
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {msg.role === 'user' ? 'You' : 'AI'} • {formatTimestamp(msg.timestamp)}
                </Typography>
                
                {msg.role === 'user' ? (
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
          ))
        )}
            {isTyping && (
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body2">AI is typing...</Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask the AI..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          InputProps={{
            endAdornment: (
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <SendIcon />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
};

export default ChatPanel;