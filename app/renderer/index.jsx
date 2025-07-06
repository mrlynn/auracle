import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  CssBaseline, Container, Typography, Box, Chip, 
  Alert, Link, CircularProgress, Stack, Card, CardContent,
  AppBar, Toolbar, Fab, Zoom, Fade, Badge, Avatar, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Tabs, Tab, IconButton, Snackbar, Grid
} from '@mui/material';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';

// Import custom components
import EnhancedResearchCard from './components/research/EnhancedResearchCard.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const { ipcRenderer } = window.require('electron');

// Professional dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4338ca',
    },
    secondary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(30, 41, 59, 0.8)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  borderRadius: 16,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
  }
}));

const ScrollableBox = styled(Box)(({ theme }) => ({
  overflowY: 'auto',
  paddingRight: theme.spacing(1),
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(148, 163, 184, 0.1)',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(148, 163, 184, 0.3)',
    borderRadius: '3px',
    '&:hover': {
      background: 'rgba(148, 163, 184, 0.5)',
    }
  },
}));

const PulsingDot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.success.main,
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(0.95)',
      boxShadow: `0 0 0 0 ${theme.palette.success.main}`,
    },
    '70%': {
      transform: 'scale(1)',
      boxShadow: `0 0 0 10px rgba(16, 185, 129, 0)`,
    },
    '100%': {
      transform: 'scale(0.95)',
      boxShadow: `0 0 0 0 rgba(16, 185, 129, 0)`,
    },
  },
}));

const RecordButton = styled(Fab)(({ theme, recording }) => ({
  width: 80,
  height: 80,
  background: recording 
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  color: 'white',
  fontSize: '24px',
  fontWeight: 600,
  boxShadow: recording
    ? '0 10px 30px rgba(239, 68, 68, 0.4)'
    : '0 10px 30px rgba(99, 102, 241, 0.4)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: recording
      ? '0 15px 40px rgba(239, 68, 68, 0.6)'
      : '0 15px 40px rgba(99, 102, 241, 0.6)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  }
}));

const StatusIndicator = styled(Box)(({ theme, connected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  borderRadius: 20,
  background: connected 
    ? 'rgba(16, 185, 129, 0.1)' 
    : 'rgba(245, 158, 11, 0.1)',
  border: `1px solid ${connected 
    ? 'rgba(16, 185, 129, 0.3)' 
    : 'rgba(245, 158, 11, 0.3)'}`,
  fontSize: '14px',
  fontWeight: 500,
  color: connected ? theme.palette.success.light : theme.palette.warning.light,
}));

