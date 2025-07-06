const EventEmitter = require('events');
const { generateCompletion } = require('./llmProviders');

class RealtimeAnalyzer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.buffer = '';
    this.lastAnalysis = null;
    this.analysisQueue = [];
    this.insights = new Map();
    this.knowledgeGraph = new Map();
    this.executiveSummary = '';
    this.slidePoints = [];
    this.recentContext = [];
    this.jargonCache = new Map();
    
    // Configuration
    this.config = {
      minWordsForAnalysis: 50,
      maxInsightsPerMinute: 10,
      confidenceThreshold: 0.7,
      executiveSummaryInterval: 30000, // 30 seconds
      slideGenerationInterval: 300000, // 5 minutes
      contextWindowSize: 500, // characters
      ...options
    };
    
    // Throttling
    this.insightCount = 0;
    this.lastInsightReset = Date.now();
    this.processing = false;
    
    // Timers
    this.summaryTimer = null;
    this.slideTimer = null;
    
    this.startTimers();
  }

  startTimers() {
    // Executive summary update timer
    this.summaryTimer = setInterval(() => {
      if (this.buffer.trim()) {
        this.updateExecutiveSummary();
      }
    }, this.config.executiveSummaryInterval);

    // Slide generation timer
    this.slideTimer = setInterval(() => {
      if (this.buffer.trim()) {
        this.generateSlides();
      }
    }, this.config.slideGenerationInterval);
  }

  async processFragment(fragment) {
    this.buffer += fragment + ' ';
    this.recentContext.push({
      text: fragment,
      timestamp: Date.now()
    });

    // Keep context window manageable
    if (this.recentContext.length > 20) {
      this.recentContext = this.recentContext.slice(-15);
    }

    // Check if we should trigger analysis
    const wordCount = this.buffer.split(' ').filter(w => w.length > 0).length;
    if (wordCount >= this.config.minWordsForAnalysis && !this.processing) {
      this.queueAnalysis();
    }
  }

  async queueAnalysis() {
    if (this.processing || !this.canProcessMoreInsights()) {
      return;
    }

    this.processing = true;
    
    try {
      // Run parallel analysis tasks
      const tasks = [
        this.detectContradictions(),
        this.explainJargon(),
        this.generateInsights(),
        this.buildKnowledgeConnections()
      ];

      const results = await Promise.allSettled(tasks);
      
      // Process results and emit insights
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.emitInsight(result.value);
        }
      });

    } catch (error) {
      console.error('Real-time analysis error:', error);
    } finally {
      this.processing = false;
      this.clearOldBuffer();
    }
  }

  async detectContradictions() {
    if (this.recentContext.length < 2) return null;

    const recentText = this.recentContext.slice(-5).map(c => c.text).join(' ');
    const olderText = this.recentContext.slice(-10, -5).map(c => c.text).join(' ');

    if (!olderText.trim()) return null;

    const prompt = `Analyze this conversation for contradictions or inconsistencies:

EARLIER CONTEXT: ${olderText}
RECENT STATEMENTS: ${recentText}

Identify any contradictions between what was said before and now. Consider:
- Factual inconsistencies
- Changed opinions or positions  
- Conflicting data or numbers
- Logical contradictions

If found, explain clearly and suggest clarification questions.
Respond with JSON: {"found": boolean, "contradiction": "description", "clarification": "suggested question", "confidence": 0.0-1.0}

If no contradictions found, respond: {"found": false}`;

    try {
      const response = await generateCompletion(prompt);
      const result = JSON.parse(response);
      
      if (result.found && result.confidence >= this.config.confidenceThreshold) {
        return {
          type: 'contradiction',
          content: result.contradiction,
          action: result.clarification,
          confidence: result.confidence,
          timestamp: Date.now(),
          context: recentText.slice(-this.config.contextWindowSize)
        };
      }
    } catch (error) {
      console.error('Contradiction detection error:', error);
    }

    return null;
  }

  async explainJargon() {
    const recentText = this.recentContext.slice(-3).map(c => c.text).join(' ');
    
    if (!recentText.trim()) return null;

    const prompt = `Identify technical terms or jargon that may need explanation:

TEXT: ${recentText}

For each term found:
1. Provide a simple, one-sentence explanation
2. Give a relatable analogy if helpful
3. Rate complexity (1-5, where 5 is very technical)

Focus on industry-specific or highly technical terms that a general audience might not understand.
Respond with JSON: {"terms": [{"term": "word", "explanation": "simple explanation", "analogy": "optional analogy", "complexity": 1-5}]}

If no jargon found, respond: {"terms": []}`;

    try {
      const response = await generateCompletion(prompt);
      const result = JSON.parse(response);
      
      if (result.terms && result.terms.length > 0) {
        // Filter for high-complexity terms not already cached
        const newTerms = result.terms.filter(term => 
          term.complexity >= 3 && !this.jargonCache.has(term.term.toLowerCase())
        );

        if (newTerms.length > 0) {
          // Cache the explanations
          newTerms.forEach(term => {
            this.jargonCache.set(term.term.toLowerCase(), term);
          });

          return {
            type: 'jargon',
            content: `Explained ${newTerms.length} technical term(s)`,
            details: newTerms,
            confidence: 0.9,
            timestamp: Date.now(),
            context: recentText.slice(-this.config.contextWindowSize)
          };
        }
      }
    } catch (error) {
      console.error('Jargon explanation error:', error);
    }

    return null;
  }

  async generateInsights() {
    const recentText = this.recentContext.slice(-5).map(c => c.text).join(' ');
    
    if (!recentText.trim()) return null;

    const prompt = `Analyze this conversation segment and provide proactive insights:

TEXT: ${recentText}

Generate insights that would help the participants:
1. Strategic implications or opportunities
2. Missing perspectives or blind spots
3. Relevant examples or case studies to mention
4. Questions to explore deeper

Provide 1-2 most valuable insights.
Respond with JSON: {"insights": [{"type": "strategic|perspective|example|question", "content": "insight text", "value": "why this helps", "confidence": 0.0-1.0}]}`;

    try {
      const response = await generateCompletion(prompt);
      const result = JSON.parse(response);
      
      if (result.insights && result.insights.length > 0) {
        const highValueInsights = result.insights.filter(insight => 
          insight.confidence >= this.config.confidenceThreshold
        );

        if (highValueInsights.length > 0) {
          return {
            type: 'insight',
            content: `${highValueInsights.length} strategic insight(s) available`,
            details: highValueInsights,
            confidence: Math.max(...highValueInsights.map(i => i.confidence)),
            timestamp: Date.now(),
            context: recentText.slice(-this.config.contextWindowSize)
          };
        }
      }
    } catch (error) {
      console.error('Insight generation error:', error);
    }

    return null;
  }

  async buildKnowledgeConnections() {
    // Extract topics from recent context
    const recentText = this.recentContext.slice(-3).map(c => c.text).join(' ');
    
    if (!recentText.trim()) return null;

    const prompt = `Extract key topics and their relationships from this text:

TEXT: ${recentText}

Identify:
1. Main topics/concepts discussed
2. How they relate to each other
3. Any cause-effect relationships

Respond with JSON: {"topics": ["topic1", "topic2"], "connections": [{"from": "topic1", "to": "topic2", "relationship": "causes|enables|contradicts|supports"}]}`;

    try {
      const response = await generateCompletion(prompt);
      const result = JSON.parse(response);
      
      if (result.topics && result.connections) {
        // Update knowledge graph
        result.topics.forEach(topic => {
          if (!this.knowledgeGraph.has(topic)) {
            this.knowledgeGraph.set(topic, { connections: new Set(), weight: 0 });
          }
          this.knowledgeGraph.get(topic).weight += 1;
        });

        result.connections.forEach(conn => {
          if (this.knowledgeGraph.has(conn.from)) {
            this.knowledgeGraph.get(conn.from).connections.add({
              to: conn.to,
              type: conn.relationship
            });
          }
        });

        this.emit('knowledge-graph-updated', this.getKnowledgeGraphData());
      }
    } catch (error) {
      console.error('Knowledge connection error:', error);
    }

    return null;
  }

  async updateExecutiveSummary() {
    if (!this.buffer.trim()) return;

    const prompt = `Update this executive summary with new conversation content:

PREVIOUS SUMMARY: ${this.executiveSummary || 'No previous summary'}
NEW CONTENT: ${this.buffer.slice(-1000)} // Last 1000 chars

Rules:
- Keep summary under 200 words
- Highlight what's NEW or CHANGED since last update
- Focus on key decisions, conclusions, and action items
- Maintain chronological flow

Respond with plain text summary:`;

    try {
      const response = await generateCompletion(prompt);
      this.executiveSummary = response.trim();
      this.emit('executive-summary-updated', this.executiveSummary);
    } catch (error) {
      console.error('Executive summary error:', error);
    }
  }

  async generateSlides() {
    if (!this.buffer.trim()) return;

    const prompt = `Create slide bullet points from this conversation segment:

TRANSCRIPT: ${this.buffer.slice(-2000)} // Last 2000 chars

Generate exactly 3 slides:
1. Key Points (3-4 bullets)
2. Insights & Implications (3-4 bullets)
3. Next Steps or Questions (3-4 bullets)

Make bullets concise, actionable, and presentation-ready.
Respond with JSON: {"slides": [{"title": "slide title", "bullets": ["bullet 1", "bullet 2"]}]}`;

    try {
      const response = await generateCompletion(prompt);
      const result = JSON.parse(response);
      
      if (result.slides) {
        this.slidePoints = result.slides;
        this.emit('slides-generated', this.slidePoints);
      }
    } catch (error) {
      console.error('Slide generation error:', error);
    }
  }

  emitInsight(insight) {
    if (!insight) return;

    this.insights.set(insight.timestamp, insight);
    this.insightCount++;
    
    this.emit('realtime-insight', insight);
    
    // Clean up old insights (keep last 50)
    if (this.insights.size > 50) {
      const oldestKey = Math.min(...this.insights.keys());
      this.insights.delete(oldestKey);
    }
  }

  canProcessMoreInsights() {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.lastInsightReset > 60000) {
      this.insightCount = 0;
      this.lastInsightReset = now;
    }

    return this.insightCount < this.config.maxInsightsPerMinute;
  }

  clearOldBuffer() {
    // Keep last 3000 characters to maintain context
    if (this.buffer.length > 5000) {
      this.buffer = this.buffer.slice(-3000);
    }
  }

  getKnowledgeGraphData() {
    const nodes = Array.from(this.knowledgeGraph.entries()).map(([topic, data]) => ({
      id: topic,
      label: topic,
      weight: data.weight
    }));

    const edges = [];
    this.knowledgeGraph.forEach((data, fromTopic) => {
      data.connections.forEach(conn => {
        edges.push({
          source: fromTopic,
          target: conn.to,
          type: conn.type
        });
      });
    });

    return { nodes, edges };
  }

  getRecentInsights(limit = 10) {
    const recentInsights = Array.from(this.insights.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return recentInsights;
  }

  clear() {
    this.buffer = '';
    this.recentContext = [];
    this.insights.clear();
    this.executiveSummary = '';
    this.slidePoints = [];
  }

  destroy() {
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
    }
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
    this.removeAllListeners();
  }
}

module.exports = RealtimeAnalyzer;