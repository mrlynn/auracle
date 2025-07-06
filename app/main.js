const { app, BrowserWindow, ipcMain, powerSaveBlocker } = require('electron');

// 🚨 EMERGENCY: Limit Electron memory to prevent system exhaustion
app.commandLine.appendSwitch('max-old-space-size', '512'); // Limit to 512MB
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

// Import emergency debugging system
const EmergencyDebugger = require('../debug-emergency');
const path = require('path');
const fs = require('fs');
const os = require('os');
const stt = require('./services/stt');
const processor = require('./services/processor');
const { testConnection: testLLMConnection } = require('./services/llmProviders');
const { generateMeetingNotes, exportToMarkdown } = require('./services/meetingNotes');
const { getAvailableProviders, testConnection, updateSettings } = require('./services/llmProviders');
const { getDashboardSummary, getCurrentSessionMetrics, exportUsageData, startNewSession } = require('./services/usageTracker');
const { saveSession, loadRecentSessions } = require('./storage');
const { loadConfig, saveConfig } = require('./config');
const { connect: connectMongo, getTemplates, createTemplate, updateTemplate, deleteTemplate, getExportedReports, getExportedReportsByUser, getExportHistory, deleteExportedReport, searchReports, getReportsByDateRange, getFavoriteReports, getStorageStats, saveTemplateVersion, getTemplateHistory, getTemplateVersion, restoreTemplateVersion } = require('./services/mongoStorage');
const { initializeDatabase, createCustomTemplate, updateCustomTemplate, deleteCustomTemplate, getTemplatesByCategory, searchTemplates, validateTemplateSchema, importTemplate, exportTemplate, exportAllTemplates, importTemplateCollection } = require('./services/templateManager');
const { generateReport, getReport, getSessionReports, getUserReports, updateReport, exportReport } = require('./services/reportGenerator');

// Import emergency debugging toolkit
const BlankingDebugger = require('../debug-toolkit');

let mainWindow;
let splashWindow;
let whisperProc = null;
let currentSession = null;
let powerSaveBlockerId = null;
let emergencyDebugger = null;
let blankingDebugger = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  splashWindow.loadFile(path.join(__dirname, 'splash/splash.html'));
  
  // Hide splash window after 5 seconds or when main window is ready
  setTimeout(() => {
    if (splashWindow) {
      closeSplashWindow();
    }
  }, 5000);
  
  return splashWindow;
}

function closeSplashWindow() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}

function createWindow() {
  // Initialize emergency debugging toolkit
  blankingDebugger = new BlankingDebugger();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until splash is done
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // Prevent background throttling during long sessions
      // Enable additional debugging flags
      webSecurity: false, // Allow debugging tools
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Open DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }
  
  // 🚨 START EMERGENCY DEBUGGING
  emergencyDebugger = new EmergencyDebugger(mainWindow);
  
  // Set up processor event handlers
  setupProcessorHandlers();
  
  // Test LLM connection after page is ready
  mainWindow.webContents.once('did-finish-load', () => {
    testLLMConnection().then(connected => {
      console.log('Sending llm-status to renderer:', connected);
      mainWindow.webContents.send('ollama-status', connected);
    });
    
    // Inject emergency diagnostic script
    try {
      const diagnosticScript = fs.readFileSync(path.join(__dirname, '../debug-renderer.js'), 'utf8');
      mainWindow.webContents.executeJavaScript(diagnosticScript);
      console.log('🔍 Emergency renderer debugging script injected');
    } catch (error) {
      console.error('Failed to inject debugging script:', error);
    }
  });
  
  // Check LLM status periodically with recursive timeout to prevent accumulation
  let statusCheckTimeout;
  const checkLLMStatusPeriodically = async () => {
    try {
      const connected = await testLLMConnection();
      console.log('Periodic llm-status check:', connected);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ollama-status', connected);
      }
    } catch (error) {
      console.error('LLM status check error:', error);
    }
    
    // Schedule next check only after current one completes
    statusCheckTimeout = setTimeout(checkLLMStatusPeriodically, 5000);
  };
  
  // Start the periodic check
  checkLLMStatusPeriodically();
  
  // Clean up timeout when window is closed
  mainWindow.on('closed', () => {
    if (statusCheckTimeout) {
      clearTimeout(statusCheckTimeout);
      statusCheckTimeout = null;
    }
  });
}

