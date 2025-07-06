// Emergency Renderer-Side Debugging for Screen Blanking
// This script runs in the renderer process to monitor DOM state

class RendererEmergencyDebug {
  constructor() {
    this.isMonitoring = false;
    this.intervals = [];
    this.lastDOMState = null;
    this.blankingDetected = false;
    
    this.startMonitoring();
    this.setupIPCHandlers();
    this.injectVisualIndicator();
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`🔍 RENDERER DEBUG [${timestamp}] ${level}: ${message}`, data);
    
    // Send to main process
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('debug-log', { level, message, data, timestamp });
      }
    } catch (error) {
      console.error('Failed to send debug log to main process:', error);
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    this.log('INIT', 'Starting renderer emergency monitoring');

    // 1. Monitor DOM state every 500ms
    const domMonitor = setInterval(() => {
      this.checkDOMState();
    }, 500);
    this.intervals.push(domMonitor);

    // 2. Monitor React state every 1 second
    const reactMonitor = setInterval(() => {
      this.checkReactState();
    }, 1000);
    this.intervals.push(reactMonitor);

    // 3. Monitor memory usage every 2 seconds
    const memoryMonitor = setInterval(() => {
      this.checkRendererMemory();
    }, 2000);
    this.intervals.push(memoryMonitor);

    // 4. Check for CSS/styling issues every 1 second
    const styleMonitor = setInterval(() => {
      this.checkStylingIssues();
    }, 1000);
    this.intervals.push(styleMonitor);

    // 5. Monitor console errors
    this.setupErrorMonitoring();
  }

  checkDOMState() {
    try {
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        this.log('CRITICAL', 'ROOT ELEMENT MISSING - This could cause blanking');
        return;
      }

      const bodyStyle = window.getComputedStyle(document.body);
      const rootStyle = window.getComputedStyle(rootElement);
      
      const domState = {
        documentReadyState: document.readyState,
        bodyVisible: bodyStyle.display !== 'none' && bodyStyle.visibility !== 'hidden',
        bodyOpacity: bodyStyle.opacity,
        rootVisible: rootStyle.display !== 'none' && rootStyle.visibility !== 'hidden',
        rootOpacity: rootStyle.opacity,
        childrenCount: rootElement.children.length,
        bodyBackground: bodyStyle.backgroundColor,
        rootBackground: rootStyle.backgroundColor,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Check for blanking conditions
      const isPotentiallyBlank = (
        domState.bodyOpacity === '0' ||
        domState.rootOpacity === '0' ||
        !domState.bodyVisible ||
        !domState.rootVisible ||
        domState.childrenCount === 0
      );

      if (isPotentiallyBlank && !this.blankingDetected) {
        this.blankingDetected = true;
        this.log('CRITICAL', '🚨 POTENTIAL BLANKING DETECTED', domState);
        this.emergencyDOMAnalysis();
        this.attemptDOMRecovery();
      } else if (!isPotentiallyBlank && this.blankingDetected) {
        this.blankingDetected = false;
        this.log('RECOVERY', 'Blanking condition resolved', domState);
      }

      this.lastDOMState = domState;
    } catch (error) {
      this.log('ERROR', 'DOM state check failed', { error: error.message, stack: error.stack });
    }
  }

  checkReactState() {
    try {
      // Check if React is mounted and working
      const root = document.getElementById('root');
      const reactFiberNode = root?._reactInternalFiber || 
                            root?._reactInternals ||
                            root?._reactRootContainer?._internalRoot?.current;
      
      const reactState = {
        reactMounted: !!reactFiberNode,
        hasReactComponents: document.querySelectorAll('[data-reactroot]').length > 0,
        muiComponents: document.querySelectorAll('[class*="Mui"]').length,
        totalComponents: document.querySelectorAll('*').length,
        rootExists: !!root,
        rootChildren: root?.children?.length || 0
      };

      if (!reactState.reactMounted && reactState.muiComponents > 0) {
        this.log('CRITICAL', '🚨 REACT CRASHED - MUI components exist but React is unmounted!', reactState);
        this.attemptReactRecovery();
      } else if (!reactState.reactMounted) {
        this.log('CRITICAL', 'React appears to be unmounted', reactState);
      }

      if (reactState.totalComponents < 10) {
        this.log('WARNING', 'Very few DOM elements detected', reactState);
      }

    } catch (error) {
      this.log('ERROR', 'React state check failed', { error: error.message });
    }
  }

  attemptReactRecovery() {
    this.log('RECOVERY', '🚨 Attempting React recovery');
    
    try {
      // Force a page reload to recover from React crash
      if (window.location && !this.recoveryAttempted) {
        this.recoveryAttempted = true;
        this.log('RECOVERY', 'Reloading page to recover React');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      this.log('ERROR', 'React recovery failed', { error: error.message });
    }
  }

  checkRendererMemory() {
    try {
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        const memoryMB = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };

        const usagePercent = (memoryMB.used / memoryMB.limit) * 100;

        if (usagePercent > 80) {
          this.log('CRITICAL', 'Renderer memory critically high', { 
            ...memoryMB, 
            usagePercent: usagePercent.toFixed(1) 
          });
        }
      }
    } catch (error) {
      this.log('ERROR', 'Memory check failed', { error: error.message });
    }
  }

  checkStylingIssues() {
    try {
      const body = document.body;
      const root = document.getElementById('root');
      
      if (!body || !root) return;

      const bodyComputedStyle = window.getComputedStyle(body);
      const rootComputedStyle = window.getComputedStyle(root);

      // Check for common styling issues that could cause blanking
      const issues = [];

      if (bodyComputedStyle.display === 'none') issues.push('body display:none');
      if (bodyComputedStyle.visibility === 'hidden') issues.push('body visibility:hidden');
      if (bodyComputedStyle.opacity === '0') issues.push('body opacity:0');
      if (rootComputedStyle.display === 'none') issues.push('root display:none');
      if (rootComputedStyle.visibility === 'hidden') issues.push('root visibility:hidden');
      if (rootComputedStyle.opacity === '0') issues.push('root opacity:0');
      
      // Check for z-index issues
      const zIndex = rootComputedStyle.zIndex;
      if (zIndex && parseInt(zIndex) < 0) issues.push('root negative z-index');

      // Check for transform issues
      const transform = rootComputedStyle.transform;
      if (transform && transform !== 'none' && transform.includes('scale(0')) {
        issues.push('root scaled to 0');
      }

      if (issues.length > 0) {
        this.log('CRITICAL', 'Styling issues detected that could cause blanking', { issues });
      }

    } catch (error) {
      this.log('ERROR', 'Style check failed', { error: error.message });
    }
  }

  setupErrorMonitoring() {
    // Capture all JavaScript errors
    window.addEventListener('error', (event) => {
      this.log('CRITICAL', 'JavaScript error detected', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('CRITICAL', 'Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Override console.error to catch React errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.log('ERROR', 'Console error', { args: args.map(arg => String(arg)) });
      originalConsoleError.apply(console, args);
    };
  }

  emergencyDOMAnalysis() {
    this.log('ANALYSIS', 'Performing emergency DOM analysis');
    
    try {
      const analysis = {
        documentTitle: document.title,
        documentURL: document.URL,
        readyState: document.readyState,
        body: {
          exists: !!document.body,
          innerHTML: document.body?.innerHTML?.substring(0, 500) || 'MISSING',
          children: document.body?.children?.length || 0
        },
        root: {
          exists: !!document.getElementById('root'),
          innerHTML: document.getElementById('root')?.innerHTML?.substring(0, 500) || 'MISSING',
          children: document.getElementById('root')?.children?.length || 0
        },
        styles: {
          bodyDisplay: window.getComputedStyle(document.body)?.display,
          bodyVisibility: window.getComputedStyle(document.body)?.visibility,
          bodyOpacity: window.getComputedStyle(document.body)?.opacity
        }
      };

      this.log('ANALYSIS', 'DOM analysis complete', analysis);
    } catch (error) {
      this.log('ERROR', 'DOM analysis failed', { error: error.message });
    }
  }

  attemptDOMRecovery() {
    this.log('RECOVERY', 'Attempting DOM recovery');
    
    try {
      const body = document.body;
      const root = document.getElementById('root');

      // Reset critical styles that could cause blanking
      if (body) {
        body.style.display = '';
        body.style.visibility = '';
        body.style.opacity = '';
      }

      if (root) {
        root.style.display = '';
        root.style.visibility = '';
        root.style.opacity = '';
        root.style.zIndex = '';
        root.style.transform = '';
      }

      this.log('RECOVERY', 'DOM recovery styles applied');
    } catch (error) {
      this.log('ERROR', 'DOM recovery failed', { error: error.message });
    }
  }

  setupIPCHandlers() {
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        
        // Respond to ping from main process
        ipcRenderer.on('debug-ping', (event, data) => {
          ipcRenderer.send('debug-pong', { 
            ...data, 
            rendererOk: true,
            timestamp: Date.now(),
            blankingDetected: this.blankingDetected
          });
        });

        // Manual debugging commands
        ipcRenderer.on('debug-force-analysis', () => {
          this.emergencyDOMAnalysis();
        });

        ipcRenderer.on('debug-force-recovery', () => {
          this.attemptDOMRecovery();
        });
      }
    } catch (error) {
      this.log('ERROR', 'IPC setup failed', { error: error.message });
    }
  }

  injectVisualIndicator() {
    // Add a visual indicator that we're monitoring
    try {
      const indicator = document.createElement('div');
      indicator.id = 'debug-indicator';
      indicator.innerHTML = '🔍 DEBUG';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        z-index: 9999999;
        border-radius: 4px;
        font-family: monospace;
      `;
      document.body.appendChild(indicator);

      // Blink the indicator to show we're alive
      setInterval(() => {
        indicator.style.opacity = indicator.style.opacity === '0.3' ? '1' : '0.3';
      }, 1000);

    } catch (error) {
      this.log('ERROR', 'Visual indicator injection failed', { error: error.message });
    }
  }

  stop() {
    this.isMonitoring = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.log('MONITOR', 'Renderer monitoring stopped');
  }
}

// Auto-start when script loads
if (typeof window !== 'undefined') {
  window.emergencyDebug = new RendererEmergencyDebug();
}