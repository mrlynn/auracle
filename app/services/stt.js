// Speech-to-Text Service (whisper.cpp integration)
const { spawn } = require('child_process');
const path = require('path');

// Clean up transcript lines
function cleanTranscriptLine(line) {
  if (!line) return null;
  
  // Filter out noise and repetitive content
  const filters = [
    /^\[BLANK_AUDIO\]$/,
    /^\[INAUDIBLE\]$/,
    /^\s*\(.*\)\s*$/,  // Remove lines that are only sound effects like (sighs), (coughing)
    /^\s*-\s*$/,       // Remove lines that are just dashes
    /^thanks for watching\.?$/i,  // Remove common video outros
    /^\s*\[\d+K\s*$/,  // Remove lines that are just terminal control codes
    /^\s*\x1b\[.*$/,   // Remove lines starting with ANSI escape sequences
    /^\s*$/, // Empty lines
  ];
  
  // Check if line matches any filter
  for (const filter of filters) {
    if (filter.test(line)) {
      return null;
    }
  }
  
  // Remove repetitive patterns (same phrase repeated multiple times)
  const words = line.split(' ');
  if (words.length > 4) {
    const firstWord = words[0].toLowerCase();
    const repetitions = words.filter(word => word.toLowerCase() === firstWord).length;
    if (repetitions > words.length / 2) {
      return null; // Likely repetitive noise
    }
  }
  
  // Clean up the line
  let cleaned = line
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape sequences
    .replace(/\[\d+K/g, '')               // Remove specific terminal control codes like [2K
    .replace(/^\s*-\s*/, '')              // Remove leading dashes
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim();
    
  // Only return if it has substantial content
  return cleaned.length > 3 ? cleaned : null;
}

// Path to whisper.cpp binary and model
const WHISPER_BIN = path.join(__dirname, '../../whisper.cpp/build/bin/whisper-stream');
const MODEL_PATH = path.join(__dirname, '../../whisper.cpp/models/ggml-base.en.bin');

function startTranscription(onTranscript) {
  // Check if whisper.cpp binary exists
  try {
    require('fs').accessSync(WHISPER_BIN);
  } catch (e) {
    onTranscript('[Error] whisper.cpp binary not found. Please build and place it in whisper/whisper.cpp/main');
    return null;
  }
  // Check if model exists
  try {
    require('fs').accessSync(MODEL_PATH);
  } catch (e) {
    onTranscript('[Error] Model file not found. Please download and place ggml-base.en.bin in whisper/models/');
    return null;
  }
  
  // Track recent lines to prevent duplicates
  const recentLines = new Set();
  const maxRecentLines = 10;
  const args = [
    '-m', MODEL_PATH,
    '-t', '4',  // 4 threads
    '--step', '1000',  // Process every 1000ms (less frequent)
    '--length', '8000',  // Keep 8 seconds of audio (more context)
    '--keep', '500',   // Keep 500ms from previous step
    '--vad-thold', '0.6'  // Voice activity detection threshold (higher = less sensitive)
  ];
  const proc = spawn(WHISPER_BIN, args);
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      const cleanedLine = cleanTranscriptLine(line.trim());
      if (cleanedLine && !recentLines.has(cleanedLine)) {
        // Add to recent lines and limit size
        recentLines.add(cleanedLine);
        if (recentLines.size > maxRecentLines) {
          const firstItem = recentLines.values().next().value;
          recentLines.delete(firstItem);
        }
        onTranscript(cleanedLine);
      }
    });
  });
  proc.stderr.on('data', (data) => {
    const errorText = data.toString();
    // Only show important errors, filter out verbose initialization logs
    if (errorText.includes('error:') || errorText.includes('failed') || errorText.includes('cannot')) {
      onTranscript('[whisper.cpp error] ' + errorText);
    }
    // Silently ignore verbose initialization messages
  });
  proc.on('close', (code) => {
    onTranscript(`[whisper.cpp exited with code ${code}]`);
  });
  return proc;
}

module.exports = { startTranscription }; 