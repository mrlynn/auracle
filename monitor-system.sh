#!/bin/bash

# Emergency System Monitor for Auracle Blanking Issue
# This script monitors the system independently of Electron

LOG_FILE="$HOME/auracle-system-monitor.log"
SCREENSHOT_DIR="$HOME/auracle-screenshots"

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"

echo "=== AURACLE SYSTEM MONITOR STARTED ===" >> "$LOG_FILE"
echo "Started at: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "🔍 MONITOR: $1"
}

# Function to take screenshot
take_screenshot() {
    local reason="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local screenshot_file="$SCREENSHOT_DIR/auracle_screenshot_${reason}_${timestamp}.png"
    
    screencapture -x "$screenshot_file" 2>/dev/null
    if [ $? -eq 0 ]; then
        log_message "Screenshot taken: $screenshot_file"
    else
        log_message "Failed to take screenshot"
    fi
}

# Function to check Auracle processes
check_auracle_processes() {
    local main_process=$(pgrep -f "electron.*auracle" | head -1)
    local renderer_processes=$(pgrep -f "auracle.*renderer" | wc -l)
    local gpu_process=$(pgrep -f "auracle.*gpu" | head -1)
    
    log_message "Main process: ${main_process:-NONE}"
    log_message "Renderer processes: $renderer_processes"
    log_message "GPU process: ${gpu_process:-NONE}"
    
    if [ -z "$main_process" ]; then
        log_message "🚨 CRITICAL: No main Auracle process found!"
        take_screenshot "no_main_process"
    fi
}

# Function to check memory usage
check_memory() {
    local memory_info=$(vm_stat | head -4)
    local memory_pressure=$(memory_pressure 2>/dev/null | head -1)
    
    log_message "Memory stats: $memory_info"
    if [ -n "$memory_pressure" ]; then
        log_message "Memory pressure: $memory_pressure"
    fi
}

# Function to check display/graphics
check_display() {
    local displays=$(system_profiler SPDisplaysDataType 2>/dev/null | grep "Resolution:" | wc -l)
    local windowserver=$(pgrep WindowServer | head -1)
    
    log_message "Active displays: $displays"
    log_message "WindowServer PID: ${windowserver:-NONE}"
    
    if [ -z "$windowserver" ]; then
        log_message "🚨 CRITICAL: WindowServer not running!"
    fi
}

# Function to monitor Electron processes specifically
monitor_electron() {
    local electron_processes=$(pgrep -f electron | wc -l)
    local helper_processes=$(pgrep -f "Electron Helper" | wc -l)
    
    log_message "Total Electron processes: $electron_processes"
    log_message "Electron Helper processes: $helper_processes"
    
    # Check for crashed processes
    local crashed_apps=$(ls /Users/*/Library/Logs/DiagnosticReports/*Electron* 2>/dev/null | tail -5)
    if [ -n "$crashed_apps" ]; then
        log_message "🚨 Recent Electron crash reports found"
        echo "$crashed_apps" >> "$LOG_FILE"
    fi
}

log_message "System monitoring started"

# Main monitoring loop
counter=0
while true; do
    counter=$((counter + 1))
    
    log_message "=== MONITOR CYCLE $counter ==="
    
    # Check every cycle
    check_auracle_processes
    check_memory
    
    # Check less frequently
    if [ $((counter % 6)) -eq 0 ]; then
        check_display
        monitor_electron
        take_screenshot "routine_check"
    fi
    
    # Sleep for 10 seconds
    sleep 10
done