// Conversation Processing Pipeline
const EventEmitter = require('events');
const { extractTopics } = require('./llmProviders');
const { fetchResearchSummaries } = require('./research');
const { loadConfig } = require('../config');

class ConversationProcessor extends EventEmitter {
  constructor() {
    super();
    this.config = loadConfig();
    this.transcriptBuffer = '';
    this.wordCount = 0;
    this.lastProcessedTime = Date.now();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Configuration
    this.minWordsPerChunk = this.config.thresholds.min_words_per_chunk || 25;
    this.maxBufferWords = 100; // Process if buffer gets too large
    this.idleTimeout = 5000; // Process after 5 seconds of silence
  }

  // Add new transcript text to the buffer
  addTranscript(text) {
    if (!text || text.trim().length === 0) return;
    
    this.transcriptBuffer += ' ' + text;
    this.wordCount += text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Check if we should process
    if (this.shouldProcess()) {
      this.processChunk();
    }
    
    // Reset idle timer
    this.resetIdleTimer();
  }

  shouldProcess() {
    // Process if we have enough words
    if (this.wordCount >= this.minWordsPerChunk) {
      return true;
    }
    
    // Process if buffer is getting too large
    if (this.wordCount >= this.maxBufferWords) {
      return true;
    }
    
    return false;
  }

  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    this.idleTimer = setTimeout(() => {
      if (this.wordCount > 0) {
        this.processChunk();
      }
    }, this.idleTimeout);
  }

  async processChunk() {
    if (this.isProcessing || this.wordCount === 0) return;
    
    // Extract chunk to process
    const chunk = this.transcriptBuffer.trim();
    this.transcriptBuffer = '';
    this.wordCount = 0;
    this.lastProcessedTime = Date.now();
    
    // Add to processing queue
    this.processingQueue.push(chunk);
    
    // Process queue
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const chunk = this.processingQueue.shift();
    
    try {
      // Emit chunk event
      this.emit('chunk', {
        text: chunk,
        timestamp: new Date().toISOString()
      });
      
      // Extract topics using LLM
      console.log('Processing chunk:', chunk.substring(0, 50) + '...');
      const topicData = await extractTopics(chunk);
      
      if (topicData.topics.length > 0 || topicData.questions.length > 0 || topicData.terms.length > 0) {
        // Emit topics event
        this.emit('topics', {
          topics: topicData.topics,
          questions: topicData.questions,
          terms: topicData.terms,
          chunkText: chunk,
          timestamp: new Date().toISOString()
        });
        
        // Fetch research summaries
        const allTopics = [
          ...topicData.topics,
          ...topicData.questions.slice(0, 1), // Include first question
          ...topicData.terms.slice(0, 1) // Include first term
        ];
        
        if (allTopics.length > 0) {
          const summaries = await fetchResearchSummaries(allTopics);
          
          if (summaries.length > 0) {
            // Emit research event
            this.emit('research', {
              summaries: summaries,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing chunk:', error);
      this.emit('error', error);
    }
    
    // Process next item in queue
    setTimeout(() => this.processQueue(), 100);
  }

  // Force processing of current buffer
  flush() {
    if (this.wordCount > 0) {
      this.processChunk();
    }
  }

  // Clear all buffers and stop processing
  clear() {
    this.transcriptBuffer = '';
    this.wordCount = 0;
    this.processingQueue = [];
    this.isProcessing = false;
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Get current status
  getStatus() {
    return {
      bufferWordCount: this.wordCount,
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      lastProcessedTime: this.lastProcessedTime
    };
  }
}

// Create singleton instance
const processor = new ConversationProcessor();

module.exports = processor;