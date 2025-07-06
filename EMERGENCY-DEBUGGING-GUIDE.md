# 🚨 EMERGENCY DEBUGGING GUIDE for Auracle Blanking Issue

## IMMEDIATE ACTIONS

### 1. Start Emergency Monitoring

**Terminal 1 - Start System Monitor:**
```bash
cd /Users/michael.lynn/code/auracle
./system-monitor.sh
```

**Terminal 2 - Start Auracle with Debug Mode:**
```bash
cd /Users/michael.lynn/code/auracle
DEBUG=* npm run dev
```

### 2. Browser Debug Console

When the app is running, open DevTools (Cmd+Alt+I) and run:

```javascript
// The emergency diagnostic script is auto-injected
// Check if it's running:
window.auracleDebug

// Manual recovery attempt:
window.auracleDebug.recover()

// Force reload if needed:
window.auracleDebug.forceReload()
```

### 3. Remote Debugging

The app now runs with remote debugging enabled on port 9222:

```bash
# Open in Chrome/Brave/Edge
open -a "Google Chrome" "http://localhost:9222"
```

## DEBUGGING APPROACHES

### A. Real-time Monitoring

1. **Watch the system monitor output** - it logs every 5 seconds
2. **Watch the debug console** - it checks for blanking every 500ms
3. **Look for patterns** - does blanking happen at specific times?

### B. Specific Issue Detection

#### GPU Issues
```bash
# Check GPU processes
ps aux | grep -i gpu

# Check for GPU crashes
log show --last 1h --predicate 'category == "Graphics" OR category == "GPU"'
```

#### Memory Issues
```bash
# Monitor memory usage
top -pid $(pgrep Auracle) -l 0

# Check for memory leaks
leaks $(pgrep Auracle)
```

#### Display Issues
```bash
# Check display settings
pmset -g

# Check for display sleep
system_profiler SPDisplaysDataType
```

### C. Electron-specific Debugging

#### Main Process Debugging
```bash
# Run with verbose logging
DEBUG=* electron .

# Check main process crashes
log show --last 1h --predicate 'process == "Auracle"'
```

#### Renderer Process Debugging
```javascript
// In DevTools Console
console.log('Memory usage:', performance.memory);
console.log('Render blocking:', window.debugAuracle.checkVisualState());
```

## RECOVERY TECHNIQUES

### 1. Automatic Recovery
The app now includes automatic recovery mechanisms:
- Detects blanking in real-time
- Attempts to restore display properties
- Logs all events to debug files

### 2. Manual Recovery
If blanking occurs:

**In DevTools Console:**
```javascript
// Step 1: Check state
window.auracleDebug.checkVisualState()

// Step 2: Attempt recovery
window.auracleDebug.recover()

// Step 3: If that fails, force reload
window.auracleDebug.forceReload()
```

**In Terminal:**
```bash
# Kill and restart
pkill Auracle
npm run dev
```

### 3. Emergency Restart
```bash
# Force quit all Electron processes
pkill -f "Electron"

# Clean restart
rm -rf node_modules/.cache
npm run dev
```

## LOGS AND FILES

### Generated Files
- `~/auracle-debug.log` - Main debug log
- `~/auracle-system-monitor.log` - System monitoring
- `~/auracle-debug-report-*.json` - Debug reports
- `~/auracle-snapshot-*.json` - Debug snapshots
- `~/auracle_screenshot_*.png` - Visual verification

### Key Information to Collect
1. **Timing** - When does blanking occur?
2. **Memory usage** - Is it high before blanking?
3. **CPU usage** - Are there spikes?
4. **GPU processes** - Are they crashing?
5. **System events** - Any power/display events?

## SPECIFIC SCENARIOS

### Scenario 1: Blanking After Inactivity
**Likely causes:**
- Power management overriding power blocker
- Display sleep kicking in
- Background throttling

**Debug steps:**
1. Check power settings: `pmset -g`
2. Monitor power blocker status in logs
3. Check for display sleep events

### Scenario 2: Blanking During Heavy Processing
**Likely causes:**
- Memory exhaustion
- GPU process crash
- Renderer process overload

**Debug steps:**
1. Monitor memory usage during processing
2. Check for GPU process crashes
3. Monitor CPU usage patterns

### Scenario 3: Blanking After CSS/Theme Changes
**Likely causes:**
- CSS rules hiding content
- Z-index issues
- Material-UI theme problems

**Debug steps:**
1. Check computed styles in DevTools
2. Look for hidden elements
3. Verify theme provider status

### Scenario 4: Blanking After Updates
**Likely causes:**
- Electron version incompatibility
- macOS updates affecting display
- Dependency conflicts

**Debug steps:**
1. Check Electron version compatibility
2. Review recent system updates
3. Test with different Electron versions

## ELECTRON FLAGS FOR DEBUGGING

Add these to main.js for specific issues:

```javascript
// GPU debugging
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Display debugging
app.commandLine.appendSwitch('disable-lcd-text');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');

// Memory debugging
app.commandLine.appendSwitch('max-old-space-size', '4096');
app.commandLine.appendSwitch('trace-warnings');
```

## SYSTEM LEVEL DEBUGGING

### macOS Specific Commands
```bash
# Check WindowServer (display server)
ps aux | grep WindowServer

# Check for display-related crashes
log show --last 1h --predicate 'subsystem == "com.apple.windowserver"'

# Check graphics drivers
system_profiler SPDisplaysDataType

# Monitor display brightness changes
log stream --predicate 'eventMessage contains "brightness"'
```

### Process Monitoring
```bash
# Monitor all Auracle processes
watch "ps aux | grep -i auracle"

# Check file descriptors
lsof -p $(pgrep Auracle)

# Monitor network connections
netstat -an | grep $(pgrep Auracle)
```

## PREVENTION STRATEGIES

### 1. Resource Management
- Monitor memory usage trends
- Set memory limits if needed
- Clean up unused resources

### 2. Display Management
- Verify power blocker effectiveness
- Test with different display settings
- Monitor for display sleep events

### 3. Error Handling
- Implement comprehensive error boundaries
- Add retry mechanisms for failed operations
- Log all critical state changes

## ESCALATION STEPS

If the issue persists after debugging:

1. **Collect all debug files** from home directory
2. **Document the exact scenario** when blanking occurs
3. **Test with minimal configuration** (disable features one by one)
4. **Try different Electron versions** if compatible
5. **Test on different macOS versions** if possible

## HOTKEYS FOR DEBUGGING

While app is running:
- **Cmd+Alt+I** - Open DevTools
- **Cmd+R** - Reload renderer
- **Cmd+Shift+R** - Hard reload
- **Cmd+Alt+J** - Open DevTools Console directly

## QUICK DIAGNOSTIC COMMANDS

```bash
# One-liner system check
echo "=== QUICK DIAGNOSTIC ===" && date && echo "Auracle PID: $(pgrep Auracle)" && echo "Memory: $(ps -o rss= -p $(pgrep Auracle) | awk '{print $1/1024 "MB"}')" && echo "Display: $(pmset -g | grep displaysleep)"

# Quick screenshot for visual verification
screencapture -x ~/desktop_check_$(date +%s).png

# Check for recent crashes
log show --last 30m --predicate 'eventMessage contains "crash"'
```

Remember: The goal is to **capture the exact moment** when blanking occurs and **identify the root cause** through systematic monitoring and debugging.