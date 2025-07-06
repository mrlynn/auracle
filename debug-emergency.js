// Emergency Real-Time Debugging System for Auracle Blanking Issue
// This script monitors EVERYTHING to catch the exact moment of blanking

const fs = require('fs');
const path = require('path');
const os = require('os');

class EmergencyDebugger {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.logFile = path.join(os.homedir(), 'auracle-emergency-debug.log');
    this.isMonitoring = false;
    this.intervals = [];
    this.lastKnownState = {
      visible: true,
      focused: true,
      bounds: null,
      timestamp: Date.now()
    };
    
    this.setupEmergencyLogging();
    this.startEmergencyMonitoring();
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(data)}\n`;
    
    console.log(`🚨 DEBUG: ${logLine.trim()}`);
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write debug log:', error);
    }
  }

  setupEmergencyLogging() {
    // Clear previous log
    try {
      fs.writeFileSync(this.logFile, `=== AURACLE EMERGENCY DEBUG LOG ===\nStarted: ${new Date().toISOString()}\n\n`);
    } catch (error) {
      console.error('Failed to initialize debug log:', error);
    }

    this.log('INIT', 'Emergency debugger initialized');
  }

  startEmergencyMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    this.log('MONITOR', 'Starting emergency monitoring');

    // 1. Monitor window state every 100ms (very frequent)
    const windowMonitor = setInterval(() => {
      this.checkWindowState();
    }, 100);
    this.intervals.push(windowMonitor);

    // 2. Monitor renderer process every 500ms
    const rendererMonitor = setInterval(() => {
      this.checkRendererProcess();
    }, 500);
    this.intervals.push(rendererMonitor);

    // 3. Monitor memory every 1 second
    const memoryMonitor = setInterval(() => {
      this.checkMemoryUsage();
    }, 1000);
    this.intervals.push(memoryMonitor);

    // 4. Monitor system resources every 2 seconds
    const systemMonitor = setInterval(() => {
      this.checkSystemResources();
    }, 2000);
    this.intervals.push(systemMonitor);

    // 5. Ping renderer to check if it's responsive
    const responsiveMonitor = setInterval(() => {
      this.checkRendererResponsiveness();
    }, 1000);
    this.intervals.push(responsiveMonitor);
  }

  checkWindowState() {
    if (!this.mainWindow) return;

    try {
      const currentState = {
        visible: this.mainWindow.isVisible(),
        focused: this.mainWindow.isFocused(),
        minimized: this.mainWindow.isMinimized(),
        maximized: this.mainWindow.isMaximized(),
        bounds: this.mainWindow.getBounds(),
        title: this.mainWindow.getTitle(),
        destroyed: this.mainWindow.isDestroyed(),
        timestamp: Date.now()
      };

      // Check for critical state changes
      if (this.lastKnownState.visible && !currentState.visible) {
        this.log('CRITICAL', 'WINDOW BECAME INVISIBLE', currentState);
        this.emergencySnapshot('window_invisible');
      }

      if (!currentState.focused && this.lastKnownState.focused) {
        this.log('WARNING', 'Window lost focus', currentState);
      }

      if (currentState.destroyed) {
        this.log('CRITICAL', 'WINDOW DESTROYED', currentState);
      }

      this.lastKnownState = currentState;
    } catch (error) {
      this.log('ERROR', 'Window state check failed', { error: error.message });
    }
  }

  checkRendererProcess() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      // Check if webContents is available
      const webContents = this.mainWindow.webContents;
      if (!webContents) {
        this.log('CRITICAL', 'WebContents missing');
        return;
      }

      const rendererState = {
        crashed: webContents.isCrashed(),
        loading: webContents.isLoading(),
        destroyed: webContents.isDestroyed(),
        devToolsOpened: webContents.isDevToolsOpened(),
        url: webContents.getURL(),
        title: webContents.getTitle(),
        zoomFactor: webContents.getZoomFactor(),
        timestamp: Date.now()
      };

      if (rendererState.crashed) {
        this.log('CRITICAL', 'RENDERER PROCESS CRASHED', rendererState);
        this.emergencySnapshot('renderer_crashed');
        this.attemptRecovery();
      }

      if (rendererState.destroyed) {
        this.log('CRITICAL', 'RENDERER PROCESS DESTROYED', rendererState);
      }

    } catch (error) {
      this.log('ERROR', 'Renderer process check failed', { error: error.message });
    }
  }

  checkMemoryUsage() {
    try {
      const memInfo = process.memoryUsage();
      const memMB = {
        rss: Math.round(memInfo.rss / 1024 / 1024),
        heapUsed: Math.round(memInfo.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memInfo.heapTotal / 1024 / 1024),
        external: Math.round(memInfo.external / 1024 / 1024)
      };

      // Log if memory usage is concerning
      if (memMB.heapUsed > 200) {
        this.log('WARNING', 'High memory usage detected', memMB);
      }

      if (memMB.heapUsed > 500) {
        this.log('CRITICAL', 'EXTREMELY HIGH MEMORY USAGE', memMB);
        this.emergencySnapshot('high_memory');
      }

    } catch (error) {
      this.log('ERROR', 'Memory check failed', { error: error.message });
    }
  }

  checkSystemResources() {
    try {
      const cpuUsage = process.cpuUsage();
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        loadAverage: os.loadavg(),
        uptime: os.uptime(),
        cpuUsage: cpuUsage
      };

      // Check for concerning system state
      const memoryUsagePercent = (1 - systemInfo.freeMemory / systemInfo.totalMemory) * 100;
      if (memoryUsagePercent > 90) {
        this.log('WARNING', 'System memory critically low', systemInfo);
      }

    } catch (error) {
      this.log('ERROR', 'System resource check failed', { error: error.message });
    }
  }

  checkRendererResponsiveness() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      // Send a ping to renderer and expect a response
      this.mainWindow.webContents.send('debug-ping', { timestamp: Date.now() });
      
      // Set a timeout to detect if renderer doesn't respond
      setTimeout(() => {
        // This will be cleared if we receive a pong
        if (!this.lastPongReceived || (Date.now() - this.lastPongReceived) > 3000) {
          this.log('WARNING', 'Renderer not responding to ping');
        }
      }, 2000);

    } catch (error) {
      this.log('ERROR', 'Responsiveness check failed', { error: error.message });
    }
  }

  emergencySnapshot(reason) {
    this.log('SNAPSHOT', `Creating emergency snapshot: ${reason}`);
    
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        reason: reason,
        process: {
          pid: process.pid,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          uptime: process.uptime()
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
          loadAverage: os.loadavg()
        },
        window: this.lastKnownState
      };

      const snapshotFile = path.join(os.homedir(), `auracle-snapshot-${reason}-${Date.now()}.json`);
      fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
      
      this.log('SNAPSHOT', `Snapshot saved to ${snapshotFile}`);
    } catch (error) {
      this.log('ERROR', 'Failed to create snapshot', { error: error.message });
    }
  }

  attemptRecovery() {
    this.log('RECOVERY', 'Attempting emergency recovery');
    
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Try to reload the renderer
        this.mainWindow.webContents.reload();
        this.log('RECOVERY', 'Renderer reload attempted');
      }
    } catch (error) {
      this.log('ERROR', 'Recovery attempt failed', { error: error.message });
    }
  }

  // Called from IPC when renderer responds to ping
  receivePong() {
    this.lastPongReceived = Date.now();
  }

  stop() {
    this.isMonitoring = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.log('MONITOR', 'Emergency monitoring stopped');
  }
}

module.exports = EmergencyDebugger;