function setupProcessorHandlers() {
  // Handle new conversation chunks
  processor.on('chunk', (data) => {
    mainWindow.webContents.send('chunk-processed', data);
  });
  
  // Handle extracted topics
  processor.on('topics', (data) => {
    mainWindow.webContents.send('topics-extracted', data);
    if (currentSession) {
      currentSession.topics.push(data);
    }
  });
  
  // Handle research summaries
  processor.on('research', (data) => {
    mainWindow.webContents.send('research-completed', data);
    if (currentSession) {
      currentSession.research.push(data);
    }
  });
  
  // Handle errors
  processor.on('error', (error) => {
    console.error('Processor error:', error);
    mainWindow.webContents.send('processor-error', error.message);
  });

  // NEW: Handle real-time insights
  processor.on('realtime-insight', (insight) => {
    console.log('🧠 Real-time insight generated:', insight.type);
    mainWindow.webContents.send('realtime-insight', insight);
    if (currentSession) {
      if (!currentSession.realtimeInsights) {
        currentSession.realtimeInsights = [];
      }
      currentSession.realtimeInsights.push(insight);
      // Keep only last 20 insights per session
      if (currentSession.realtimeInsights.length > 20) {
        currentSession.realtimeInsights = currentSession.realtimeInsights.slice(-20);
      }
    }
  });

  // NEW: Handle executive summary updates
  processor.on('executive-summary-updated', (summary) => {
    console.log('📄 Executive summary updated');
    mainWindow.webContents.send('executive-summary-updated', summary);
    if (currentSession) {
      currentSession.executiveSummary = summary;
      currentSession.summaryUpdatedAt = new Date().toISOString();
    }
  });

  // NEW: Handle slides generation
  processor.on('slides-generated', (slides) => {
    console.log('📊 Slides generated:', slides.length, 'slides');
    mainWindow.webContents.send('slides-generated', slides);
    if (currentSession) {
      currentSession.generatedSlides = slides;
      currentSession.slidesGeneratedAt = new Date().toISOString();
    }
  });

  // NEW: Handle knowledge graph updates
  processor.on('knowledge-graph-updated', (graphData) => {
    console.log('🕸️ Knowledge graph updated:', graphData.nodes.length, 'nodes');
    mainWindow.webContents.send('knowledge-graph-updated', graphData);
  });

  // NEW: Handle topic additions to knowledge graph
  processor.on('topic-added', (data) => {
    mainWindow.webContents.send('topic-added', data);
  });

  // NEW: Handle connection additions to knowledge graph
  processor.on('connection-added', (data) => {
    mainWindow.webContents.send('connection-added', data);
  });
}

// Initialize MongoDB connection and default templates
async function initializeServices() {
  try {
    await connectMongo();
    await initializeDatabase();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
    // Continue without MongoDB if connection fails
  }
}

app.whenReady().then(() => {
  // Show splash screen first
  createSplashWindow();
  
  // Create main window but don't show it yet
  createWindow();
  
  // Initialize services and show main window when ready
  initializeServices().then(() => {
    // Services loaded, show main window and close splash
    mainWindow.show();
    closeSplashWindow();
  }).catch((error) => {
    console.error('Failed to initialize services:', error);
    // Still show main window even if some services fail
    mainWindow.show();
    closeSplashWindow();
  });
});

