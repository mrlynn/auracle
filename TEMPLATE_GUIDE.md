# Auracle Template System Guide

## Overview

Auracle supports a standardized JSON template format that allows users to create, import, and export custom report templates. This system enables you to craft specialized report formats for different use cases and share them with others.

## Template Structure

Templates follow a standardized JSON schema with the following structure:

### Required Fields

- **name**: Display name of the template
- **description**: Brief description of what the template generates  
- **category**: Template category (Business, HR, Sales, Healthcare, Legal, Education, Technology, Finance, Custom)
- **version**: Version in format x.y.z (e.g., "1.0.0")
- **prompt**: The main prompt template with variable placeholders

### Optional Fields

- **icon**: Icon or emoji for display (defaults to "📄")
- **variables**: Array of input variables for the template
- **outputFormat**: Expected output format (markdown, html, json, plain)
- **sections**: Expected sections in the output
- **metadata**: Additional template metadata
- **examples**: Example inputs and outputs

## Variable Types

Templates support various input types for dynamic content:

### Text Variables
```json
{
  "name": "companyName",
  "type": "text",
  "label": "Company Name",
  "placeholder": "Enter company name",
  "required": true
}
```

### Textarea Variables
```json
{
  "name": "additionalContext",
  "type": "textarea",
  "label": "Additional Context",
  "placeholder": "Any additional context (optional)",
  "required": false
}
```

### Select Variables
```json
{
  "name": "meetingType",
  "type": "select",
  "label": "Meeting Type",
  "required": true,
  "default": "regular",
  "options": ["regular", "standup", "planning", "strategy"]
}
```

### Date Variables
```json
{
  "name": "reportDate",
  "type": "date",
  "label": "Report Date",
  "required": true
}
```

### Other Supported Types
- `number`: Numeric input
- `email`: Email validation
- `url`: URL validation

## Variable Substitution

Variables are substituted in the prompt using double curly braces:

```
Meeting Date: {{meetingDate}}
Company: {{companyName}}
Transcript: {{transcript}}
```

### Conditional Content

Use conditional blocks for optional content:

```
{{#if additionalContext}}
Additional Context: {{additionalContext}}
{{/if}}
```

## Built-in Variables

- `{{transcript}}`: The conversation transcript (automatically provided)

## Template Examples

### Basic Meeting Minutes Template

```json
{
  "name": "Simple Meeting Minutes",
  "description": "Basic meeting minutes format",
  "category": "Business",
  "version": "1.0.0",
  "icon": "📝",
  "prompt": "Create meeting minutes for the following transcript:\n\nDate: {{meetingDate}}\nTranscript: {{transcript}}\n\nInclude:\n1. Summary\n2. Key Points\n3. Action Items",
  "variables": [
    {
      "name": "meetingDate",
      "type": "date",
      "label": "Meeting Date",
      "required": true
    }
  ],
  "outputFormat": "markdown"
}
```

## How to Use Templates

### Creating Templates

1. Write your template following the JSON schema
2. Test it with sample data
3. Save as a `.json` file

### Importing Templates

1. Open the Template Gallery in Auracle
2. Click the "Import" button
3. Either:
   - Upload a `.json` template file
   - Paste JSON content directly

### Exporting Templates

1. In the Template Gallery, find your template
2. Click the export button (📥) on any template card
3. Or use "Export All" to export all templates

### Sharing Templates

Templates are exported as standard JSON files that can be:
- Shared via email or file sharing
- Stored in version control systems
- Published in template libraries
- Backed up for safekeeping

## Best Practices

### Template Design

1. **Clear Names**: Use descriptive, unique template names
2. **Helpful Descriptions**: Explain what the template does
3. **Logical Variables**: Only include necessary variables
4. **Good Defaults**: Provide sensible default values
5. **Clear Prompts**: Write detailed, specific prompts

### Prompt Engineering

1. **Be Specific**: Clearly define the expected output format
2. **Include Context**: Provide necessary background information
3. **Structure Requests**: Break down complex requirements
4. **Handle Edge Cases**: Account for incomplete or unusual data

### Version Management

1. **Semantic Versioning**: Use x.y.z format (e.g., 1.0.0, 1.1.0, 2.0.0)
2. **Document Changes**: Update descriptions when changing templates
3. **Backward Compatibility**: Be mindful of breaking changes

## Template Categories

- **Business**: General business reports, meeting minutes
- **HR**: Interview summaries, performance reviews
- **Sales**: Call reports, pipeline analysis
- **Healthcare**: Consultation notes, patient summaries
- **Legal**: Deposition summaries, case notes
- **Education**: Lecture summaries, research reports
- **Technology**: Technical documentation, code reviews
- **Finance**: Financial analysis, audit reports
- **Custom**: Specialized or unique use cases

## Validation

Templates are automatically validated on import for:
- Required fields presence
- Valid category selection
- Proper version format
- Variable type correctness
- Schema compliance

## Storage System

Auracle uses a hybrid storage approach:

### MongoDB Storage (Primary)
When MongoDB is available and configured:
- Templates stored in MongoDB Atlas
- Full search and filtering capabilities
- Supports team collaboration
- Real-time sync across devices

### Local Storage (Fallback)
When MongoDB is unavailable:
- Templates stored locally in `~/.research-companion/local-templates.json`
- Full import/export functionality preserved
- Templates persist between app restarts
- Works completely offline

The system automatically detects MongoDB availability and falls back gracefully to local storage.

## Environment Setup

To use MongoDB storage, ensure your `.env.local` file contains:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auracle?retryWrites=true&w=majority
OPENAI_API_KEY=sk-...your-openai-key
```

If these environment variables are missing, the app will use local storage automatically.

## Troubleshooting

### Common Issues

1. **Import Fails**: Check JSON syntax and required fields
2. **Variables Not Working**: Verify variable names match placeholders
3. **Poor Output**: Refine prompt clarity and specificity
4. **Template Conflicts**: Use unique names to avoid duplicates
5. **MongoDB Connection Issues**: App automatically falls back to local storage

### Storage-Related Issues

1. **Templates Not Syncing**: Check MongoDB connection string
2. **Templates Disappear**: May have switched between MongoDB and local storage
3. **Export Issues**: Try exporting individual templates if bulk export fails
4. **ID Format Errors**: Template/report IDs are automatically converted to handle different formats (string, ObjectId, buffer)

### Getting Help

- Check the console for detailed error messages
- Validate JSON syntax using online tools
- Review example templates for reference
- Ensure all required fields are present
- Check environment variable configuration

## Example Templates

The system includes several example templates in the `/templates/examples/` directory:

- `meeting-minutes-example.json`: Comprehensive meeting minutes
- `custom-template-example.json`: Advanced research report template

These examples demonstrate best practices and can serve as starting points for your own templates.