const { generateCompletion } = require('./llmProviders');

class InsightGenerator {
  constructor() {
    this.insightTypes = {
      CONTRADICTION: 'contradiction',
      JARGON: 'jargon',
      SUGGESTION: 'suggestion',
      EXAMPLE: 'example',
      COUNTERPOINT: 'counterpoint',
      STRATEGIC: 'strategic',
      PERSPECTIVE: 'perspective',
      QUESTION: 'question'
    };

    this.prompts = this.initializePrompts();
    this.cache = new Map();
    this.confidenceThreshold = 0.7;
  }

  initializePrompts() {
    return {
      [this.insightTypes.CONTRADICTION]: `Analyze this conversation for contradictions or inconsistencies:

RECENT CONTEXT: {recentContext}
NEW STATEMENT: {newStatement}

Identify any contradictions between what was said before and now. Consider:
- Factual inconsistencies
- Changed opinions or positions
- Conflicting data or numbers
- Logical contradictions

If found, explain the contradiction clearly and suggest clarification questions.
Respond with JSON: {"found": boolean, "contradiction": "description", "clarification": "question", "confidence": 0.0-1.0}`,

      [this.insightTypes.JARGON]: `Identify technical terms or jargon in this text that may need explanation:

TEXT: {text}

For each term found:
1. Provide a simple, one-sentence explanation
2. Give a relatable analogy if helpful
3. Rate complexity (1-5)

Focus on terms that are industry-specific or highly technical.
Respond with JSON: {"terms": [{"term": "word", "explanation": "simple explanation", "analogy": "optional", "complexity": 1-5}]}`,

      [this.insightTypes.SUGGESTION]: `Based on this conversation segment, suggest actionable improvements or opportunities:

CONTEXT: {context}
CURRENT DISCUSSION: {text}

Provide 2-3 specific, actionable suggestions that could:
- Improve the discussed approach
- Address potential issues
- Leverage opportunities mentioned
- Enhance outcomes

Respond with JSON: {"suggestions": [{"title": "brief title", "description": "detailed suggestion", "rationale": "why this helps", "confidence": 0.0-1.0}]}`,

      [this.insightTypes.EXAMPLE]: `Find relevant examples or case studies for this discussion:

TOPIC: {topic}
CONTEXT: {context}

Suggest 1-2 relevant examples that would illustrate or support the points being discussed:
- Real-world case studies
- Historical precedents
- Industry examples
- Analogous situations

Respond with JSON: {"examples": [{"title": "example name", "description": "brief description", "relevance": "how it applies", "source": "where to find more info", "confidence": 0.0-1.0}]}`,

      [this.insightTypes.COUNTERPOINT]: `Generate thoughtful counterpoints or alternative perspectives:

CURRENT POSITION: {position}
CONTEXT: {context}

Identify 1-2 legitimate counterarguments or alternative viewpoints that should be considered:
- Different approaches
- Potential risks or downsides
- Alternative interpretations
- Missing considerations

Respond with JSON: {"counterpoints": [{"perspective": "alternative view", "reasoning": "supporting logic", "implications": "what this means", "confidence": 0.0-1.0}]}`,

      [this.insightTypes.STRATEGIC]: `Analyze this discussion for strategic implications:

DISCUSSION: {text}
BUSINESS CONTEXT: {context}

Identify strategic opportunities, risks, or considerations:
- Market implications
- Competitive advantages/disadvantages
- Resource requirements
- Timeline considerations
- Success metrics

Respond with JSON: {"strategic_insights": [{"type": "opportunity|risk|consideration", "insight": "description", "impact": "potential impact", "action": "recommended action", "confidence": 0.0-1.0}]}`,

      [this.insightTypes.PERSPECTIVE]: `Identify missing perspectives or blind spots in this discussion:

DISCUSSION: {text}
PARTICIPANTS: {participants}

What important viewpoints or stakeholders might be missing:
- Underrepresented groups
- Different departments/functions
- External stakeholders
- Alternative approaches
- Long-term vs short-term views

Respond with JSON: {"missing_perspectives": [{"stakeholder": "who is missing", "viewpoint": "their likely perspective", "value": "why this matters", "confidence": 0.0-1.0}]}`,

      [this.insightTypes.QUESTION]: `Generate insightful follow-up questions for this discussion:

DISCUSSION: {text}
KEY TOPICS: {topics}

Create 2-3 thought-provoking questions that would:
- Deepen understanding
- Uncover assumptions
- Explore implications
- Drive decision-making

Respond with JSON: {"questions": [{"question": "the question", "purpose": "what it reveals", "category": "clarifying|strategic|operational|creative", "confidence": 0.0-1.0}]}`
    };
  }