app.on('window-all-closed', () => {
  // Clean up power save blocker
  if (powerSaveBlockerId !== null) {
    try {
      powerSaveBlocker.stop(powerSaveBlockerId);
      powerSaveBlockerId = null;
    } catch (error) {
      console.error('Failed to stop power save blocker on exit:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: Splash screen handlers
ipcMain.on('splash-loading-complete', () => {
  if (mainWindow) {
    mainWindow.show();
  }
  closeSplashWindow();
});

ipcMain.handle('splash-update-progress', (event, progress) => {
  if (splashWindow) {
    splashWindow.webContents.send('loading-progress', progress);
  }
});

ipcMain.handle('splash-update-status', (event, status) => {
  if (splashWindow) {
    splashWindow.webContents.send('loading-status', status);
  }
});

// IPC: Start transcription
ipcMain.on('start-transcription', (event) => {
  if (whisperProc) return; // Already running
  
  // Prevent system sleep during recording
  try {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    console.log('Display sleep prevention started');
  } catch (error) {
    console.error('Failed to start power save blocker:', error);
  }
  
  // Create new session
  currentSession = {
    id: Date.now().toString(),
    startTime: new Date().toISOString(),
    transcript: [],
    topics: [],
    research: []
  };
  
  // Clear processor
  processor.clear();
  
  whisperProc = stt.startTranscription((data) => {
    // Handle new structured transcript data
    if (typeof data === 'string') {
      // Legacy format for backward compatibility
      mainWindow.webContents.send('transcript-update', data);
      if (currentSession) {
        currentSession.transcript.push({
          text: data,
          timestamp: new Date().toISOString()
        });
      }
      processor.addTranscript(data);
    } else if (data.type === 'final') {
      // Final committed text
      mainWindow.webContents.send('transcript-update', { type: 'final', text: data.text });
      if (currentSession) {
        currentSession.transcript.push({
          text: data.text,
          timestamp: new Date().toISOString(),
          type: 'final'
        });
      }
      processor.addTranscript(data.text);
    } else if (data.type === 'interim') {
      // Interim text (don't save to session, just display)
      mainWindow.webContents.send('transcript-update', { type: 'interim', text: data.text });
    } else if (data.type === 'error' || data.type === 'system') {
      // System messages
      mainWindow.webContents.send('transcript-update', { type: data.type, text: data.text });
    }
  });
});

// IPC: Handle renderer errors
ipcMain.on('renderer-error', (event, errorData) => {
  console.error('🚨 Renderer error received:', errorData);
  
  // Log the error for debugging
  console.error('Renderer crash details:', {
    message: errorData.message,
    timestamp: errorData.timestamp,
    stack: errorData.stack
  });
  
  // Could implement crash recovery here
  // For now, just log it
});

// IPC: Emergency debugging handlers
ipcMain.on('debug-log', (event, logData) => {
  console.log(`🔍 RENDERER: [${logData.timestamp}] ${logData.level}: ${logData.message}`, logData.data);
});

ipcMain.on('debug-pong', (event, data) => {
  if (emergencyDebugger) {
    emergencyDebugger.receivePong();
  }
  console.log('🔍 Renderer pong received:', data);
});

// Manual debugging commands
ipcMain.handle('debug-force-analysis', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('debug-force-analysis');
  }
  return { success: true };
});

ipcMain.handle('debug-force-recovery', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('debug-force-recovery');
  }
  return { success: true };
});

ipcMain.handle('debug-get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    nodeVersion: process.version
  };
});

// IPC: Stop transcription
ipcMain.on('stop-transcription', async () => {
  if (whisperProc) {
    whisperProc.kill();
    whisperProc = null;
    
    // Allow system sleep again
    if (powerSaveBlockerId !== null) {
      try {
        powerSaveBlocker.stop(powerSaveBlockerId);
        powerSaveBlockerId = null;
        console.log('Display sleep prevention stopped');
      } catch (error) {
        console.error('Failed to stop power save blocker:', error);
      }
    }
    
    // Flush any remaining buffer
    processor.flush();
    
    // Save session
    if (currentSession) {
      currentSession.endTime = new Date().toISOString();
      await saveSession(currentSession);
      currentSession = null;
    }
  }
});

// IPC: Get processor status
ipcMain.handle('get-processor-status', () => {
  return processor.getStatus();
});

// IPC: Get recent sessions
ipcMain.handle('get-recent-sessions', async () => {
  return await loadRecentSessions(5);
});

// IPC: Test LLM connection
ipcMain.handle('test-ollama', async () => {
  return await testLLMConnection();
});

// IPC: Get current configuration
ipcMain.handle('get-config', () => {
  return loadConfig();
});

// IPC: Force process current buffer
ipcMain.on('force-process', () => {
  console.log('🔧 Main: Force processing requested');
  processor.flush();
});

