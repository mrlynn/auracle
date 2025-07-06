// Emergency Debugging Toolkit for Auracle Blanking Issue
// This file provides comprehensive debugging tools to identify the root cause

const { app, BrowserWindow, ipcMain, systemPreferences, screen } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class BlankingDebugger {
  constructor() {
    this.logFile = path.join(os.homedir(), 'auracle-debug.log');
    this.monitors = [];
    this.isDebugging = false;
    this.lastScreenshot = null;
    this.performanceData = {
      memory: [],
      cpu: [],
      gpu: [],
      renderingEvents: []
    };
    
    this.setupDebugMode();
  }

  setupDebugMode() {
    // Only set up Electron debugging flags if app is available (running in Electron)
    if (app && app.commandLine) {
      // Enable Electron debugging flags
      app.commandLine.appendSwitch('enable-logging', 'stderr');
      app.commandLine.appendSwitch('log-level', '0');
      app.commandLine.appendSwitch('enable-crash-reporter');
      app.commandLine.appendSwitch('v', '1'); // Verbose logging
      
      // GPU debugging
      app.commandLine.appendSwitch('disable-gpu-sandbox');
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('force-gpu-rasterization');
      
      // Renderer debugging
      app.commandLine.appendSwitch('enable-renderer-tls-check');
      app.commandLine.appendSwitch('disable-background-timer-throttling');
      app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
      app.commandLine.appendSwitch('disable-renderer-backgrounding');
      
      this.log('🔧 Debug mode enabled with comprehensive logging');
    } else {
      this.log('🔧 Running outside Electron - basic debug mode only');
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(logEntry);
    
    // Append to debug log file
    fs.appendFileSync(this.logFile, logEntry);
  }

  // Monitor system resources
  startSystemMonitoring() {
    this.log('🔍 Starting system monitoring...');
    
    // Memory monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.performanceData.memory.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      });
      
      // Log high memory usage
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.log(`⚠️  High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
    }, 1000);

    // CPU monitoring (macOS specific)
    if (process.platform === 'darwin') {
      setInterval(() => {
        exec('top -l 1 -n 0 | grep "Auracle\\|Electron"', (error, stdout, stderr) => {
          if (stdout) {
            const cpuMatch = stdout.match(/(\d+\.\d+)%/);
            if (cpuMatch) {
              const cpuUsage = parseFloat(cpuMatch[1]);
              this.performanceData.cpu.push({
                timestamp: Date.now(),
                usage: cpuUsage
              });
              
              if (cpuUsage > 80) {
                this.log(`⚠️  High CPU usage: ${cpuUsage}%`);
              }
            }
          }
        });
      }, 2000);
    }
  }

  // Monitor GPU processes
  startGPUMonitoring() {
    this.log('🎮 Starting GPU monitoring...');
    
    if (process.platform === 'darwin') {
      setInterval(() => {
        exec('ps aux | grep -i gpu', (error, stdout, stderr) => {
          if (stdout) {
            const gpuProcesses = stdout.split('\n').filter(line => 
              line.includes('gpu') && !line.includes('grep')
            );
            
            if (gpuProcesses.length > 0) {
              this.log(`🎮 GPU processes: ${gpuProcesses.length}`);
            }
          }
        });
      }, 5000);
    }
  }

  // Monitor window state changes
  monitorWindowStates(mainWindow) {
    this.log('🪟 Setting up window state monitoring...');
    
    // Monitor window visibility
    mainWindow.on('hide', () => {
      this.log('🚨 CRITICAL: Window hidden!');
      this.captureDebugSnapshot('window-hidden');
    });
    
    mainWindow.on('show', () => {
      this.log('✅ Window shown');
    });
    
    mainWindow.on('minimize', () => {
      this.log('📉 Window minimized');
    });
    
    mainWindow.on('restore', () => {
      this.log('📈 Window restored');
    });
    
    mainWindow.on('blur', () => {
      this.log('🔍 Window lost focus');
    });
    
    mainWindow.on('focus', () => {
      this.log('🎯 Window gained focus');
    });
    
    // Monitor renderer process crashes
    mainWindow.webContents.on('crashed', (event, killed) => {
      this.log(`🚨 CRITICAL: Renderer crashed! Killed: ${killed}`);
      this.captureDebugSnapshot('renderer-crashed');
    });
    
    mainWindow.webContents.on('unresponsive', () => {
      this.log('🚨 CRITICAL: Renderer unresponsive!');
      this.captureDebugSnapshot('renderer-unresponsive');
    });
    
    mainWindow.webContents.on('responsive', () => {
      this.log('✅ Renderer responsive again');
    });
    
    // Monitor DOM ready state
    mainWindow.webContents.on('dom-ready', () => {
      this.log('✅ DOM ready');
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      this.log('✅ Page finished loading');
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      this.log(`🚨 Page failed to load: ${errorCode} - ${errorDescription}`);
    });
  }

  // Monitor system power events
  monitorPowerEvents() {
    this.log('⚡ Setting up power event monitoring...');
    
    // Monitor system sleep/wake
    if (process.platform === 'darwin') {
      if (app) {
        app.on('before-quit', () => {
          this.log('🛑 App quitting');
        });
      }
      
      // Monitor display sleep
      setInterval(() => {
        exec('pmset -g ps', (error, stdout, stderr) => {
          if (stdout) {
            if (stdout.includes('sleep')) {
              this.log('😴 System entering sleep');
            }
          }
        });
      }, 5000);
    }
  }

  // Capture comprehensive debug snapshot
  captureDebugSnapshot(trigger) {
    this.log(`📸 Capturing debug snapshot (trigger: ${trigger})`);
    
    const snapshot = {
      timestamp: Date.now(),
      trigger,
      system: {
        platform: process.platform,
        version: process.version,
        electronVersion: process.versions.electron,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      screen: screen ? {
        displays: screen ? screen.getAllDisplays() : [],
        primaryDisplay: screen ? screen.getPrimaryDisplay() : null
      } : { message: 'Screen API not available' },
      performance: {
        memory: this.performanceData.memory.slice(-10),
        cpu: this.performanceData.cpu.slice(-10),
        gpu: this.performanceData.gpu.slice(-10)
      }
    };
    
    // Save snapshot to file
    const snapshotFile = path.join(os.homedir(), `auracle-snapshot-${Date.now()}.json`);
    fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
    
    this.log(`📸 Debug snapshot saved to: ${snapshotFile}`);
  }

  // Enable remote debugging
  enableRemoteDebugging(mainWindow) {
    this.log('🔧 Setting up remote debugging...');
    
    // Enable remote debugging on port 9222
    if (app && app.commandLine) {
      app.commandLine.appendSwitch('remote-debugging-port', '9222');
    }
    
    // Add debug console commands
    mainWindow.webContents.executeJavaScript(`
      console.log('🔧 Debug mode active');
      
      // Add global debug functions
      window.debugAuracle = {
        captureDOM: () => {
          return {
            html: document.documentElement.outerHTML,
            body: document.body.innerHTML,
            styles: Array.from(document.styleSheets).map(sheet => {
              try {
                return Array.from(sheet.cssRules).map(rule => rule.cssText);
              } catch (e) {
                return 'Unable to access stylesheet: ' + e.message;
              }
            }),
            computed: {
              bodyDisplay: getComputedStyle(document.body).display,
              bodyVisibility: getComputedStyle(document.body).visibility,
              bodyOpacity: getComputedStyle(document.body).opacity,
              bodyZIndex: getComputedStyle(document.body).zIndex
            }
          };
        },
        
        checkVisibility: () => {
          const elements = document.querySelectorAll('*');
          const hiddenElements = [];
          
          elements.forEach(el => {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              hiddenElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity
              });
            }
          });
          
          return hiddenElements;
        },
        
        monitorChanges: () => {
          const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
              if (mutation.type === 'attributes' && 
                  (mutation.attributeName === 'style' || 
                   mutation.attributeName === 'class')) {
                console.log('🔍 Style/class changed:', mutation.target, mutation.attributeName);
              }
            });
          });
          
          observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class']
          });
          
          return 'Monitoring DOM changes...';
        }
      };
      
      // Monitor for blanking
      let lastBodyHTML = document.body.innerHTML;
      setInterval(() => {
        const currentBodyHTML = document.body.innerHTML;
        const bodyVisible = getComputedStyle(document.body).display !== 'none' &&
                           getComputedStyle(document.body).visibility !== 'hidden' &&
                           getComputedStyle(document.body).opacity !== '0';
        
        if (!bodyVisible || currentBodyHTML.trim() === '') {
          console.error('🚨 BLANKING DETECTED!', {
            bodyVisible,
            hasContent: currentBodyHTML.trim() !== '',
            timestamp: new Date().toISOString()
          });
          
          // Send to main process
          if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('blanking-detected', {
              bodyVisible,
              hasContent: currentBodyHTML.trim() !== '',
              timestamp: new Date().toISOString(),
              debug: window.debugAuracle.captureDOM()
            });
          }
        }
        
        lastBodyHTML = currentBodyHTML;
      }, 500);
    `);
  }

  // Start comprehensive monitoring
  startMonitoring(mainWindow) {
    this.log('🚀 Starting comprehensive monitoring...');
    
    this.startSystemMonitoring();
    this.startGPUMonitoring();
    this.monitorWindowStates(mainWindow);
    this.monitorPowerEvents();
    this.enableRemoteDebugging(mainWindow);
    
    // Set up IPC handlers for debug info
    ipcMain.on('blanking-detected', (event, data) => {
      this.log(`🚨 BLANKING DETECTED BY RENDERER: ${JSON.stringify(data)}`);
      this.captureDebugSnapshot('blanking-detected');
    });
    
    // Enable crash reporting
    process.on('uncaughtException', (error) => {
      this.log(`🚨 Uncaught Exception: ${error.message}\n${error.stack}`);
      this.captureDebugSnapshot('uncaught-exception');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.log(`🚨 Unhandled Rejection at: ${promise} reason: ${reason}`);
      this.captureDebugSnapshot('unhandled-rejection');
    });
    
    this.log('✅ All monitoring systems active');
  }

  // Generate debug report
  generateDebugReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        version: process.version,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      displays: screen ? screen.getAllDisplays() : [],
      performance: this.performanceData,
      logFile: this.logFile
    };
    
    const reportFile = path.join(os.homedir(), `auracle-debug-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📋 Debug report generated: ${reportFile}`);
    return reportFile;
  }
}

module.exports = BlankingDebugger;