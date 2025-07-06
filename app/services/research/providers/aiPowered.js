// AI-Powered Research Providers
// Integrates with AI search engines for intelligent research
const https = require('https');
const { loadConfig } = require('../../../config');

class AISearchProvider {
  constructor() {
    this.config = loadConfig();
  }

  // Perplexity AI Search
  async searchPerplexity(query, options = {}) {
    const apiKey = this.config.research?.perplexityApiKey;
    if (!apiKey) {
      console.log('Perplexity API key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const payload = {
        model: 'sonar-medium-online', // Real-time web search model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide accurate, relevant information with sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_recency_filter: options.recency || 'month', // month, week, day, hour
        stream: false
      };

      const postData = JSON.stringify(payload);
      const requestOptions = {
        hostname: 'api.perplexity.ai',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.choices && response.choices[0]) {
              const content = response.choices[0].message.content;
              const citations = response.citations || [];
              
              resolve([{
                source: 'Perplexity AI',
                title: `AI Research: ${query}`,
                summary: content,
                fullContent: content,
                citations: citations,
                url: 'https://www.perplexity.ai',
                type: 'ai-synthesis',
                confidence: 'high',
                timestamp: new Date().toISOString()
              }]);
            } else {
              resolve([]);
            }
          } catch (error) {
            console.error('Perplexity parse error:', error);
            resolve([]);
          }
        });
      });

      req.on('error', error => {
        console.error('Perplexity request error:', error);
        resolve([]);
      });

      req.write(postData);
      req.end();
    });
  }

  // You.com AI Search
  async searchYouDotCom(query, options = {}) {
    const apiKey = this.config.research?.youApiKey;
    if (!apiKey) {
      console.log('You.com API key not configured - using free tier');
      // You.com offers limited free search
    }

    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const requestOptions = {
        hostname: 'api.ydc-index.io',
        path: `/search?query=${encodedQuery}`,
        method: 'GET',
        headers: {
          'X-API-Key': apiKey || '',
          'Content-Type': 'application/json'
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.hits) {
              response.hits.slice(0, 3).forEach(hit => {
                results.push({
                  source: 'You.com',
                  title: hit.title || query,
                  summary: hit.description || hit.snippet,
                  url: hit.url,
                  type: 'ai-enhanced',
                  relevanceScore: hit.score,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('You.com parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('You.com request error:', error);
        resolve([]);
      });
    });
  }

  // Tavily AI Search (designed for AI agents)
  async searchTavily(query, options = {}) {
    const apiKey = this.config.research?.tavilyApiKey;
    if (!apiKey) {
      console.log('Tavily API key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const payload = {
        api_key: apiKey,
        query: query,
        search_depth: options.depth || 'advanced', // basic or advanced
        include_answer: true,
        include_raw_content: options.includeRaw || false,
        max_results: options.maxResults || 5,
        include_domains: options.domains || [],
        exclude_domains: options.excludeDomains || []
      };

      const postData = JSON.stringify(payload);
      const requestOptions = {
        hostname: 'api.tavily.com',
        path: '/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            // Add the AI-generated answer if available
            if (response.answer) {
              results.push({
                source: 'Tavily AI',
                title: 'AI Summary',
                summary: response.answer,
                type: 'ai-answer',
                confidence: 'high',
                url: 'https://tavily.com',
                timestamp: new Date().toISOString()
              });
            }
            
            // Add individual search results
            if (response.results) {
              response.results.forEach(result => {
                results.push({
                  source: 'Tavily Search',
                  title: result.title,
                  summary: result.content,
                  url: result.url,
                  type: 'web-result',
                  relevanceScore: result.score,
                  publishedDate: result.published_date,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Tavily parse error:', error);
            resolve([]);
          }
        });
      });

      req.on('error', error => {
        console.error('Tavily request error:', error);
        resolve([]);
      });

      req.write(postData);
      req.end();
    });
  }

  // SerpAPI - Access Google, Bing, and other search engines
  async searchSerpAPI(query, options = {}) {
    const apiKey = this.config.research?.serpApiKey;
    if (!apiKey) {
      console.log('SerpAPI key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        engine: options.engine || 'google',
        num: options.num || 5,
        hl: 'en',
        gl: 'us'
      });

      const requestOptions = {
        hostname: 'serpapi.com',
        path: `/search.json?${params}`,
        method: 'GET'
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            // Organic results
            if (response.organic_results) {
              response.organic_results.forEach(result => {
                results.push({
                  source: 'Google Search',
                  title: result.title,
                  summary: result.snippet,
                  url: result.link,
                  type: 'search-result',
                  position: result.position,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            // Knowledge graph
            if (response.knowledge_graph) {
              const kg = response.knowledge_graph;
              results.push({
                source: 'Google Knowledge Graph',
                title: kg.title,
                summary: kg.description,
                url: kg.source?.link,
                type: 'knowledge-graph',
                metadata: {
                  type: kg.type,
                  facts: kg.facts
                },
                timestamp: new Date().toISOString()
              });
            }
            
            // Answer box
            if (response.answer_box) {
              results.push({
                source: 'Google Answer',
                title: response.answer_box.title || 'Quick Answer',
                summary: response.answer_box.answer || response.answer_box.snippet,
                url: response.answer_box.link,
                type: 'answer-box',
                timestamp: new Date().toISOString()
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('SerpAPI parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('SerpAPI request error:', error);
        resolve([]);
      });
    });
  }

  // Brave Search API
  async searchBrave(query, options = {}) {
    const apiKey = this.config.research?.braveApiKey;
    if (!apiKey) {
      console.log('Brave Search API key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        count: options.count || 5,
        freshness: options.freshness || '', // pd, pw, pm, py (past day/week/month/year)
        text_decorations: false
      });

      const requestOptions = {
        hostname: 'api.search.brave.com',
        path: `/res/v1/web/search?${params}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.web?.results) {
              response.web.results.forEach(result => {
                results.push({
                  source: 'Brave Search',
                  title: result.title,
                  summary: result.description,
                  url: result.url,
                  type: 'web-result',
                  age: result.age, // How old the content is
                  language: result.language,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            // Brave also provides discussions (Reddit, forums)
            if (response.discussions?.results) {
              response.discussions.results.forEach(discussion => {
                results.push({
                  source: 'Brave Discussions',
                  title: discussion.title,
                  summary: discussion.description,
                  url: discussion.url,
                  type: 'discussion',
                  forumName: discussion.forum_name,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Brave Search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Brave Search request error:', error);
        resolve([]);
      });
    });
  }

  // Main search method that combines multiple AI sources
  async search(query, options = {}) {
    const enabledProviders = this.config.research?.aiProviders || ['tavily'];
    const searchPromises = [];
    
    if (enabledProviders.includes('perplexity')) {
      searchPromises.push(this.searchPerplexity(query, options));
    }
    
    if (enabledProviders.includes('you')) {
      searchPromises.push(this.searchYouDotCom(query, options));
    }
    
    if (enabledProviders.includes('tavily')) {
      searchPromises.push(this.searchTavily(query, options));
    }
    
    if (enabledProviders.includes('serpapi')) {
      searchPromises.push(this.searchSerpAPI(query, options));
    }
    
    if (enabledProviders.includes('brave')) {
      searchPromises.push(this.searchBrave(query, options));
    }
    
    try {
      const results = await Promise.all(searchPromises);
      return results.flat().filter(r => r !== null);
    } catch (error) {
      console.error('AI search error:', error);
      return [];
    }
  }
}

// Export singleton instance
const aiSearchProvider = new AISearchProvider();

module.exports = {
  searchAI: (query, options) => aiSearchProvider.search(query, options),
  searchPerplexity: (query, options) => aiSearchProvider.searchPerplexity(query, options),
  searchYouDotCom: (query, options) => aiSearchProvider.searchYouDotCom(query, options),
  searchTavily: (query, options) => aiSearchProvider.searchTavily(query, options),
  searchSerpAPI: (query, options) => aiSearchProvider.searchSerpAPI(query, options),
  searchBrave: (query, options) => aiSearchProvider.searchBrave(query, options)
};