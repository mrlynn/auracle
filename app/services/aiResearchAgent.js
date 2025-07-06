// AI-Powered Research Agent
// Provides intelligent, context-aware research capabilities
const { generateCompletion } = require('./llmProviders');
const { trackRequest } = require('./usageTracker');
const EventEmitter = require('events');

class AIResearchAgent extends EventEmitter {
  constructor() {
    super();
    this.conversationContext = [];
    this.researchHistory = [];
    this.userPreferences = this.loadUserPreferences();
  }

  // Analyze conversation context to understand research needs
  async analyzeContext(transcript, currentTopics, previousResearch) {
    const prompt = `You are an expert research assistant. Analyze this conversation and determine the most valuable research directions.

CONVERSATION TRANSCRIPT:
${transcript.slice(-500)} // Last 500 chars for context

CURRENT TOPICS:
${currentTopics.map(t => `- ${t}`).join('\n')}

PREVIOUS RESEARCH:
${previousResearch.slice(-3).map(r => `- ${r.topic}: ${r.sources.length} sources`).join('\n')}

Based on the conversation context:
1. What are the most important aspects to research?
2. What type of information would be most valuable (technical details, examples, comparisons, tutorials)?
3. What knowledge gaps need to be filled?
4. What follow-up questions might the user have?

Respond with a JSON object:
{
  "primaryFocus": "main research focus",
  "researchQueries": ["specific search query 1", "specific search query 2", ...],
  "informationType": "technical|tutorial|comparison|explanation|current_events|academic",
  "knowledgeGaps": ["gap 1", "gap 2"],
  "suggestedFollowUps": ["follow-up question 1", "follow-up question 2"],
  "contextSummary": "brief summary of what the conversation is about"
}`

    try {
      const response = await generateCompletion(prompt, { 
        temperature: 0.3,
        format: 'json'
      });
      
      // Track usage
      trackRequest('researchAnalysis', 
        this.estimateTokens(prompt), 
        this.estimateTokens(response),
        'ai-research',
        'context-analysis'
      );

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing context:', error);
      return this.getFallbackAnalysis(currentTopics);
    }
  }

