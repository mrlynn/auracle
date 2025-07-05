# whisper.cpp Integration

## Install on macOS

1. **Install dependencies:**
   ```sh
   brew install cmake
   brew install portaudio
   ```

2. **Clone whisper.cpp:**
   ```sh
   git clone https://github.com/ggerganov/whisper.cpp.git
   cd whisper.cpp
   make
   ```

3. **Test transcription:**
   ```sh
   ./main -m models/ggml-base.en.bin -f samples/jfk.wav
   ```

4. **For real-time mic input:**
   ```sh
   ./main -m models/ggml-base.en.bin -t 4 --step 500 --length 5000 --real-time --output-txt
   ```

See [whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp) for more details. 