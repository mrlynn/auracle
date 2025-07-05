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

// Calculate similarity between two strings using word overlap
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  return intersection.size / Math.max(set1.size, set2.size);
}

// Extract new content from incremental transcription
function extractNewContent(previousContent, newContent) {
  if (!previousContent) return newContent;
  if (!newContent) return '';
  
  const prevWords = previousContent.toLowerCase().split(/\s+/);
  const newWords = newContent.toLowerCase().split(/\s+/);
  const originalNewWords = newContent.split(/\s+/);
  
  // Find the longest common suffix in previous content
  let matchLength = 0;
  for (let i = 1; i <= Math.min(prevWords.length, newWords.length); i++) {
    const prevSuffix = prevWords.slice(-i);
    const newPrefix = newWords.slice(0, i);
    
    if (JSON.stringify(prevSuffix) === JSON.stringify(newPrefix)) {
      matchLength = i;
    }
  }
  
  // If we found a significant overlap, extract only the new part
  if (matchLength > 0) {
    const newPart = originalNewWords.slice(matchLength).join(' ').trim();
    return newPart;
  }
  
  // If no overlap or very little overlap, check if new content is mostly contained in previous
  const similarity = calculateSimilarity(previousContent, newContent);
  if (similarity > 0.7) {
    // Find the difference by looking for new words at the end
    const prevWordsSet = new Set(prevWords);
    const uniqueNewWords = originalNewWords.filter((word, index) => {
      const lowerWord = word.toLowerCase();
      return !prevWordsSet.has(lowerWord) || index >= newWords.length - 3; // Keep last few words
    });
    
    if (uniqueNewWords.length > 0) {
      return uniqueNewWords.join(' ').trim();
    }
    
    return ''; // No new content
  }
  
  return newContent; // Significantly different, return as is
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
  
  // Advanced transcription state management
  let transcriptBuffer = '';
  let lastCommittedText = '';
  let pendingText = '';
  const COMMIT_DELAY = 2000; // 2 seconds before committing interim text
  const MIN_SENTENCE_LENGTH = 10;
  
  // Timer for committing pending text
  let commitTimer = null;
  
  const commitPendingText = () => {
    if (pendingText && pendingText.length > MIN_SENTENCE_LENGTH) {
      const finalText = improveSentenceStructure(pendingText);
      onTranscript({ type: 'final', text: finalText });
      lastCommittedText += (lastCommittedText ? ' ' : '') + finalText;
      pendingText = '';
    }
  };
  
  const args = [
    '-m', MODEL_PATH,
    '-t', '4',  // 4 threads
    '--step', '800',   // Slightly faster updates
    '--length', '6000', // Reduced context for less overlap
    '--keep', '300',    // Reduced overlap significantly
    '--vad-thold', '0.6'
  ];
  
  const proc = spawn(WHISPER_BIN, args);
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      const cleanedLine = cleanTranscriptLine(line.trim());
      if (cleanedLine) {
        // Extract only new content from the full whisper output
        const newContent = extractNewContent(transcriptBuffer, cleanedLine);
        
        if (newContent && newContent.length > 0) {
          transcriptBuffer = cleanedLine;
          
          // Check if this looks like a sentence completion
          const hasEndPunctuation = /[.!?]\s*$/.test(newContent);
          const isLongEnough = newContent.length > MIN_SENTENCE_LENGTH;
          
          if (hasEndPunctuation && isLongEnough) {
            // Complete sentence - commit immediately
            const finalText = improveSentenceStructure(pendingText + ' ' + newContent);
            onTranscript({ type: 'final', text: finalText.trim() });
            lastCommittedText += (lastCommittedText ? ' ' : '') + finalText.trim();
            pendingText = '';
            
            // Clear any pending commit timer
            if (commitTimer) {
              clearTimeout(commitTimer);
              commitTimer = null;
            }
          } else {
            // Interim content - add to pending
            pendingText += (pendingText ? ' ' : '') + newContent;
            
            // Send interim update
            onTranscript({ 
              type: 'interim', 
              text: improveSentenceStructure(pendingText) 
            });
            
            // Set timer to commit if no updates come
            if (commitTimer) clearTimeout(commitTimer);
            commitTimer = setTimeout(commitPendingText, COMMIT_DELAY);
          }
          
        }
      }
    });
  });
  
  proc.stderr.on('data', (data) => {
    const errorText = data.toString();
    if (errorText.includes('error:') || errorText.includes('failed') || errorText.includes('cannot')) {
      onTranscript({ type: 'error', text: '[whisper.cpp error] ' + errorText });
    }
  });
  
  proc.on('close', (code) => {
    // Commit any remaining pending text
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitPendingText();
    }
    onTranscript({ type: 'system', text: `[whisper.cpp exited with code ${code}]` });
  });
  
  return proc;
}

// Improve sentence structure and capitalization
function improveSentenceStructure(text) {
  if (!text) return '';
  
  let improved = text.trim();
  
  // Capitalize first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  
  // Add period if sentence doesn't end with punctuation
  if (!/[.!?]\s*$/.test(improved)) {
    improved += '.';
  }
  
  // Fix common capitalization issues
  improved = improved.replace(/\bi\b/g, 'I');
  improved = improved.replace(/\b(mr|mrs|dr|prof)\b/gi, (match) => 
    match.charAt(0).toUpperCase() + match.slice(1).toLowerCase() + '.');
  
  return improved;
}

module.exports = { startTranscription }; 