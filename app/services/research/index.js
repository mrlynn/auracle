// Enhanced Research Service - Main Orchestrator
// Coordinates AI-powered research across multiple providers
const EventEmitter = require('events');
const { loadConfig } = require('../../config');

// Import AI Research Agent
const { 
  analyzeContext, 
  generateResearchQueries, 
  synthesizeResearch,
  evaluateCredibility,
  generateFollowUpQuestions,
  identifyKnowledgeGaps 
} = require('../aiResearchAgent');

// Import research providers
const { searchAI } = require('./providers/aiPowered');
const { searchAcademic } = require('./providers/academic');
const { searchNews } = require('./providers/news');
const { searchTechnical } = require('./providers/technical');

// Import legacy providers
const oldResearch = require('../research');

class EnhancedResearchService extends EventEmitter {
  constructor() {
    super();
    this.config = loadConfig();
    this.researchCache = new Map();
    this.activeSearches = new Set();
    
    // Periodic cache cleanup to prevent memory leaks during long sessions
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 2 * 60 * 1000); // Clean every 2 minutes
  }
  
  // Clean up expired cache entries
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.researchCache.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) { // 5 minute TTL
        this.researchCache.delete(key);
        cleaned++;
      }
    }
    
    // Also limit total cache size to prevent unbounded growth
    if (this.researchCache.size > 100) {
      const entries = Array.from(this.researchCache.entries());
      // Sort by timestamp and keep only the 50 most recent
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.researchCache.clear();
      entries.slice(0, 50).forEach(([key, value]) => {
        this.researchCache.set(key, value);
      });
      cleaned += entries.length - 50;
    }
    
    if (cleaned > 0) {
      console.log(`🗑️ Research cache: cleaned ${cleaned} expired entries, ${this.researchCache.size} remaining`);
    }
  }

  // Main research method - AI-powered and context-aware
  async research(topics, transcript, previousResearch = []) {
    if (!topics || topics.length === 0) {
      return [];
    }

    console.log('🧠 Enhanced Research: Starting AI-powered research for topics:', topics);

    try {
      // Step 1: Analyze context with AI
      const context = await analyzeContext(
        transcript || topics.join('. '), 
        topics, 
        previousResearch
      );
      console.log('📊 Research context analyzed:', context.primaryFocus);

      // Step 2: Generate smart queries for each topic
      const researchPromises = topics.slice(0, 5).map(async (topic) => {
        try {
          // Skip invalid or system topics
          if (!topic || topic.length < 2 || 
              topic.includes('BLANK_AUDIO') || 
              topic.includes('NULL') || 
              topic.includes('UNDEFINED')) {
            console.log('🚫 Skipping invalid topic:', topic);
            return null;
          }

          // Check cache first
          const cacheKey = `${topic}-${context.informationType}`;
          if (this.researchCache.has(cacheKey)) {
            const cached = this.researchCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
              console.log('📦 Using cached research for:', topic);
              return cached.data;
            }
          }

          // Generate intelligent queries
          const queries = await generateResearchQueries(topic, context, context.informationType);
          console.log(`🔍 Generated ${queries.length} queries for topic:`, topic);

          // Execute searches in parallel across providers
          const searchResults = await this.executeSearches(topic, queries, context);
          console.log(`📚 Found ${searchResults.length} results for:`, topic);

          // Synthesize results with AI
          const synthesis = await synthesizeResearch(topic, searchResults, context);
          
          // Evaluate credibility of sources
          const credibilityPromises = searchResults.slice(0, 3).map(result => 
            evaluateCredibility(result, result.summary)
          );
          const credibilityScores = await Promise.all(credibilityPromises);

          // Generate follow-up questions (only if synthesis exists)
          const followUpQuestions = synthesis ? 
            await generateFollowUpQuestions(topic, synthesis, context) : [];

          // Combine everything into enhanced research result
          const enhancedResult = {
            topic,
            context: context.contextSummary,
            primaryFocus: context.primaryFocus,
            sources: searchResults.map((result, index) => ({
              ...result,
              credibility: credibilityScores[index] || { score: 50, recommendation: 'use with caution' }
            })),
            synthesis: synthesis || {
              synthesis: searchResults.map(r => r.summary).join(' '),
              keyPoints: [],
              confidence: 'low'
            },
            followUpQuestions,
            timestamp: new Date().toISOString()
          };

          // Cache the result
          this.researchCache.set(cacheKey, {
            data: enhancedResult,
            timestamp: Date.now()
          });

          // Emit progress event
          this.emit('research-progress', {
            topic,
            status: 'completed',
            resultCount: searchResults.length
          });

          return enhancedResult;

        } catch (error) {
          console.error(`Error researching topic "${topic}":`, error);
          this.emit('research-error', { topic, error: error.message });
          return null;
        }
      });

      // Wait for all research to complete
      const results = await Promise.all(researchPromises);
      const validResults = results.filter(r => r !== null);

      // Identify knowledge gaps across all topics
      if (validResults.length > 0) {
        const gaps = await identifyKnowledgeGaps(topics, validResults);
        this.emit('knowledge-gaps', gaps);
      }

      console.log(`✅ Enhanced research completed: ${validResults.length} topics researched`);
      return validResults;

    } catch (error) {
      console.error('Enhanced research error:', error);
      this.emit('research-error', { error: error.message });
      return [];
    }
  }

  // Execute searches across multiple providers
  async executeSearches(topic, queries, context) {
    const searchPromises = [];
    const maxResultsPerProvider = 3;

    // Determine which providers to use based on context
    const providers = this.selectProviders(context.informationType);
    
    // Execute queries across selected providers
    queries.forEach(queryObj => {
      const { query, sourceType } = queryObj;
      
      if (providers.includes('ai') && ['general', 'ai-synthesis'].includes(sourceType)) {
        searchPromises.push(searchAI(query, { 
          maxResults: maxResultsPerProvider,
          depth: 'advanced' 
        }));
      }
      
      if (providers.includes('academic') && ['academic', 'technical'].includes(sourceType)) {
        searchPromises.push(searchAcademic(query, { 
          maxResults: maxResultsPerProvider 
        }));
      }
      
      if (providers.includes('news') && ['news', 'current_events'].includes(sourceType)) {
        searchPromises.push(searchNews(query, { 
          maxResults: maxResultsPerProvider,
          sortBy: 'relevancy' 
        }));
      }
      
      if (providers.includes('technical') && ['technical', 'tutorial'].includes(sourceType)) {
        searchPromises.push(searchTechnical(query, { 
          maxResults: maxResultsPerProvider 
        }));
      }
      
      // Also use legacy providers
      if (providers.includes('wikipedia')) {
        searchPromises.push(oldResearch.researchTopic(topic));
      }
    });

    try {
      const results = await Promise.all(searchPromises);
      // Flatten, remove duplicates, and sort by relevance
      const allResults = results.flat().filter(r => r !== null);
      return this.deduplicateAndRank(allResults);
    } catch (error) {
      console.error('Search execution error:', error);
      return [];
    }
  }

  // Select providers based on information type and availability
  selectProviders(informationType) {
    // Start with free/reliable providers
    const baseProviders = ['wikipedia'];
    
    // Check which enhanced providers are configured
    const availableProviders = this.getAvailableProviders();
    
    const providerMap = {
      'technical': [...baseProviders, 'technical'],
      'tutorial': [...baseProviders, 'technical'],
      'comparison': [...baseProviders, 'technical'],
      'explanation': [...baseProviders],
      'current_events': [...baseProviders, 'news'],
      'academic': [...baseProviders, 'academic'],
      'general': [...baseProviders]
    };

    let selectedProviders = providerMap[informationType] || baseProviders;
    
    // Add AI providers if available
    if (availableProviders.includes('ai')) {
      selectedProviders.unshift('ai');
    }
    
    return selectedProviders;
  }

  // Check which providers have valid configuration
  getAvailableProviders() {
    const available = [];
    
    // Check AI providers
    if (this.config.research?.tavilyApiKey) {
      available.push('ai');
    }
    
    // Check academic providers (many are free)
    if (this.config.research?.academicProviders?.length > 0) {
      available.push('academic');
    }
    
    // Check technical providers (Stack Overflow is free)
    if (this.config.research?.technicalProviders?.length > 0) {
      available.push('technical');
    }
    
    // Check news providers (Reddit/HN are free)
    if (this.config.research?.newsProviders?.length > 0) {
      available.push('news');
    }
    
    return available;
  }

  // Deduplicate and rank results
  deduplicateAndRank(results) {
    // Remove exact duplicates based on URL
    const uniqueResults = [];
    const seenUrls = new Set();
    
    results.forEach(result => {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    });

    // Rank by multiple factors
    return uniqueResults.sort((a, b) => {
      // Prioritize AI synthesis
      if (a.type === 'ai-synthesis' && b.type !== 'ai-synthesis') return -1;
      if (b.type === 'ai-synthesis' && a.type !== 'ai-synthesis') return 1;
      
      // Then by relevance score if available
      const scoreA = a.relevanceScore || a.score || 0;
      const scoreB = b.relevanceScore || b.score || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Then by recency
      const dateA = new Date(a.publishedAt || a.timestamp);
      const dateB = new Date(b.publishedAt || b.timestamp);
      return dateB - dateA;
    }).slice(0, 10); // Limit to top 10 results
  }

  // Quick search for immediate results
  async quickSearch(query, options = {}) {
    console.log('⚡ Quick search for:', query);
    
    try {
      const searchPromises = [
        searchAI(query, { maxResults: 2 }),
        oldResearch.researchTopic(query)
      ];

      const results = await Promise.all(searchPromises);
      return results.flat().filter(r => r !== null).slice(0, 5);
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  }

  // Search with specific provider
  async searchWithProvider(query, provider, options = {}) {
    switch (provider) {
      case 'ai':
        return searchAI(query, options);
      case 'academic':
        return searchAcademic(query, options);
      case 'news':
        return searchNews(query, options);
      case 'technical':
        return searchTechnical(query, options);
      default:
        return oldResearch.researchTopic(query);
    }
  }

  // Clear cache
  clearCache() {
    this.researchCache.clear();
    console.log('🗑️ Research cache cleared');
  }
  
  // Cleanup when service is destroyed
  destroy() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    this.clearCache();
    this.activeSearches.clear();
    console.log('🔥 Enhanced research service destroyed');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.researchCache.size,
      entries: Array.from(this.researchCache.entries()).map(([key, value]) => ({
        key,
        timestamp: new Date(value.timestamp).toISOString(),
        age: Date.now() - value.timestamp
      }))
    };
  }
}

// Create singleton instance
const enhancedResearch = new EnhancedResearchService();

// Export enhanced research functions
module.exports = {
  // Main research function
  fetchResearchSummaries: (topics, transcript, previousResearch) => 
    enhancedResearch.research(topics, transcript, previousResearch),
  
  // Quick search
  quickSearch: (query, options) => 
    enhancedResearch.quickSearch(query, options),
  
  // Provider-specific searches
  searchWithProvider: (query, provider, options) => 
    enhancedResearch.searchWithProvider(query, provider, options),
  
  // Cache management
  clearResearchCache: () => enhancedResearch.clearCache(),
  getResearchCacheStats: () => enhancedResearch.getCacheStats(),
  
  // Event emitter for progress tracking
  researchEmitter: enhancedResearch,
  
  // Legacy compatibility
  researchTopic: (topic) => oldResearch.researchTopic(topic)
};