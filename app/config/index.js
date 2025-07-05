// Config Loader
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = path.join(os.homedir(), '.research-companion');
const configFile = path.join(configDir, 'config.json');

function loadConfig() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }
  if (!fs.existsSync(configFile)) {
    // Default config
    const defaultConfig = {
      llm: {
        provider: 'ollama',
        model: 'llama3',
        endpoint: 'http://localhost:11434',
        // API Keys for different providers
        openaiApiKey: '',
        geminiApiKey: '',
        claudeApiKey: '',
        cohereApiKey: '',
        mistralApiKey: '',
        // Provider-specific settings
        temperature: 0.3,
        maxTokens: 2000,
      },
      speech_to_text: {
        method: 'whisper.cpp',
        language: 'en',
      },
      research: {
        providers: ['wikipedia', 'duckduckgo'],
        max_results: 4,
        googleApiKey: '',
        googleSearchEngineId: ''
      },
      thresholds: {
        min_words_per_chunk: 25,
      },
      ui: {
        theme: 'dark',
        autoExportNotes: false,
        showDebugInfo: false
      }
    };
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  return JSON.parse(fs.readFileSync(configFile));
}

function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig }; 