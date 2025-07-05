# Auracle - Real-time Conversational Research Companion

Auracle is a cross-platform desktop application that listens to real-time conversations via microphone, transcribes speech to text, extracts topics/questions, and automatically performs research to surface relevant insights. It leverages a local LLM (via Ollama) to keep user data private and performant.

## Features

- **Real-time Speech Transcription**: Uses whisper.cpp for accurate, local speech-to-text conversion
- **Intelligent Topic Extraction**: Leverages Ollama to identify main topics, questions, and technical terms
- **Automatic Research**: Fetches relevant information from Wikipedia (Google search ready with API key)
- **Privacy-First**: All speech processing and LLM operations run locally on your machine
- **Session Management**: Saves conversation sessions with topics and research for later review

## Prerequisites

### 1. Install Ollama
Ollama is required for local LLM topic extraction.

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model (e.g., llama3)
ollama pull llama3
```

### 2. Install whisper.cpp
whisper.cpp is required for speech-to-text transcription.

```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build
make

# Download a model (base.en recommended for English)
bash ./models/download-ggml-model.sh base.en
```

### 3. Install Node.js Dependencies

```bash
# Install dependencies
npm install

# Build the UI
npm run build
```

## Configuration

The app uses a configuration file at `~/.research-companion/config.json`. Default configuration:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3",
    "endpoint": "http://localhost:11434"
  },
  "speech_to_text": {
    "method": "whisper.cpp",
    "language": "en"
  },
  "research": {
    "providers": ["wikipedia"],
    "max_results": 3
  },
  "thresholds": {
    "min_words_per_chunk": 25
  }
}
```

### Whisper Configuration

Update the whisper paths in `app/services/stt.js`:
- `whisperBinary`: Path to whisper.cpp main executable
- `modelPath`: Path to downloaded whisper model

### Research Sources (All Free!)

The app comes pre-configured with completely free research sources:

#### ✅ **Currently Active (No Setup Required):**
- **Wikipedia**: Comprehensive encyclopedia entries
- **DuckDuckGo**: Privacy-focused instant answers and definitions  
- **SearXNG**: Aggregated web search results (privacy-focused)

These provide excellent research coverage without any API keys or payment.

#### 🔧 **Custom Configuration:**
Edit `~/.research-companion/config.json` to customize:
```json
{
  "research": {
    "providers": ["wikipedia", "duckduckgo", "searxng"],
    "max_results": 4
  }
}
```

#### 💰 **Google Search (Optional - Requires Payment)**
If you want Google results (not recommended due to cost/complexity):
1. Google requires a billing account even for "free" tier
2. Setup is complex with multiple registration steps
3. Limited to 100 searches/day before charges apply

**Recommendation**: The free sources provide excellent coverage. Google adds minimal value for the complexity and cost.

## Running the Application

1. **Ensure Ollama is running**:
   ```bash
   ollama serve
   ```

2. **Start the application**:
   ```bash
   npm start
   ```

3. **Using the app**:
   - Click "Start" to begin transcription
   - Speak naturally - the app will transcribe your speech
   - Topics and questions will be automatically extracted
   - Research summaries will appear for identified topics
   - Click "Stop" to end the session (automatically saved)

## How It Works

1. **Speech Capture**: Captures audio from your microphone
2. **Transcription**: Processes audio through whisper.cpp for text conversion
3. **Chunking**: Groups transcript into meaningful chunks (25+ words)
4. **Topic Extraction**: Sends chunks to Ollama for intelligent analysis
5. **Research**: Queries Wikipedia (and optionally Google) for relevant information
6. **Display**: Shows transcript, topics, and research in real-time

## Troubleshooting

### Ollama Not Connected
- Ensure Ollama is running: `ollama serve`
- Check if it's accessible: `curl http://localhost:11434`
- Verify you have a model installed: `ollama list`

### No Audio/Transcription
- Check microphone permissions for the Electron app
- Verify whisper.cpp path in `app/services/stt.js`
- Test whisper.cpp directly: `./main -m models/ggml-base.en.bin -f samples/jfk.wav`

### No Topics Extracted
- Check Ollama logs for errors
- Ensure the LLM model supports JSON output
- Try with a different model: `ollama pull mistral`

## Development

### Project Structure
```
auracle/
├── app/
│   ├── main.js          # Electron main process
│   ├── renderer/        # React UI
│   ├── services/        # Core services
│   │   ├── stt.js       # Speech-to-text
│   │   ├── llm.js       # Ollama integration
│   │   ├── research.js  # Web research
│   │   └── processor.js # Conversation pipeline
│   ├── config/          # Configuration
│   └── storage/         # Session persistence
├── whisper.cpp/         # Speech recognition
└── package.json
```

### Building for Production

```bash
npm run package
```

This will create platform-specific distributables in the `dist` folder.

## Privacy & Security

- **Local Processing**: All speech and LLM processing happens on your machine
- **No Cloud Upload**: Audio never leaves your device
- **Research Only**: Only topic searches are sent to external APIs
- **Session Storage**: Conversations are stored locally in JSON format

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.