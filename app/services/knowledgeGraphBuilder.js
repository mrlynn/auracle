const EventEmitter = require('events');

class KnowledgeGraphBuilder extends EventEmitter {
  constructor() {
    super();
    
    this.nodes = new Map(); // topic -> { id, label, weight, category, confidence }
    this.edges = new Map(); // "nodeA-nodeB" -> { weight, type, confidence, timestamps }
    this.categories = new Set(); // track different topic categories
    this.maxNodes = 100; // Limit graph size for performance
    this.decayFactor = 0.95; // Gradually reduce old connection weights
    
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance();
    }, 300000); // 5 minutes
  }

  addTopic(topic, category = 'general', confidence = 0.8) {
    const topicKey = topic.toLowerCase();
    
    if (!this.nodes.has(topicKey)) {
      this.nodes.set(topicKey, {
        id: topicKey,
        label: topic,
        weight: 1,
        category,
        confidence,
        firstSeen: Date.now(),
        lastMentioned: Date.now(),
        connections: new Set()
      });
      this.categories.add(category);
    } else {
      // Update existing topic
      const node = this.nodes.get(topicKey);
      node.weight += 1;
      node.lastMentioned = Date.now();
      node.confidence = Math.max(node.confidence, confidence);
    }

    this.emit('topic-added', { topic: topicKey, category, confidence });
    return topicKey;
  }

  addConnection(topicA, topicB, relationshipType = 'related', confidence = 0.8) {
    const keyA = topicA.toLowerCase();
    const keyB = topicB.toLowerCase();
    
    // Ensure both topics exist
    if (!this.nodes.has(keyA)) {
      this.addTopic(topicA);
    }
    if (!this.nodes.has(keyB)) {
      this.addTopic(topicB);
    }

    // Create sorted edge key to avoid duplicates
    const edgeKey = [keyA, keyB].sort().join('→');
    
    if (!this.edges.has(edgeKey)) {
      this.edges.set(edgeKey, {
        source: keyA,
        target: keyB,
        weight: 1,
        type: relationshipType,
        confidence,
        timestamps: [Date.now()],
        strengthening: true
      });
    } else {
      // Strengthen existing connection
      const edge = this.edges.get(edgeKey);
      edge.weight += 1;
      edge.confidence = Math.max(edge.confidence, confidence);
      edge.timestamps.push(Date.now());
      edge.strengthening = true;
      
      // Keep only recent timestamps (last 10)
      if (edge.timestamps.length > 10) {
        edge.timestamps = edge.timestamps.slice(-10);
      }
    }

    // Update node connections
    this.nodes.get(keyA).connections.add(keyB);
    this.nodes.get(keyB).connections.add(keyA);

    this.emit('connection-added', { 
      from: keyA, 
      to: keyB, 
      type: relationshipType, 
      confidence 
    });

    return edgeKey;
  }

  addTopicsFromText(topics, connections = []) {
    // Add all topics first
    const addedTopics = topics.map(topic => {
      const category = this.inferCategory(topic);
      return this.addTopic(topic, category);
    });

    // Add explicit connections
    connections.forEach(conn => {
      this.addConnection(conn.from, conn.to, conn.relationship, conn.confidence || 0.8);
    });

    // Add implicit connections (topics mentioned together)
    for (let i = 0; i < addedTopics.length; i++) {
      for (let j = i + 1; j < addedTopics.length; j++) {
        this.addConnection(addedTopics[i], addedTopics[j], 'co-mentioned', 0.6);
      }
    }

    this.emit('topics-batch-added', { topics: addedTopics, connections });
  }

  inferCategory(topic) {
    const topicLower = topic.toLowerCase();
    
    // Simple categorization based on keywords
    if (topicLower.includes('tech') || topicLower.includes('software') || 
        topicLower.includes('ai') || topicLower.includes('data')) {
      return 'technology';
    }
    
    if (topicLower.includes('business') || topicLower.includes('strategy') || 
        topicLower.includes('market') || topicLower.includes('revenue')) {
      return 'business';
    }
    
    if (topicLower.includes('user') || topicLower.includes('customer') || 
        topicLower.includes('experience') || topicLower.includes('design')) {
      return 'user-experience';
    }
    
    if (topicLower.includes('process') || topicLower.includes('workflow') || 
        topicLower.includes('operations') || topicLower.includes('management')) {
      return 'operations';
    }
    
    return 'general';
  }

  getStrongestConnections(topic, limit = 5) {
    const topicKey = topic.toLowerCase();
    const node = this.nodes.get(topicKey);
    
    if (!node) return [];

    const connections = Array.from(this.edges.values())
      .filter(edge => edge.source === topicKey || edge.target === topicKey)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map(edge => ({
        target: edge.source === topicKey ? edge.target : edge.source,
        weight: edge.weight,
        type: edge.type,
        confidence: edge.confidence
      }));

    return connections;
  }

  getTopicsByCategory(category) {
    return Array.from(this.nodes.values())
      .filter(node => node.category === category)
      .sort((a, b) => b.weight - a.weight);
  }

  getMostConnectedTopics(limit = 10) {
    return Array.from(this.nodes.values())
      .sort((a, b) => b.connections.size - a.connections.size)
      .slice(0, limit);
  }

  getRecentlyActiveTopics(timeWindow = 300000, limit = 10) { // 5 minutes
    const now = Date.now();
    return Array.from(this.nodes.values())
      .filter(node => now - node.lastMentioned < timeWindow)
      .sort((a, b) => b.lastMentioned - a.lastMentioned)
      .slice(0, limit);
  }

  findShortestPath(topicA, topicB) {
    const keyA = topicA.toLowerCase();
    const keyB = topicB.toLowerCase();
    
    if (!this.nodes.has(keyA) || !this.nodes.has(keyB)) {
      return null;
    }

    // Simple BFS to find shortest path
    const queue = [[keyA]];
    const visited = new Set([keyA]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === keyB) {
        return path.map(key => this.nodes.get(key).label);
      }

      const currentNode = this.nodes.get(current);
      for (const neighbor of currentNode.connections) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null; // No path found
  }

  getClusterAroundTopic(topic, depth = 2) {
    const topicKey = topic.toLowerCase();
    if (!this.nodes.has(topicKey)) return null;

    const cluster = new Set([topicKey]);
    const toExplore = [{ key: topicKey, level: 0 }];

    while (toExplore.length > 0) {
      const { key, level } = toExplore.shift();
      
      if (level < depth) {
        const node = this.nodes.get(key);
        for (const neighbor of node.connections) {
          if (!cluster.has(neighbor)) {
            cluster.add(neighbor);
            toExplore.push({ key: neighbor, level: level + 1 });
          }
        }
      }
    }

    // Get subgraph
    const clusterNodes = Array.from(cluster).map(key => this.nodes.get(key));
    const clusterEdges = Array.from(this.edges.values())
      .filter(edge => cluster.has(edge.source) && cluster.has(edge.target));

    return {
      centerTopic: topic,
      nodes: clusterNodes,
      edges: clusterEdges,
      size: cluster.size
    };
  }

  getGraphData(options = {}) {
    const {
      minWeight = 1,
      maxNodes = this.maxNodes,
      includeCategories = true,
      timeWindow = null
    } = options;

    let nodes = Array.from(this.nodes.values());
    let edges = Array.from(this.edges.values());

    // Filter by time window if specified
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      nodes = nodes.filter(node => node.lastMentioned > cutoff);
      const validNodeKeys = new Set(nodes.map(n => n.id));
      edges = edges.filter(edge => 
        validNodeKeys.has(edge.source) && validNodeKeys.has(edge.target)
      );
    }

    // Filter by weight
    edges = edges.filter(edge => edge.weight >= minWeight);
    const connectedNodeKeys = new Set();
    edges.forEach(edge => {
      connectedNodeKeys.add(edge.source);
      connectedNodeKeys.add(edge.target);
    });
    nodes = nodes.filter(node => connectedNodeKeys.has(node.id));

    // Limit number of nodes (keep highest weight)
    if (nodes.length > maxNodes) {
      nodes = nodes
        .sort((a, b) => b.weight - a.weight)
        .slice(0, maxNodes);
      
      const validNodeKeys = new Set(nodes.map(n => n.id));
      edges = edges.filter(edge => 
        validNodeKeys.has(edge.source) && validNodeKeys.has(edge.target)
      );
    }

    const result = { nodes, edges };
    
    if (includeCategories) {
      result.categories = Array.from(this.categories);
      result.stats = this.getGraphStats();
    }

    return result;
  }

  getGraphStats() {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      categories: Array.from(this.categories).map(cat => ({
        name: cat,
        count: this.getTopicsByCategory(cat).length
      })),
      mostConnected: this.getMostConnectedTopics(5).map(node => ({
        topic: node.label,
        connections: node.connections.size,
        weight: node.weight
      })),
      recentlyActive: this.getRecentlyActiveTopics(300000, 5).map(node => ({
        topic: node.label,
        lastMentioned: node.lastMentioned,
        weight: node.weight
      }))
    };
  }

  performMaintenance() {
    const now = Date.now();
    const oneHour = 3600000;
    const oneDay = 86400000;

    // Decay old connections
    this.edges.forEach((edge, key) => {
      const timeSinceLastUpdate = now - Math.max(...edge.timestamps);
      
      if (timeSinceLastUpdate > oneHour) {
        edge.weight *= this.decayFactor;
        edge.strengthening = false;
        
        // Remove very weak connections
        if (edge.weight < 0.1) {
          this.edges.delete(key);
        }
      }
    });

    // Remove isolated nodes (no connections)
    this.nodes.forEach((node, key) => {
      const hasConnections = Array.from(this.edges.values())
        .some(edge => edge.source === key || edge.target === key);
      
      if (!hasConnections && now - node.lastMentioned > oneDay) {
        this.nodes.delete(key);
      }
    });

    // Limit total size
    if (this.nodes.size > this.maxNodes) {
      const sortedNodes = Array.from(this.nodes.values())
        .sort((a, b) => a.lastMentioned - b.lastMentioned);
      
      const toRemove = sortedNodes.slice(0, this.nodes.size - this.maxNodes);
      toRemove.forEach(node => {
        this.nodes.delete(node.id);
        // Remove edges involving this node
        this.edges.forEach((edge, key) => {
          if (edge.source === node.id || edge.target === node.id) {
            this.edges.delete(key);
          }
        });
      });
    }

    this.emit('maintenance-completed', {
      nodes: this.nodes.size,
      edges: this.edges.size,
      categoriesCount: this.categories.size
    });
  }

  exportGraph() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      categories: Array.from(this.categories),
      timestamp: Date.now()
    };
  }

  importGraph(data) {
    this.clear();
    
    this.nodes = new Map(data.nodes);
    this.edges = new Map(data.edges);
    this.categories = new Set(data.categories);
    
    this.emit('graph-imported', {
      nodes: this.nodes.size,
      edges: this.edges.size
    });
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.categories.clear();
    this.emit('graph-cleared');
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
    this.clear();
  }
}

module.exports = KnowledgeGraphBuilder;