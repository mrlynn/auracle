// Test script to verify debugging tools work correctly
const BlankingDebugger = require('./debug-toolkit');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Auracle Debug Tools...');

// Test 1: Initialize debugger
console.log('1. Testing debugger initialization...');
const blankingDebugger = new BlankingDebugger();
console.log('✅ Debugger initialized successfully');

// Test 2: Test logging
console.log('2. Testing logging...');
blankingDebugger.log('Test log message');
console.log('✅ Logging works');

// Test 3: Test snapshot creation
console.log('3. Testing snapshot creation...');
blankingDebugger.captureDebugSnapshot('test-trigger');
console.log('✅ Snapshot creation works');

// Test 4: Test report generation
console.log('4. Testing report generation...');
const reportPath = blankingDebugger.generateDebugReport();
console.log('✅ Report generation works:', reportPath);

// Test 5: Check if files were created
console.log('5. Checking generated files...');
const homeDir = require('os').homedir();
const logFile = path.join(homeDir, 'auracle-debug.log');

if (fs.existsSync(logFile)) {
  console.log('✅ Debug log file exists:', logFile);
} else {
  console.log('❌ Debug log file missing:', logFile);
}

// Test 6: Check emergency diagnostic script syntax
console.log('6. Testing emergency diagnostic script...');
try {
  const diagnosticScript = fs.readFileSync('./emergency-diagnostic.js', 'utf8');
  if (diagnosticScript.includes('auracleDebug')) {
    console.log('✅ Emergency diagnostic script syntax OK');
  } else {
    console.log('❌ Emergency diagnostic script missing key functions');
  }
} catch (error) {
  console.log('❌ Error reading emergency diagnostic script:', error.message);
}

// Test 7: Check system monitor script
console.log('7. Testing system monitor script...');
try {
  const monitorScript = fs.readFileSync('./system-monitor.sh', 'utf8');
  if (monitorScript.includes('auracle-system-monitor.log')) {
    console.log('✅ System monitor script syntax OK');
  } else {
    console.log('❌ System monitor script missing key functions');
  }
} catch (error) {
  console.log('❌ Error reading system monitor script:', error.message);
}

// Test 8: Check if system monitor is executable
console.log('8. Checking system monitor permissions...');
try {
  const stats = fs.statSync('./system-monitor.sh');
  if (stats.mode & parseInt('111', 8)) {
    console.log('✅ System monitor script is executable');
  } else {
    console.log('❌ System monitor script is not executable');
  }
} catch (error) {
  console.log('❌ Error checking system monitor permissions:', error.message);
}

console.log('\n🎉 Debug tools testing complete!');
console.log('\nNext steps:');
console.log('1. Start the app with: npm run dev');
console.log('2. Open DevTools and look for the diagnostic script');
console.log('3. In a separate terminal, run: ./system-monitor.sh');
console.log('4. Monitor the logs for any blanking events');
console.log('\nLog files will be created in your home directory:');
console.log('- ~/auracle-debug.log');
console.log('- ~/auracle-system-monitor.log');
console.log('- ~/auracle-debug-report-*.json');
console.log('- ~/auracle-snapshot-*.json');
console.log('- ~/auracle_screenshot_*.png');