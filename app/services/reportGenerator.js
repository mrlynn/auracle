// Report Generator Service - Handles report generation using OpenAI and template processing
const https = require('https');
const { createReport, getReports, getReportById, getReportsBySession, updateReport, saveExportedReport } = require('./mongoStorage');
const { getTemplateForUse, substituteVariables, validateVariables } = require('./templateManager');
const { trackRequest } = require('./usageTracker');

class ReportGeneratorService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.defaultModel = 'gpt-4-turbo-preview';
    this.maxTokens = 4000;
  }

  async generateReport(templateId, transcript, variables = {}, sessionId = null) {
    try {
      // 1. Get template and validate
      const template = await getTemplateForUse(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // 2. Validate required variables
      const validationErrors = validateVariables(template, variables);
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
      }

      // 3. Substitute variables in prompt
      const processedPrompt = substituteVariables(template, {
        ...variables,
        transcript: transcript
      });

      console.log('Generating report with template:', template.name);
      console.log('Prompt length:', processedPrompt.length);

      // 4. Call OpenAI API
      const response = await this.callOpenAI(processedPrompt, template.outputFormat);
      
      // 5. Process response based on output format
      const processedContent = this.processOutput(response.content, template.outputFormat);

      // 6. Calculate tokens and cost
      const inputTokens = this.estimateTokens(processedPrompt);
      const outputTokens = this.estimateTokens(response.content);
      const cost = this.calculateCost(inputTokens, outputTokens, response.model);

      // 7. Track usage
      trackRequest('reportGeneration', inputTokens, outputTokens, 'openai', response.model);

      // 8. Save report to database
      const reportData = {
        sessionId: sessionId,
        templateId: template._id,
        templateName: template.name,
        transcript: transcript,
        variables: variables,
        content: processedContent,
        format: template.outputFormat,
        metadata: {
          tokensUsed: inputTokens + outputTokens,
          cost: cost,
          provider: 'openai',
          model: response.model,
          inputTokens,
          outputTokens
        }
      };

      const savedReport = await createReport(reportData);

      console.log('Report generated successfully:', savedReport._id);

      return {
        success: true,
        reportId: savedReport._id,
        content: processedContent,
        metadata: savedReport.metadata
      };

    } catch (error) {
      console.error('Error generating report:', error);
      
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  async callOpenAI(prompt, outputFormat) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    return new Promise((resolve, reject) => {
      const systemPrompt = this.buildSystemPrompt(outputFormat);
      
      const payload = {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3,
        response_format: outputFormat === 'json' ? { type: 'json_object' } : undefined
      };

      const data = JSON.stringify(payload);

      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            
            if (response.error) {
              reject(new Error(`OpenAI API Error: ${response.error.message}`));
              return;
            }

            if (!response.choices || response.choices.length === 0) {
              reject(new Error('No response from OpenAI'));
              return;
            }

            resolve({
              content: response.choices[0].message.content,
              model: response.model,
              usage: response.usage
            });
          } catch (e) {
            reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`OpenAI request failed: ${error.message}`));
      });

      req.write(data);
      req.end();
    });
  }

  buildSystemPrompt(outputFormat) {
    const basePrompt = `You are a professional report writer and analyst. Your task is to create well-structured, comprehensive reports based on transcripts and specific instructions.

Guidelines:
1. Be accurate and only include information present in the transcript
2. Maintain a professional tone throughout
3. Structure information clearly with appropriate headers and sections
4. Extract actionable insights where relevant
5. Be concise but thorough`;

    switch (outputFormat) {
      case 'json':
        return `${basePrompt}

Output your response as valid JSON with clear structure and appropriate field names.`;
      
      case 'html':
        return `${basePrompt}

Format your response as clean HTML with proper semantic markup, headers, and styling classes.`;
      
      case 'markdown':
      default:
        return `${basePrompt}

Format your response using clean Markdown with proper headers, lists, and emphasis. Use ## for main sections and ### for subsections.`;
    }
  }

  processOutput(content, format) {
    switch (format) {
      case 'json':
        try {
          // Validate and pretty-print JSON
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          console.warn('Invalid JSON response, returning as text');
          return content;
        }
      
      case 'html':
        // Basic HTML validation and cleanup
        return content.trim();
      
      case 'markdown':
      default:
        // Clean up markdown formatting
        return content.trim();
    }
  }

  calculateCost(inputTokens, outputTokens, model = 'gpt-4-turbo-preview') {
    // OpenAI pricing per 1M tokens (as of 2024)
    const pricing = {
      'gpt-4-turbo-preview': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'gpt-4o': { input: 5, output: 15 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4-turbo-preview'];
    
    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  estimateTokens(text) {
    // Rough estimation: ~4 characters per token for GPT models
    return Math.ceil(text.length / 4);
  }

  // Report management functions
  async getReport(reportId) {
    try {
      const report = await getReportById(reportId);
      return {
        success: true,
        report: report
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSessionReports(sessionId) {
    try {
      const reports = await getReportsBySession(sessionId);
      return {
        success: true,
        reports: reports
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserReports(filter = {}, options = {}) {
    try {
      const reports = await getReports(filter, options);
      return {
        success: true,
        reports: reports
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateReport(reportId, updates) {
    try {
      const result = await updateReport(reportId, updates);
      return {
        success: true,
        updated: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export functions
  async exportReport(reportId, format = 'markdown') {
    try {
      const report = await getReportById(reportId);
      
      if (!report) {
        throw new Error('Report not found');
      }

      let exportContent;
      let filename;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

      switch (format) {
        case 'markdown':
          exportContent = this.exportToMarkdown(report);
          filename = `report-${report.templateName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.md`;
          break;
        
        case 'html':
          exportContent = this.exportToHTML(report);
          filename = `report-${report.templateName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.html`;
          break;
        
        case 'json':
          exportContent = JSON.stringify(report, null, 2);
          filename = `report-${report.templateName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`;
          break;
        
        default:
          throw new Error('Unsupported export format');
      }

      // Save export record to MongoDB
      try {
        await saveExportedReport({
          reportId: reportId,
          format: format,
          fileName: filename,
          filePath: null, // Will be set by main process when saved to disk
          fileSize: Buffer.byteLength(exportContent, 'utf8'),
          originalReport: {
            templateName: report.templateName,
            generatedAt: report.generatedAt,
            sessionId: report.sessionId
          },
          exportSettings: {
            format: format,
            timestamp: timestamp
          }
        });
        console.log(`Export record saved for report ${reportId}`);
      } catch (error) {
        console.error('Failed to save export record:', error);
        // Don't fail the export if MongoDB save fails
      }

      return {
        success: true,
        content: exportContent,
        filename: filename,
        mimeType: this.getMimeType(format),
        reportId: reportId,
        fileSize: Buffer.byteLength(exportContent, 'utf8')
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  exportToMarkdown(report) {
    const date = new Date(report.generatedAt).toLocaleDateString();
    const time = new Date(report.generatedAt).toLocaleTimeString();

    return `# ${report.templateName}

**Generated:** ${date} at ${time}
**Template:** ${report.templateName}
${report.sessionId ? `**Session:** ${report.sessionId}` : ''}

---

${report.content}

---

*Report generated by Auracle*
*Tokens used: ${report.metadata.tokensUsed} | Cost: $${report.metadata.cost.toFixed(4)}*`;
  }

  exportToHTML(report) {
    const date = new Date(report.generatedAt).toLocaleDateString();
    const time = new Date(report.generatedAt).toLocaleTimeString();

    // Convert markdown to HTML (basic conversion)
    let htmlContent = report.content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${report.templateName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
        .footer { border-top: 1px solid #ccc; margin-top: 30px; padding-top: 10px; font-size: 0.9em; color: #666; }
        h1, h2, h3 { color: #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.templateName}</h1>
        <p><strong>Generated:</strong> ${date} at ${time}</p>
        <p><strong>Template:</strong> ${report.templateName}</p>
        ${report.sessionId ? `<p><strong>Session:</strong> ${report.sessionId}</p>` : ''}
    </div>
    
    <div class="content">
        ${htmlContent}
    </div>
    
    <div class="footer">
        <p><em>Report generated by Auracle</em></p>
        <p><em>Tokens used: ${report.metadata.tokensUsed} | Cost: $${report.metadata.cost.toFixed(4)}</em></p>
    </div>
</body>
</html>`;
  }

  getMimeType(format) {
    const mimeTypes = {
      'markdown': 'text/markdown',
      'html': 'text/html',
      'json': 'application/json'
    };
    return mimeTypes[format] || 'text/plain';
  }
}

// Create singleton instance
const reportGenerator = new ReportGeneratorService();

module.exports = {
  reportGenerator,
  generateReport: (templateId, transcript, variables, sessionId) => 
    reportGenerator.generateReport(templateId, transcript, variables, sessionId),
  getReport: (reportId) => reportGenerator.getReport(reportId),
  getSessionReports: (sessionId) => reportGenerator.getSessionReports(sessionId),
  getUserReports: (filter, options) => reportGenerator.getUserReports(filter, options),
  updateReport: (reportId, updates) => reportGenerator.updateReport(reportId, updates),
  exportReport: (reportId, format) => reportGenerator.exportReport(reportId, format)
};