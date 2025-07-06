# 🚨 EMERGENCY FIX - Screen Blanking Root Cause Found

## THE PROBLEM
Your system has **extreme memory pressure** (only 200MB-1GB free out of 36GB). The Auracle app renderer is consuming **935MB** of memory!

## IMMEDIATE ACTIONS

### 1. Free System Memory NOW
```bash
# Kill Docker/Colima VM (using 1.2GB)
colima stop

# Close unnecessary apps
killall "Google Chrome"
```

### 2. Increase Electron Memory Limits
The renderer is hitting memory limits. Add these to main.js:

```javascript
app.commandLine.appendSwitch('max-old-space-size', '512');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
```

### 3. Emergency Memory Reduction
The transcript is likely consuming massive memory. Reduce limits to:
- MAX_TRANSCRIPT_LENGTH = 10000 (from 50000)
- Topics = 10 entries (from 30)
- Research = 5 entries (from 20)

## WHY IT'S BLANKING
When system memory is critically low, macOS:
1. Suspends background processes
2. Forces GPU memory to swap
3. **Kills renderer processes** to free memory
4. Window appears blank because renderer is dead/suspended

## THE SMOKING GUN
Your debug log shows:
- System free memory: 200MB-1GB (< 3% free)
- Auracle renderer: 935MB memory usage
- Load average: 6+ (system overloaded)
- Window lost focus at 07:07:28

This is a **system-level memory exhaustion** issue, not a code bug!