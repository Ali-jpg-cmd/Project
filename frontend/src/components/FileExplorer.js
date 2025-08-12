import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const FileExplorer = ({ files, onFileSelect, currentFile, onRefresh }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Auto-expand parent folders of selected file
  useEffect(() => {
    if (currentFile) {
      const pathParts = currentFile.path.split('/');
      const folderPaths = [];
      
      // Build all parent folder paths
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderPath = pathParts.slice(0, i + 1).join('/');
        folderPaths.push(folderPath);
      }
      
      // Expand all parent folders
      setExpandedFolders(prev => {
        const newState = {...prev};
        folderPaths.forEach(path => {
          newState[path] = true;
        });
        return newState;
      });
    }
  }, [currentFile]);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderFileTree = (items, basePath = '') => {
    // Group items by directory
    const grouped = {};
    
    items.forEach(item => {
      const parts = item.name.split('/');
      const currentPart = parts[0];
      const restParts = parts.slice(1).join('/');
      
      if (!grouped[currentPart]) {
        grouped[currentPart] = [];
      }
      
      if (restParts) {
        grouped[currentPart].push({
          ...item,
          name: restParts
        });
      } else if (parts.length === 1) {
        grouped[currentPart].push(item);
      }
    });
    
    // Sort directories first, then files
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const aIsDir = grouped[a].some(item => item.name.includes('/'));
      const bIsDir = grouped[b].some(item => item.name.includes('/'));
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    return (
      <List dense>
        {sortedKeys.map(key => {
          const isDirectory = grouped[key].some(item => item.name.includes('/'));
          const fullPath = basePath ? `${basePath}/${key}` : key;
          const isExpanded = expandedFolders[fullPath];
          
          if (isDirectory) {
            return (
              <React.Fragment key={fullPath}>
                <ListItem 
                  button 
                  onClick={() => toggleFolder(fullPath)}
                  className="file-item"
                  onMouseEnter={() => setHoveredItem(fullPath)}
                  onMouseLeave={() => setHoveredItem(null)}
                  sx={{
                    backgroundColor: hoveredItem === fullPath ? 'rgba(63, 81, 181, 0.08)' : 'transparent',
                    borderRadius: '4px',
                    my: 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemIcon>
                    {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                  </ListItemIcon>
                  <ListItemIcon>
                    <FolderIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={key} />
                </ListItem>
                
                {isExpanded && (
                  <Box sx={{ pl: 4 }}>
                    {renderFileTree(grouped[key], fullPath)}
                  </Box>
                )}
              </React.Fragment>
            );
          } else {
            return grouped[key].map(file => {
              const filePath = basePath ? `${basePath}/${file.name}` : file.name;
              const isSelected = currentFile && currentFile.path === filePath;
              
              return (
                <ListItem 
                  key={filePath}
                  button 
                  onClick={() => onFileSelect({ ...file, path: filePath })}
                  className={`file-item ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setHoveredItem(filePath)}
                  onMouseLeave={() => setHoveredItem(null)}
                  sx={{
                    backgroundColor: isSelected 
                      ? 'rgba(63, 81, 181, 0.2)' 
                      : (hoveredItem === filePath ? 'rgba(63, 81, 181, 0.08)' : 'transparent'),
                    borderRadius: '4px',
                    my: 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemIcon>
                    <InsertDriveFileIcon />
                  </ListItemIcon>
                  <ListItemText primary={file.name} />
                </ListItem>
              );
            });
          }
        })}
      </List>
    );
  };

  return (
    <Box className="file-explorer">
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          Explorer
        </Typography>
        <Tooltip title="Refresh Files">
          <IconButton 
            size="small" 
            onClick={onRefresh}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(63, 81, 181, 0.08)',
              },
              transition: 'all 0.2s'
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {files.length > 0 ? (
        renderFileTree(files)
      ) : (
        <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
          No files found
        </Typography>
      )}
    </Box>
  );
};

export default FileExplorer;