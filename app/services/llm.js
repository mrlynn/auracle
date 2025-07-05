// LLM Service - Ollama Integration for Topic Extraction
const http = require('http');
const { loadConfig } = require('../config');

class OllamaService {
  constructor() {
    this.config = loadConfig();
    this.endpoint = this.config.llm.endpoint;
    this.model = this.config.llm.model;
  }

  async extractTopics(text) {
    if (!text || text.trim().length < 10) {
      return { topics: [], questions: [] };
    }

    const prompt = `You are analyzing a conversation transcript. Extract the main topics, questions, and unknown terms that would benefit from research.

Conversation transcript:
"${text}"

Respond with a JSON object containing:
1. "topics": array of 1-3 main topics or concepts discussed (short phrases)
2. "questions": array of any questions asked or implied (if any)
3. "terms": array of technical terms or concepts that might need explanation

Be selective - only extract truly important topics worth researching. If the conversation is casual small talk, return empty arrays.

Example response:
{"topics": ["machine learning algorithms", "neural networks"], "questions": ["How does backpropagation work?"], "terms": ["gradient descent", "loss function"]}`;

    try {
      const response = await this.callOllama(prompt);
      return this.parseTopicsResponse(response);
    } catch (error) {
      console.error('Failed to extract topics:', error);
      return { topics: [], questions: [], terms: [] };
    }
  }

  async callOllama(prompt) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3,
          top_p: 0.9
        }
      });

      const url = new URL(this.endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.response) {
              resolve(response.response);
            } else {
              reject(new Error('Invalid Ollama response'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  parseTopicsResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        topics: parsed.topics || [],
        questions: parsed.questions || [],
        terms: parsed.terms || []
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      // Fallback: try to extract topics using simple patterns
      return this.fallbackTopicExtraction(response);
    }
  }

  fallbackTopicExtraction(text) {
    // Simple fallback if JSON parsing fails
    const topics = [];
    const questions = [];
    
    // Look for question marks
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (sentence.includes('?')) {
        questions.push(sentence.trim());
      }
    });

    return { topics, questions, terms: [] };
  }

  async callOllamaSimple(prompt) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        // No JSON format for simple calls
        options: {
          temperature: 0.3,
          top_p: 0.9
        }
      });

      const url = new URL(this.endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.response) {
              resolve(response.response);
            } else {
              reject(new Error('Invalid Ollama response'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async testConnection() {
    return new Promise((resolve) => {
      console.log('Testing Ollama connection...');
      
      const postData = JSON.stringify({
        model: this.model,
        prompt: 'OK',
        stream: false
      });

      const url = new URL(this.endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 3000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const connected = response.response && typeof response.response === 'string';
            console.log('Ollama connection test result:', connected);
            resolve(connected);
          } catch (e) {
            console.error('Ollama response parse error:', e);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Ollama connection error:', error.message);
        resolve(false);
      });

      req.on('timeout', () => {
        console.error('Ollama connection timeout');
        req.destroy();
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }
}

// Create singleton instance
const ollamaService = new OllamaService();

// Export main functions
module.exports = {
  extractTopics: (text) => ollamaService.extractTopics(text),
  testOllamaConnection: () => ollamaService.testConnection()
}; 