  // Generate intelligent research queries based on context
  async generateResearchQueries(topic, context, informationType) {
    // Skip invalid topics
    if (!topic || topic.length < 2 || 
        topic.includes('BLANK_AUDIO') || 
        topic.includes('NULL') || 
        topic.includes('UNDEFINED')) {
      console.log('Skipping query generation for invalid topic:', topic);
      return [{ 
        query: 'general information', 
        purpose: 'Fallback query',
        sourceType: 'general'
      }];
    }

    const prompt = `Generate highly specific search queries for researching "${topic}".

Context: ${context.contextSummary || 'General discussion'}
Information Type Needed: ${informationType}
User Expertise Level: ${this.userPreferences.expertiseLevel || 'intermediate'}

Generate 5 search queries that will find the most relevant and valuable information.
Consider different angles: technical documentation, tutorials, comparisons, recent developments, best practices.

Respond with a JSON array of query objects:
[
  {
    "query": "specific search query",
    "purpose": "what this query will find",
    "sourceType": "academic|technical|news|tutorial|general"
  }
]`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.4,
        format: 'json'
      });
      
      const parsed = JSON.parse(response);
      
      // Handle both array and object responses
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.queries && Array.isArray(parsed.queries)) {
        return parsed.queries;
      } else {
        console.log('Unexpected query response format:', parsed);
        return [{ 
          query: topic, 
          purpose: 'General information',
          sourceType: 'general'
        }];
      }
    } catch (error) {
      console.error('Error generating queries:', error);
      return [{ 
        query: topic, 
        purpose: 'General information',
        sourceType: 'general'
      }];
    }
  }

  // Synthesize research results into coherent insights
  async synthesizeResearch(topic, searchResults, context) {
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results to synthesize for topic:', topic);
      return null;
    }

    // Skip synthesis for invalid topics
    if (!topic || topic.length < 2 || 
        topic.includes('BLANK_AUDIO') || 
        topic.includes('NULL') || 
        topic.includes('UNDEFINED')) {
      console.log('Skipping synthesis for invalid topic:', topic);
      return null;
    }

    const prompt = `You are a research synthesis expert. Analyze these search results and create a comprehensive insight.

TOPIC: ${topic}
CONTEXT: ${context.contextSummary || 'General research'}

SEARCH RESULTS:
${searchResults.map((r, i) => `
Source ${i + 1}: ${r.source}
Title: ${r.title}
Summary: ${r.summary}
URL: ${r.url}
`).join('\n')}

Create a synthesized insight that:
1. Combines information from multiple sources
2. Highlights key points relevant to the context
3. Identifies any conflicting information
4. Suggests areas for deeper exploration
5. Provides practical takeaways

Respond with a JSON object:
{
  "synthesis": "comprehensive summary combining all sources",
  "keyPoints": ["key point 1", "key point 2", ...],
  "conflicts": ["any conflicting information"],
  "practicalTakeaways": ["actionable insight 1", "actionable insight 2"],
  "deeperExploration": ["suggested follow-up topic 1", "suggested follow-up topic 2"],
  "confidence": "high|medium|low",
  "sourcesUsed": [0, 1, 2] // indices of sources that contributed
}`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.2,
        format: 'json'
      });

      const synthesis = JSON.parse(response);
      
      // Track usage
      trackRequest('researchSynthesis',
        this.estimateTokens(prompt),
        this.estimateTokens(response),
        'ai-research',
        'synthesis'
      );

      return synthesis;
    } catch (error) {
      console.error('Error synthesizing research:', error);
      return null;
    }
  }

  // Evaluate source credibility
  async evaluateCredibility(source, content) {
    const prompt = `Evaluate the credibility of this information source.

SOURCE: ${source.source}
TITLE: ${source.title}
URL: ${source.url}
CONTENT PREVIEW: ${source.summary}

Evaluate based on:
1. Source reputation
2. Content quality
3. Recency (if applicable)
4. Objectivity
5. Evidence/citations

Respond with JSON:
{
  "credibilityScore": 0-100,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "biasIndicators": ["potential bias 1"],
  "recommendation": "highly reliable|generally reliable|use with caution|unreliable"
}`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.2,
        format: 'json'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error evaluating credibility:', error);
      return {
        credibilityScore: 50,
        strengths: ['Source available'],
        weaknesses: ['Unable to verify'],
        biasIndicators: [],
        recommendation: 'use with caution'
      };
    }
  }

  // Generate follow-up questions based on research
  async generateFollowUpQuestions(topic, research, context) {
    // Handle null or undefined research
    if (!research) {
      console.log('No research data provided for follow-up questions');
      return [];
    }

    const prompt = `Based on this research, generate insightful follow-up questions.

TOPIC: ${topic}
RESEARCH SUMMARY: ${research.synthesis || 'Research conducted on ' + topic}
KEY POINTS: ${research.keyPoints?.join(', ') || 'Various aspects explored'}

Generate 3-5 follow-up questions that:
1. Explore deeper aspects
2. Clarify important points
3. Connect to related topics
4. Address practical applications

Return as JSON array of strings.`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.5,
        format: 'json'
      });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return [];
    }
  }

  // Identify knowledge gaps
  async identifyKnowledgeGaps(topics, researchDone) {
    const prompt = `Identify knowledge gaps in the current research.

TOPICS DISCUSSED: ${topics.join(', ')}
RESEARCH COMPLETED: ${researchDone.map(r => r.topic).join(', ')}

What important related topics or aspects haven't been researched yet?
What connections between topics should be explored?

Return as JSON:
{
  "gaps": ["gap 1", "gap 2"],
  "connections": ["connection to explore 1"],
  "recommendations": ["recommended research area 1"]
}`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.4,
        format: 'json'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error identifying gaps:', error);
      return { gaps: [], connections: [], recommendations: [] };
    }
  }

  // Create research brief
  async createResearchBrief(topic, allResearch) {
    const prompt = `Create an executive research brief on "${topic}".

RESEARCH DATA:
${JSON.stringify(allResearch, null, 2).slice(0, 2000)}

Create a professional brief with:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Implications
4. Recommendations
5. Areas for Further Research

Format as JSON with these sections.`;

    try {
      const response = await generateCompletion(prompt, {
        temperature: 0.3,
        format: 'json'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error creating brief:', error);
      return null;
    }
  }

  // Helper methods
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  getFallbackAnalysis(topics) {
    return {
      primaryFocus: topics[0] || 'general research',
      researchQueries: topics.slice(0, 3),
      informationType: 'general',
      knowledgeGaps: [],
      suggestedFollowUps: [],
      contextSummary: 'General research on provided topics'
    };
  }

  loadUserPreferences() {
    // TODO: Load from persistent storage
    return {
      expertiseLevel: 'intermediate',
      preferredSources: ['academic', 'technical', 'tutorial'],
      detailLevel: 'balanced'
    };
  }

  updateConversationContext(transcript, topics) {
    this.conversationContext.push({
      timestamp: new Date(),
      transcript: transcript.slice(-500),
      topics
    });

    // Keep only last 10 entries
    if (this.conversationContext.length > 10) {
      this.conversationContext.shift();
    }
  }

  addToHistory(research) {
    this.researchHistory.push({
      timestamp: new Date(),
      ...research
    });

    // Keep only last 50 entries
    if (this.researchHistory.length > 50) {
      this.researchHistory.shift();
    }
  }
}

// Create singleton instance
const aiResearchAgent = new AIResearchAgent();

module.exports = {
  aiResearchAgent,
  analyzeContext: (transcript, topics, research) => 
    aiResearchAgent.analyzeContext(transcript, topics, research),
  generateResearchQueries: (topic, context, type) => 
    aiResearchAgent.generateResearchQueries(topic, context, type),
  synthesizeResearch: (topic, results, context) => 
    aiResearchAgent.synthesizeResearch(topic, results, context),
  evaluateCredibility: (source, content) => 
    aiResearchAgent.evaluateCredibility(source, content),
  generateFollowUpQuestions: (topic, research, context) =>
    aiResearchAgent.generateFollowUpQuestions(topic, research, context),
  identifyKnowledgeGaps: (topics, research) =>
    aiResearchAgent.identifyKnowledgeGaps(topics, research),
  createResearchBrief: (topic, research) =>
    aiResearchAgent.createResearchBrief(topic, research)
};