// IPC: Test topic extraction directly
ipcMain.handle('test-topic-extraction', async (_, text) => {
  try {
    console.log('🧪 Main: Testing topic extraction with text:', text?.substring(0, 50));
    const { extractTopics } = require('./services/llmProviders');
    const result = await extractTopics(text || 'This is a test about machine learning and artificial intelligence.');
    console.log('✅ Main: Topic extraction test result:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Main: Topic extraction test failed:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Check LLM status immediately
ipcMain.on('check-ollama-status', async () => {
  const connected = await testLLMConnection();
  console.log('Manual llm-status check:', connected);
  mainWindow.webContents.send('ollama-status', connected);
});

// IPC: Trigger immediate research for current transcript
ipcMain.handle('trigger-immediate-research', async (_, transcript) => {
  console.log('Immediate research triggered for transcript:', transcript?.substring(0, 100));
  
  try {
    const { extractTopics } = require('./services/llmProviders');
    const { fetchResearchSummaries } = require('./services/research/index');
    
    // Extract topics from transcript
    const topicData = await extractTopics(transcript);
    const allTopics = [...topicData.topics, ...topicData.terms.slice(0, 1)];
    
    // Filter out invalid topics
    const validTopics = allTopics.filter(topic => 
      topic && 
      typeof topic === 'string' && 
      topic.length > 2 && 
      !topic.includes('BLANK_AUDIO') && 
      !topic.includes('NULL') && 
      !topic.includes('UNDEFINED')
    );
    
    if (validTopics.length === 0) {
      console.log('No valid topics to research');
      return { success: false, error: 'No valid topics provided' };
    }
    
    // Fetch research summaries
    const summaries = await fetchResearchSummaries(
      validTopics,
      transcript || '',
      [] // No previous research context for manual triggers
    );
    
    console.log(`Research completed for ${validTopics.length} topics, found ${summaries.length} summaries`);
    
    // Emit research-completed event to renderer
    if (summaries.length > 0) {
      mainWindow.webContents.send('research-completed', {
        summaries: summaries,
        timestamp: new Date().toISOString()
      });
      
      // Add to session if available
      if (currentSession) {
        currentSession.research.push({
          summaries: summaries,
          timestamp: new Date().toISOString(),
          triggeredManually: true
        });
      }
    }
    
    return { success: true, summariesCount: summaries.length };
  } catch (error) {
    console.error('Error triggering research:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Trigger research for specific topics (legacy handler)
ipcMain.handle('trigger-research', async (_, data) => {
  console.log('Manual research triggered for topics:', data.topics);
  
  try {
    const { fetchResearchSummaries } = require('./services/research/index');
    
    // Filter out invalid topics
    const validTopics = data.topics.filter(topic => 
      topic && 
      typeof topic === 'string' && 
      topic.length > 2 && 
      !topic.includes('BLANK_AUDIO') && 
      !topic.includes('NULL') && 
      !topic.includes('UNDEFINED')
    );
    
    if (validTopics.length === 0) {
      console.log('No valid topics to research');
      return { success: false, error: 'No valid topics provided' };
    }
    
    // Fetch research summaries
    const summaries = await fetchResearchSummaries(
      validTopics,
      data.transcript || '',
      [] // No previous research context for manual triggers
    );
    
    console.log(`Research completed for ${validTopics.length} topics, found ${summaries.length} summaries`);
    
    // Emit research-completed event to renderer
    if (summaries.length > 0) {
      mainWindow.webContents.send('research-completed', {
        summaries: summaries,
        timestamp: new Date().toISOString()
      });
      
      // Add to session if available
      if (currentSession) {
        currentSession.research.push({
          summaries: summaries,
          timestamp: new Date().toISOString(),
          triggeredManually: true
        });
      }
    }
    
    return { success: true, summariesCount: summaries.length };
  } catch (error) {
    console.error('Error triggering research:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Generate meeting notes
ipcMain.handle('generate-meeting-notes', async (_, uiState) => {
  console.log('Meeting notes generation requested');
  console.log('UI state provided:', !!uiState);
  
  let transcriptText, topicsData, researchData;
  
  if (uiState) {
    // Use UI state directly
    transcriptText = uiState.transcript || '';
    topicsData = uiState.topics || [];
    researchData = uiState.research || [];
    console.log('Using UI state - transcript length:', transcriptText.length);
  } else if (currentSession) {
    // Fallback to session data
    transcriptText = currentSession.transcript
      .map(entry => entry.text)
      .join('\n');
    topicsData = currentSession.topics || [];
    researchData = currentSession.research || [];
    console.log('Using session data - transcript length:', transcriptText.length);
  } else {
    console.log('No data source available');
    return { error: 'No transcript data available to generate notes from' };
  }
  
  try {
    console.log('Full transcript length:', transcriptText.length);
    console.log('First 100 chars of transcript:', transcriptText.substring(0, 100));
    console.log('Topics count:', topicsData.length);
    
    const meetingNotes = await generateMeetingNotes(
      transcriptText, 
      topicsData, 
      researchData
    );
    
    console.log('Generated meeting notes:', JSON.stringify(meetingNotes, null, 2));
    
    // Add meeting notes to session if available
    if (currentSession) {
      currentSession.meetingNotes = meetingNotes;
      currentSession.notesGeneratedAt = new Date().toISOString();
    }
    
    console.log('Meeting notes generated successfully');
    return meetingNotes;
    
  } catch (error) {
    console.error('Error generating meeting notes:', error);
    return { error: error.message };
  }
});

// IPC: Export meeting notes
ipcMain.handle('export-meeting-notes', async (_, meetingNotes) => {
  try {
    const markdown = exportToMarkdown(meetingNotes, currentSession);
    
    // Save to Downloads folder
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `meeting-notes-${timestamp}.md`;
    const filepath = path.join(downloadsPath, filename);
    
    fs.writeFileSync(filepath, markdown);
    
    console.log(`Meeting notes exported to: ${filepath}`);
    return { success: true, filepath };
    
  } catch (error) {
    console.error('Error exporting meeting notes:', error);
    return { error: error.message };
  }
});

// IPC: Get settings
ipcMain.handle('get-settings', async () => {
  try {
    const config = loadConfig();
    return config;
  } catch (error) {
    console.error('Error loading settings:', error);
    return { error: error.message };
  }
});

// IPC: Update settings
ipcMain.handle('update-settings', async (_, newSettings) => {
  try {
    console.log('Updating settings:', newSettings);
    
    // Get current config to check if provider changed
    const currentConfig = loadConfig();
    const oldProvider = currentConfig.llm?.provider;
    const oldModel = currentConfig.llm?.model;
    
    // Merge with existing config
    const updatedConfig = { ...currentConfig, ...newSettings };
    
    // Save to file
    saveConfig(updatedConfig);
    
    // Update LLM provider manager
    updateSettings(updatedConfig);
    
    // Check if provider or model changed - start new usage session if so
    const newProvider = updatedConfig.llm?.provider;
    const newModel = updatedConfig.llm?.model;
    
    if (oldProvider !== newProvider || oldModel !== newModel) {
      console.log(`Provider/model changed from ${oldProvider}/${oldModel} to ${newProvider}/${newModel} - starting new usage session`);
      startNewSession(newProvider, newModel);
    }
    
    console.log('Settings updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { error: error.message };
  }
});

// IPC: Get available LLM providers
ipcMain.handle('get-llm-providers', async () => {
  try {
    const providers = getAvailableProviders();
    return providers;
  } catch (error) {
    console.error('Error getting LLM providers:', error);
    return { error: error.message };
  }
});

// IPC: Test LLM provider connection
ipcMain.handle('test-llm-provider', async (_, providerName) => {
  try {
    console.log('Testing connection for provider:', providerName);
    const connected = await testConnection(providerName);
    console.log('Connection test result:', connected);
    return { connected };
  } catch (error) {
    console.error('Error testing LLM provider:', error);
    return { error: error.message, connected: false };
  }
});

// IPC: Open settings window
ipcMain.on('open-settings', () => {
  mainWindow.webContents.send('show-settings', true);
});

// IPC: Get usage metrics dashboard
ipcMain.handle('get-usage-metrics', async () => {
  try {
    const dashboard = getDashboardSummary();
    return dashboard;
  } catch (error) {
    console.error('Error getting usage metrics:', error);
    return { error: error.message };
  }
});

// IPC: Get current session metrics
ipcMain.handle('get-current-session-metrics', async () => {
  try {
    const metrics = getCurrentSessionMetrics();
    return metrics;
  } catch (error) {
    console.error('Error getting current session metrics:', error);
    return { error: error.message };
  }
});

// IPC: Export usage data
ipcMain.handle('export-usage-data', async () => {
  try {
    const data = exportUsageData();
    
    // Save to Downloads folder
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `auracle-usage-data-${timestamp}.json`;
    const filepath = path.join(downloadsPath, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    console.log(`Usage data exported to: ${filepath}`);
    return { success: true, filepath };
    
  } catch (error) {
    console.error('Error exporting usage data:', error);
    return { error: error.message };
  }
});

// IPC: Get all templates
ipcMain.handle('get-templates', async (_, filter = {}) => {
  try {
    const templates = await getTemplates(filter);
    console.log('Retrieved templates from storage:', templates.length);
    // Debug template IDs
    templates.forEach((template, index) => {
      console.log(`Template ${index} ID:`, template._id, 'Type:', typeof template._id, 'Name:', template.name);
    });
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates:', error);
    return { error: error.message };
  }
});

// IPC: Get templates by category
ipcMain.handle('get-templates-by-category', async (_, category) => {
  try {
    const templates = await getTemplatesByCategory(category);
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates by category:', error);
    return { error: error.message };
  }
});

// IPC: Search templates
ipcMain.handle('search-templates', async (_, searchTerm) => {
  try {
    const templates = await searchTemplates(searchTerm);
    return { success: true, templates };
  } catch (error) {
    console.error('Error searching templates:', error);
    return { error: error.message };
  }
});

// IPC: Create custom template
ipcMain.handle('create-template', async (_, templateData) => {
  try {
    const template = await createCustomTemplate(templateData);
    return { success: true, template };
  } catch (error) {
    console.error('Error creating template:', error);
    return { error: error.message };
  }
});

// IPC: Update template
ipcMain.handle('update-template', async (_, templateId, updates) => {
  try {
    const result = await updateCustomTemplate(templateId, updates);
    return { success: result };
  } catch (error) {
    console.error('Error updating template:', error);
    return { error: error.message };
  }
});

// IPC: Delete template
ipcMain.handle('delete-template', async (_, templateId) => {
  try {
    const result = await deleteCustomTemplate(templateId);
    return { success: result };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { error: error.message };
  }
});

// IPC: Generate report from template
ipcMain.handle('generate-report', async (_, templateId, transcript, variables, sessionId) => {
  try {
    console.log('Generating report with template ID:', templateId);
    console.log('Template ID type:', typeof templateId);
    console.log('Template ID value:', templateId);
    const result = await generateReport(templateId, transcript, variables, sessionId);
    return result;
  } catch (error) {
    console.error('Error generating report:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Get report by ID
ipcMain.handle('get-report', async (_, reportId) => {
  try {
    const result = await getReport(reportId);
    return result;
  } catch (error) {
    console.error('Error getting report:', error);
    return { error: error.message };
  }
});

// IPC: Get reports for session
ipcMain.handle('get-session-reports', async (_, sessionId) => {
  try {
    const result = await getSessionReports(sessionId);
    return result;
  } catch (error) {
    console.error('Error getting session reports:', error);
    return { error: error.message };
  }
});

// IPC: Get user reports
ipcMain.handle('get-user-reports', async (_, filter = {}, options = {}) => {
  try {
    const result = await getUserReports(filter, options);
    return result;
  } catch (error) {
    console.error('Error getting user reports:', error);
    return { error: error.message };
  }
});

// IPC: Update report
ipcMain.handle('update-report', async (_, reportId, updates) => {
  try {
    const result = await updateReport(reportId, updates);
    return result;
  } catch (error) {
    console.error('Error updating report:', error);
    return { error: error.message };
  }
});

// IPC: Export report
ipcMain.handle('export-report', async (_, reportId, format = 'markdown') => {
  try {
    const result = await exportReport(reportId, format);
    
    if (result.success) {
      // Save to Downloads folder
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const filepath = path.join(downloadsPath, result.filename);
      
      fs.writeFileSync(filepath, result.content);
      
      console.log(`Report exported to: ${filepath}`);
      return { success: true, filepath, filename: result.filename };
    }
    
    return result;
  } catch (error) {
    console.error('Error exporting report:', error);
    return { error: error.message };
  }
});

// IPC: Validate template schema
ipcMain.handle('validate-template-schema', async (_, templateData) => {
  try {
    const errors = validateTemplateSchema(templateData);
    return { success: true, errors };
  } catch (error) {
    console.error('Error validating template schema:', error);
    return { error: error.message };
  }
});

// IPC: Import template from JSON
ipcMain.handle('import-template', async (_, templateJson) => {
  try {
    const result = await importTemplate(templateJson);
    return { success: true, template: result };
  } catch (error) {
    console.error('Error importing template:', error);
    return { error: error.message };
  }
});

// IPC: Export template to JSON
ipcMain.handle('export-template-json', async (_, templateId) => {
  try {
    console.log('Export template IPC called with ID:', templateId, typeof templateId);
    const result = await exportTemplate(templateId);
    console.log('Export template result:', result);
    
    if (result.success) {
      // Save to Downloads folder
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const filepath = path.join(downloadsPath, result.filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result.template, null, 2));
      
      console.log(`Template exported to: ${filepath}`);
      return { success: true, filepath, filename: result.filename };
    }
    
    return result;
  } catch (error) {
    console.error('Error exporting template:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Export all templates
ipcMain.handle('export-all-templates', async () => {
  try {
    console.log('Export all templates IPC called');
    const result = await exportAllTemplates();
    console.log('Export all templates result:', result);
    
    if (result.success) {
      // Save to Downloads folder
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const filepath = path.join(downloadsPath, result.filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result.data, null, 2));
      
      console.log(`All templates exported to: ${filepath}`);
      return { success: true, filepath, filename: result.filename };
    }
    
    return result;
  } catch (error) {
    console.error('Error exporting all templates:', error);
    return { success: false, error: error.message };
  }
});

// IPC: Import template collection
ipcMain.handle('import-template-collection', async (_, collectionJson) => {
  try {
    const result = await importTemplateCollection(collectionJson);
    return result;
  } catch (error) {
    console.error('Error importing template collection:', error);
    return { error: error.message };
  }
});

// IPC: Get exported reports
ipcMain.handle('get-exported-reports', async (_, filter = {}, options = {}) => {
  try {
    const reports = await getExportedReports(filter, options);
    return { success: true, reports };
  } catch (error) {
    console.error('Error getting exported reports:', error);
    return { error: error.message };
  }
});

// IPC: Get exported reports by user
ipcMain.handle('get-exported-reports-by-user', async (_, userId = 'default-user', options = {}) => {
  try {
    const reports = await getExportedReportsByUser(userId, options);
    return { success: true, reports };
  } catch (error) {
    console.error('Error getting exported reports by user:', error);
    return { error: error.message };
  }
});

// IPC: Get export history for a report
ipcMain.handle('get-export-history', async (_, reportId) => {
  try {
    const history = await getExportHistory(reportId);
    return { success: true, history };
  } catch (error) {
    console.error('Error getting export history:', error);
    return { error: error.message };
  }
});

// IPC: Delete exported report
ipcMain.handle('delete-exported-report', async (_, exportId) => {
  try {
    const result = await deleteExportedReport(exportId);
    return { success: true, deleted: result.deletedCount > 0 };
  } catch (error) {
    console.error('Error deleting exported report:', error);
    return { error: error.message };
  }
});

// IPC: Search reports
ipcMain.handle('search-reports', async (_, query, options = {}) => {
  try {
    const reports = await searchReports(query, options);
    return { success: true, reports };
  } catch (error) {
    console.error('Error searching reports:', error);
    return { error: error.message };
  }
});

// IPC: Get reports by date range
ipcMain.handle('get-reports-by-date-range', async (_, startDate, endDate, options = {}) => {
  try {
    const reports = await getReportsByDateRange(startDate, endDate, options);
    return { success: true, reports };
  } catch (error) {
    console.error('Error getting reports by date range:', error);
    return { error: error.message };
  }
});

// IPC: Get favorite reports
ipcMain.handle('get-favorite-reports', async (_, userId = 'default-user', options = {}) => {
  try {
    const reports = await getFavoriteReports(userId, options);
    return { success: true, reports };
  } catch (error) {
    console.error('Error getting favorite reports:', error);
    return { error: error.message };
  }
});

// IPC: Get storage statistics
ipcMain.handle('get-storage-stats', async () => {
  try {
    const stats = await getStorageStats();
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { error: error.message };
  }
});

// IPC: Save template version
ipcMain.handle('save-template-version', async (_, templateId, templateData, action = 'updated') => {
  try {
    const result = await saveTemplateVersion(templateId, templateData, action);
    return { success: true, versionId: result.insertedId };
  } catch (error) {
    console.error('Error saving template version:', error);
    return { error: error.message };
  }
});

// IPC: Get template history
ipcMain.handle('get-template-history', async (_, templateId, options = {}) => {
  try {
    const history = await getTemplateHistory(templateId, options);
    return { success: true, history };
  } catch (error) {
    console.error('Error getting template history:', error);
    return { error: error.message };
  }
});

// IPC: Get specific template version
ipcMain.handle('get-template-version', async (_, templateId, version) => {
  try {
    const versionData = await getTemplateVersion(templateId, version);
    return { success: true, versionData };
  } catch (error) {
    console.error('Error getting template version:', error);
    return { error: error.message };
  }
});

// IPC: Restore template version
ipcMain.handle('restore-template-version', async (_, templateId, version) => {
  try {
    const result = await restoreTemplateVersion(templateId, version);
    return { success: true, restoredData: result };
  } catch (error) {
    console.error('Error restoring template version:', error);
    return { error: error.message };
  }
});

// Real-time Analysis IPC Handlers
ipcMain.handle('get-realtime-data', async () => {
  try {
    const data = processor.getRealtimeData();
    return { success: true, data };
  } catch (error) {
    console.error('Error getting real-time data:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-executive-summary', async () => {
  try {
    const summary = processor.getExecutiveSummary();
    return { success: true, summary };
  } catch (error) {
    console.error('Error getting executive summary:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-current-slides', async () => {
  try {
    const slides = processor.getCurrentSlides();
    return { success: true, slides };
  } catch (error) {
    console.error('Error getting current slides:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-knowledge-graph', async (_, options = {}) => {
  try {
    const graphData = processor.getKnowledgeGraph(options);
    return { success: true, graphData };
  } catch (error) {
    console.error('Error getting knowledge graph:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-recent-insights', async (_, limit = 10) => {
  try {
    const insights = processor.realtimeAnalyzer.getRecentInsights(limit);
    return { success: true, insights };
  } catch (error) {
    console.error('Error getting recent insights:', error);
    return { error: error.message };
  }
});

// Emergency Debug IPC Handlers
ipcMain.handle('debug-generate-report', async () => {
  if (blankingDebugger) {
    const reportPath = blankingDebugger.generateDebugReport();
    console.log('🔧 Debug report generated:', reportPath);
    return { success: true, reportPath };
  }
  return { error: 'Debugger not initialized' };
});

ipcMain.handle('debug-capture-snapshot', async (_, trigger) => {
  if (blankingDebugger) {
    blankingDebugger.captureDebugSnapshot(trigger || 'manual');
    return { success: true };
  }
  return { error: 'Debugger not initialized' };
});

ipcMain.on('debug-emergency-recovery', () => {
  console.log('🚨 Emergency recovery initiated from renderer');
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Try to restore window
    mainWindow.show();
    mainWindow.focus();
    
    // Reload the page
    mainWindow.webContents.reload();
    
    // Re-inject diagnostic script after reload
    mainWindow.webContents.once('did-finish-load', () => {
      const diagnosticScript = fs.readFileSync(path.join(__dirname, '../emergency-diagnostic.js'), 'utf8');
      mainWindow.webContents.executeJavaScript(diagnosticScript);
    });
  }
});