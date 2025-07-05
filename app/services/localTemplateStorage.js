// Local Template Storage - Fallback for when MongoDB is not available
const fs = require('fs');
const path = require('path');
const os = require('os');

class LocalTemplateStorage {
  constructor() {
    this.dataDir = path.join(os.homedir(), '.research-companion');
    this.templatesFile = path.join(this.dataDir, 'local-templates.json');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadTemplates() {
    try {
      if (fs.existsSync(this.templatesFile)) {
        const data = fs.readFileSync(this.templatesFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading local templates:', error);
    }
    return [];
  }

  saveTemplates(templates) {
    try {
      fs.writeFileSync(this.templatesFile, JSON.stringify(templates, null, 2));
    } catch (error) {
      console.error('Error saving local templates:', error);
    }
  }

  async createTemplate(template) {
    const templates = this.loadTemplates();
    const newTemplate = {
      ...template,
      _id: Date.now().toString(), // Simple ID generation
      metadata: {
        ...template.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0
      }
    };
    
    templates.push(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  async getTemplates(filter = {}) {
    const templates = this.loadTemplates();
    
    if (Object.keys(filter).length === 0) {
      return templates;
    }
    
    // Simple filtering (supports name and category)
    return templates.filter(template => {
      if (filter.name && template.name !== filter.name) {
        return false;
      }
      if (filter.category && template.category !== filter.category) {
        return false;
      }
      return true;
    });
  }

  async getTemplateById(id) {
    const templates = this.loadTemplates();
    
    // Normalize the ID for comparison
    let searchId = id;
    if (typeof id === 'object' && id.toString) {
      searchId = id.toString();
    } else if (typeof id !== 'string') {
      searchId = String(id);
    }
    
    return templates.find(template => 
      template._id === searchId || 
      template._id === id ||
      String(template._id) === searchId
    );
  }

  async updateTemplate(id, updates) {
    const templates = this.loadTemplates();
    
    // Normalize the ID for comparison
    let searchId = id;
    if (typeof id === 'object' && id.toString) {
      searchId = id.toString();
    } else if (typeof id !== 'string') {
      searchId = String(id);
    }
    
    const index = templates.findIndex(template => 
      template._id === searchId || 
      template._id === id ||
      String(template._id) === searchId
    );
    
    if (index >= 0) {
      templates[index] = {
        ...templates[index],
        ...updates,
        metadata: {
          ...templates[index].metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      this.saveTemplates(templates);
      return true;
    }
    return false;
  }

  async deleteTemplate(id) {
    const templates = this.loadTemplates();
    
    // Normalize the ID for comparison
    let searchId = id;
    if (typeof id === 'object' && id.toString) {
      searchId = id.toString();
    } else if (typeof id !== 'string') {
      searchId = String(id);
    }
    
    const filteredTemplates = templates.filter(template => 
      template._id !== searchId && 
      template._id !== id &&
      String(template._id) !== searchId
    );
    
    if (filteredTemplates.length < templates.length) {
      this.saveTemplates(filteredTemplates);
      return true;
    }
    return false;
  }

  async incrementTemplateUsage(id) {
    const templates = this.loadTemplates();
    
    // Normalize the ID for comparison
    let searchId = id;
    if (typeof id === 'object' && id.toString) {
      searchId = id.toString();
    } else if (typeof id !== 'string') {
      searchId = String(id);
    }
    
    const template = templates.find(t => 
      t._id === searchId || 
      t._id === id ||
      String(t._id) === searchId
    );
    
    if (template) {
      template.metadata.usageCount = (template.metadata.usageCount || 0) + 1;
      template.metadata.lastUsedAt = new Date().toISOString();
      this.saveTemplates(templates);
    }
  }
}

// Create singleton instance
const localTemplateStorage = new LocalTemplateStorage();

module.exports = {
  localTemplateStorage,
  // Exported functions that match the MongoDB interface
  createTemplate: (template) => localTemplateStorage.createTemplate(template),
  getTemplates: (filter) => localTemplateStorage.getTemplates(filter),
  getTemplateById: (id) => localTemplateStorage.getTemplateById(id),
  updateTemplate: (id, updates) => localTemplateStorage.updateTemplate(id, updates),
  deleteTemplate: (id) => localTemplateStorage.deleteTemplate(id),
  incrementTemplateUsage: (id) => localTemplateStorage.incrementTemplateUsage(id)
};