# Privacy Policy for Auracle

*Last updated: January 2025*

## Overview

Auracle is designed with privacy as a core principle. We believe in keeping your conversations and data private and secure.

## Data Collection and Processing

### Local Processing
- **Speech Recognition**: All audio processing happens locally on your device using whisper.cpp
- **AI Analysis**: Topic extraction and analysis is performed locally using Ollama
- **No Cloud Upload**: Your audio and conversations never leave your device

### What We Collect
- **Nothing Automatically**: Auracle does not automatically collect any personal data
- **Optional Research Queries**: Only topic searches are sent to external research APIs (Wikipedia, etc.)
- **No Audio Storage**: Audio is processed in real-time and not stored

### What We Store Locally
- **Conversation Transcripts**: Stored locally in JSON files on your device
- **Generated Reports**: Saved locally to your Downloads folder
- **App Settings**: Configuration preferences stored locally
- **Usage Metrics**: Basic app usage statistics (stored locally, not transmitted)

## Third-Party Services

### Research APIs
When you use Auracle's research features, we may send search queries to:
- **Wikipedia**: For encyclopedia entries
- **DuckDuckGo**: For general web search results
- **Other Research Sources**: As configured in settings

**Important**: Only search terms and topics are sent, never your audio or full conversations.

### Optional Cloud Services
- **AI Providers**: If you configure cloud AI providers (OpenAI, etc.), your prompts may be sent to those services
- **You Control This**: All cloud integrations are optional and configurable

## Data Security

### Local Storage
- Conversation data is stored locally on your device
- No unauthorized access from external services
- You maintain full control over your data

### Encryption
- Network communications use HTTPS/TLS encryption
- Local data storage uses your operating system's built-in security

## Your Rights

### Data Control
- **Access**: All your data is stored locally and accessible to you
- **Deletion**: You can delete conversation files and app data at any time
- **Export**: Your data is stored in standard JSON format for easy export

### Settings Control
- **Disable Research**: You can turn off all external research features
- **Choose Providers**: Select which research sources you want to use
- **Opt Out**: Disable any data collection or external communications

## Children's Privacy

Auracle is not designed for or directed at children under 13. We do not knowingly collect personal information from children under 13.

## Changes to Privacy Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy in the app and updating the "Last updated" date.

## Contact Information

If you have questions about this privacy policy, please contact us at:
- Email: privacy@auracle.app
- Website: https://auracle.app/privacy

## Technical Details

### Data Location
- **macOS**: `~/Library/Application Support/Auracle/`
- **Windows**: `%APPDATA%/Auracle/`
- **Linux**: `~/.config/Auracle/`

### Network Communications
- Research API calls (only search terms)
- Software update checks (anonymous)
- Optional cloud AI providers (if configured)

### No Tracking
- No analytics or tracking cookies
- No behavioral profiling
- No advertising networks
- No social media integrations

---

*Auracle is committed to protecting your privacy and maintaining transparency about our data practices.*