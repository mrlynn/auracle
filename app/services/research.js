// Research Service - Google and Wikipedia Integration
const https = require('https');
const { loadConfig } = require('../config');

class ResearchService {
  constructor() {
    this.config = loadConfig();
    this.maxResults = this.config.research.max_results || 3;
    this.providers = this.config.research.providers || ['wikipedia'];
  }

  async fetchResearchSummaries(topics) {
    if (!topics || topics.length === 0) {
      return [];
    }

    const summaries = [];
    
    // Process each topic
    for (const topic of topics.slice(0, 3)) { // Limit to 3 topics
      try {
        const results = await this.researchTopic(topic);
        if (results.length > 0) {
          summaries.push({
            topic: topic,
            sources: results,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Failed to research topic "${topic}":`, error);
      }
    }

    return summaries;
  }

  async researchTopic(topic) {
    const results = [];

    // Research from enabled providers
    if (this.providers.includes('wikipedia')) {
      const wikiResult = await this.searchWikipedia(topic);
      if (wikiResult) results.push(wikiResult);
    }

    if (this.providers.includes('duckduckgo')) {
      const ddgResult = await this.searchDuckDuckGo(topic);
      if (ddgResult) results.push(ddgResult);
    }

    if (this.providers.includes('searxng')) {
      const searxResults = await this.searchSearXNG(topic);
      results.push(...searxResults);
    }

    if (this.providers.includes('google')) {
      const googleResults = await this.searchGoogle(topic);
      results.push(...googleResults);
    }

    return results.slice(0, this.maxResults);
  }

  async searchWikipedia(query) {
    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const options = {
        hostname: 'en.wikipedia.org',
        path: `/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&titles=${encodedQuery}`,
        method: 'GET',
        headers: {
          'User-Agent': 'ResearchCompanion/1.0'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const pages = response.query.pages;
            const pageId = Object.keys(pages)[0];
            
            if (pageId !== '-1' && pages[pageId].extract) {
              const extract = pages[pageId].extract;
              const summary = extract.length > 300 
                ? extract.substring(0, 297) + '...' 
                : extract;
              
              resolve({
                source: 'Wikipedia',
                title: pages[pageId].title,
                summary: summary,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title.replace(/ /g, '_'))}`
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Wikipedia parse error:', error);
            resolve(null);
          }
        });
      }).on('error', (error) => {
        console.error('Wikipedia request error:', error);
        resolve(null);
      });
    });
  }

  async searchGoogle(query) {
    const apiKey = this.config.research.googleApiKey;
    const searchEngineId = this.config.research.googleSearchEngineId;
    
    // Check if API credentials are configured
    if (!apiKey || !searchEngineId || 
        apiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
        searchEngineId === 'YOUR_SEARCH_ENGINE_ID_HERE') {
      console.log('Google search not configured - please add API credentials to config');
      return [];
    }

    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const options = {
        hostname: 'www.googleapis.com',
        path: `/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=2`,
        method: 'GET'
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.items) {
              response.items.forEach(item => {
                results.push({
                  source: 'Google',
                  title: item.title,
                  summary: item.snippet,
                  url: item.link
                });
              });
            } else if (response.error) {
              console.error('Google API error:', response.error.message);
            }
            
            resolve(results);
          } catch (error) {
            console.error('Google search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', (error) => {
        console.error('Google search request error:', error);
        resolve([]);
      });
    });
  }

  // Free alternative search sources
  async searchDuckDuckGo(query) {
    // DuckDuckGo Instant Answer API (free, no registration)
    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const options = {
        hostname: 'api.duckduckgo.com',
        path: `/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-ResearchCompanion/1.0'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            // Try Abstract first (best results)
            if (response.AbstractText && response.AbstractText.length > 10) {
              const summary = response.AbstractText.length > 300 
                ? response.AbstractText.substring(0, 297) + '...' 
                : response.AbstractText;
              
              resolve({
                source: 'DuckDuckGo',
                title: response.Heading || query,
                summary: summary,
                url: response.AbstractURL || `https://duckduckgo.com/?q=${encodedQuery}`
              });
              return;
            }

            // Try Definition if available
            if (response.Definition && response.Definition.length > 10) {
              const summary = response.Definition.length > 300 
                ? response.Definition.substring(0, 297) + '...' 
                : response.Definition;
              
              resolve({
                source: 'DuckDuckGo',
                title: response.DefinitionSource || query,
                summary: summary,
                url: response.DefinitionURL || `https://duckduckgo.com/?q=${encodedQuery}`
              });
              return;
            }

            // Try Answer (for quick facts)
            if (response.Answer && response.Answer.length > 5) {
              resolve({
                source: 'DuckDuckGo',
                title: `${query} (Quick Answer)`,
                summary: response.Answer,
                url: `https://duckduckgo.com/?q=${encodedQuery}`
              });
              return;
            }

            resolve(null);
          } catch (error) {
            console.error('DuckDuckGo parse error:', error);
            resolve(null);
          }
        });
      }).on('error', (error) => {
        console.error('DuckDuckGo request error:', error);
        resolve(null);
      });
    });
  }

  // Alternative: Search using SearXNG (privacy-focused metasearch)
  async searchSearXNG(query) {
    // Using public SearXNG instance (completely free)
    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const options = {
        hostname: 'searx.be',  // Public SearXNG instance
        path: `/search?q=${encodedQuery}&format=json&categories=general`,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-ResearchCompanion/1.0'
        },
        timeout: 5000
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.results && response.results.length > 0) {
              // Get top 2 results
              response.results.slice(0, 2).forEach(item => {
                if (item.content && item.content.length > 20) {
                  const summary = item.content.length > 300 
                    ? item.content.substring(0, 297) + '...' 
                    : item.content;
                  
                  results.push({
                    source: 'Web Search',
                    title: item.title || query,
                    summary: summary.replace(/<[^>]*>/g, ''), // Remove HTML tags
                    url: item.url
                  });
                }
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('SearXNG parse error:', error);
            resolve([]);
          }
        });
      }).on('error', (error) => {
        console.error('SearXNG request error:', error);
        resolve([]);
      });
    });
  }
}

// Create singleton instance
const researchService = new ResearchService();

// Export main functions
module.exports = {
  fetchResearchSummaries: (topics) => researchService.fetchResearchSummaries(topics),
  researchTopic: (topic) => researchService.researchTopic(topic)
}; 