// Conversation Processing Pipeline
const EventEmitter = require('events');
const { extractTopics } = require('./llmProviders');
const { fetchResearchSummaries } = require('./research/index');
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
    this.previousResearch = []; // Track previous research for context
    
    // Configuration - lowered for testing
    this.minWordsPerChunk = this.config.thresholds.min_words_per_chunk || 5; // Lowered from 25 to 5
    this.maxBufferWords = 100; // Process if buffer gets too large
    this.idleTimeout = 3000; // Process after 3 seconds of silence (reduced from 5)
  }

  // Add new transcript text to the buffer
  addTranscript(text) {
    if (!text || text.trim().length === 0) return;
    
    console.log('📝 Processor: Adding transcript text:', text.substring(0, 50) + '...');
    this.transcriptBuffer += ' ' + text;
    this.wordCount += text.split(/\s+/).filter(word => word.length > 0).length;
    console.log('📊 Processor: Buffer now has', this.wordCount, 'words, min required:', this.minWordsPerChunk);
    
    // Check if we should process
    if (this.shouldProcess()) {
      console.log('✅ Processor: Should process - triggering chunk processing');
      this.processChunk();
    } else {
      console.log('⏳ Processor: Not enough words yet, waiting...');
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
    
    // More aggressive queue management to prevent memory exhaustion
    if (this.processingQueue.length > 20) {
      console.warn(`Processing queue overflow: ${this.processingQueue.length} items, dropping to 10`);
      this.processingQueue = this.processingQueue.slice(-10);
    }
    
    this.isProcessing = true;
    const chunk = this.processingQueue.shift();
    
    try {
      // Emit chunk event
      console.log('🔄 Processor: Emitting chunk event');
      this.emit('chunk', {
        text: chunk,
        timestamp: new Date().toISOString()
      });
      
      // Extract topics using LLM
      console.log('🧠 Processor: Extracting topics from chunk:', chunk.substring(0, 100) + '...');
      const topicData = await extractTopics(chunk);
      console.log('🎯 Processor: Topic extraction result:', topicData);
      
      if (topicData.topics.length > 0 || topicData.questions.length > 0 || topicData.terms.length > 0) {
        console.log('✨ Processor: Topics found! Emitting topics event');
        // Emit topics event
        this.emit('topics', {
          topics: topicData.topics,
          questions: topicData.questions,
          terms: topicData.terms,
          chunkText: chunk,
          timestamp: new Date().toISOString()
        });
        
        // Fetch research summaries - filter out invalid topics
        const allTopics = [
          ...topicData.topics,
          ...topicData.questions.slice(0, 1), // Include first question
          ...topicData.terms.slice(0, 1) // Include first term
        ].filter(topic => 
          topic && 
          typeof topic === 'string' && 
          topic.length > 2 && 
          !topic.includes('BLANK_AUDIO') && 
          !topic.includes('NULL') && 
          !topic.includes('UNDEFINED') &&
          !topic.includes('[object Object]')
        );
        
        if (allTopics.length > 0) {
          console.log('🔍 Processor: Fetching research for topics:', allTopics);
          // Pass transcript context for AI-powered research
          const summaries = await fetchResearchSummaries(
            allTopics, 
            this.transcriptBuffer, 
            this.previousResearch || []
          );
          console.log('📚 Processor: Research summaries:', summaries.length, 'found');
          
          if (summaries.length > 0) {
            console.log('📡 Processor: Emitting research event');
            // Store research for future context with aggressive memory management
            this.previousResearch.push(...summaries);
            // Keep only last 5 research items for context (reduced from 15)
            if (this.previousResearch.length > 5) {
              this.previousResearch = this.previousResearch.slice(-5);
              console.warn(`Research context truncated to ${this.previousResearch.length} items`);
            }
            
            // Emit research event
            this.emit('research', {
              summaries: summaries,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        console.log('🤷 Processor: No topics found in this chunk');
      }
    } catch (error) {
      console.error('❌ Processor: Error processing chunk:', error);
      this.emit('error', error);
    }
    
    // Process next item in queue with better timing
    // Use longer delay to prevent CPU overload during extended sessions
    setTimeout(() => this.processQueue(), 200);
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
    this.previousResearch = []; // Clear research context
    
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