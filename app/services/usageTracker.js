// Usage Tracking and Metrics Collection Service
const fs = require('fs');
const path = require('path');
const os = require('os');

class UsageTracker {
  constructor() {
    this.dataDir = path.join(os.homedir(), '.research-companion');
    this.usageFile = path.join(this.dataDir, 'usage-metrics.json');
    this.sessionFile = path.join(this.dataDir, 'current-session-usage.json');
    this.ensureDataDirectory();
    this.currentSession = this.loadCurrentSession();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadCurrentSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        return JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading current session usage:', error);
    }
    
    return {
      sessionId: Date.now().toString(),
      startTime: new Date().toISOString(),
      provider: null,
      model: null,
      requests: [],
      totalTokens: 0,
      totalCost: 0,
      operations: {
        topicExtraction: { count: 0, tokens: 0, cost: 0 },
        meetingNotes: { count: 0, tokens: 0, cost: 0 },
        research: { count: 0, tokens: 0, cost: 0 },
        reportGeneration: { count: 0, tokens: 0, cost: 0 }
      }
    };
  }

  saveCurrentSession() {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(this.currentSession, null, 2));
    } catch (error) {
      console.error('Error saving current session usage:', error);
    }
  }

  loadHistoricalUsage() {
    try {
      if (fs.existsSync(this.usageFile)) {
        return JSON.parse(fs.readFileSync(this.usageFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading historical usage:', error);
    }
    
    return {
      totalSessions: 0,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      providers: {},
      dailyUsage: {},
      monthlyUsage: {},
      operationBreakdown: {
        topicExtraction: { count: 0, tokens: 0, cost: 0 },
        meetingNotes: { count: 0, tokens: 0, cost: 0 },
        research: { count: 0, tokens: 0, cost: 0 },
        reportGeneration: { count: 0, tokens: 0, cost: 0 }
      }
    };
  }

  saveHistoricalUsage(data) {
    try {
      fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving historical usage:', error);
    }
  }

  startNewSession(provider, model) {
    // Save previous session to historical data
    this.endCurrentSession();
    
    // Start new session
    this.currentSession = {
      sessionId: Date.now().toString(),
      startTime: new Date().toISOString(),
      provider: provider,
      model: model,
      requests: [],
      totalTokens: 0,
      totalCost: 0,
      operations: {
        topicExtraction: { count: 0, tokens: 0, cost: 0 },
        meetingNotes: { count: 0, tokens: 0, cost: 0 },
        research: { count: 0, tokens: 0, cost: 0 },
        reportGeneration: { count: 0, tokens: 0, cost: 0 }
      }
    };
    
    this.saveCurrentSession();
    console.log('Started new usage tracking session:', this.currentSession.sessionId);
  }

  trackRequest(operation, inputTokens, outputTokens, provider, model) {
    const timestamp = new Date().toISOString();
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    const request = {
      timestamp,
      operation,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    };

    // Update current session
    this.currentSession.requests.push(request);
    this.currentSession.totalTokens += totalTokens;
    this.currentSession.totalCost += cost;
    this.currentSession.provider = provider;
    this.currentSession.model = model;

    // Update operation-specific metrics
    if (this.currentSession.operations[operation]) {
      this.currentSession.operations[operation].count += 1;
      this.currentSession.operations[operation].tokens += totalTokens;
      this.currentSession.operations[operation].cost += cost;
    }

    this.saveCurrentSession();
    
    console.log(`Tracked ${operation} request: ${totalTokens} tokens, $${cost.toFixed(4)}`);
    return request;
  }

  calculateCost(provider, model, inputTokens, outputTokens) {
    // Pricing per 1M tokens (as of 2024)
    const pricing = {
      openai: {
        'gpt-4': { input: 30, output: 60 },
        'gpt-4-turbo': { input: 10, output: 30 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'gpt-4o': { input: 5, output: 15 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 }
      },
      gemini: {
        'gemini-pro': { input: 0.5, output: 1.5 },
        'gemini-1.5-pro': { input: 3.5, output: 10.5 },
        'gemini-1.5-flash': { input: 0.075, output: 0.3 }
      },
      claude: {
        'claude-3-opus-20240229': { input: 15, output: 75 },
        'claude-3-sonnet-20240229': { input: 3, output: 15 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-5-sonnet-20241022': { input: 3, output: 15 }
      },
      cohere: {
        'command': { input: 1, output: 2 },
        'command-r': { input: 0.5, output: 1.5 },
        'command-r-plus': { input: 3, output: 15 }
      },
      mistral: {
        'mistral-tiny': { input: 0.25, output: 0.25 },
        'mistral-small': { input: 2, output: 6 },
        'mistral-medium': { input: 2.7, output: 8.1 },
        'mistral-large': { input: 8, output: 24 }
      },
      ollama: {
        // Local models - no cost
        default: { input: 0, output: 0 }
      }
    };

    if (provider === 'ollama') {
      return 0; // Local models are free
    }

    const modelPricing = pricing[provider]?.[model] || pricing[provider]?.default || { input: 0, output: 0 };
    
    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  endCurrentSession() {
    if (this.currentSession.requests.length === 0) {
      return; // No requests to save
    }

    this.currentSession.endTime = new Date().toISOString();
    
    // Load historical data
    const historical = this.loadHistoricalUsage();
    
    // Update historical totals
    historical.totalSessions += 1;
    historical.totalRequests += this.currentSession.requests.length;
    historical.totalTokens += this.currentSession.totalTokens;
    historical.totalCost += this.currentSession.totalCost;

    // Update provider stats
    const provider = this.currentSession.provider;
    if (provider) {
      if (!historical.providers[provider]) {
        historical.providers[provider] = {
          sessions: 0,
          requests: 0,
          tokens: 0,
          cost: 0,
          models: {}
        };
      }
      
      historical.providers[provider].sessions += 1;
      historical.providers[provider].requests += this.currentSession.requests.length;
      historical.providers[provider].tokens += this.currentSession.totalTokens;
      historical.providers[provider].cost += this.currentSession.totalCost;

      // Update model stats
      const model = this.currentSession.model;
      if (model) {
        if (!historical.providers[provider].models[model]) {
          historical.providers[provider].models[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        historical.providers[provider].models[model].requests += this.currentSession.requests.length;
        historical.providers[provider].models[model].tokens += this.currentSession.totalTokens;
        historical.providers[provider].models[model].cost += this.currentSession.totalCost;
      }
    }

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    if (!historical.dailyUsage[today]) {
      historical.dailyUsage[today] = { requests: 0, tokens: 0, cost: 0 };
    }
    historical.dailyUsage[today].requests += this.currentSession.requests.length;
    historical.dailyUsage[today].tokens += this.currentSession.totalTokens;
    historical.dailyUsage[today].cost += this.currentSession.totalCost;

    // Update monthly usage
    const month = today.substring(0, 7); // YYYY-MM
    if (!historical.monthlyUsage[month]) {
      historical.monthlyUsage[month] = { requests: 0, tokens: 0, cost: 0 };
    }
    historical.monthlyUsage[month].requests += this.currentSession.requests.length;
    historical.monthlyUsage[month].tokens += this.currentSession.totalTokens;
    historical.monthlyUsage[month].cost += this.currentSession.totalCost;

    // Update operation breakdown
    Object.keys(this.currentSession.operations).forEach(op => {
      if (!historical.operationBreakdown[op]) {
        historical.operationBreakdown[op] = { count: 0, tokens: 0, cost: 0 };
      }
      historical.operationBreakdown[op].count += this.currentSession.operations[op].count;
      historical.operationBreakdown[op].tokens += this.currentSession.operations[op].tokens;
      historical.operationBreakdown[op].cost += this.currentSession.operations[op].cost;
    });

    // Save updated historical data
    this.saveHistoricalUsage(historical);
    
    console.log('Session ended. Usage saved to historical data.');
  }

  getCurrentSessionMetrics() {
    return {
      ...this.currentSession,
      duration: this.currentSession.startTime ? 
        Date.now() - new Date(this.currentSession.startTime).getTime() : 0
    };
  }

  getHistoricalMetrics() {
    return this.loadHistoricalUsage();
  }

  getDashboardSummary() {
    const historical = this.loadHistoricalUsage();
    const current = this.getCurrentSessionMetrics();
    
    // Get recent usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const recentUsage = Object.entries(historical.dailyUsage)
      .filter(([date]) => date >= cutoffDate)
      .reduce((acc, [_, usage]) => {
        acc.requests += usage.requests;
        acc.tokens += usage.tokens;
        acc.cost += usage.cost;
        return acc;
      }, { requests: 0, tokens: 0, cost: 0 });

    return {
      current: current,
      historical: historical,
      recentUsage: recentUsage,
      topProviders: Object.entries(historical.providers)
        .sort(([,a], [,b]) => b.requests - a.requests)
        .slice(0, 5),
      costTrend: this.calculateCostTrend(historical.dailyUsage),
      efficiency: this.calculateEfficiencyMetrics(historical)
    };
  }

  calculateCostTrend(dailyUsage) {
    const last7Days = Object.entries(dailyUsage)
      .slice(-7)
      .map(([date, usage]) => ({ date, cost: usage.cost }));
    
    if (last7Days.length < 2) return 0;
    
    const recent = last7Days.slice(-3).reduce((sum, day) => sum + day.cost, 0) / 3;
    const previous = last7Days.slice(0, -3).reduce((sum, day) => sum + day.cost, 0) / Math.max(1, last7Days.length - 3);
    
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  }

  calculateEfficiencyMetrics(historical) {
    const totalOperations = Object.values(historical.operationBreakdown)
      .reduce((sum, op) => sum + op.count, 0);
    
    if (totalOperations === 0) return {};

    return {
      avgTokensPerOperation: historical.totalTokens / totalOperations,
      avgCostPerOperation: historical.totalCost / totalOperations,
      mostEfficientOperation: Object.entries(historical.operationBreakdown)
        .reduce((min, [op, data]) => 
          data.count > 0 && (data.cost / data.count) < (min.costPerOp || Infinity) 
            ? { operation: op, costPerOp: data.cost / data.count }
            : min, {}),
      operationDistribution: Object.entries(historical.operationBreakdown)
        .map(([op, data]) => ({
          operation: op,
          percentage: (data.count / totalOperations) * 100
        }))
    };
  }

  exportUsageData() {
    const historical = this.loadHistoricalUsage();
    const current = this.getCurrentSessionMetrics();
    
    return {
      exportDate: new Date().toISOString(),
      currentSession: current,
      historicalData: historical,
      summary: this.getDashboardSummary()
    };
  }
}

// Create singleton instance
const usageTracker = new UsageTracker();

module.exports = {
  usageTracker,
  trackRequest: (operation, inputTokens, outputTokens, provider, model) => 
    usageTracker.trackRequest(operation, inputTokens, outputTokens, provider, model),
  startNewSession: (provider, model) => usageTracker.startNewSession(provider, model),
  endCurrentSession: () => usageTracker.endCurrentSession(),
  getCurrentSessionMetrics: () => usageTracker.getCurrentSessionMetrics(),
  getHistoricalMetrics: () => usageTracker.getHistoricalMetrics(),
  getDashboardSummary: () => usageTracker.getDashboardSummary(),
  exportUsageData: () => usageTracker.exportUsageData()
};