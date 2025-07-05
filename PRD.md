📄 Product Requirements Document (PRD)
Real-time Conversational Research Companion
📌 Overview
Product Name:
Real-time Conversational Research Companion

Description:
A cross-platform desktop application that listens to real-time conversations (via microphone), transcribes speech to text, extracts topics/questions, and automatically performs research to surface relevant insights.
It leverages a local LLM (via Ollama) to keep user data private and performant.

Target Platforms:

Initial: macOS

Next: Windows & Linux (cross-platform via Electron or Tauri)

🎯 Goals & Objectives
Goal	Description
🎤 Passive listening	Continuously capture speech and transcribe in real time
📝 Topic extraction	Use local LLM to detect main topics, questions, or unknown terms
🔍 Automatic research	Fetch info from web (Google, Wikipedia, others) on detected topics
🖥️ Insight presentation	Show research summaries, links, and highlights in an intuitive GUI
🔧 Configurable stack	Allow switching LLM models, adjusting thresholds, enabling/disabling research
🔒 Local-first privacy	All speech & LLM processing is local; only web searches leave the machine

🧭 Scope
✅ MVP
🎙 Real-time mic input + transcription (via Whisper / whisper.cpp)

🔎 Local LLM (Ollama) for topic extraction

🌐 Simple research module (search Google/Wikipedia for top topics)

🖥 Basic GUI timeline to show:

transcript text

extracted topics

summaries from research

💾 Local persistence (store sessions, config, history)

⚙ Config file for:

LLM endpoint & model

speech-to-text settings

research providers

thresholds (chunk size, min topic confidence)

🚫 Not in MVP
Multi-language support

Meeting participant separation / diarization

OAuth for personal knowledge sources (Notion, Confluence, etc.)

Mobile app

🏗 Architecture Overview
csharp
Copy
Edit
[Microphone Input]
   ↓
[Speech-to-Text]
   ↓
[Chunking (every N words/seconds)]
   ↓
[Local LLM Topic Extraction]
   ↓
[Web Research]
   ↓
[UI Timeline & Insights Panel]
   ↓
[Local storage]
🛠 Tech Stack
Layer	Tech Options
GUI	Electron + React / Tauri + React
Speech-to-text	whisper.cpp (via local CLI)
LLM	Ollama (local endpoint, configurable model)
Research	Node HTTP requests to Google Custom Search, Wikipedia
Data storage	JSON / LiteDB / SQLite (for sessions & config)
Config	JSON file in user home dir (~/.research-companion/config.json)

⚙️ Config Example
json
Copy
Edit
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
    "providers": ["google", "wikipedia"],
    "max_results": 3
  },
  "thresholds": {
    "min_words_per_chunk": 25
  }
}
🚀 User Stories
As a ...	I want to ...	So that ...
Casual user	start the app and let it run in the background	it automatically gives me research without effort
Developer	configure which LLM or speech-to-text engine to use	I can test different local setups
Privacy-minded	keep everything local (speech & LLM processing)	none of my private conversations go to the cloud
Researcher	see topics & automatic summaries in a clean timeline	I can quickly learn about what's discussed

📋 Acceptance Criteria
✅ Mic input works with acceptable real-time latency (< 3s lag)

✅ LLM detects topics & outputs 1-3 main keywords/questions per chunk

✅ Research module fetches at least 2 sources per topic

✅ UI shows a clear timeline with: transcript, topics, summary

✅ Config file can change LLM model, thresholds, research providers

✅ No audio or transcription data is uploaded anywhere except direct web lookups

📂 Directory Structure
bash
Copy
Edit
/
├── app/
│   ├── main.js          # Electron/Tauri entry
│   ├── renderer/        # React UI
│   ├── services/
│   │   ├── stt.js       # Speech-to-text integration
│   │   ├── llm.js       # Ollama interface
│   │   ├── research.js  # Web research handlers
│   ├── storage/         # JSON / DB handling
│   └── config/          # Config loader & schema
├── whisper/             # (or scripts to invoke whisper.cpp)
└── README.md
🔥 Milestones
Milestone	Description	Target Date
✅ Prototype transcription	Mic → Whisper → Console output	+2 weeks
✅ Integrate Ollama	Chunk text → send to LLM → get topics	+4 weeks
✅ Build research fetcher	Google/Wikipedia → get summaries	+6 weeks
✅ UI timeline	Transcript + topics + summaries	+8 weeks
✅ Config / local persistence	JSON file for settings & session saves	+10 weeks
✅ Build Mac app bundle	Electron/Tauri packaged .app	+12 weeks

📝 Open Questions
Should we offer auto start on system boot for power users?

Should we allow live voice command triggers (e.g. “Hey Companion, summarize this”)?

Future integrations: local vector store to remember what user already learned.

📌 Ownership
Product Owner: You (or appointed PM)

Engineering Lead: TBD

Design: TBD

Testing: TBD

✅ Done means:

App can run on macOS, start listening, summarize topics, and present research in a UI timeline, with configurable local LLM and local-only processing (except external research lookups).
