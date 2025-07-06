// Emergency Diagnostic Script for Auracle Blanking Issue
// Run this in the Electron Developer Console for immediate debugging

(function() {
  'use strict';
  
  console.log('🚨 EMERGENCY DIAGNOSTIC MODE ACTIVATED');
  console.log('='.repeat(50));
  
  // 1. IMMEDIATE VISUAL STATE CHECK
  function checkVisualState() {
    console.log('🔍 VISUAL STATE CHECK:');
    
    const body = document.body;
    const html = document.documentElement;
    
    const bodyStyle = getComputedStyle(body);
    const htmlStyle = getComputedStyle(html);
    
    console.log('Body element:', {
      display: bodyStyle.display,
      visibility: bodyStyle.visibility,
      opacity: bodyStyle.opacity,
      zIndex: bodyStyle.zIndex,
      width: bodyStyle.width,
      height: bodyStyle.height,
      backgroundColor: bodyStyle.backgroundColor,
      color: bodyStyle.color,
      overflow: bodyStyle.overflow,
      position: bodyStyle.position
    });
    
    console.log('HTML element:', {
      display: htmlStyle.display,
      visibility: htmlStyle.visibility,
      opacity: htmlStyle.opacity,
      backgroundColor: htmlStyle.backgroundColor,
      overflow: htmlStyle.overflow
    });
    
    console.log('Body content length:', body.innerHTML.length);
    console.log('Body text content:', body.textContent.substring(0, 100) + '...');
    
    // Check if body has any visible children
    const visibleChildren = Array.from(body.children).filter(child => {
      const style = getComputedStyle(child);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
    });
    
    console.log('Visible children count:', visibleChildren.length);
    
    return {
      bodyVisible: bodyStyle.display !== 'none' && 
                  bodyStyle.visibility !== 'hidden' && 
                  bodyStyle.opacity !== '0',
      hasContent: body.innerHTML.trim() !== '',
      visibleChildren: visibleChildren.length
    };
  }
  
  // 2. REACT STATE CHECK
  function checkReactState() {
    console.log('⚛️ REACT STATE CHECK:');
    
    // Find React root
    const reactRoot = document.getElementById('root');
    if (!reactRoot) {
      console.error('❌ React root element not found!');
      return { hasRoot: false };
    }
    
    const rootStyle = getComputedStyle(reactRoot);
    console.log('React root style:', {
      display: rootStyle.display,
      visibility: rootStyle.visibility,
      opacity: rootStyle.opacity,
      width: rootStyle.width,
      height: rootStyle.height
    });
    
    // Check for React fiber
    const reactFiber = reactRoot._reactInternalFiber || 
                      reactRoot._reactInternalInstance ||
                      reactRoot._reactRootContainer;
    
    console.log('React fiber exists:', !!reactFiber);
    
    return {
      hasRoot: true,
      rootVisible: rootStyle.display !== 'none' && 
                  rootStyle.visibility !== 'hidden' && 
                  rootStyle.opacity !== '0',
      hasFiber: !!reactFiber
    };
  }
  
  // 3. MATERIAL-UI THEME CHECK
  function checkMUITheme() {
    console.log('🎨 MATERIAL-UI THEME CHECK:');
    
    // Check for MUI theme provider
    const muiTheme = document.querySelector('[data-mui-theme]');
    console.log('MUI theme provider found:', !!muiTheme);
    
    // Check for CSS variables
    const rootStyles = getComputedStyle(document.documentElement);
    const cssVars = {};
    
    for (let i = 0; i < rootStyles.length; i++) {
      const property = rootStyles[i];
      if (property.startsWith('--')) {
        cssVars[property] = rootStyles.getPropertyValue(property);
      }
    }
    
    console.log('CSS variables count:', Object.keys(cssVars).length);
    
    // Check for MUI components
    const muiComponents = document.querySelectorAll('[class*="Mui"], [class*="MuiBox"], [class*="MuiContainer"]');
    console.log('MUI components found:', muiComponents.length);
    
    return {
      hasThemeProvider: !!muiTheme,
      cssVarCount: Object.keys(cssVars).length,
      muiComponentCount: muiComponents.length
    };
  }
  
  // 4. ERROR MONITORING
  function setupErrorMonitoring() {
    console.log('🔍 SETTING UP ERROR MONITORING:');
    
    // Monitor all errors
    window.addEventListener('error', (event) => {
      console.error('🚨 JavaScript Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    });
    
    // Monitor React errors if available
    if (window.React) {
      console.log('React version:', window.React.version);
    }
    
    console.log('✅ Error monitoring active');
  }
  
  // 5. PERFORMANCE MONITORING
  function monitorPerformance() {
    console.log('⚡ PERFORMANCE MONITORING:');
    
    // Monitor memory usage
    if (performance.memory) {
      console.log('Memory usage:', {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('🐌 Long task detected:', entry.duration + 'ms');
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    }
    
    // Monitor layout thrashing
    let lastLayoutTime = performance.now();
    const layoutObserver = new ResizeObserver(() => {
      const now = performance.now();
      if (now - lastLayoutTime < 16) {
        console.warn('🔄 Potential layout thrashing detected');
      }
      lastLayoutTime = now;
    });
    
    layoutObserver.observe(document.body);
    
    console.log('✅ Performance monitoring active');
  }
  
  // 6. REAL-TIME MONITORING
  function startRealTimeMonitoring() {
    console.log('🔄 STARTING REAL-TIME MONITORING:');
    
    let checks = 0;
    const monitor = setInterval(() => {
      checks++;
      const visual = checkVisualState();
      
      if (!visual.bodyVisible || !visual.hasContent || visual.visibleChildren === 0) {
        console.error('🚨 BLANKING DETECTED!', {
          check: checks,
          timestamp: new Date().toISOString(),
          visual,
          react: checkReactState(),
          mui: checkMUITheme(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
        
        // Try to capture stack trace
        console.trace('Stack trace at blanking detection');
        
        // Try to restore if possible
        if (document.body.style.display === 'none') {
          console.log('🔧 Attempting to restore body display');
          document.body.style.display = '';
        }
        
        if (document.body.style.visibility === 'hidden') {
          console.log('🔧 Attempting to restore body visibility');
          document.body.style.visibility = '';
        }
        
        if (document.body.style.opacity === '0') {
          console.log('🔧 Attempting to restore body opacity');
          document.body.style.opacity = '';
        }
      }
      
      // Log status every 30 seconds
      if (checks % 60 === 0) {
        console.log(`✅ Monitoring active - ${checks} checks completed`);
      }
    }, 500);
    
    console.log('✅ Real-time monitoring started (500ms interval)');
    
    // Return stop function
    return () => {
      clearInterval(monitor);
      console.log('🛑 Real-time monitoring stopped');
    };
  }
  
  // 7. SYSTEM INFO
  function logSystemInfo() {
    console.log('💻 SYSTEM INFO:');
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('Language:', navigator.language);
    console.log('Online:', navigator.onLine);
    console.log('Cookies enabled:', navigator.cookieEnabled);
    console.log('Screen resolution:', screen.width + 'x' + screen.height);
    console.log('Viewport size:', window.innerWidth + 'x' + window.innerHeight);
    console.log('Device pixel ratio:', window.devicePixelRatio);
    console.log('Color depth:', screen.colorDepth);
    
    // Check for WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    console.log('WebGL supported:', !!gl);
    
    if (gl) {
      console.log('WebGL renderer:', gl.getParameter(gl.RENDERER));
      console.log('WebGL vendor:', gl.getParameter(gl.VENDOR));
    }
  }
  
  // 8. MAIN EXECUTION
  console.log('🚀 RUNNING EMERGENCY DIAGNOSTIC...');
  
  // Initial checks
  logSystemInfo();
  const initialVisual = checkVisualState();
  const initialReact = checkReactState();
  const initialMUI = checkMUITheme();
  
  console.log('Initial state:', {
    visual: initialVisual,
    react: initialReact,
    mui: initialMUI
  });
  
  // Set up monitoring
  setupErrorMonitoring();
  monitorPerformance();
  
  // Start real-time monitoring
  const stopMonitoring = startRealTimeMonitoring();
  
  // Add to global scope for manual control
  window.auracleDebug = {
    checkVisualState,
    checkReactState,
    checkMUITheme,
    stopMonitoring,
    
    // Manual recovery attempts
    recover: () => {
      console.log('🔧 ATTEMPTING MANUAL RECOVERY...');
      
      // Reset body styles
      document.body.style.display = '';
      document.body.style.visibility = '';
      document.body.style.opacity = '';
      document.body.style.zIndex = '';
      
      // Reset html styles  
      document.documentElement.style.display = '';
      document.documentElement.style.visibility = '';
      document.documentElement.style.opacity = '';
      
      // Force repaint
      document.body.offsetHeight;
      
      console.log('✅ Recovery attempt complete');
    },
    
    // Force full page reload
    forceReload: () => {
      console.log('🔄 FORCING PAGE RELOAD...');
      window.location.reload();
    }
  };
  
  console.log('✅ Emergency diagnostic complete');
  console.log('💡 Use window.auracleDebug.recover() to attempt manual recovery');
  console.log('💡 Use window.auracleDebug.stopMonitoring() to stop monitoring');
  console.log('💡 Use window.auracleDebug.forceReload() to force page reload');
  
})();