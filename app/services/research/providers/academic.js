// Academic Research Provider
// Searches scholarly sources, research papers, and academic databases
const https = require('https');
const { loadConfig } = require('../../../config');

class AcademicResearchProvider {
  constructor() {
    this.config = loadConfig();
  }

  // ArXiv API - Free access to scientific papers
  async searchArXiv(query, options = {}) {
    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const maxResults = options.maxResults || 5;
      
      const requestOptions = {
        hostname: 'export.arxiv.org',
        path: `/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`,
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
            const results = [];
            
            // Parse XML response (simplified - in production use xml2js)
            const entries = data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
            
            entries.forEach(entry => {
              const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
              const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim();
              const authors = entry.match(/<name>([\s\S]*?)<\/name>/g)?.map(a => 
                a.replace(/<\/?name>/g, '').trim()
              ) || [];
              const link = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim();
              const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim();
              
              if (title && summary) {
                results.push({
                  source: 'ArXiv',
                  title: title,
                  summary: summary.length > 300 ? summary.substring(0, 297) + '...' : summary,
                  fullAbstract: summary,
                  authors: authors,
                  url: link?.replace('http://arxiv.org/abs/', 'https://arxiv.org/abs/'),
                  pdfUrl: link?.replace('http://arxiv.org/abs/', 'https://arxiv.org/pdf/') + '.pdf',
                  type: 'research-paper',
                  publishedDate: published,
                  timestamp: new Date().toISOString()
                });
              }
            });
            
            resolve(results);
          } catch (error) {
            console.error('ArXiv parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('ArXiv request error:', error);
        resolve([]);
      });
    });
  }

  // PubMed API - Biomedical literature
  async searchPubMed(query, options = {}) {
    return new Promise(async (resolve) => {
      try {
        // First, search for IDs
        const encodedQuery = encodeURIComponent(query);
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmode=json&retmax=${options.maxResults || 5}`;
        
        https.get(searchUrl, (res) => {
          let searchData = '';
          res.on('data', chunk => searchData += chunk);
          res.on('end', async () => {
            try {
              const searchResult = JSON.parse(searchData);
              const ids = searchResult.esearchresult?.idlist || [];
              
              if (ids.length === 0) {
                resolve([]);
                return;
              }
              
              // Fetch summaries for the IDs
              const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
              
              https.get(summaryUrl, (res2) => {
                let summaryData = '';
                res2.on('data', chunk => summaryData += chunk);
                res2.on('end', () => {
                  try {
                    const summaryResult = JSON.parse(summaryData);
                    const results = [];
                    
                    ids.forEach(id => {
                      const article = summaryResult.result?.[id];
                      if (article) {
                        const authors = article.authors?.map(a => a.name).join(', ') || 'Unknown';
                        results.push({
                          source: 'PubMed',
                          title: article.title,
                          summary: `${article.source} (${article.pubdate}). Authors: ${authors}`,
                          authors: article.authors?.map(a => a.name) || [],
                          journal: article.source,
                          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                          type: 'medical-research',
                          publishedDate: article.pubdate,
                          doi: article.doi,
                          pmid: id,
                          timestamp: new Date().toISOString()
                        });
                      }
                    });
                    
                    resolve(results);
                  } catch (error) {
                    console.error('PubMed summary parse error:', error);
                    resolve([]);
                  }
                });
              }).on('error', error => {
                console.error('PubMed summary request error:', error);
                resolve([]);
              });
            } catch (error) {
              console.error('PubMed search parse error:', error);
              resolve([]);
            }
          });
        }).on('error', error => {
          console.error('PubMed search request error:', error);
          resolve([]);
        });
      } catch (error) {
        console.error('PubMed error:', error);
        resolve([]);
      }
    });
  }

  // Semantic Scholar API - AI-powered research paper search
  async searchSemanticScholar(query, options = {}) {
    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const fields = 'paperId,title,abstract,authors,year,citationCount,influentialCitationCount,isOpenAccess,openAccessPdf,venue';
      const limit = options.maxResults || 5;
      
      const requestOptions = {
        hostname: 'api.semanticscholar.org',
        path: `/graph/v1/paper/search?query=${encodedQuery}&fields=${fields}&limit=${limit}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Auracle-Research/1.0'
        }
      };

      // Add API key if available
      if (this.config.research?.semanticScholarApiKey) {
        requestOptions.headers['x-api-key'] = this.config.research.semanticScholarApiKey;
      }

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.data) {
              response.data.forEach(paper => {
                const authorNames = paper.authors?.map(a => a.name).join(', ') || 'Unknown';
                results.push({
                  source: 'Semantic Scholar',
                  title: paper.title,
                  summary: paper.abstract ? 
                    (paper.abstract.length > 300 ? paper.abstract.substring(0, 297) + '...' : paper.abstract) :
                    `Published in ${paper.venue || 'Unknown'} (${paper.year}). Authors: ${authorNames}`,
                  fullAbstract: paper.abstract,
                  authors: paper.authors?.map(a => a.name) || [],
                  url: `https://www.semanticscholar.org/paper/${paper.paperId}`,
                  pdfUrl: paper.openAccessPdf?.url,
                  type: 'research-paper',
                  year: paper.year,
                  citationCount: paper.citationCount,
                  influentialCitationCount: paper.influentialCitationCount,
                  isOpenAccess: paper.isOpenAccess,
                  venue: paper.venue,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Semantic Scholar parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Semantic Scholar request error:', error);
        resolve([]);
      });
    });
  }

  // CORE API - Open access research papers
  async searchCORE(query, options = {}) {
    const apiKey = this.config.research?.coreApiKey;
    if (!apiKey) {
      console.log('CORE API key not configured - using limited access');
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        q: query,
        limit: options.maxResults || 5,
        stats: false
      });

      const requestOptions = {
        hostname: 'api.core.ac.uk',
        path: `/v3/search/outputs?${params}`,
        method: 'GET',
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : ''
        }
      };

      https.get(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const results = [];
            
            if (response.results) {
              response.results.forEach(paper => {
                results.push({
                  source: 'CORE',
                  title: paper.title,
                  summary: paper.abstract ? 
                    (paper.abstract.length > 300 ? paper.abstract.substring(0, 297) + '...' : paper.abstract) :
                    paper.description || 'Open access research paper',
                  authors: paper.authors || [],
                  url: paper.sourceFulltextUrls?.[0] || paper.downloadUrl,
                  pdfUrl: paper.downloadUrl,
                  type: 'open-access-paper',
                  year: paper.yearPublished,
                  doi: paper.doi,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('CORE parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('CORE request error:', error);
        resolve([]);
      });
    });
  }

  // Google Scholar (via SerpAPI if configured)
  async searchGoogleScholar(query, options = {}) {
    const apiKey = this.config.research?.serpApiKey;
    if (!apiKey) {
      console.log('Google Scholar search requires SerpAPI key');
      return [];
    }

    return new Promise((resolve) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        engine: 'google_scholar',
        q: query,
        num: options.maxResults || 5,
        hl: 'en'
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
            
            if (response.organic_results) {
              response.organic_results.forEach(result => {
                results.push({
                  source: 'Google Scholar',
                  title: result.title,
                  summary: result.snippet || result.publication_info?.summary || '',
                  authors: result.publication_info?.authors?.map(a => a.name) || [],
                  url: result.link,
                  pdfUrl: result.resources?.find(r => r.file_format === 'PDF')?.link,
                  type: 'scholarly-article',
                  year: result.publication_info?.year,
                  citationCount: result.inline_links?.cited_by?.total,
                  venue: result.publication_info?.venue,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            resolve(results);
          } catch (error) {
            console.error('Google Scholar parse error:', error);
            resolve([]);
          }
        });
      }).on('error', error => {
        console.error('Google Scholar request error:', error);
        resolve([]);
      });
    });
  }

  // Main search method combining all academic sources
  async search(query, options = {}) {
    const enabledProviders = this.config.research?.academicProviders || 
      ['arxiv', 'semanticscholar', 'pubmed'];
    
    const searchPromises = [];
    
    if (enabledProviders.includes('arxiv')) {
      searchPromises.push(this.searchArXiv(query, options));
    }
    
    if (enabledProviders.includes('pubmed')) {
      searchPromises.push(this.searchPubMed(query, options));
    }
    
    if (enabledProviders.includes('semanticscholar')) {
      searchPromises.push(this.searchSemanticScholar(query, options));
    }
    
    if (enabledProviders.includes('core')) {
      searchPromises.push(this.searchCORE(query, options));
    }
    
    if (enabledProviders.includes('googlescholar')) {
      searchPromises.push(this.searchGoogleScholar(query, options));
    }
    
    try {
      const results = await Promise.all(searchPromises);
      // Flatten and sort by relevance/citation count
      return results.flat()
        .filter(r => r !== null)
        .sort((a, b) => {
          // Prioritize papers with citation counts
          const aCitations = a.citationCount || 0;
          const bCitations = b.citationCount || 0;
          return bCitations - aCitations;
        });
    } catch (error) {
      console.error('Academic search error:', error);
      return [];
    }
  }

  // Search for papers by a specific author
  async searchByAuthor(authorName, options = {}) {
    const query = `author:"${authorName}"`;
    return this.search(query, options);
  }

  // Search for papers in a specific field
  async searchByField(field, topic, options = {}) {
    const fieldQueries = {
      'cs': `cat:cs.* ${topic}`, // Computer Science on ArXiv
      'physics': `cat:physics.* ${topic}`,
      'math': `cat:math.* ${topic}`,
      'biology': `${field} ${topic}`,
      'medicine': `${field} ${topic}`
    };
    
    const query = fieldQueries[field.toLowerCase()] || `${field} ${topic}`;
    return this.search(query, options);
  }
}

// Export singleton instance
const academicProvider = new AcademicResearchProvider();

module.exports = {
  searchAcademic: (query, options) => academicProvider.search(query, options),
  searchArXiv: (query, options) => academicProvider.searchArXiv(query, options),
  searchPubMed: (query, options) => academicProvider.searchPubMed(query, options),
  searchSemanticScholar: (query, options) => academicProvider.searchSemanticScholar(query, options),
  searchCORE: (query, options) => academicProvider.searchCORE(query, options),
  searchGoogleScholar: (query, options) => academicProvider.searchGoogleScholar(query, options),
  searchByAuthor: (author, options) => academicProvider.searchByAuthor(author, options),
  searchByField: (field, topic, options) => academicProvider.searchByField(field, topic, options)
};