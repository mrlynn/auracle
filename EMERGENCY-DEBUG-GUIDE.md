# 🚨 EMERGENCY DEBUGGING GUIDE - Auracle Screen Blanking

## Quick Start

The app is still going blank despite our memory fixes. This means we need to catch it in real-time. I've implemented comprehensive debugging tools to identify the EXACT cause.

### STEP 1: Start System Monitor (Terminal 1)
```bash
cd /Users/michael.lynn/code/auracle
./monitor-system.sh
```
This runs **independent of Electron** and will capture system state when blanking occurs.

### STEP 2: Start the App with Full Debugging (Terminal 2)
```bash
npm start
```
The app now includes:
- **Emergency debugger** monitoring every 100ms
- **Renderer monitoring** with DOM state checks
- **DevTools always open** for real-time inspection
- **Visual debug indicator** (red "🔍 DEBUG" in top-right)

### STEP 3: Monitor Console Output

Watch for these critical messages:

**🔍 Normal Operation:**
```
🔍 DEBUG: Memory usage: 45.2MB / 2048.0MB
🔍 RENDERER DEBUG: DOM state check passed
[timestamp] MONITOR: Window state normal
```

**🚨 Blanking Detection:**
```
🚨 CRITICAL: WINDOW BECAME INVISIBLE
🚨 CRITICAL: RENDERER PROCESS CRASHED  
🚨 CRITICAL: POTENTIAL BLANKING DETECTED
🚨 HIGH MEMORY USAGE DETECTED
```

## What to Look For

### 1. **Immediate Blanking Indicators**
- Red debug indicator disappears
- Console stops updating
- DevTools becomes unresponsive
- Window becomes invisible but process still running

### 2. **Pre-Blanking Warning Signs**
- Memory usage climbing above 150MB
- Console errors about React/DOM
- "Renderer not responding to ping" messages
- GPU process crashes

### 3. **System-Level Issues**
- Screenshots show blank/white window
- WindowServer crashes
- Memory pressure warnings
- Display driver issues

## Debug Files Generated

All debugging info saves to your home directory:

- `~/auracle-emergency-debug.log` - Main debug log
- `~/auracle-system-monitor.log` - System monitoring
- `~/auracle-screenshots/` - Screenshots during incidents
- `~/auracle-snapshot-*.json` - Emergency snapshots

## Manual Debug Commands

If the app goes blank, try these in DevTools console:

```javascript
// Force DOM analysis
window.emergencyDebug?.emergencyDOMAnalysis()

// Attempt recovery
window.emergencyDebug?.attemptDOMRecovery()

// Check memory
console.log(performance.memory)

// Check React state
console.log(document.getElementById('root'))
```

## Critical Debugging Questions

When blanking occurs, we need to determine:

1. **Is the window invisible or destroyed?**
2. **Is the renderer process crashed or responsive?**
3. **Is the DOM content missing or hidden?**
4. **Is it a CSS/styling issue or memory crash?**
5. **Is it system-level (GPU) or app-level?**

## Expected Debugging Output

### Normal Operation:
```
[2024-01-XX XX:XX:XX] INIT: Emergency debugger initialized
🔍 DEBUG: Window state normal
🔍 RENDERER DEBUG: DOM state check passed
🔍 MONITOR: Main process: 12345
🔍 MONITOR: Renderer processes: 3
```

### When Blanking Occurs:
```
🚨 CRITICAL: WINDOW BECAME INVISIBLE
🚨 CRITICAL: POTENTIAL BLANKING DETECTED  
[Details about exact state when it happened]
SNAPSHOT: Creating emergency snapshot: window_invisible
```

## Recovery Actions

The system will automatically:
1. **Take screenshots** when issues detected
2. **Create snapshots** with full system state
3. **Attempt recovery** by resetting CSS and reloading
4. **Log everything** for post-mortem analysis

## Next Steps

1. **Run the monitoring** and reproduce the blanking
2. **Check the debug logs** immediately after blanking
3. **Examine screenshots** to see visual state
4. **Analyze console output** for error patterns

This comprehensive debugging will identify whether the blanking is caused by:
- **Memory exhaustion** (heap size limits)
- **Renderer crashes** (process termination)  
- **CSS/DOM issues** (invisible content)
- **System problems** (GPU/display drivers)
- **Electron bugs** (window management)

**The debug system will catch the exact moment of blanking and tell us the root cause!**