  async generateInsight(type, context, options = {}) {
    const prompt = this.prompts[type];
    if (!prompt) {
      throw new Error(`Unknown insight type: ${type}`);
    }

    // Create cache key
    const cacheKey = `${type}:${this.hashContext(context)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Replace template variables
      const processedPrompt = this.processPromptTemplate(prompt, context);
      
      // Generate completion
      const response = await generateCompletion(processedPrompt);
      const result = JSON.parse(response);

      // Process and validate result
      const insight = this.processInsightResult(type, result, context);
      
      // Cache successful results
      if (insight && insight.confidence >= this.confidenceThreshold) {
        this.cache.set(cacheKey, insight);
        
        // Limit cache size
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      return insight;

    } catch (error) {
      console.error(`Error generating ${type} insight:`, error);
      return null;
    }
  }

  processPromptTemplate(prompt, context) {
    let processed = prompt;
    
    // Replace common template variables
    const replacements = {
      '{text}': context.text || '',
      '{recentContext}': context.recentContext || '',
      '{newStatement}': context.newStatement || '',
      '{context}': context.context || '',
      '{topic}': context.topic || '',
      '{position}': context.position || '',
      '{participants}': context.participants || 'participants',
      '{topics}': Array.isArray(context.topics) ? context.topics.join(', ') : (context.topics || '')
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    return processed;
  }

  processInsightResult(type, result, originalContext) {
    const baseInsight = {
      type,
      timestamp: Date.now(),
      context: originalContext.text?.slice(-500) || '',
      confidence: 0
    };

    switch (type) {
      case this.insightTypes.CONTRADICTION:
        if (result.found) {
          return {
            ...baseInsight,
            content: result.contradiction,
            action: result.clarification,
            confidence: result.confidence || 0.8
          };
        }
        return null;

      case this.insightTypes.JARGON:
        if (result.terms && result.terms.length > 0) {
          const complexTerms = result.terms.filter(term => term.complexity >= 3);
          if (complexTerms.length > 0) {
            return {
              ...baseInsight,
              content: `${complexTerms.length} technical term(s) explained`,
              details: complexTerms,
              confidence: 0.9
            };
          }
        }
        return null;

      case this.insightTypes.SUGGESTION:
        if (result.suggestions && result.suggestions.length > 0) {
          const highConfidenceSuggestions = result.suggestions.filter(s => s.confidence >= this.confidenceThreshold);
          if (highConfidenceSuggestions.length > 0) {
            return {
              ...baseInsight,
              content: `${highConfidenceSuggestions.length} suggestion(s) for improvement`,
              details: highConfidenceSuggestions,
              confidence: Math.max(...highConfidenceSuggestions.map(s => s.confidence))
            };
          }
        }
        return null;

      case this.insightTypes.EXAMPLE:
        if (result.examples && result.examples.length > 0) {
          const relevantExamples = result.examples.filter(e => e.confidence >= this.confidenceThreshold);
          if (relevantExamples.length > 0) {
            return {
              ...baseInsight,
              content: `${relevantExamples.length} relevant example(s) found`,
              details: relevantExamples,
              confidence: Math.max(...relevantExamples.map(e => e.confidence))
            };
          }
        }
        return null;

      case this.insightTypes.COUNTERPOINT:
        if (result.counterpoints && result.counterpoints.length > 0) {
          const validCounterpoints = result.counterpoints.filter(c => c.confidence >= this.confidenceThreshold);
          if (validCounterpoints.length > 0) {
            return {
              ...baseInsight,
              content: `${validCounterpoints.length} alternative perspective(s) to consider`,
              details: validCounterpoints,
              confidence: Math.max(...validCounterpoints.map(c => c.confidence))
            };
          }
        }
        return null;

      case this.insightTypes.STRATEGIC:
        if (result.strategic_insights && result.strategic_insights.length > 0) {
          const actionableInsights = result.strategic_insights.filter(i => i.confidence >= this.confidenceThreshold);
          if (actionableInsights.length > 0) {
            return {
              ...baseInsight,
              content: `${actionableInsights.length} strategic insight(s) identified`,
              details: actionableInsights,
              confidence: Math.max(...actionableInsights.map(i => i.confidence))
            };
          }
        }
        return null;

      case this.insightTypes.PERSPECTIVE:
        if (result.missing_perspectives && result.missing_perspectives.length > 0) {
          const importantPerspectives = result.missing_perspectives.filter(p => p.confidence >= this.confidenceThreshold);
          if (importantPerspectives.length > 0) {
            return {
              ...baseInsight,
              content: `${importantPerspectives.length} missing perspective(s) identified`,
              details: importantPerspectives,
              confidence: Math.max(...importantPerspectives.map(p => p.confidence))
            };
          }
        }
        return null;

      case this.insightTypes.QUESTION:
        if (result.questions && result.questions.length > 0) {
          const valuableQuestions = result.questions.filter(q => q.confidence >= this.confidenceThreshold);
          if (valuableQuestions.length > 0) {
            return {
              ...baseInsight,
              content: `${valuableQuestions.length} insightful question(s) suggested`,
              details: valuableQuestions,
              confidence: Math.max(...valuableQuestions.map(q => q.confidence))
            };
          }
        }
        return null;

      default:
        return null;
    }
  }

  hashContext(context) {
    // Simple hash function for caching
    const str = JSON.stringify(context);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async generateMultipleInsights(types, context, options = {}) {
    const promises = types.map(type => 
      this.generateInsight(type, context, options)
        .catch(error => {
          console.error(`Failed to generate ${type} insight:`, error);
          return null;
        })
    );

    const results = await Promise.all(promises);
    return results.filter(result => result !== null);
  }

  getInsightTypeColor(type) {
    const colors = {
      [this.insightTypes.CONTRADICTION]: 'error',
      [this.insightTypes.JARGON]: 'info',
      [this.insightTypes.SUGGESTION]: 'success',
      [this.insightTypes.EXAMPLE]: 'primary',
      [this.insightTypes.COUNTERPOINT]: 'warning',
      [this.insightTypes.STRATEGIC]: 'secondary',
      [this.insightTypes.PERSPECTIVE]: 'info',
      [this.insightTypes.QUESTION]: 'primary'
    };
    return colors[type] || 'default';
  }

  getInsightTypeIcon(type) {
    const icons = {
      [this.insightTypes.CONTRADICTION]: '⚠️',
      [this.insightTypes.JARGON]: '📖',
      [this.insightTypes.SUGGESTION]: '💡',
      [this.insightTypes.EXAMPLE]: '📋',
      [this.insightTypes.COUNTERPOINT]: '🤔',
      [this.insightTypes.STRATEGIC]: '🎯',
      [this.insightTypes.PERSPECTIVE]: '👥',
      [this.insightTypes.QUESTION]: '❓'
    };
    return icons[type] || '💭';
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 100,
      hitRate: 0 // Could track this if needed
    };
  }
}

module.exports = InsightGenerator;