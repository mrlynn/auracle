// MongoDB Storage Service - Handles all database operations for templates and reports
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

class MongoStorageService {
  constructor() {
    this.client = null;
    this.db = null;
    this.templates = null;
    this.reports = null;
    this.isConnected = false;
  }

  // Helper method to convert various ID formats to ObjectId
  convertToObjectId(id) {
    try {
      // Handle null/undefined
      if (!id) {
        throw new Error('ID is null or undefined');
      }

      // Log the ID for debugging
      console.log('Converting ID:', typeof id, id);

      // If it's already a string and valid ObjectId format
      if (typeof id === 'string') {
        if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
          return new ObjectId(id);
        } else {
          throw new Error(`String ID must be 24 character hex string, got: ${id} (length: ${id.length})`);
        }
      } 
      
      // If it's already an ObjectId
      else if (id instanceof ObjectId) {
        return id;
      } 
      
      // Handle buffer/Uint8Array case
      else if (id && (id.buffer || ArrayBuffer.isView(id) || Array.isArray(id))) {
        let bytes;
        
        if (id.buffer) {
          bytes = Array.from(new Uint8Array(id.buffer));
        } else if (ArrayBuffer.isView(id)) {
          bytes = Array.from(id);
        } else if (Array.isArray(id)) {
          bytes = id;
        }
        
        // ObjectId should be exactly 12 bytes
        if (bytes.length !== 12) {
          throw new Error(`Buffer must be exactly 12 bytes, got: ${bytes.length} bytes`);
        }
        
        const hexString = bytes
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
          
        console.log('Converted buffer to hex:', hexString);
        return new ObjectId(hexString);
      } 
      
      // Handle object with _id property
      else if (id && typeof id === 'object' && id._id) {
        return this.convertToObjectId(id._id);
      }
      
      // Last resort - try to convert to string
      else {
        const stringId = String(id);
        console.log('Converting to string:', stringId);
        
        // Check if String() produced the useless "[object Object]"
        if (stringId === '[object Object]') {
          // Try to extract useful info from the object
          if (id.id) {
            return this.convertToObjectId(id.id);
          } else if (id.toString && typeof id.toString === 'function') {
            const toStringResult = id.toString();
            if (toStringResult !== '[object Object]') {
              return this.convertToObjectId(toStringResult);
            }
          }
          
          // If we can't extract anything useful, show the object structure
          try {
            const objectInfo = JSON.stringify(id, null, 2);
            throw new Error(`Cannot convert object to ID - object structure: ${objectInfo}`);
          } catch (jsonError) {
            throw new Error(`Cannot convert complex object to ID: ${typeof id}`);
          }
        }
        
        return this.convertToObjectId(stringId);
      }
      
    } catch (error) {
      console.error('Error converting ID:', error.message, 'Original ID:', typeof id, id);
      throw new Error(`Invalid ID: ${error.message}`);
    }
  }

  async connect() {
    if (this.isConnected) return;

    try {
      const uri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;
      
      if (!uri) {
        console.error('MongoDB URI not found in environment variables');
        throw new Error('MongoDB connection string not configured');
      }

      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      await this.client.connect();
      console.log('Connected to MongoDB Atlas');

      // Initialize database and collections
      this.db = this.client.db('auracle');
      this.templates = this.db.collection('templates');
      this.reports = this.db.collection('reports');

      // Create indexes
      await this.createIndexes();
      
      this.isConnected = true;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Template indexes
      await this.templates.createIndex({ name: 1 });
      await this.templates.createIndex({ category: 1 });
      await this.templates.createIndex({ 'metadata.createdAt': -1 });
      await this.templates.createIndex({ 'metadata.usageCount': -1 });

      // Report indexes
      await this.reports.createIndex({ sessionId: 1 });
      await this.reports.createIndex({ templateId: 1 });
      await this.reports.createIndex({ generatedAt: -1 });

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  // Template Operations
  async createTemplate(template) {
    await this.ensureConnected();
    
    const doc = {
      ...template,
      metadata: {
        ...template.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        rating: 0
      }
    };

    const result = await this.templates.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async getTemplates(filter = {}, options = {}) {
    await this.ensureConnected();
    
    const defaultOptions = {
      sort: { 'metadata.usageCount': -1 },
      limit: 50
    };

    const templates = await this.templates
      .find(filter)
      .sort(options.sort || defaultOptions.sort)
      .limit(options.limit || defaultOptions.limit)
      .toArray();

    return templates;
  }

  async getTemplateById(id) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const template = await this.templates.findOne({ 
      _id: objectId 
    });
    
    return template;
  }

  async updateTemplate(id, updates) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const result = await this.templates.updateOne(
      { _id: objectId },
      { 
        $set: {
          ...updates,
          'metadata.updatedAt': new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async deleteTemplate(id) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const result = await this.templates.deleteOne({ 
      _id: objectId 
    });
    
    return result.deletedCount > 0;
  }

  async incrementTemplateUsage(id) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    await this.templates.updateOne(
      { _id: objectId },
      { 
        $inc: { 'metadata.usageCount': 1 },
        $set: { 'metadata.lastUsedAt': new Date() }
      }
    );
  }

  // Report Operations
  async createReport(report) {
    await this.ensureConnected();
    
    const doc = {
      ...report,
      generatedAt: new Date()
    };

    const result = await this.reports.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async getReports(filter = {}, options = {}) {
    await this.ensureConnected();
    
    const defaultOptions = {
      sort: { generatedAt: -1 },
      limit: 50
    };

    const reports = await this.reports
      .find(filter)
      .sort(options.sort || defaultOptions.sort)
      .limit(options.limit || defaultOptions.limit)
      .toArray();

    return reports;
  }

  async getReportById(id) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const report = await this.reports.findOne({ 
      _id: objectId 
    });
    
    return report;
  }

  async getReportsBySession(sessionId) {
    await this.ensureConnected();
    
    const reports = await this.reports
      .find({ sessionId })
      .sort({ generatedAt: -1 })
      .toArray();

    return reports;
  }

  async deleteReport(id) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const result = await this.reports.deleteOne({ 
      _id: objectId 
    });
    
    return result.deletedCount > 0;
  }

  // Aggregation Operations
  async getTemplateStats() {
    await this.ensureConnected();
    
    const stats = await this.templates.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalUsage: { $sum: '$metadata.usageCount' },
          avgRating: { $avg: '$metadata.rating' }
        }
      },
      {
        $sort: { totalUsage: -1 }
      }
    ]).toArray();

    return stats;
  }

  async getPopularTemplates(limit = 10) {
    await this.ensureConnected();
    
    return await this.getTemplates({}, {
      sort: { 'metadata.usageCount': -1 },
      limit
    });
  }

  // Helper method to ensure connection
  async ensureConnected() {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

// Create singleton instance
const mongoStorage = new MongoStorageService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoStorage.disconnect();
  process.exit(0);
});

module.exports = {
  mongoStorage,
  ObjectId,
  // Exported functions
  connect: () => mongoStorage.connect(),
  disconnect: () => mongoStorage.disconnect(),
  // Templates
  createTemplate: (template) => mongoStorage.createTemplate(template),
  getTemplates: (filter, options) => mongoStorage.getTemplates(filter, options),
  getTemplateById: (id) => mongoStorage.getTemplateById(id),
  updateTemplate: (id, updates) => mongoStorage.updateTemplate(id, updates),
  deleteTemplate: (id) => mongoStorage.deleteTemplate(id),
  incrementTemplateUsage: (id) => mongoStorage.incrementTemplateUsage(id),
  // Reports
  createReport: (report) => mongoStorage.createReport(report),
  getReports: (filter, options) => mongoStorage.getReports(filter, options),
  getReportById: (id) => mongoStorage.getReportById(id),
  getReportsBySession: (sessionId) => mongoStorage.getReportsBySession(sessionId),
  deleteReport: (id) => mongoStorage.deleteReport(id),
  // Stats
  getTemplateStats: () => mongoStorage.getTemplateStats(),
  getPopularTemplates: (limit) => mongoStorage.getPopularTemplates(limit)
};