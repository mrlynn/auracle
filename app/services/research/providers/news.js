// News and Current Events Research Provider
// Searches news sources, RSS feeds, and current events
const https = require('https');
const { loadConfig } = require('../../../config');

class NewsResearchProvider {
  constructor() {
    this.config = loadConfig();
  }

  // NewsAPI - Comprehensive news coverage
  async searchNewsAPI(query, options = {}) {
    const apiKey = this.config.research?.newsApiKey;
    if (!apiKey) {
      console.log('NewsAPI key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        apiKey: apiKey,
        language: options.language || 'en',
        sortBy: options.sortBy || 'relevancy', // relevancy, popularity, publishedAt
        pageSize: options.maxResults || 5,
        from: options.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
      });

      // Choose endpoint based on options
      const endpoint = options.topHeadlines ? '/v2/top-headlines' : '/v2/everything';
      
      const requestOptions = {
        hostname: 'newsapi.org',
        path: `${endpoint}?${params}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-Research/1.0'
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.articles) {
              response.articles.forEach(article => {
                results.push({
                  source: `News - ${article.source.name}`,
                  title: article.title,
                  summary: article.description || article.content?.substring(0, 300),
                  url: article.url,
                  type: 'news-article',
                  author: article.author,
                  publishedAt: article.publishedAt,
                  imageUrl: article.urlToImage,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('NewsAPI parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('NewsAPI request error:', error);
        resolve([]);
      });
    });
  }

  // The Guardian API - Quality journalism
  async searchGuardian(query, options = {}) {
    const apiKey = this.config.research?.guardianApiKey;
    if (!apiKey) {
      console.log('Guardian API key not configured - using free tier');
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        'api-key': apiKey || 'test', // 'test' gives limited access
        'page-size': options.maxResults || 5,
        'order-by': options.orderBy || 'relevance',
        'show-fields': 'headline,standfirst,body,thumbnail',
        'from-date': options.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      const requestOptions = {
        hostname: 'content.guardianapis.com',
        path: `/search?${params}`,
        method: 'GET'
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.response?.results) {
              response.response.results.forEach(article => {
                const fields = article.fields || {};
                results.push({
                  source: 'The Guardian',
                  title: fields.headline || article.webTitle,
                  summary: fields.standfirst || fields.body?.substring(0, 300) || '',
                  url: article.webUrl,
                  type: 'news-article',
                  section: article.sectionName,
                  publishedAt: article.webPublicationDate,
                  imageUrl: fields.thumbnail,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Guardian parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Guardian request error:', error);
        resolve([]);
      });
    });
  }

  // New York Times API
  async searchNYTimes(query, options = {}) {
    const apiKey = this.config.research?.nytApiKey;
    if (!apiKey) {
      console.log('NY Times API key not configured');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        'api-key': apiKey,
        sort: options.sort || 'relevance',
        page: 0
      });

      const requestOptions = {
        hostname: 'api.nytimes.com',
        path: `/svc/search/v2/articlesearch.json?${params}`,
        method: 'GET'
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.response?.docs) {
              response.response.docs.slice(0, options.maxResults || 5).forEach(article => {
                results.push({
                  source: 'New York Times',
                  title: article.headline?.main || article.abstract,
                  summary: article.abstract || article.lead_paragraph?.substring(0, 300),
                  url: article.web_url,
                  type: 'news-article',
                  section: article.section_name,
                  author: article.byline?.original,
                  publishedAt: article.pub_date,
                  keywords: article.keywords?.map(k => k.value),
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('NY Times parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('NY Times request error:', error);
        resolve([]);
      });
    });
  }

  // BBC News (via RSS)
  async searchBBCNews(query, options = {}) {
    // BBC doesn't have a search API, but we can use their RSS feeds
    const feeds = {
      'world': 'http://feeds.bbci.co.uk/news/world/rss.xml',
      'technology': 'http://feeds.bbci.co.uk/news/technology/rss.xml',
      'science': 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
      'business': 'http://feeds.bbci.co.uk/news/business/rss.xml',
      'health': 'http://feeds.bbci.co.uk/news/health/rss.xml'
    };

    // For now, return empty - in production, implement RSS parsing
    return [];
  }

  // Reddit - Real-time discussions and news
  async searchReddit(query, options = {}) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        limit: options.maxResults || 5,
        sort: options.sort || 'relevance',
        t: options.time || 'week' // hour, day, week, month, year, all
      });

      const subreddit = options.subreddit || '';
      const path = subreddit ? `/r/${subreddit}/search.json?${params}&restrict_sr=1` : `/search.json?${params}`;

      const requestOptions = {
        hostname: 'www.reddit.com',
        path: path,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-Research/1.0'
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.data?.children) {
              response.data.children.forEach(post => {
                const postData = post.data;
                results.push({
                  source: `Reddit - r/${postData.subreddit}`,
                  title: postData.title,
                  summary: postData.selftext ? 
                    (postData.selftext.length > 300 ? postData.selftext.substring(0, 297) + '...' : postData.selftext) :
                    `${postData.num_comments} comments, ${postData.score} upvotes`,
                  url: `https://reddit.com${postData.permalink}`,
                  type: 'discussion',
                  author: postData.author,
                  score: postData.score,
                  numComments: postData.num_comments,
                  created: new Date(postData.created_utc * 1000).toISOString(),
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Reddit parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Reddit request error:', error);
        resolve([]);
      });
    });
  }

  // Hacker News - Tech news and discussions
  async searchHackerNews(query, options = {}) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        query: query,
        tags: options.tags || 'story',
        hitsPerPage: options.maxResults || 5
      });

      const requestOptions = {
        hostname: 'hn.algolia.com',
        path: `/api/v1/search?${params}`,
        method: 'GET'
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.hits) {
              response.hits.forEach(hit => {
                results.push({
                  source: 'Hacker News',
                  title: hit.title || hit.story_title,
                  summary: hit.story_text ? 
                    (hit.story_text.length > 300 ? hit.story_text.substring(0, 297) + '...' : hit.story_text) :
                    `${hit.num_comments || 0} comments, ${hit.points || 0} points`,
                  url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                  type: 'tech-news',
                  author: hit.author,
                  points: hit.points,
                  numComments: hit.num_comments,
                  created: hit.created_at,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Hacker News parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Hacker News request error:', error);
        resolve([]);
      });
    });
  }

  // Google News via SerpAPI
  async searchGoogleNews(query, options = {}) {
    const apiKey = this.config.research?.serpApiKey;
    if (!apiKey) {
      console.log('Google News search requires SerpAPI key');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        engine: 'google_news',
        q: query,
        gl: options.country || 'us',
        hl: options.language || 'en'
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
            
            if (response.news_results) {
              response.news_results.slice(0, options.maxResults || 5).forEach(article => {
                results.push({
                  source: article.source?.name || 'Google News',
                  title: article.title,
                  summary: article.snippet || '',
                  url: article.link,
                  type: 'news-article',
                  publishedAt: article.date,
                  thumbnail: article.thumbnail,
                  relatedCoverage: article.stories?.length || 0,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Google News parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Google News request error:', error);
        resolve([]);
      });
    });
  }

  // Main search method combining news sources
  async search(query, options = {}) {
    const enabledProviders = this.config.research?.newsProviders || 
      ['newsapi', 'reddit', 'hackernews'];
    
    const searchPromises = [];
    
    if (enabledProviders.includes('newsapi')) {
      searchPromises.push(this.searchNewsAPI(query, options));
    }
    
    if (enabledProviders.includes('guardian')) {
      searchPromises.push(this.searchGuardian(query, options));
    }
    
    if (enabledProviders.includes('nytimes')) {
      searchPromises.push(this.searchNYTimes(query, options));
    }
    
    if (enabledProviders.includes('reddit')) {
      searchPromises.push(this.searchReddit(query, options));
    }
    
    if (enabledProviders.includes('hackernews')) {
      searchPromises.push(this.searchHackerNews(query, options));
    }
    
    if (enabledProviders.includes('googlenews')) {
      searchPromises.push(this.searchGoogleNews(query, options));
    }
    
    try {
      const results = await Promise.all(searchPromises);
      // Flatten and sort by date
      return results.flat()
        .filter(r => r !== null)
        .sort((a, b) => {
          const dateA = new Date(a.publishedAt || a.created || a.timestamp);
          const dateB = new Date(b.publishedAt || b.created || b.timestamp);
          return dateB - dateA; // Most recent first
        });
    } catch (error) {
      console.error('News search error:', error);
      return [];
    }
  }

  // Search for trending topics
  async searchTrending(options = {}) {
    // This would integrate with Twitter API, Google Trends, etc.
    // For now, return empty
    return [];
  }

  // Search news by category
  async searchByCategory(category, options = {}) {
    const categoryQueries = {
      'technology': 'technology OR tech OR software OR AI',
      'science': 'science OR research OR discovery',
      'business': 'business OR economy OR finance OR market',
      'health': 'health OR medical OR healthcare OR medicine',
      'politics': 'politics OR government OR policy OR election'
    };
    
    const query = categoryQueries[category.toLowerCase()] || category;
    return this.search(query, { ...options, topHeadlines: true });
  }
}

// Export singleton instance
const newsProvider = new NewsResearchProvider();

module.exports = {
  searchNews: (query, options) => newsProvider.search(query, options),
  searchNewsAPI: (query, options) => newsProvider.searchNewsAPI(query, options),
  searchGuardian: (query, options) => newsProvider.searchGuardian(query, options),
  searchNYTimes: (query, options) => newsProvider.searchNYTimes(query, options),
  searchReddit: (query, options) => newsProvider.searchReddit(query, options),
  searchHackerNews: (query, options) => newsProvider.searchHackerNews(query, options),
  searchGoogleNews: (query, options) => newsProvider.searchGoogleNews(query, options),
  searchTrending: (options) => newsProvider.searchTrending(options),
  searchNewsByCategory: (category, options) => newsProvider.searchByCategory(category, options)
};