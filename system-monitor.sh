#!/bin/bash

# System-level monitoring script for Auracle blanking issue (macOS)
# This script monitors system resources and display activity

echo "🔍 Starting Auracle System Monitor..."
echo "Press Ctrl+C to stop monitoring"

# Create log file
LOG_FILE="$HOME/auracle-system-monitor.log"
echo "📝 Logging to: $LOG_FILE"
echo "=== Auracle System Monitor Started $(date) ===" >> "$LOG_FILE"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if Auracle is running
check_auracle() {
    local pid=$(pgrep -f "Auracle")
    if [ ! -z "$pid" ]; then
        echo "$pid"
    else
        echo "0"
    fi
}

# Function to monitor GPU activity
monitor_gpu() {
    log_message "🎮 GPU Activity:"
    
    # Check GPU processes
    ps aux | grep -i gpu | grep -v grep | while read line; do
        log_message "  GPU Process: $line"
    done
    
    # Check WindowServer (macOS display server)
    ps aux | grep WindowServer | grep -v grep | while read line; do
        log_message "  WindowServer: $line"
    done
}

# Function to monitor display activity
monitor_display() {
    log_message "🖥️  Display Activity:"
    
    # Check display sleep settings
    local display_sleep=$(pmset -g | grep displaysleep | awk '{print $2}')
    log_message "  Display sleep setting: $display_sleep"
    
    # Check current power state
    local power_state=$(pmset -g ps | head -1)
    log_message "  Power state: $power_state"
    
    # Check display brightness
    local brightness=$(brightness -l 2>/dev/null | grep "display 0" | awk '{print $4}' 2>/dev/null || echo "unknown")
    log_message "  Display brightness: $brightness"
}

# Function to monitor system resources
monitor_resources() {
    local auracle_pid=$(check_auracle)
    
    if [ "$auracle_pid" != "0" ]; then
        log_message "📊 System Resources (PID: $auracle_pid):"
        
        # Memory usage
        local memory_usage=$(ps -p "$auracle_pid" -o rss= 2>/dev/null)
        if [ ! -z "$memory_usage" ]; then
            local memory_mb=$((memory_usage / 1024))
            log_message "  Memory usage: ${memory_mb}MB"
            
            # Alert on high memory usage
            if [ "$memory_mb" -gt 1000 ]; then
                log_message "  ⚠️  HIGH MEMORY USAGE: ${memory_mb}MB"
            fi
        fi
        
        # CPU usage
        local cpu_usage=$(ps -p "$auracle_pid" -o pcpu= 2>/dev/null)
        if [ ! -z "$cpu_usage" ]; then
            log_message "  CPU usage: ${cpu_usage}%"
            
            # Alert on high CPU usage
            if (( $(echo "$cpu_usage > 80" | bc -l) )); then
                log_message "  ⚠️  HIGH CPU USAGE: ${cpu_usage}%"
            fi
        fi
        
        # File descriptors
        local fd_count=$(lsof -p "$auracle_pid" 2>/dev/null | wc -l)
        log_message "  File descriptors: $fd_count"
        
        # Threads
        local thread_count=$(ps -p "$auracle_pid" -o thcount= 2>/dev/null)
        log_message "  Thread count: $thread_count"
        
    else
        log_message "❌ Auracle process not found"
    fi
}

# Function to monitor system events
monitor_system_events() {
    log_message "🔔 System Events:"
    
    # Check for recent system events
    log show --last 30s --predicate 'category == "Power" OR category == "Display" OR category == "Graphics"' 2>/dev/null | while read line; do
        if [[ "$line" =~ (sleep|wake|display|gpu|graphics) ]]; then
            log_message "  Event: $line"
        fi
    done
}

# Function to check Electron-specific issues
monitor_electron() {
    log_message "⚡ Electron Monitoring:"
    
    # Check for Electron processes
    ps aux | grep -i electron | grep -v grep | while read line; do
        log_message "  Electron Process: $line"
    done
    
    # Check for renderer processes
    ps aux | grep -i renderer | grep -v grep | while read line; do
        log_message "  Renderer Process: $line"
    done
    
    # Check for GPU processes related to Electron
    ps aux | grep -E "(gpu|chrome)" | grep -v grep | while read line; do
        log_message "  GPU/Chrome Process: $line"
    done
}

# Function to take screenshot for visual verification
take_screenshot() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local screenshot_path="$HOME/auracle_screenshot_$timestamp.png"
    
    screencapture -x "$screenshot_path" 2>/dev/null
    
    if [ -f "$screenshot_path" ]; then
        log_message "📸 Screenshot saved: $screenshot_path"
        
        # Get file size to detect blank screenshots
        local file_size=$(stat -f%z "$screenshot_path" 2>/dev/null || echo "0")
        log_message "  Screenshot size: $file_size bytes"
        
        # Small file size might indicate blank screen
        if [ "$file_size" -lt 50000 ]; then
            log_message "  ⚠️  SMALL SCREENSHOT SIZE - POSSIBLE BLANK SCREEN"
        fi
    else
        log_message "❌ Failed to capture screenshot"
    fi
}

# Function to monitor network connections
monitor_network() {
    log_message "🌐 Network Monitoring:"
    
    # Check for network connections from Auracle
    local auracle_pid=$(check_auracle)
    if [ "$auracle_pid" != "0" ]; then
        lsof -p "$auracle_pid" -i 2>/dev/null | while read line; do
            log_message "  Network: $line"
        done
    fi
}

# Function to check for audio/video issues
monitor_audio_video() {
    log_message "🎵 Audio/Video Monitoring:"
    
    # Check audio devices
    system_profiler SPAudioDataType 2>/dev/null | grep -A 5 "Audio Devices:" | while read line; do
        log_message "  Audio: $line"
    done
    
    # Check camera usage
    lsof | grep -i camera 2>/dev/null | while read line; do
        log_message "  Camera: $line"
    done
}

# Trap Ctrl+C for cleanup
trap 'log_message "🛑 Monitoring stopped by user"; exit 0' INT

# Main monitoring loop
log_message "🚀 Starting continuous monitoring..."

while true; do
    log_message "--- Monitoring Cycle ---"
    
    # Basic checks
    monitor_resources
    monitor_display
    monitor_gpu
    monitor_electron
    
    # System events (every other cycle to reduce noise)
    if [ $(($(date +%s) % 20)) -eq 0 ]; then
        monitor_system_events
        monitor_network
    fi
    
    # Take screenshot every 5 minutes for visual verification
    if [ $(($(date +%s) % 300)) -eq 0 ]; then
        take_screenshot
    fi
    
    # Audio/video check every 10 minutes
    if [ $(($(date +%s) % 600)) -eq 0 ]; then
        monitor_audio_video
    fi
    
    # Check if Auracle is still running
    if [ "$(check_auracle)" = "0" ]; then
        log_message "🚨 AURACLE PROCESS TERMINATED"
        break
    fi
    
    log_message "--- End Cycle ---"
    sleep 5
done

log_message "🏁 Monitoring ended"