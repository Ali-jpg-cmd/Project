import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';

const CodeGenerator = ({ darkMode, onSaveCode }) => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [framework, setFramework] = useState('');
  const [style, setStyle] = useState('clean');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const languages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
  ];

  const frameworks = {
    javascript: ['React', 'Vue', 'Angular', 'Node.js', 'Express'],
    typescript: ['React', 'Vue', 'Angular', 'Node.js', 'NestJS'],
    python: ['Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy'],
    java: ['Spring', 'Spring Boot', 'Hibernate'],
    cpp: ['Qt', 'Boost'],
    csharp: ['.NET', 'ASP.NET', 'Entity Framework'],
    go: ['Gin', 'Echo', 'Fiber'],
    rust: ['Actix', 'Rocket', 'Warp'],
    php: ['Laravel', 'Symfony', 'CodeIgniter'],
    ruby: ['Rails', 'Sinatra']
  };

  const styles = [
    { value: 'clean', label: 'Clean & Readable' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'verbose', label: 'Verbose with Comments' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8001/api/generate-code', {
        prompt: prompt,
        language: language,
        framework: framework,
        style: style
      });

      setGeneratedCode(response.data.generated_code);
    } catch (error) {
      console.error('Code generation error:', error);
      setError('Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        // Could add a toast notification here
      })
      .catch(err => console.error('Failed to copy code:', err));
  };

  const handleSaveCode = () => {
    if (onSaveCode && generatedCode) {
      const extension = language === 'javascript' ? 'js' : 
                      language === 'typescript' ? 'ts' :
                      language === 'python' ? 'py' :
                      language === 'java' ? 'java' :
                      language === 'cpp' ? 'cpp' :
                      language === 'csharp' ? 'cs' :
                      language === 'go' ? 'go' :
                      language === 'rust' ? 'rs' :
                      language === 'php' ? 'php' :
                      language === 'ruby' ? 'rb' : 'txt';
      
      const filename = `generated_code.${extension}`;
      onSaveCode(filename, generatedCode);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <CodeIcon sx={{ mr: 1 }} />
        AI Code Generator
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Describe what you want to build"
          placeholder="e.g., Create a React component for a user profile card with avatar, name, and bio"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              label="Language"
            >
              {languages.map(lang => (
                <MenuItem key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              label="Framework"
            >
              <MenuItem value="">None</MenuItem>
              {(frameworks[language] || []).map(fw => (
                <MenuItem key={fw} value={fw}>
                  {fw}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Style</InputLabel>
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              label="Style"
            >
              {styles.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <CodeIcon />}
          sx={{ mb: 2 }}
        >
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {generatedCode && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Generated Code</Typography>
            <Box>
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyCode}
                sx={{ mr: 1 }}
              >
                Copy
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveCode}
                variant="contained"
              >
                Save to File
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={language} color="primary" size="small" />
            {framework && <Chip label={framework} color="secondary" size="small" />}
            <Chip label={style} size="small" />
          </Box>

          <SyntaxHighlighter
            language={language}
            style={darkMode ? tomorrow : prism}
            customStyle={{
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            {generatedCode}
          </SyntaxHighlighter>
        </Paper>
      )}
    </Box>
  );
};

export default CodeGenerator;