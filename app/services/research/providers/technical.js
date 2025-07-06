// Technical Documentation Research Provider
// Searches technical docs, Stack Overflow, GitHub, and developer resources
const https = require('https');
const { loadConfig } = require('../../../config');

class TechnicalResearchProvider {
  constructor() {
    this.config = loadConfig();
  }

  // Stack Overflow API
  async searchStackOverflow(query, options = {}) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        order: 'desc',
        sort: options.sort || 'relevance',
        q: query,
        site: 'stackoverflow',
        filter: '!9Z(-wzu0T', // Include body in response
        pagesize: options.maxResults || 5
      });

      const requestOptions = {
        hostname: 'api.stackexchange.com',
        path: `/2.3/search/advanced?${params}`,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip'
        }
      };

      https.get(requestOptions, (res) => {
        let chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            // Stack Exchange API returns gzipped data
            const buffer = Buffer.concat(chunks);
            const zlib = require('zlib');
            
            zlib.gunzip(buffer, (err, decoded) => {
              if (err) {
                console.error('Stack Overflow decompression error:', err);
                resolve([]);
                return;
              }

              const response = JSON.parse(decoded.toString());
              const results = [];
              
              if (response.items) {
                response.items.forEach(item => {
                  results.push({
                    source: 'Stack Overflow',
                    title: item.title,
                    summary: item.body ? 
                      (item.body.length > 300 ? item.body.substring(0, 297) + '...' : item.body) :
                      `Score: ${item.score}, ${item.answer_count} answers`,
                    url: item.link,
                    type: 'q&a',
                    score: item.score,
                    answerCount: item.answer_count,
                    isAnswered: item.is_answered,
                    tags: item.tags,
                    created: new Date(item.creation_date * 1000).toISOString(),
                    lastActivity: new Date(item.last_activity_date * 1000).toISOString(),
                    timestamp: new Date().toISOString()
                  });
                });
              }
              
              resolve(results);
            });
          } catch (error) {
            console.error('Stack Overflow parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Stack Overflow request error:', error);
        resolve([]);
      });
    });
  }

  // GitHub Search
  async searchGitHub(query, options = {}) {
    const token = this.config.research?.githubToken;
    
    return new Promise((resolve) => {
      const searchType = options.type || 'repositories'; // repositories, code, issues
      const params = new URLSearchParams({
        q: query,
        sort: options.sort || 'relevance',
        order: 'desc',
        per_page: options.maxResults || 5
      });

      const requestOptions = {
        hostname: 'api.github.com',
        path: `/search/${searchType}?${params}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-Research/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      if (token) {
        requestOptions.headers['Authorization'] = `token ${token}`;
      }

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.items) {
              response.items.forEach(item => {
                if (searchType === 'repositories') {
                  results.push({
                    source: 'GitHub',
                    title: item.full_name,
                    summary: item.description || `${item.stargazers_count} stars, ${item.language || 'Unknown'} language`,
                    url: item.html_url,
                    type: 'repository',
                    stars: item.stargazers_count,
                    forks: item.forks_count,
                    language: item.language,
                    topics: item.topics,
                    lastUpdated: item.updated_at,
                    timestamp: new Date().toISOString()
                  });
                } else if (searchType === 'code') {
                  results.push({
                    source: 'GitHub Code',
                    title: `${item.repository.full_name}/${item.path}`,
                    summary: `Code in ${item.path}`,
                    url: item.html_url,
                    type: 'code',
                    repository: item.repository.full_name,
                    path: item.path,
                    timestamp: new Date().toISOString()
                  });
                } else if (searchType === 'issues') {
                  results.push({
                    source: 'GitHub Issues',
                    title: item.title,
                    summary: item.body ? 
                      (item.body.length > 300 ? item.body.substring(0, 297) + '...' : item.body) :
                      `Issue #${item.number} in ${item.repository_url.split('/').slice(-2).join('/')}`,
                    url: item.html_url,
                    type: 'issue',
                    state: item.state,
                    comments: item.comments,
                    created: item.created_at,
                    timestamp: new Date().toISOString()
                  });
                }
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('GitHub parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('GitHub request error:', error);
        resolve([]);
      });
    });
  }

  // MDN Web Docs (via DuckDuckGo)
  async searchMDN(query, options = {}) {
    return new Promise((resolve) => {
      const mdnQuery = `site:developer.mozilla.org ${query}`;
      const encodedQuery = encodeURIComponent(mdnQuery);
      
      const requestOptions = {
        hostname: 'api.duckduckgo.com',
        path: `/?q=${encodedQuery}&format=json&no_html=1`,
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
            
            // MDN results often come in RelatedTopics
            if (response.RelatedTopics && response.RelatedTopics.length > 0) {
              response.RelatedTopics.slice(0, options.maxResults || 3).forEach(topic => {
                if (topic.FirstURL && topic.Text) {
                  results.push({
                    source: 'MDN Web Docs',
                    title: topic.Text.split(' - ')[0],
                    summary: topic.Text,
                    url: topic.FirstURL,
                    type: 'documentation',
                    timestamp: new Date().toISOString()
                  });
                }
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('MDN search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('MDN search request error:', error);
        resolve([]);
      });
    });
  }

  // DevDocs.io API (unofficial)
  async searchDevDocs(query, options = {}) {
    // DevDocs doesn't have an official API, but we can search documentation
    const docs = options.docs || ['javascript', 'python', 'react', 'node'];
    const results = [];
    
    // For now, we'll just return a structured response
    // In production, this would scrape or use a custom index
    docs.forEach(doc => {
      results.push({
        source: `DevDocs - ${doc}`,
        title: `${query} in ${doc} documentation`,
        summary: `Search for ${query} in ${doc} documentation`,
        url: `https://devdocs.io/${doc}/${encodeURIComponent(query)}`,
        type: 'documentation',
        timestamp: new Date().toISOString()
      });
    });
    
    return results.slice(0, options.maxResults || 3);
  }

  // Package managers (NPM, PyPI, etc.)
  async searchPackages(query, options = {}) {
    const ecosystem = options.ecosystem || 'npm';
    
    switch (ecosystem) {
      case 'npm':
        return this.searchNPM(query, options);
      case 'pypi':
        return this.searchPyPI(query, options);
      case 'cargo':
        return this.searchCargo(query, options);
      default:
        return [];
    }
  }

  // NPM Registry
  async searchNPM(query, options = {}) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        text: query,
        size: options.maxResults || 5
      });

      const requestOptions = {
        hostname: 'registry.npmjs.org',
        path: `/-/v1/search?${params}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.objects) {
              response.objects.forEach(obj => {
                const pkg = obj.package;
                results.push({
                  source: 'NPM',
                  title: pkg.name,
                  summary: pkg.description || 'No description available',
                  url: pkg.links.npm,
                  type: 'package',
                  version: pkg.version,
                  author: pkg.author?.name,
                  keywords: pkg.keywords,
                  downloads: obj.score?.detail?.popularity,
                  repository: pkg.links.repository,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('NPM search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('NPM search request error:', error);
        resolve([]);
      });
    });
  }

  // PyPI Python Package Index
  async searchPyPI(query, options = {}) {
    return new Promise((resolve) => {
      const requestOptions = {
        hostname: 'pypi.org',
        path: `/pypi/${encodeURIComponent(query)}/json`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 404) {
              // Package not found, try search instead
              resolve([]);
              return;
            }
            
            const response = JSON.parse(data);
            const info = response.info;
            
            resolve([{
              source: 'PyPI',
              title: info.name,
              summary: info.summary || info.description?.substring(0, 300),
              url: info.home_page || info.project_url,
              type: 'package',
              version: info.version,
              author: info.author,
              keywords: info.keywords,
              license: info.license,
              repository: info.project_urls?.Source,
              timestamp: new Date().toISOString()
            }]);
          } catch (error) {
            console.error('PyPI search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('PyPI search request error:', error);
        resolve([]);
      });
    });
  }

  // Rust Crates.io
  async searchCargo(query, options = {}) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        per_page: options.maxResults || 5
      });

      const requestOptions = {
        hostname: 'crates.io',
        path: `/api/v1/crates?${params}`,
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
            
            if (response.crates) {
              response.crates.forEach(crate => {
                results.push({
                  source: 'Crates.io',
                  title: crate.name,
                  summary: crate.description || 'No description available',
                  url: `https://crates.io/crates/${crate.name}`,
                  type: 'package',
                  version: crate.newest_version,
                  downloads: crate.downloads,
                  repository: crate.repository,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Cargo search parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Cargo search request error:', error);
        resolve([]);
      });
    });
  }

  // Main search method
  async search(query, options = {}) {
    const enabledProviders = this.config.research?.technicalProviders || 
      ['stackoverflow', 'github', 'npm'];
    
    const searchPromises = [];
    
    if (enabledProviders.includes('stackoverflow')) {
      searchPromises.push(this.searchStackOverflow(query, options));
    }
    
    if (enabledProviders.includes('github')) {
      searchPromises.push(this.searchGitHub(query, options));
    }
    
    if (enabledProviders.includes('mdn')) {
      searchPromises.push(this.searchMDN(query, options));
    }
    
    if (enabledProviders.includes('npm')) {
      searchPromises.push(this.searchNPM(query, options));
    }
    
    if (enabledProviders.includes('pypi')) {
      searchPromises.push(this.searchPyPI(query, options));
    }
    
    try {
      const results = await Promise.all(searchPromises);
      return results.flat().filter(r => r !== null);
    } catch (error) {
      console.error('Technical search error:', error);
      return [];
    }
  }

  // Search for code examples
  async searchCodeExamples(language, topic, options = {}) {
    const queries = [
      `${language} ${topic} example`,
      `${language} ${topic} tutorial`,
      `${language} ${topic} how to`
    ];
    
    const promises = queries.map(q => this.searchStackOverflow(q, { maxResults: 2 }));
    const results = await Promise.all(promises);
    return results.flat();
  }

  // Search for error solutions
  async searchError(error, language, options = {}) {
    const query = `${language} "${error}"`;
    return this.search(query, { ...options, sort: 'votes' });
  }
}

// Export singleton instance
const technicalProvider = new TechnicalResearchProvider();

module.exports = {
  searchTechnical: (query, options) => technicalProvider.search(query, options),
  searchStackOverflow: (query, options) => technicalProvider.searchStackOverflow(query, options),
  searchGitHub: (query, options) => technicalProvider.searchGitHub(query, options),
  searchMDN: (query, options) => technicalProvider.searchMDN(query, options),
  searchPackages: (query, options) => technicalProvider.searchPackages(query, options),
  searchNPM: (query, options) => technicalProvider.searchNPM(query, options),
  searchPyPI: (query, options) => technicalProvider.searchPyPI(query, options),
  searchCargo: (query, options) => technicalProvider.searchCargo(query, options),
  searchCodeExamples: (language, topic, options) => technicalProvider.searchCodeExamples(language, topic, options),
  searchError: (error, language, options) => technicalProvider.searchError(error, language, options)
};