# 🚨 COMPLETE DEBUGGING STRATEGY FOR AURACLE BLANKING ISSUE

## IMPLEMENTED SOLUTIONS

I've created a comprehensive debugging toolkit to identify the root cause of the Auracle app blanking issue. Here's what has been implemented:

### 1. Emergency Debugging Toolkit (`debug-toolkit.js`)
- **Real-time monitoring** of system resources, GPU processes, and window states
- **Automatic crash detection** for renderer and main processes
- **Power event monitoring** to detect system sleep/wake cycles
- **Memory leak detection** with alerting for high usage
- **Comprehensive logging** to `~/auracle-debug.log`

### 2. Emergency Diagnostic Script (`emergency-diagnostic.js`)
- **Injected into renderer** automatically when app starts
- **Real-time DOM monitoring** every 500ms to detect blanking
- **Visual state checking** for display, visibility, opacity issues
- **React state validation** to ensure components are mounted
- **Material-UI theme verification** 
- **Automatic recovery attempts** when blanking is detected
- **Available as `window.auracleDebug` for manual control**

### 3. System Monitor Script (`system-monitor.sh`)
- **System-level monitoring** independent of Electron
- **GPU process tracking** for crashes and failures
- **Display management monitoring** (sleep, brightness, power)
- **Resource usage monitoring** (memory, CPU, file descriptors)
- **Screenshot capture** for visual verification
- **Logs to `~/auracle-system-monitor.log`**

### 4. Enhanced Main Process (`app/main.js`)
- **Integrated debugging toolkit** with comprehensive monitoring
- **Enhanced error handling** with crash recovery
- **Remote debugging enabled** on port 9222
- **Additional Electron flags** for debugging
- **Emergency recovery IPC handlers**

## HOW TO USE THE DEBUGGING TOOLS

### Step 1: Start System Monitoring
```bash
cd /Users/michael.lynn/code/auracle
./system-monitor.sh
```
This will run continuously and log system-level events.

### Step 2: Start Auracle with Debug Mode
```bash
cd /Users/michael.lynn/code/auracle
npm run dev
```
The app now includes:
- Automatic debug toolkit initialization
- Emergency diagnostic script injection
- Remote debugging on port 9222
- Comprehensive logging

### Step 3: Monitor in Real-Time
- **DevTools Console**: Watch for blanking detection messages
- **System Monitor Terminal**: Watch for system-level issues
- **Home Directory Logs**: Check generated log files

### Step 4: When Blanking Occurs
The system will automatically:
1. **Detect blanking** in real-time (500ms intervals)
2. **Log comprehensive debug info** including DOM state, styles, React state
3. **Attempt automatic recovery** by restoring display properties
4. **Capture debug snapshots** with system state
5. **Alert you** with console messages and log entries

## DEBUG FILES GENERATED

All files are saved to your home directory (`~`):

- **`auracle-debug.log`** - Main debug log from toolkit
- **`auracle-system-monitor.log`** - System-level monitoring
- **`auracle-debug-report-*.json`** - Comprehensive debug reports
- **`auracle-snapshot-*.json`** - Debug snapshots when issues occur
- **`auracle_screenshot_*.png`** - Visual verification screenshots

## MANUAL DEBUGGING COMMANDS

### In DevTools Console:
```javascript
// Check current visual state
window.auracleDebug.checkVisualState()

// Check React state
window.auracleDebug.checkReactState()

// Check Material-UI theme
window.auracleDebug.checkMUITheme()

// Attempt manual recovery
window.auracleDebug.recover()

// Force reload if needed
window.auracleDebug.forceReload()

// Stop monitoring
window.auracleDebug.stopMonitoring()
```

### Remote Debugging:
Open Chrome/Brave/Edge and navigate to: `http://localhost:9222`

### System Commands:
```bash
# Quick diagnostic
echo "Auracle PID: $(pgrep Auracle)" && ps -o rss= -p $(pgrep Auracle) | awk '{print "Memory: " $1/1024 "MB"}'

# Take screenshot
screencapture -x ~/desktop_check_$(date +%s).png

# Check for crashes
log show --last 30m --predicate 'eventMessage contains "crash"'
```

## WHAT THE DEBUGGING WILL REVEAL

### If it's a CSS/Styling Issue:
- You'll see changes to `display`, `visibility`, or `opacity` in the logs
- The diagnostic script will detect hidden elements
- Theme provider status will be logged

### If it's a Memory Issue:
- Memory usage will spike before blanking
- System monitor will show high memory alerts
- Performance monitoring will track memory growth

### If it's a GPU Issue:
- GPU processes will crash and be logged
- System monitor will detect GPU process failures
- WindowServer issues will be captured

### If it's a Power Management Issue:
- Power events will be logged before blanking
- Display sleep events will be captured
- Power blocker effectiveness will be monitored

### If it's an Electron Issue:
- Renderer/main process crashes will be detected
- Window state changes will be logged
- IPC communication failures will be captured

### If it's a React Issue:
- Component mounting/unmounting will be tracked
- React state will be validated
- Error boundaries will capture React errors

## SPECIFIC SCENARIOS TO WATCH FOR

1. **Blanking after inactivity** → Power management override
2. **Blanking during processing** → Memory/GPU exhaustion
3. **Blanking after UI updates** → CSS/theme issues
4. **Blanking at random times** → System-level interference
5. **Blanking after startup** → Initialization race condition

## EMERGENCY RECOVERY

If blanking occurs, the system will automatically attempt:
1. **Style restoration** - Reset display, visibility, opacity
2. **Component remounting** - Force React re-render
3. **Window management** - Show, focus, restore window
4. **Page reload** - Last resort full reload

You can also manually trigger recovery:
- **DevTools**: `window.auracleDebug.recover()`
- **Terminal**: Kill process and restart with `pkill Auracle && npm run dev`

## EXPECTED OUTCOME

With this comprehensive monitoring in place, you should be able to:

1. **Identify the exact moment** when blanking occurs
2. **Determine the root cause** (CSS, memory, GPU, power, etc.)
3. **See the sequence of events** leading to blanking
4. **Implement targeted fixes** based on the specific cause
5. **Verify the fix** with continued monitoring

The debugging system is designed to be **minimally invasive** while providing **maximum visibility** into all potential failure points.

## NEXT STEPS

1. **Run the system** with debugging enabled
2. **Wait for blanking to occur** (or trigger it if you know how)
3. **Examine the logs** for patterns and root causes
4. **Implement specific fixes** based on findings
5. **Continue monitoring** to verify fixes

This approach should definitively identify why the Auracle app is going blank and provide the information needed to implement a permanent fix.