// Meeting Notes Service - AI-powered meeting summarization and action item extraction
const { loadConfig } = require('../config');
const { generateMeetingNotes: generateMeetingNotesWithProvider } = require('./llmProviders');

class MeetingNotesService {
  constructor() {
    this.config = loadConfig();
    this.endpoint = this.config.llm.endpoint;
    this.model = this.config.llm.model;
  }

  async generateMeetingNotes(transcript, topics = [], research = []) {
    console.log('Meeting notes service called with transcript length:', transcript?.length || 0);
    
    if (!transcript || transcript.trim().length < 50) {
      console.log('Transcript too short, returning empty notes');
      return {
        summary: '',
        actionItems: [],
        decisions: [],
        keyPoints: [],
        attendees: [],
        nextSteps: []
      };
    }

    try {
      console.log('Using LLM provider for meeting notes generation...');
      const result = await generateMeetingNotesWithProvider(transcript, topics, research);
      console.log('Meeting notes generated:', result);
      return result;
    } catch (error) {
      console.error('Failed to generate meeting notes:', error);
      return {
        summary: 'Error generating meeting summary',
        actionItems: [],
        decisions: [],
        keyPoints: [],
        attendees: [],
        nextSteps: []
      };
    }
  }


  // Export meeting notes to different formats
  exportToMarkdown(meetingNotes, sessionInfo = {}) {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let markdown = `# Meeting Notes\n\n`;
    markdown += `**Date:** ${date}\n`;
    markdown += `**Time:** ${time}\n`;
    
    if (meetingNotes.attendees.length > 0) {
      markdown += `**Attendees:** ${meetingNotes.attendees.join(', ')}\n`;
    }
    
    markdown += `\n## Summary\n\n${meetingNotes.summary}\n\n`;
    
    if (meetingNotes.keyPoints.length > 0) {
      markdown += `## Key Discussion Points\n\n`;
      meetingNotes.keyPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n`;
    }
    
    if (meetingNotes.decisions.length > 0) {
      markdown += `## Decisions Made\n\n`;
      meetingNotes.decisions.forEach(decision => {
        markdown += `### ${decision.decision}\n`;
        markdown += `- **Context:** ${decision.context}\n`;
        markdown += `- **Impact:** ${decision.impact}\n\n`;
      });
    }
    
    if (meetingNotes.actionItems.length > 0) {
      markdown += `## Action Items\n\n`;
      meetingNotes.actionItems.forEach((item, index) => {
        markdown += `${index + 1}. **${item.item}**\n`;
        if (item.assignee) markdown += `   - **Assigned to:** ${item.assignee}\n`;
        if (item.deadline) markdown += `   - **Deadline:** ${item.deadline}\n`;
        markdown += `   - **Priority:** ${item.priority}\n\n`;
      });
    }
    
    if (meetingNotes.nextSteps.length > 0) {
      markdown += `## Next Steps\n\n`;
      meetingNotes.nextSteps.forEach(step => {
        markdown += `- ${step}\n`;
      });
    }
    
    return markdown;
  }
}

// Create singleton instance
const meetingNotesService = new MeetingNotesService();

module.exports = {
  generateMeetingNotes: (transcript, topics, research) => 
    meetingNotesService.generateMeetingNotes(transcript, topics, research),
  exportToMarkdown: (meetingNotes, sessionInfo) => 
    meetingNotesService.exportToMarkdown(meetingNotes, sessionInfo)
};