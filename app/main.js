const { app, BrowserWindow, ipcMain } = require('electron');
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

let mainWindow;
let whisperProc = null;
let currentSession = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Open DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }
  
  // Set up processor event handlers
  setupProcessorHandlers();
  
  // Test LLM connection after page is ready
  mainWindow.webContents.once('did-finish-load', () => {
    testLLMConnection().then(connected => {
      console.log('Sending llm-status to renderer:', connected);
      mainWindow.webContents.send('ollama-status', connected);
    });
  });
  
  // Check LLM status periodically
  setInterval(async () => {
    const connected = await testLLMConnection();
    console.log('Periodic llm-status check:', connected);
    mainWindow.webContents.send('ollama-status', connected);
  }, 5000); // Check every 5 seconds
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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: Start transcription
ipcMain.on('start-transcription', (event) => {
  if (whisperProc) return; // Already running
  
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
  
  whisperProc = stt.startTranscription((line) => {
    // Send to UI
    mainWindow.webContents.send('transcript-update', line);
    
    // Add to session
    if (currentSession) {
      currentSession.transcript.push({
        text: line,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process through pipeline
    processor.addTranscript(line);
  });
});

// IPC: Stop transcription
ipcMain.on('stop-transcription', async () => {
  if (whisperProc) {
    whisperProc.kill();
    whisperProc = null;
    
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
  processor.flush();
});

// IPC: Check LLM status immediately
ipcMain.on('check-ollama-status', async () => {
  const connected = await testLLMConnection();
  console.log('Manual llm-status check:', connected);
  mainWindow.webContents.send('ollama-status', connected);
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