function App() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [meetingNotes, setMeetingNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [llmProviders, setLlmProviders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [testingConnection, setTestingConnection] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // Metrics state
  const [usageMetrics, setUsageMetrics] = useState(null);
  const [currentSessionMetrics, setCurrentSessionMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Template state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDialog, setTemplateDialog] = useState({ open: false, mode: 'view', template: null });
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Report state
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Exported Reports state
  const [exportedReports, setExportedReports] = useState([]);
  const [loadingExportedReports, setLoadingExportedReports] = useState(false);
  const [reportViewMode, setReportViewMode] = useState('generated'); // 'generated' | 'exported' | 'favorites'
  
  // Report editing state
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReportName, setEditedReportName] = useState('');
  const [editedReportContent, setEditedReportContent] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    let isMounted = true;
    console.log('Setting up IPC listeners...');
    
    // Transcript updates with AGGRESSIVE memory management
    const MAX_TRANSCRIPT_LENGTH = 10000; // 10KB limit - REDUCED for extreme memory pressure
    const MAX_TRANSCRIPT_LINES = 100; // Max lines - REDUCED
    
    const transcriptHandler = (_, data) => {
      if (!isMounted) return; // Prevent updates after unmount
      
      if (typeof data === 'string') {
        // Legacy format
        setTranscript((prev) => {
          // Memory management: truncate if too large
          let managedPrev = prev;
          if (prev.length > MAX_TRANSCRIPT_LENGTH) {
            const lines = prev.split('\n');
            managedPrev = lines.slice(-Math.floor(MAX_TRANSCRIPT_LINES / 2)).join('\n');
            console.warn('Transcript truncated due to memory limits');
          }
          
          const newTranscript = managedPrev + (managedPrev ? '\n' : '') + data;
          setWordCount(newTranscript.split(/\s+/).filter(word => word.length > 0).length);
          return newTranscript;
        });
      } else if (data.type === 'final') {
        // Committed text - add permanently
        setTranscript((prev) => {
          // Memory management: truncate if too large
          let managedPrev = prev;
          if (prev.length > MAX_TRANSCRIPT_LENGTH) {
            const lines = prev.split('\n');
            managedPrev = lines.slice(-Math.floor(MAX_TRANSCRIPT_LINES / 2)).join('\n');
            console.warn('Transcript truncated due to memory limits');
          }
          
          const newTranscript = managedPrev + (managedPrev ? '\n' : '') + data.text;
          setWordCount(newTranscript.split(/\s+/).filter(word => word.length > 0).length);
          return newTranscript;
        });
      } else if (data.type === 'interim') {
        // Interim text - show temporarily but don't save
        setTranscript((prev) => {
          // Memory management for interim updates
          let managedPrev = prev;
          if (prev.length > MAX_TRANSCRIPT_LENGTH) {
            const lines = prev.split('\n');
            managedPrev = lines.slice(-Math.floor(MAX_TRANSCRIPT_LINES / 2)).join('\n');
          }
          
          // Remove any previous interim text and add new interim
          const lines = managedPrev.split('\n');
          const finalLines = lines.filter(line => !line.startsWith('〉'));
          const newTranscript = finalLines.join('\n') + (finalLines.length > 0 ? '\n' : '') + '〉 ' + data.text;
          return newTranscript;
        });
      } else if (data.type === 'error' || data.type === 'system') {
        // System messages
        setTranscript((prev) => {
          const newTranscript = prev + (prev ? '\n' : '') + data.text;
          return newTranscript;
        });
      }
    };
    
    // Topics extracted with deduplication and limits
    const topicsHandler = (_, data) => {
      if (!isMounted) return;
      setTopics((prev) => {
        // Add new data and deduplicate by timestamp
        const newTopics = [...prev, data];
        const uniqueTopics = newTopics.filter((topic, index, array) => 
          array.findIndex(t => t.timestamp === topic.timestamp) === index
        );
        
        // Keep only last 10 topic entries - REDUCED for extreme memory pressure
        const limitedTopics = uniqueTopics.slice(-10);
        
        if (limitedTopics.length < uniqueTopics.length) {
          console.warn(`Topics truncated: ${uniqueTopics.length} -> ${limitedTopics.length}`);
        }
        
        return limitedTopics;
      });
    };
    
    // Research completed with deduplication and limits
    const researchHandler = (_, data) => {
      if (!isMounted) return;
      setResearch((prev) => {
        // Add new summaries and deduplicate by topic
        const newResearch = [...prev, ...data.summaries];
        const uniqueResearch = newResearch.filter((research, index, array) => 
          array.findIndex(r => r.topic === research.topic && r.timestamp === research.timestamp) === index
        );
        
        // Keep only last 5 research items - REDUCED for extreme memory pressure
        const limitedResearch = uniqueResearch.slice(-5);
        
        if (limitedResearch.length < uniqueResearch.length) {
          console.warn(`Research truncated: ${uniqueResearch.length} -> ${limitedResearch.length}`);
        }
        
        return limitedResearch;
      });
    };
    
    // Ollama status
    const ollamaHandler = (_, connected) => {
      if (!isMounted) return;
      console.log('Received ollama-status update:', connected);
      setOllamaConnected(connected);
    };
    
    // Processing status
    const chunkHandler = () => {
      if (!isMounted) return;
      setProcessingStatus('Processing chunk...');
      setTimeout(() => {
        if (isMounted) setProcessingStatus(null);
      }, 1000);
    };
    
    // Error handler
    const errorHandler = (_, error) => {
      if (!isMounted) return;
      console.error('IPC Error:', error);
    };

    // Register all handlers with error handling
    try {
      console.log('Registering IPC event handlers...');
      ipcRenderer.on('transcript-update', transcriptHandler);
      ipcRenderer.on('topics-extracted', topicsHandler);
      ipcRenderer.on('research-completed', researchHandler);
      ipcRenderer.on('ollama-status', ollamaHandler);
      ipcRenderer.on('chunk-processed', chunkHandler);
      ipcRenderer.on('processor-error', errorHandler);
      
      // Check Ollama status after handlers are registered
      setTimeout(() => {
        if (isMounted) {
          console.log('Sending check-ollama-status request...');
          ipcRenderer.send('check-ollama-status');
        }
      }, 100);
    } catch (error) {
      console.error('Failed to set up IPC listeners:', error);
    }
    
    return () => {
      isMounted = false;
      console.log('Cleaning up IPC listeners...');
      
      // Remove all listeners - more thorough cleanup
      try {
        ipcRenderer.removeListener('transcript-update', transcriptHandler);
        ipcRenderer.removeListener('topics-extracted', topicsHandler);
        ipcRenderer.removeListener('research-completed', researchHandler);
        ipcRenderer.removeListener('ollama-status', ollamaHandler);
        ipcRenderer.removeListener('chunk-processed', chunkHandler);
        ipcRenderer.removeListener('processor-error', errorHandler);
      } catch (error) {
        console.error('Error during IPC cleanup:', error);
      }
    };
  }, []);

  // Emergency memory recovery system
  useEffect(() => {
    let memoryCheckInterval;
    
    // Monitor memory usage and perform emergency cleanup if needed
    const checkMemoryUsage = () => {
      try {
        // Check if performance.memory is available (Chromium/Electron)
        if (window.performance && window.performance.memory) {
          const memoryInfo = window.performance.memory;
          const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
          const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
          
          console.log(`Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB`);
          
          // Emergency cleanup if memory usage is too high - MORE AGGRESSIVE
          if (usedMB > 100 || (usedMB / limitMB) > 0.7) {
            console.warn('🚨 High memory usage detected, performing emergency cleanup');
            
            // Aggressive state cleanup - batch updates to prevent React unmounting
            React.startTransition(() => {
              setTopics(prev => prev.slice(-5)); // Even more aggressive
              setResearch(prev => prev.slice(-3));
              setTranscript(prev => {
                const lines = prev.split('\n');
                return lines.slice(-50).join('\n'); // Keep only last 50 lines
              });
              
              // Clear any pending updates
              setProcessingStatus(null);
              setWordCount(0);
            });
            
            // Force garbage collection if available
            if (window.gc) {
              window.gc();
            }
          }
        }
      } catch (error) {
        console.error('Memory check error:', error);
      }
    };
    
    // Check every 30 seconds
    memoryCheckInterval = setInterval(checkMemoryUsage, 30000);
    
    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
      }
    };
  }, []);

  // Global error boundary for renderer crashes
  useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 Renderer error detected:', error);
      try {
        // Send crash report to main process
        ipcRenderer.send('renderer-error', {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to send error report:', e);
      }
    };
    
    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      handleError(new Error(`Unhandled rejection: ${event.reason}`));
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const startTranscription = () => {
    setTranscript('');
    setTopics([]);
    setResearch([]);
    setWordCount(0);
    setMeetingNotes(null);
    ipcRenderer.send('start-transcription');
    setIsListening(true);
  };
  
  const stopTranscription = () => {
    ipcRenderer.send('stop-transcription');
    setIsListening(false);
    
    // Show template selection if we have sufficient transcript
    if (transcript.length > 50) {
      setShowTemplateSelection(true);
    }
  };

  const triggerResearchForTopic = async (topicData) => {
    if (!topicData || !topicData.topics || topicData.topics.length === 0) {
      console.warn('No topics available for research');
      return;
    }

    console.log('Triggering research for topics:', topicData.topics);
    
    try {
      // Send research request to main process
      const result = await ipcRenderer.invoke('trigger-research', {
        topics: topicData.topics,
        questions: topicData.questions || [],
        terms: topicData.terms || [],
        transcript: transcript,
        timestamp: topicData.timestamp
      });
      
      if (result.success) {
        console.log('Research triggered successfully');
        // Research results will be received via the research-completed event
      } else {
        console.error('Failed to trigger research:', result.error);
      }
    } catch (error) {
      console.error('Error triggering research:', error);
    }
  };

  const generateMeetingNotes = async () => {
    if (notesLoading) return;
    
    console.log('Generate meeting notes button clicked');
    console.log('Current transcript length:', transcript.length);
    console.log('Current topics:', topics);
    
    setNotesLoading(true);
    try {
      // Send current UI state to main process for generation
      const result = await ipcRenderer.invoke('generate-meeting-notes', {
        transcript,
        topics,
        research
      });
      console.log('Meeting notes result:', result);
      if (result.error) {
        console.error('Error generating meeting notes:', result.error);
      } else {
        setMeetingNotes(result);
        console.log('Meeting notes set successfully');
      }
    } catch (error) {
      console.error('Failed to generate meeting notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const exportMeetingNotes = async () => {
    if (!meetingNotes) return;
    
    try {
      const result = await ipcRenderer.invoke('export-meeting-notes', meetingNotes);
      if (result.success) {
        // Could show a toast notification here
        console.log('Meeting notes exported to:', result.filepath);
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to export meeting notes:', error);
    }
  };

  const clearMeetingNotes = () => {
    setMeetingNotes(null);
  };

  // Settings functions
  const loadSettings = async () => {
    try {
      const config = await ipcRenderer.invoke('get-settings');
      const providers = await ipcRenderer.invoke('get-llm-providers');
      setSettings(config);
      setLlmProviders(providers);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const result = await ipcRenderer.invoke('update-settings', newSettings);
      if (result.success) {
        setSettings(prev => ({ ...prev, ...newSettings }));
        setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    }
  };

  const testProviderConnection = async (providerName) => {
    setTestingConnection(true);
    try {
      const result = await ipcRenderer.invoke('test-llm-provider', providerName);
      if (result.connected) {
        setSnackbar({ open: true, message: `${providerName} connected successfully!`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `Failed to connect to ${providerName}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setSnackbar({ open: true, message: 'Connection test failed', severity: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const openSettings = () => {
    loadSettings();
    loadMetrics();
    loadUserReports();
    loadExportedReports();
    setShowSettings(true);
  };

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const [usage, current] = await Promise.all([
        ipcRenderer.invoke('get-usage-metrics'),
        ipcRenderer.invoke('get-current-session-metrics')
      ]);
      setUsageMetrics(usage);
      setCurrentSessionMetrics(current);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const exportUsageData = async () => {
    try {
      const result = await ipcRenderer.invoke('export-usage-data');
      if (result.success) {
        setSnackbar({ open: true, message: 'Usage data exported successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to export usage data', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to export usage data:', error);
      setSnackbar({ open: true, message: 'Failed to export usage data', severity: 'error' });
    }
  };

  // Template functions
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await ipcRenderer.invoke('get-templates');
      if (result.success) {
        setTemplates(result.templates);
      } else {
        setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateReport = async (templateId) => {
    try {
      setSnackbar({ open: true, message: 'Generating report...', severity: 'info' });
      const result = await ipcRenderer.invoke('generate-report', templateId, transcript, {}, Date.now().toString());
      if (result.success) {
        setSnackbar({ open: true, message: 'Report generated successfully!', severity: 'success' });
        // Store the generated report and show it
        setGeneratedReport({
          id: result.reportId,
          content: result.content,
          metadata: result.metadata,
          templateId: templateId,
          template: templates.find(t => t._id === templateId),
          generatedAt: new Date()
        });
        setShowReportDialog(true);
        // Refresh user reports list
        loadUserReports();
      } else {
        setSnackbar({ open: true, message: `Failed to generate report: ${result.error}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setSnackbar({ open: true, message: 'Failed to generate report', severity: 'error' });
    }
  };

  const generateReportFromSelection = async (templateId) => {
    setGeneratingReport(true);
    setShowTemplateSelection(false);
    
    try {
      setSnackbar({ open: true, message: 'Generating report from template...', severity: 'info' });
      const result = await ipcRenderer.invoke('generate-report', templateId, transcript, {}, Date.now().toString());
      if (result.success) {
        setSnackbar({ open: true, message: 'Report generated successfully!', severity: 'success' });
        // Store the generated report and show it
        setGeneratedReport({
          id: result.reportId,
          content: result.content,
          metadata: result.metadata,
          templateId: templateId,
          template: templates.find(t => t._id === templateId),
          generatedAt: new Date()
        });
        setShowReportDialog(true);
        // Refresh user reports list
        loadUserReports();
      } else {
        setSnackbar({ open: true, message: `Failed to generate report: ${result.error}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setSnackbar({ open: true, message: 'Failed to generate report', severity: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportTemplate = async (templateId) => {
    try {
      const result = await ipcRenderer.invoke('export-template-json', templateId);
      if (result.success) {
        setSnackbar({ open: true, message: 'Template exported successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to export template', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to export template:', error);
      setSnackbar({ open: true, message: 'Failed to export template', severity: 'error' });
    }
  };

  const exportAllTemplates = async () => {
    try {
      const result = await ipcRenderer.invoke('export-all-templates');
      if (result.success) {
        setSnackbar({ open: true, message: 'All templates exported successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to export templates', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to export all templates:', error);
      setSnackbar({ open: true, message: 'Failed to export templates', severity: 'error' });
    }
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Report management functions
  const loadUserReports = async () => {
    setLoadingReports(true);
    try {
      const result = await ipcRenderer.invoke('get-user-reports');
      if (result.success) {
        setUserReports(result.reports);
      } else {
        console.error('Failed to load user reports:', result.error);
      }
    } catch (error) {
      console.error('Failed to load user reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const exportGeneratedReport = async (reportId) => {
    try {
      const result = await ipcRenderer.invoke('export-report', reportId, 'markdown');
      if (result.success) {
        setSnackbar({ open: true, message: `Report exported to ${result.filename}`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to export report', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      setSnackbar({ open: true, message: 'Failed to export report', severity: 'error' });
    }
  };

  const viewReport = async (reportId) => {
    try {
      const result = await ipcRenderer.invoke('get-report', reportId);
      if (result.success) {
        setGeneratedReport({
          id: result.report._id,
          content: result.report.content,
          metadata: result.report.metadata,
          templateId: result.report.templateId,
          template: { name: result.report.templateName },
          generatedAt: new Date(result.report.generatedAt)
        });
        setShowReportDialog(true);
      } else {
        setSnackbar({ open: true, message: 'Failed to load report', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      setSnackbar({ open: true, message: 'Failed to load report', severity: 'error' });
    }
  };

  // Exported Reports functions
  const loadExportedReports = async () => {
    setLoadingExportedReports(true);
    try {
      const result = await ipcRenderer.invoke('get-exported-reports-by-user', 'default-user');
      if (result.success) {
        setExportedReports(result.reports);
      } else {
        console.error('Failed to load exported reports:', result.error);
        setSnackbar({ open: true, message: 'Failed to load exported reports', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to load exported reports:', error);
      setSnackbar({ open: true, message: 'Failed to load exported reports', severity: 'error' });
    } finally {
      setLoadingExportedReports(false);
    }
  };

  const loadFavoriteReports = async () => {
    setLoadingReports(true);
    try {
      const result = await ipcRenderer.invoke('get-favorite-reports', 'default-user');
      if (result.success) {
        setUserReports(result.reports);
      } else {
        console.error('Failed to load favorite reports:', result.error);
        setSnackbar({ open: true, message: 'Failed to load favorite reports', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to load favorite reports:', error);
      setSnackbar({ open: true, message: 'Failed to load favorite reports', severity: 'error' });
    } finally {
      setLoadingReports(false);
    }
  };

  const deleteExportedReport = async (exportId) => {
    try {
      const result = await ipcRenderer.invoke('delete-exported-report', exportId);
      if (result.success && result.deleted) {
        setSnackbar({ open: true, message: 'Exported report deleted successfully', severity: 'success' });
        loadExportedReports(); // Refresh list
      } else {
        setSnackbar({ open: true, message: 'Failed to delete exported report', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete exported report:', error);
      setSnackbar({ open: true, message: 'Failed to delete exported report', severity: 'error' });
    }
  };

  // Report editing functions
  const startEditingReport = () => {
    if (generatedReport) {
      setIsEditingReport(true);
      setEditedReportName(generatedReport.template?.name || '');
      setEditedReportContent(generatedReport.content);
    }
  };

  const cancelEditingReport = () => {
    setIsEditingReport(false);
    setEditedReportName('');
    setEditedReportContent('');
  };

  const saveReportEdits = async () => {
    if (!generatedReport) return;
    
    setSavingReport(true);
    try {
      const updates = {
        templateName: editedReportName,
        content: editedReportContent
      };
      
      const result = await ipcRenderer.invoke('update-report', generatedReport.id, updates);
      if (result.success) {
        setSnackbar({ open: true, message: 'Report updated successfully', severity: 'success' });
        
        // Update the local state
        setGeneratedReport(prev => ({
          ...prev,
          template: { ...prev.template, name: editedReportName },
          content: editedReportContent
        }));
        
        // Refresh reports list
        loadUserReports();
        setIsEditingReport(false);
      } else {
        setSnackbar({ open: true, message: 'Failed to update report', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save report edits:', error);
      setSnackbar({ open: true, message: 'Failed to update report', severity: 'error' });
    } finally {
      setSavingReport(false);
    }
  };

  const renderMeetingNotes = () => {
    if (!meetingNotes) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            📝 No meeting notes generated yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate AI-powered meeting summary with action items
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Chip 
              label={notesLoading ? "Generating..." : "Generate Notes"}
              onClick={generateMeetingNotes}
              disabled={notesLoading || transcript.length < 10}
              sx={{ 
                background: notesLoading ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': {
                  background: notesLoading ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                }
              }}
            />
            <Chip 
              label="Test Generate"
              onClick={() => {
                console.log('Test button clicked');
                // Add some test data for testing
                setTranscript('We discussed the quarterly budget and decided to increase marketing spend by 20%. John will prepare the budget proposal by Friday. Sarah mentioned that we need to hire two new developers. The team agreed to implement the new API by end of March.');
                setTopics([{
                  topics: ['budget', 'marketing', 'hiring', 'API development'],
                  questions: ['When should we start hiring?'],
                  terms: ['quarterly budget', 'API'],
                  timestamp: new Date().toISOString()
                }]);
                setTimeout(() => generateMeetingNotes(), 500);
              }}
              sx={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                ml: 1
              }}
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box>
        {/* Header with Export Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.light' }}>
            📋 Meeting Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="Export"
              size="small"
              onClick={exportMeetingNotes}
              sx={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '11px'
              }}
            />
            <Chip 
              label="Clear"
              size="small"
              onClick={clearMeetingNotes}
              sx={{ 
                background: 'rgba(239, 68, 68, 0.8)',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '11px'
              }}
            />
          </Box>
        </Box>

        <Stack spacing={2}>
          {/* Summary */}
          {meetingNotes.summary && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(99, 102, 241, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(99, 102, 241, 0.1)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.light' }}>
                📄 Summary
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {meetingNotes.summary}
              </Typography>
            </Box>
          )}

          {/* Action Items */}
          {meetingNotes.actionItems && meetingNotes.actionItems.length > 0 && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(245, 158, 11, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(245, 158, 11, 0.1)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'warning.light' }}>
                ✅ Action Items ({meetingNotes.actionItems.length})
              </Typography>
              {meetingNotes.actionItems.map((item, index) => (
                <Box key={index} sx={{ mb: 1, ml: 1 }}>
                  <Typography variant="caption" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 500,
                    display: 'block'
                  }}>
                    {index + 1}. {item.item}
                  </Typography>
                  {(item.assignee || item.deadline || item.priority) && (
                    <Box sx={{ ml: 1, mt: 0.5 }}>
                      {item.assignee && (
                        <Chip label={`@${item.assignee}`} size="small" sx={{ 
                          mr: 0.5, fontSize: '10px', height: '18px'
                        }} />
                      )}
                      {item.priority && (
                        <Chip 
                          label={item.priority} 
                          size="small" 
                          sx={{ 
                            mr: 0.5, 
                            fontSize: '10px', 
                            height: '18px',
                            background: item.priority === 'high' ? 'rgba(239, 68, 68, 0.8)' :
                                       item.priority === 'medium' ? 'rgba(245, 158, 11, 0.8)' :
                                       'rgba(107, 114, 128, 0.8)',
                            color: 'white'
                          }} 
                        />
                      )}
                      {item.deadline && (
                        <Typography variant="caption" color="text.secondary">
                          Due: {item.deadline}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Decisions */}
          {meetingNotes.decisions && meetingNotes.decisions.length > 0 && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(6, 182, 212, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(6, 182, 212, 0.1)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'secondary.light' }}>
                🎯 Decisions ({meetingNotes.decisions.length})
              </Typography>
              {meetingNotes.decisions.map((decision, index) => (
                <Box key={index} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 500,
                    display: 'block'
                  }}>
                    {decision.decision}
                  </Typography>
                  {decision.context && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                      Context: {decision.context}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Key Points */}
          {meetingNotes.keyPoints && meetingNotes.keyPoints.length > 0 && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(16, 185, 129, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(16, 185, 129, 0.1)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'success.light' }}>
                💡 Key Points
              </Typography>
              {meetingNotes.keyPoints.map((point, index) => (
                <Typography key={index} variant="caption" sx={{ 
                  color: 'text.secondary', 
                  display: 'block',
                  mb: 0.5,
                  ml: 1
                }}>
                  • {point}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      </Box>
    );
  };

  const renderTopics = () => {
    if (topics.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            🔍 No topics detected yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start speaking to see AI-extracted topics appear
          </Typography>
        </Box>
      );
    }
    
    return (
      <Stack spacing={2}>
        {topics.map((topicData, index) => (
          <Fade in={true} key={index} style={{ transitionDelay: `${index * 100}ms` }}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(99, 102, 241, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(99, 102, 241, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                mb: 1.5,
                fontWeight: 500
              }}>
                ⏰ {new Date(topicData.timestamp).toLocaleTimeString()}
              </Typography>
              
              {topicData.topics.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.light' }}>
                    💡 Topics
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {topicData.topics.map((topic, i) => (
                      <Chip 
                        key={i} 
                        label={topic} 
                        size="small" 
                        sx={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                          color: 'white',
                          fontWeight: 500,
                          '&:hover': {
                            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {topicData.questions.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'secondary.light' }}>
                    ❓ Questions
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {topicData.questions.map((question, i) => (
                      <Chip 
                        key={i} 
                        label={question} 
                        size="small" 
                        sx={{
                          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          color: 'white',
                          fontWeight: 500,
                          '&:hover': {
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {topicData.terms.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    🔤 Terms
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {topicData.terms.map((term, i) => (
                      <Chip 
                        key={i} 
                        label={term} 
                        size="small" 
                        variant="outlined"
                        sx={{
                          borderColor: 'text.secondary',
                          color: 'text.secondary',
                          fontWeight: 500,
                          '&:hover': {
                            borderColor: 'text.primary',
                            color: 'text.primary',
                            bgcolor: 'rgba(148, 163, 184, 0.1)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        ))}
      </Stack>
    );
  };

  const renderResearch = () => {
    if (research.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            📚 No research insights yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Research will appear automatically as topics are detected
          </Typography>
        </Box>
      );
    }
    
    return (
      <Stack spacing={2}>
        {research.map((item, index) => {
          // Check if this is enhanced research data (has synthesis, context, etc.)
          const isEnhancedResearch = item.synthesis || item.context || item.followUpQuestions;
          
          if (isEnhancedResearch) {
            // Use enhanced research card for AI-powered research
            return (
              <Fade in={true} key={`enhanced-${index}`} style={{ transitionDelay: `${index * 150}ms` }}>
                <EnhancedResearchCard
                  research={item}
                  onFollowUpClick={(question) => {
                    // Add follow-up question as a new topic for research
                    console.log('Follow-up question:', question);
                    setSnackbar({
                      open: true,
                      message: `Follow-up question noted: ${question}`,
                      severity: 'info'
                    });
                  }}
                  onSourceClick={(source) => {
                    // Open source in new tab
                    window.open(source.url, '_blank');
                  }}
                />
              </Fade>
            );
          } else {
            // Use legacy display for old research format
            const summary = item; // Maintain compatibility
            return (
              <Fade in={true} key={`legacy-${index}`} style={{ transitionDelay: `${index * 150}ms` }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(6, 182, 212, 0.05)', 
                  borderRadius: 2,
                  border: '1px solid rgba(6, 182, 212, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    transform: 'translateY(-1px)',
                  }
                }}>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 700, 
                    mb: 2, 
                    color: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🎯 {summary.topic}
                  </Typography>
                  
                  <Stack spacing={1.5}>
                    {summary.sources.map((source, i) => (
                      <Box 
                        key={i} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(15, 23, 42, 0.3)', 
                          borderRadius: 2,
                          border: '1px solid rgba(148, 163, 184, 0.1)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', flex: 1, mr: 1 }}>
                            {source.title}
                          </Typography>
                          <Chip 
                            label={source.source} 
                            size="small" 
                            sx={{
                              background: source.source === 'Wikipedia' 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : source.source === 'DuckDuckGo'
                                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                              color: 'white',
                              fontWeight: 500,
                              fontSize: '11px'
                            }}
                          />
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 1.5, 
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {source.summary}
                        </Typography>
                        
                        <Link 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener" 
                          variant="caption"
                          sx={{ 
                            color: 'secondary.light',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              color: 'secondary.main',
                              textDecoration: 'underline',
                            }
                          }}
                        >
                          🔗 Read more
                        </Link>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Fade>
            );
          }
        })}
      </Stack>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <AppBar position="static" elevation={0} sx={{ 
          background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                width: 40,
                height: 40,
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                A
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Auracle
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                  AI Research Companion
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StatusIndicator 
                connected={ollamaConnected}
                onClick={() => ipcRenderer.send('check-ollama-status')}
                sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
              >
                {ollamaConnected ? <PulsingDot /> : <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />}
                <Typography variant="body2">
                  {ollamaConnected ? 'AI Connected' : 'AI Disconnected'}
                </Typography>
              </StatusIndicator>
              
              {wordCount > 0 && (
                <Chip 
                  label={`${wordCount} words`} 
                  size="small" 
                  variant="outlined"
                  sx={{ borderColor: 'primary.main', color: 'primary.light' }}
                />
              )}
              
              <IconButton 
                onClick={openSettings}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.light' }
                }}
                title="Settings"
              >
                ⚙️
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
          {!ollamaConnected && (
            <Fade in={!ollamaConnected}>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3, 
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'warning.light',
                  '& .MuiAlert-icon': { color: 'warning.main' }
                }}
              >
                Ollama AI is not connected. Please ensure Ollama is running locally on port 11434.
              </Alert>
            </Fade>
          )}

          <Box sx={{ 
            height: 'calc(100vh - 140px)', 
            display: 'flex', 
            gap: 3 
          }}>
            {/* Main Panel: Topic-Centric Dashboard - 70% */}
            <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Quick Status & Control Bar */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <Zoom in={true}>
                  <RecordButton
                    recording={isListening}
                    onClick={isListening ? stopTranscription : startTranscription}
                    sx={{ width: 60, height: 60 }}
                  >
                    {isListening ? '⏹' : '🎤'}
                  </RecordButton>
                </Zoom>
                
                <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isListening && (
                    <Chip 
                      label="🔴 LIVE RECORDING" 
                      size="medium" 
                      sx={{ 
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        fontWeight: 600,
                        animation: 'pulse 2s infinite'
                      }}
                    />
                  )}
                  
                  {topics.length > 0 && (
                    <Chip 
                      label={`${topics.length} topics detected`} 
                      size="medium" 
                      sx={{ 
                        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                        color: 'white'
                      }}
                    />
                  )}
                  
                  {research.length > 0 && (
                    <Chip 
                      label={`${research.length} research insights`} 
                      size="medium" 
                      sx={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        color: 'white'
                      }}
                    />
                  )}
                  
                  {processingStatus && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="primary" />
                      <Typography variant="body2" color="primary.light">
                        {processingStatus}
                      </Typography>
                    </Box>
                  )}

                  {transcript && topics.length > 0 && (
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => setShowTemplateSelection(true)}
                      sx={{ 
                        bgcolor: 'rgba(16, 185, 129, 0.9)', 
                        '&:hover': { bgcolor: 'rgba(16, 185, 129, 1)' },
                        ml: 'auto'
                      }}
                    >
                      📝 Generate Report
                    </Button>
                  )}

                  {/* Debug: Manual topic extraction button */}
                  {transcript && transcript.length > 20 && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        console.log('🧪 Debug: Manually triggering topic extraction');
                        ipcRenderer.send('force-process');
                      }}
                      sx={{ 
                        borderColor: 'rgba(245, 158, 11, 0.5)',
                        color: 'warning.light',
                        '&:hover': { 
                          bgcolor: 'rgba(245, 158, 11, 0.1)',
                          borderColor: 'warning.main'
                        }
                      }}
                    >
                      🧪 Test Topics
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Main Topics Display */}
              <GlassCard sx={{ flex: 1 }}>
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      🧠 Conversation Topics
                    </Typography>
                    {!isListening && topics.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Press record to start real-time topic extraction
                      </Typography>
                    )}
                  </Box>
                  
                  <ScrollableBox sx={{ flex: 1 }}>
                    {topics.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                          🎯 Ready for Real-Time Analysis
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                          {isListening 
                            ? 'Listening... Topics will appear as conversation develops'
                            : 'Start recording to see conversation topics extracted automatically'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Each topic will appear as a card with instant research access
                        </Typography>
                      </Box>
                    ) : (
                      <Grid container spacing={3}>
                        {topics.map((topicData, index) => (
                          <Grid item xs={12} sm={6} lg={4} key={index}>
                            <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                              <GlassCard sx={{ 
                                height: '100%',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                                }
                              }}>
                                <CardContent sx={{ p: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 0.5,
                                      fontWeight: 500
                                    }}>
                                      ⏰ {new Date(topicData.timestamp).toLocaleTimeString()}
                                    </Typography>
                                    <Chip 
                                      label={`${topicData.topics?.length || 0} topics`} 
                                      size="small" 
                                      sx={{ 
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                        color: 'white',
                                        fontSize: '10px'
                                      }}
                                    />
                                  </Box>
                                  
                                  {topicData.topics && topicData.topics.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {topicData.topics.slice(0, 4).map((topic, i) => (
                                          <Chip 
                                            key={i} 
                                            label={topic} 
                                            size="small" 
                                            sx={{ 
                                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                                              color: 'primary.light',
                                              border: '1px solid rgba(99, 102, 241, 0.2)',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                              mb: 0.5
                                            }}
                                          />
                                        ))}
                                        {topicData.topics.length > 4 && (
                                          <Chip 
                                            label={`+${topicData.topics.length - 4}`} 
                                            size="small" 
                                            sx={{ 
                                              bgcolor: 'rgba(148, 163, 184, 0.1)',
                                              color: 'text.secondary',
                                              fontSize: '10px'
                                            }}
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                  )}
                                  
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                                    <Button 
                                      size="small" 
                                      variant="outlined"
                                      onClick={() => triggerResearchForTopic(topicData)}
                                      sx={{ 
                                        fontSize: '11px', 
                                        px: 2, 
                                        flex: 1,
                                        borderColor: 'rgba(6, 182, 212, 0.3)',
                                        color: 'secondary.light',
                                        '&:hover': { 
                                          bgcolor: 'rgba(6, 182, 212, 0.1)',
                                          borderColor: 'secondary.main'
                                        }
                                      }}
                                    >
                                      🔍 Research
                                    </Button>
                                    <Button 
                                      size="small" 
                                      variant="contained"
                                      onClick={() => setShowTemplateSelection(true)}
                                      sx={{ 
                                        fontSize: '11px', 
                                        px: 2, 
                                        flex: 1,
                                        bgcolor: 'rgba(16, 185, 129, 0.9)',
                                        '&:hover': { bgcolor: 'rgba(16, 185, 129, 1)' }
                                      }}
                                    >
                                      📝 Report
                                    </Button>
                                  </Box>
                                </CardContent>
                              </GlassCard>
                            </Fade>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </ScrollableBox>
                </CardContent>
              </GlassCard>
            </Box>

            {/* Side Panel: Research & Compact Info - 30% */}
            <Box sx={{ width: '30%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Research Insights - Priority */}
              <GlassCard sx={{ height: research.length > 0 ? '60%' : '40%' }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    📚 Research Insights
                    {research.length > 0 && (
                      <Badge badgeContent={research.length} color="secondary" />
                    )}
                  </Typography>
                  <ScrollableBox sx={{ flex: 1 }}>
                    {research.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          🔍 Ready for Research
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click "Research" on any topic for instant insights
                        </Typography>
                      </Box>
                    ) : (
                      renderResearch()
                    )}
                  </ScrollableBox>
                </CardContent>
              </GlassCard>

              {/* Quick Meeting Notes */}
              <GlassCard sx={{ height: research.length > 0 ? '25%' : '35%' }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    📝 Quick Notes
                    {meetingNotes && (
                      <Badge badgeContent="✓" color="success" />
                    )}
                  </Typography>
                  <ScrollableBox sx={{ flex: 1 }}>
                    {renderMeetingNotes()}
                  </ScrollableBox>
                </CardContent>
              </GlassCard>

              {/* Compact Transcript - Minimal */}
              <GlassCard sx={{ height: research.length > 0 ? '15%' : '25%' }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    🎤 Recent
                    {wordCount > 0 && (
                      <Chip 
                        label={`${wordCount} words`} 
                        size="small" 
                        sx={{ fontSize: '9px' }}
                      />
                    )}
                  </Typography>
                  <ScrollableBox sx={{ 
                    flex: 1,
                    bgcolor: 'rgba(15, 23, 42, 0.3)', 
                    borderRadius: 1,
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    p: 1
                  }}>
                    {transcript ? (
                      <Box>
                        {transcript.split('\n').slice(-8).map((line, index) => {
                          const isInterim = line.startsWith('〉');
                          const displayText = isInterim ? line.substring(2) : line;
                          
                          return displayText.trim() ? (
                            <Typography 
                              key={index}
                              variant="body2" 
                              sx={{ 
                                lineHeight: 1.4,
                                fontSize: '11px',
                                mb: 0.3,
                                color: isInterim ? 'primary.light' : 'text.secondary',
                                fontStyle: isInterim ? 'italic' : 'normal',
                                opacity: isInterim ? 0.8 : 0.9
                              }}
                            >
                              {displayText.length > 80 ? displayText.substring(0, 80) + '...' : displayText}
                            </Typography>
                          ) : null;
                        })}
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          textAlign: 'center', 
                          py: 2,
                          color: 'text.secondary',
                          fontSize: '11px'
                        }}
                      >
                        🎙️ Transcript preview
                      </Typography>
                    )}
                  </ScrollableBox>
                </CardContent>
              </GlassCard>
            </Box>
          </Box>
        </Container>

        {/* Settings Dialog */}
        <Dialog 
          open={showSettings} 
          onClose={() => setShowSettings(false)}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }
          }}
        >
          <DialogTitle sx={{ 
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            ⚙️ Settings & Preferences
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {settings && (
              <Box>
                <Tabs 
                  value={activeTab} 
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}
                >
                  <Tab label="🤖 AI Provider" />
                  <Tab label="📊 Usage & Metrics" />
                  <Tab label="📝 Templates" />
                  <Tab label="📄 Reports" />
                  <Tab label="🎤 Speech" />
                  <Tab label="🔍 Research" />
                  <Tab label="🎨 Interface" />
                </Tabs>

                {/* AI Provider Tab */}
                {activeTab === 0 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      🤖 AI Language Model Provider
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>Provider</InputLabel>
                      <Select
                        value={settings.llm?.provider || 'ollama'}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            llm: { ...settings.llm, provider: e.target.value }
                          };
                          setSettings(newSettings);
                        }}
                      >
                        {llmProviders.map(provider => (
                          <MenuItem key={provider.id} value={provider.id}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {provider.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {provider.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Provider-specific settings */}
                    {settings.llm?.provider !== 'ollama' && (
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.light' }}>
                          🔑 API Configuration
                        </Typography>
                        
                        {settings.llm?.provider === 'openai' && (
                          <TextField
                            fullWidth
                            label="OpenAI API Key"
                            type="password"
                            value={settings.llm?.openaiApiKey || ''}
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                llm: { ...settings.llm, openaiApiKey: e.target.value }
                              };
                              setSettings(newSettings);
                            }}
                            helperText="Get your API key from platform.openai.com"
                            sx={{ mb: 2 }}
                          />
                        )}
                        
                        {settings.llm?.provider === 'gemini' && (
                          <TextField
                            fullWidth
                            label="Google Gemini API Key"
                            type="password"
                            value={settings.llm?.geminiApiKey || ''}
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                llm: { ...settings.llm, geminiApiKey: e.target.value }
                              };
                              setSettings(newSettings);
                            }}
                            helperText="Get your API key from Google AI Studio"
                            sx={{ mb: 2 }}
                          />
                        )}
                        
                        {settings.llm?.provider === 'claude' && (
                          <TextField
                            fullWidth
                            label="Anthropic Claude API Key"
                            type="password"
                            value={settings.llm?.claudeApiKey || ''}
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                llm: { ...settings.llm, claudeApiKey: e.target.value }
                              };
                              setSettings(newSettings);
                            }}
                            helperText="Get your API key from console.anthropic.com"
                            sx={{ mb: 2 }}
                          />
                        )}
                        
                        {settings.llm?.provider === 'cohere' && (
                          <TextField
                            fullWidth
                            label="Cohere API Key"
                            type="password"
                            value={settings.llm?.cohereApiKey || ''}
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                llm: { ...settings.llm, cohereApiKey: e.target.value }
                              };
                              setSettings(newSettings);
                            }}
                            helperText="Get your API key from dashboard.cohere.ai"
                            sx={{ mb: 2 }}
                          />
                        )}
                        
                        {settings.llm?.provider === 'mistral' && (
                          <TextField
                            fullWidth
                            label="Mistral API Key"
                            type="password"
                            value={settings.llm?.mistralApiKey || ''}
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                llm: { ...settings.llm, mistralApiKey: e.target.value }
                              };
                              setSettings(newSettings);
                            }}
                            helperText="Get your API key from console.mistral.ai"
                            sx={{ mb: 2 }}
                          />
                        )}
                      </Box>
                    )}

                    {/* Model Selection */}
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={settings.llm?.model || ''}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            llm: { ...settings.llm, model: e.target.value }
                          };
                          setSettings(newSettings);
                        }}
                      >
                        {llmProviders
                          .find(p => p.id === settings.llm?.provider)
                          ?.models?.map(model => (
                            <MenuItem key={model} value={model}>
                              {model}
                            </MenuItem>
                          )) || []
                        }
                      </Select>
                    </FormControl>

                    {/* Test Connection */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        onClick={() => testProviderConnection(settings.llm?.provider)}
                        disabled={testingConnection}
                        startIcon={testingConnection ? <CircularProgress size={16} /> : null}
                      >
                        {testingConnection ? 'Testing...' : 'Test Connection'}
                      </Button>
                      <Typography variant="body2" color="text.secondary">
                        Verify your API configuration
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Usage & Metrics Tab */}
                {activeTab === 1 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📊 AI Usage & Metrics
                    </Typography>
                    
                    {loadingMetrics ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : usageMetrics && currentSessionMetrics ? (
                      <Stack spacing={3}>
                        {/* Current Session */}
                        <GlassCard>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              🔄 Current Session
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h4" color="primary">
                                    {currentSessionMetrics.requests?.length || 0}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Requests
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h4" color="secondary">
                                    {(currentSessionMetrics.totalTokens || 0).toLocaleString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Tokens
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h4" color="success.main">
                                    ${(currentSessionMetrics.totalCost || 0).toFixed(4)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Cost
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h4" color="warning.main">
                                    {currentSessionMetrics.provider || 'None'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Provider
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </GlassCard>

                        {/* Operation Breakdown */}
                        <GlassCard>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              🔧 Current Session Operations
                            </Typography>
                            {Object.entries(currentSessionMetrics.operations || {}).map(([operation, data]) => (
                              <Box key={operation} sx={{ mb: 2, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                                    {operation.replace(/([A-Z])/g, ' $1').trim()}
                                  </Typography>
                                  <Chip 
                                    label={`${data.count} calls`} 
                                    size="small" 
                                    color="primary"
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Tokens: {data.tokens?.toLocaleString() || 0}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Cost: ${(data.cost || 0).toFixed(4)}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </CardContent>
                        </GlassCard>

                        {/* Historical Overview */}
                        <GlassCard>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              📈 Historical Usage
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 1 }}>
                                  <Typography variant="h5" color="primary">
                                    {usageMetrics.historical?.totalSessions || 0}
                                  </Typography>
                                  <Typography variant="caption">Total Sessions</Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(6, 182, 212, 0.05)', borderRadius: 1 }}>
                                  <Typography variant="h5" color="secondary">
                                    {(usageMetrics.historical?.totalTokens || 0).toLocaleString()}
                                  </Typography>
                                  <Typography variant="caption">Total Tokens</Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 1 }}>
                                  <Typography variant="h5" color="success.main">
                                    ${(usageMetrics.historical?.totalCost || 0).toFixed(2)}
                                  </Typography>
                                  <Typography variant="caption">Total Cost</Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </GlassCard>

                        {/* Provider Breakdown */}
                        {usageMetrics.topProviders && usageMetrics.topProviders.length > 0 && (
                          <GlassCard>
                            <CardContent sx={{ p: 3 }}>
                              <Typography variant="h6" sx={{ mb: 2 }}>
                                🏆 Top Providers
                              </Typography>
                              {usageMetrics.topProviders.map(([provider, data]) => (
                                <Box key={provider} sx={{ mb: 2, p: 2, bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                                      {provider}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                      <Chip label={`${data.requests} requests`} size="small" />
                                      <Chip label={`$${data.cost.toFixed(2)}`} size="small" color="warning" />
                                    </Box>
                                  </Box>
                                </Box>
                              ))}
                            </CardContent>
                          </GlassCard>
                        )}

                        {/* Cost Insights */}
                        {usageMetrics.efficiency && (
                          <GlassCard>
                            <CardContent sx={{ p: 3 }}>
                              <Typography variant="h6" sx={{ mb: 2 }}>
                                💡 Efficiency Insights
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={6}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Average Cost per Operation
                                  </Typography>
                                  <Typography variant="h6" color="primary">
                                    ${(usageMetrics.efficiency.avgCostPerOperation || 0).toFixed(4)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Average Tokens per Operation
                                  </Typography>
                                  <Typography variant="h6" color="secondary">
                                    {Math.round(usageMetrics.efficiency.avgTokensPerOperation || 0)}
                                  </Typography>
                                </Grid>
                              </Grid>
                              {usageMetrics.efficiency.mostEfficientOperation?.operation && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 1 }}>
                                  <Typography variant="subtitle2" color="success.main">
                                    Most Efficient: {usageMetrics.efficiency.mostEfficientOperation.operation}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ${usageMetrics.efficiency.mostEfficientOperation.costPerOp.toFixed(4)} per operation
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </GlassCard>
                        )}

                        {/* Export Section */}
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                          <Button
                            variant="outlined"
                            onClick={loadMetrics}
                            startIcon={loadingMetrics ? <CircularProgress size={16} /> : null}
                          >
                            Refresh Metrics
                          </Button>
                          <Button
                            variant="contained"
                            onClick={exportUsageData}
                            startIcon={null}
                          >
                            Export Usage Data
                          </Button>
                        </Box>
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                          📊 No usage data available yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start using AI features to see metrics and insights
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Templates Tab */}
                {activeTab === 2 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📝 Report Templates
                    </Typography>
                    
                    {loadingTemplates ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Stack spacing={3}>
                        {/* Template Actions */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Button 
                            variant="contained" 
                            onClick={loadTemplates}
                            startIcon={loadingTemplates ? <CircularProgress size={16} /> : null}
                            disabled={loadingTemplates}
                          >
                            Refresh Templates
                          </Button>
                          <Button 
                            variant="outlined" 
                            onClick={exportAllTemplates}
                          >
                            Export All Templates
                          </Button>
                        </Box>

                        {/* Templates Grid */}
                        <Grid container spacing={2}>
                          {templates.map((template) => (
                            <Grid item xs={12} md={6} key={template._id}>
                              <GlassCard sx={{ height: '100%' }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                    <Typography sx={{ fontSize: '1.2em' }}>
                                      {template.icon || '📄'}
                                    </Typography>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {template.name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {template.description}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                                        <Chip 
                                          label={template.category} 
                                          size="small" 
                                          sx={{ 
                                            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                            color: 'white',
                                            fontSize: '10px'
                                          }} 
                                        />
                                        {template.metadata?.usageCount > 0 && (
                                          <Typography variant="caption" color="text.secondary">
                                            Used {template.metadata.usageCount} times
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <Button 
                                      size="small" 
                                      variant="contained"
                                      onClick={() => generateReport(template._id)}
                                      disabled={transcript.length < 10}
                                    >
                                      Generate Report
                                    </Button>
                                    <Button 
                                      size="small" 
                                      variant="outlined"
                                      onClick={() => exportTemplate(template._id)}
                                    >
                                      Export
                                    </Button>
                                  </Box>
                                </CardContent>
                              </GlassCard>
                            </Grid>
                          ))}
                        </Grid>

                        {templates.length === 0 && (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                              📝 No templates available
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Templates will be loaded automatically when the database is available.
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Reports Tab */}
                {activeTab === 3 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📄 Report Management
                    </Typography>
                    
                    {/* View Mode Tabs */}
                    <Box sx={{ mb: 3 }}>
                      <Tabs 
                        value={reportViewMode} 
                        onChange={(_, newValue) => setReportViewMode(newValue)}
                        sx={{ mb: 2 }}
                      >
                        <Tab label="📝 Generated Reports" value="generated" />
                        <Tab label="💾 Exported Reports" value="exported" />
                        <Tab label="⭐ Favorites" value="favorites" />
                      </Tabs>
                    </Box>
                    
                    {(loadingReports || loadingExportedReports) ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Stack spacing={3}>
                        {/* Report Actions */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {reportViewMode === 'generated' && (
                            <Button 
                              variant="contained" 
                              onClick={loadUserReports}
                              startIcon={loadingReports ? <CircularProgress size={16} /> : null}
                              disabled={loadingReports}
                            >
                              Refresh Generated Reports
                            </Button>
                          )}
                          {reportViewMode === 'exported' && (
                            <Button 
                              variant="contained" 
                              onClick={loadExportedReports}
                              startIcon={loadingExportedReports ? <CircularProgress size={16} /> : null}
                              disabled={loadingExportedReports}
                            >
                              Refresh Exported Reports
                            </Button>
                          )}
                          {reportViewMode === 'favorites' && (
                            <Button 
                              variant="contained" 
                              onClick={loadFavoriteReports}
                              startIcon={loadingReports ? <CircularProgress size={16} /> : null}
                              disabled={loadingReports}
                            >
                              Refresh Favorites
                            </Button>
                          )}
                        </Box>

                        {/* Generated Reports View */}
                        {reportViewMode === 'generated' && (
                          <>
                            <Grid container spacing={2}>
                              {userReports.map((report) => (
                                <Grid item xs={12} md={6} key={report._id}>
                                  <GlassCard sx={{ height: '100%' }}>
                                    <CardContent sx={{ p: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                        <Typography sx={{ fontSize: '1.2em' }}>
                                          📄
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                            {report.templateName}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Generated: {new Date(report.generatedAt).toLocaleString()}
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                                            <Chip 
                                              label={`${report.metadata?.tokensUsed || 0} tokens`} 
                                              size="small" 
                                              sx={{ 
                                                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                                color: 'white',
                                                fontSize: '10px'
                                              }} 
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                              ${(report.metadata?.cost || 0).toFixed(4)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                      
                                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <Button 
                                          size="small" 
                                          variant="contained"
                                          onClick={() => viewReport(report._id)}
                                        >
                                          View
                                        </Button>
                                        <Button 
                                          size="small" 
                                          variant="outlined"
                                          onClick={() => {
                                            viewReport(report._id);
                                            setTimeout(() => startEditingReport(), 100);
                                          }}
                                          sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                        >
                                          ✏️ Edit
                                        </Button>
                                        <Button 
                                          size="small" 
                                          variant="outlined"
                                          onClick={() => exportGeneratedReport(report._id)}
                                        >
                                          Export
                                        </Button>
                                      </Box>
                                    </CardContent>
                                  </GlassCard>
                                </Grid>
                              ))}
                            </Grid>

                            {userReports.length === 0 && (
                              <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary" sx={{ mb: 2 }}>
                                  📄 No reports generated yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Generate reports from your transcripts using templates.
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}

                        {/* Exported Reports View */}
                        {reportViewMode === 'exported' && (
                          <>
                            <Grid container spacing={2}>
                              {exportedReports.map((exportRecord) => (
                                <Grid item xs={12} md={6} key={exportRecord._id}>
                                  <GlassCard sx={{ height: '100%' }}>
                                    <CardContent sx={{ p: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                        <Typography sx={{ fontSize: '1.2em' }}>
                                          💾
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                            {exportRecord.fileName}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Exported: {new Date(exportRecord.exportedAt).toLocaleString()}
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                            <Chip 
                                              label={exportRecord.format.toUpperCase()} 
                                              size="small" 
                                              sx={{ 
                                                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                                color: 'white',
                                                fontSize: '10px'
                                              }} 
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                              {(exportRecord.fileSize / 1024).toFixed(1)} KB
                                            </Typography>
                                          </Box>
                                          {exportRecord.metadata?.originalReport?.templateName && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                              Template: {exportRecord.metadata.originalReport.templateName}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                      
                                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button 
                                          size="small" 
                                          variant="outlined"
                                          color="error"
                                          onClick={() => deleteExportedReport(exportRecord._id)}
                                        >
                                          Delete
                                        </Button>
                                      </Box>
                                    </CardContent>
                                  </GlassCard>
                                </Grid>
                              ))}
                            </Grid>

                            {exportedReports.length === 0 && (
                              <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary" sx={{ mb: 2 }}>
                                  💾 No reports exported yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Export reports to see them here for management.
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}

                        {/* Favorites View */}
                        {reportViewMode === 'favorites' && (
                          <>
                            <Grid container spacing={2}>
                              {userReports.map((report) => (
                                <Grid item xs={12} md={6} key={report._id}>
                                  <GlassCard sx={{ height: '100%' }}>
                                    <CardContent sx={{ p: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                        <Typography sx={{ fontSize: '1.2em' }}>
                                          ⭐
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                            {report.templateName}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Generated: {new Date(report.generatedAt).toLocaleString()}
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                                            <Chip 
                                              label="Frequently Exported" 
                                              size="small" 
                                              sx={{ 
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: 'white',
                                                fontSize: '10px'
                                              }} 
                                            />
                                          </Box>
                                        </Box>
                                      </Box>
                                      
                                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <Button 
                                          size="small" 
                                          variant="contained"
                                          onClick={() => viewReport(report._id)}
                                        >
                                          View
                                        </Button>
                                        <Button 
                                          size="small" 
                                          variant="outlined"
                                          onClick={() => {
                                            viewReport(report._id);
                                            setTimeout(() => startEditingReport(), 100);
                                          }}
                                          sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                        >
                                          ✏️ Edit
                                        </Button>
                                        <Button 
                                          size="small" 
                                          variant="outlined"
                                          onClick={() => exportGeneratedReport(report._id)}
                                        >
                                          Export
                                        </Button>
                                      </Box>
                                    </CardContent>
                                  </GlassCard>
                                </Grid>
                              ))}
                            </Grid>

                            {userReports.length === 0 && (
                              <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary" sx={{ mb: 2 }}>
                                  ⭐ No favorite reports yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Reports that are exported multiple times will appear here as favorites.
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Speech Tab */}
                {activeTab === 4 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>🎤 Speech Recognition</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Speech settings are currently configured for Whisper.cpp local processing.
                      Future versions will support cloud speech providers.
                    </Typography>
                  </Box>
                )}

                {/* Research Tab */}
                {activeTab === 5 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>🔍 Research Sources</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Currently using free research sources: Wikipedia and DuckDuckGo.
                      Google Search API can be configured for enhanced results.
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Google API Key (Optional)"
                      type="password"
                      value={settings.research?.googleApiKey || ''}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          research: { ...settings.research, googleApiKey: e.target.value }
                        };
                        setSettings(newSettings);
                      }}
                      helperText="Enable Google Custom Search for enhanced research"
                      sx={{ mb: 2 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Google Search Engine ID (Optional)"
                      value={settings.research?.googleSearchEngineId || ''}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          research: { ...settings.research, googleSearchEngineId: e.target.value }
                        };
                        setSettings(newSettings);
                      }}
                      helperText="Custom Search Engine ID from Google Cloud Console"
                    />
                  </Box>
                )}

                {/* Interface Tab */}
                {activeTab === 6 && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>🎨 Interface Preferences</Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.ui?.autoExportNotes || false}
                          onChange={(e) => {
                            const newSettings = {
                              ...settings,
                              ui: { ...settings.ui, autoExportNotes: e.target.checked }
                            };
                            setSettings(newSettings);
                          }}
                        />
                      }
                      label="Auto-export meeting notes"
                      sx={{ mb: 2 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.ui?.showDebugInfo || false}
                          onChange={(e) => {
                            const newSettings = {
                              ...settings,
                              ui: { ...settings.ui, showDebugInfo: e.target.checked }
                            };
                            setSettings(newSettings);
                          }}
                        />
                      }
                      label="Show debug information"
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', p: 3 }}>
            <Button onClick={() => setShowSettings(false)} color="inherit">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                saveSettings(settings);
                setShowSettings(false);
              }}
              variant="contained"
              startIcon={null}
            >
              Save Settings
            </Button>
          </DialogActions>
        </Dialog>

        {/* Template Selection Dialog */}
        <Dialog 
          open={showTemplateSelection} 
          onClose={() => setShowTemplateSelection(false)}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }
          }}
        >
          <DialogTitle sx={{ 
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📝 Generate Report
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              Select a template to generate your report
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {generatingReport ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Generating your report...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose from the available templates below to generate a structured report from your {transcript.length} character transcript.
                </Typography>
                
                <Grid container spacing={2}>
                  {templates.map((template) => (
                    <Grid item xs={12} sm={6} key={template._id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: '1px solid rgba(148, 163, 184, 0.1)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }
                        }}
                        onClick={() => generateReportFromSelection(template._id)}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Typography sx={{ fontSize: '1.5em' }}>
                              {template.icon || '📄'}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {template.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {template.description}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip 
                                  label={template.category} 
                                  size="small" 
                                  sx={{ 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                    color: 'white',
                                    fontSize: '10px'
                                  }} 
                                />
                                {template.metadata?.usageCount > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    Used {template.metadata.usageCount} times
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {templates.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      📝 No templates available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Templates are loading or no templates are configured.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => setShowTemplateSelection(false)}
              disabled={generatingReport}
            >
              Cancel
            </Button>
            <Button 
              onClick={generateMeetingNotes}
              variant="outlined"
              disabled={generatingReport}
            >
              Generate Basic Notes Instead
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Display Dialog */}
        <Dialog 
          open={showReportDialog} 
          onClose={() => {
            setShowReportDialog(false);
            setIsEditingReport(false);
          }}
          maxWidth="lg"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              maxHeight: '90vh',
            }
          }}
        >
          <DialogTitle sx={{ 
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📄 {isEditingReport ? 'Edit Report' : 'Generated Report'}
            {generatedReport?.template && !isEditingReport && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {generatedReport.template.name}
              </Typography>
            )}
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {generatedReport && (
              <Box sx={{ p: 3 }}>
                {/* Report Header */}
                {!isEditingReport ? (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {generatedReport.template?.name || 'Generated Report'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Generated: {generatedReport.generatedAt.toLocaleString()}
                      </Typography>
                      {generatedReport.metadata && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Tokens: {generatedReport.metadata.tokensUsed?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cost: ${(generatedReport.metadata.cost || 0).toFixed(4)}
                          </Typography>
                        </>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={() => exportGeneratedReport(generatedReport.id)}
                        startIcon={null}
                      >
                        Export Report
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => navigator.clipboard.writeText(generatedReport.content)}
                      >
                        Copy Content
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={startEditingReport}
                        sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      >
                        ✏️ Edit Report
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Edit Report Details
                    </Typography>
                    <TextField
                      fullWidth
                      label="Report Name/Title"
                      value={editedReportName}
                      onChange={(e) => setEditedReportName(e.target.value)}
                      sx={{ mb: 2 }}
                      variant="outlined"
                    />
                  </Box>
                )}

                {/* Report Content */}
                {!isEditingReport ? (
                  <Box sx={{ 
                    p: 3,
                    bgcolor: 'rgba(15, 23, 42, 0.3)',
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    maxHeight: '60vh',
                    overflowY: 'auto'
                  }}>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0,
                      color: 'inherit'
                    }}>
                      {generatedReport.content}
                    </pre>
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={20}
                    label="Report Content"
                    value={editedReportContent}
                    onChange={(e) => setEditedReportContent(e.target.value)}
                    variant="outlined"
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: 'rgba(15, 23, 42, 0.3)',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }
                    }}
                  />
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            {!isEditingReport ? (
              <Button 
                onClick={() => setShowReportDialog(false)}
                variant="outlined"
              >
                Close
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
                <Button 
                  onClick={cancelEditingReport}
                  variant="outlined"
                  disabled={savingReport}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveReportEdits}
                  variant="contained"
                  disabled={savingReport || !editedReportName.trim() || !editedReportContent.trim()}
                  startIcon={savingReport ? <CircularProgress size={16} /> : null}
                >
                  {savingReport ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )}
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
); 