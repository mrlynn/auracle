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
      this.exportedReports = this.db.collection('exported_reports');
      this.templateHistory = this.db.collection('template_history');
      this.reportHistory = this.db.collection('report_history');

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
      
      // Exported reports indexes
      await this.exportedReports.createIndex({ userId: 1 });
      await this.exportedReports.createIndex({ reportId: 1 });
      await this.exportedReports.createIndex({ exportedAt: -1 });
      await this.exportedReports.createIndex({ format: 1 });
      await this.exportedReports.createIndex({ 'metadata.size': 1 });
      
      // Template history indexes
      await this.templateHistory.createIndex({ templateId: 1 });
      await this.templateHistory.createIndex({ version: -1 });
      await this.templateHistory.createIndex({ createdAt: -1 });
      await this.templateHistory.createIndex({ action: 1 });
      
      // Report history indexes
      await this.reportHistory.createIndex({ reportId: 1 });
      await this.reportHistory.createIndex({ action: 1 });
      await this.reportHistory.createIndex({ timestamp: -1 });
      await this.reportHistory.createIndex({ userId: 1 });

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

  async updateReport(id, updates) {
    await this.ensureConnected();
    
    const objectId = this.convertToObjectId(id);
    const result = await this.reports.updateOne(
      { _id: objectId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
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

  // Exported Reports Operations
  async saveExportedReport(exportData) {
    await this.ensureConnected();
    
    const exportRecord = {
      reportId: this.convertToObjectId(exportData.reportId),
      userId: exportData.userId || 'default-user',
      format: exportData.format,
      fileName: exportData.fileName,
      filePath: exportData.filePath,
      fileSize: exportData.fileSize,
      exportedAt: new Date(),
      metadata: {
        originalReport: exportData.originalReport,
        exportSettings: exportData.exportSettings,
        version: exportData.version || '1.0'
      }
    };

    const result = await this.exportedReports.insertOne(exportRecord);
    
    // Also log in report history
    await this.logReportAction(exportData.reportId, 'exported', {
      format: exportData.format,
      fileName: exportData.fileName,
      exportId: result.insertedId
    });

    return result;
  }

  async getExportedReports(filter = {}, options = {}) {
    await this.ensureConnected();
    
    // Set default sort by export date (newest first)
    const defaultSort = { exportedAt: -1 };
    const finalOptions = {
      sort: defaultSort,
      ...options
    };

    return await this.exportedReports.find(filter, finalOptions).toArray();
  }

  async getExportedReportsByUser(userId, options = {}) {
    return await this.getExportedReports({ userId }, options);
  }

  async getExportHistory(reportId) {
    await this.ensureConnected();
    
    return await this.exportedReports
      .find({ reportId: this.convertToObjectId(reportId) })
      .sort({ exportedAt: -1 })
      .toArray();
  }

  async deleteExportedReport(exportId) {
    await this.ensureConnected();
    
    const exportRecord = await this.exportedReports.findOne({ 
      _id: this.convertToObjectId(exportId) 
    });
    
    if (exportRecord) {
      // Log deletion in report history
      await this.logReportAction(exportRecord.reportId, 'export_deleted', {
        exportId: exportId,
        fileName: exportRecord.fileName
      });
    }

    return await this.exportedReports.deleteOne({ 
      _id: this.convertToObjectId(exportId) 
    });
  }

  // Template History Operations
  async saveTemplateVersion(templateId, templateData, action = 'updated') {
    await this.ensureConnected();
    
    // Get current version number
    const latestVersion = await this.templateHistory
      .findOne(
        { templateId: this.convertToObjectId(templateId) },
        { sort: { version: -1 } }
      );
    
    const version = latestVersion ? latestVersion.version + 1 : 1;

    const historyRecord = {
      templateId: this.convertToObjectId(templateId),
      version: version,
      action: action,
      templateData: templateData,
      createdAt: new Date(),
      metadata: {
        changes: this.detectTemplateChanges(latestVersion?.templateData, templateData),
        size: JSON.stringify(templateData).length
      }
    };

    return await this.templateHistory.insertOne(historyRecord);
  }

  async getTemplateHistory(templateId, options = {}) {
    await this.ensureConnected();
    
    const defaultSort = { version: -1 };
    const finalOptions = {
      sort: defaultSort,
      ...options
    };

    return await this.templateHistory
      .find({ templateId: this.convertToObjectId(templateId) }, finalOptions)
      .toArray();
  }

  async getTemplateVersion(templateId, version) {
    await this.ensureConnected();
    
    return await this.templateHistory.findOne({
      templateId: this.convertToObjectId(templateId),
      version: version
    });
  }

  async restoreTemplateVersion(templateId, version) {
    await this.ensureConnected();
    
    const versionData = await this.getTemplateVersion(templateId, version);
    if (!versionData) {
      throw new Error(`Template version ${version} not found`);
    }

    // Update the current template with the historical version
    await this.updateTemplate(templateId, versionData.templateData);
    
    // Save this as a new version with restore action
    await this.saveTemplateVersion(templateId, versionData.templateData, 'restored');
    
    return versionData;
  }

  // Report History Operations
  async logReportAction(reportId, action, details = {}) {
    await this.ensureConnected();
    
    const historyRecord = {
      reportId: this.convertToObjectId(reportId),
      action: action,
      details: details,
      timestamp: new Date(),
      userId: details.userId || 'default-user'
    };

    return await this.reportHistory.insertOne(historyRecord);
  }

  async getReportHistory(reportId, options = {}) {
    await this.ensureConnected();
    
    const defaultSort = { timestamp: -1 };
    const finalOptions = {
      sort: defaultSort,
      ...options
    };

    return await this.reportHistory
      .find({ reportId: this.convertToObjectId(reportId) }, finalOptions)
      .toArray();
  }

  async getReportActivitySummary(filter = {}, options = {}) {
    await this.ensureConnected();
    
    return await this.reportHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' },
          reports: { $addToSet: '$reportId' }
        }
      },
      {
        $project: {
          action: '$_id',
          count: 1,
          lastActivity: 1,
          uniqueReports: { $size: '$reports' },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
  }

  // Report Management and Search
  async searchReports(query, options = {}) {
    await this.ensureConnected();
    
    const searchFilter = {
      $or: [
        { templateName: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $in: [new RegExp(query, 'i')] } }
      ]
    };

    return await this.getReports(searchFilter, options);
  }

  async getReportsByDateRange(startDate, endDate, options = {}) {
    await this.ensureConnected();
    
    const dateFilter = {
      generatedAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    return await this.getReports(dateFilter, options);
  }

  async getFavoriteReports(userId = 'default-user', options = {}) {
    await this.ensureConnected();
    
    // Get reports that have been exported multiple times (indicating user value)
    const favoriteExports = await this.exportedReports.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$reportId',
          exportCount: { $sum: 1 },
          lastExport: { $max: '$exportedAt' }
        }
      },
      { $match: { exportCount: { $gte: 2 } } },
      { $sort: { exportCount: -1, lastExport: -1 } }
    ]).toArray();

    const favoriteReportIds = favoriteExports.map(f => f._id);
    
    if (favoriteReportIds.length === 0) {
      return [];
    }

    return await this.getReports(
      { _id: { $in: favoriteReportIds } },
      options
    );
  }

  // Helper method to detect changes between template versions
  detectTemplateChanges(oldTemplate, newTemplate) {
    if (!oldTemplate) return ['created'];
    
    const changes = [];
    
    if (oldTemplate.name !== newTemplate.name) changes.push('name');
    if (oldTemplate.description !== newTemplate.description) changes.push('description');
    if (oldTemplate.category !== newTemplate.category) changes.push('category');
    if (JSON.stringify(oldTemplate.prompt) !== JSON.stringify(newTemplate.prompt)) changes.push('prompt');
    if (oldTemplate.outputFormat !== newTemplate.outputFormat) changes.push('outputFormat');
    if (JSON.stringify(oldTemplate.variables) !== JSON.stringify(newTemplate.variables)) changes.push('variables');
    
    return changes.length > 0 ? changes : ['minor_update'];
  }

  // Cleanup and Maintenance
  async cleanupOldExports(daysToKeep = 30) {
    await this.ensureConnected();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.exportedReports.deleteMany({
      exportedAt: { $lt: cutoffDate }
    });

    console.log(`Cleaned up ${result.deletedCount} old export records`);
    return result;
  }

  async getStorageStats() {
    await this.ensureConnected();
    
    const stats = await Promise.all([
      this.templates.countDocuments(),
      this.reports.countDocuments(),
      this.exportedReports.countDocuments(),
      this.templateHistory.countDocuments(),
      this.reportHistory.countDocuments()
    ]);

    return {
      templates: stats[0],
      reports: stats[1],
      exportedReports: stats[2],
      templateHistory: stats[3],
      reportHistory: stats[4],
      total: stats.reduce((sum, count) => sum + count, 0)
    };
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
  updateReport: (id, updates) => mongoStorage.updateReport(id, updates),
  deleteReport: (id) => mongoStorage.deleteReport(id),
  // Exported Reports
  saveExportedReport: (exportData) => mongoStorage.saveExportedReport(exportData),
  getExportedReports: (filter, options) => mongoStorage.getExportedReports(filter, options),
  getExportedReportsByUser: (userId, options) => mongoStorage.getExportedReportsByUser(userId, options),
  getExportHistory: (reportId) => mongoStorage.getExportHistory(reportId),
  deleteExportedReport: (exportId) => mongoStorage.deleteExportedReport(exportId),
  // Template History
  saveTemplateVersion: (templateId, templateData, action) => mongoStorage.saveTemplateVersion(templateId, templateData, action),
  getTemplateHistory: (templateId, options) => mongoStorage.getTemplateHistory(templateId, options),
  getTemplateVersion: (templateId, version) => mongoStorage.getTemplateVersion(templateId, version),
  restoreTemplateVersion: (templateId, version) => mongoStorage.restoreTemplateVersion(templateId, version),
  // Report History
  logReportAction: (reportId, action, details) => mongoStorage.logReportAction(reportId, action, details),
  getReportHistory: (reportId, options) => mongoStorage.getReportHistory(reportId, options),
  getReportActivitySummary: (filter, options) => mongoStorage.getReportActivitySummary(filter, options),
  // Advanced Report Operations
  searchReports: (query, options) => mongoStorage.searchReports(query, options),
  getReportsByDateRange: (startDate, endDate, options) => mongoStorage.getReportsByDateRange(startDate, endDate, options),
  getFavoriteReports: (userId, options) => mongoStorage.getFavoriteReports(userId, options),
  // Maintenance
  cleanupOldExports: (daysToKeep) => mongoStorage.cleanupOldExports(daysToKeep),
  getStorageStats: () => mongoStorage.getStorageStats(),
  // Stats
  getTemplateStats: () => mongoStorage.getTemplateStats(),
  getPopularTemplates: (limit) => mongoStorage.getPopularTemplates(limit)
};