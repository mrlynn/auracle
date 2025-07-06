// Enhanced Research Card Component
// Displays AI-powered research results with synthesis, credibility, and follow-ups
import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, Accordion, AccordionSummary,
  AccordionDetails, Link, IconButton, Tooltip, LinearProgress, Stack,
  Divider, List, ListItem, ListItemText, Button, Badge, Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  Psychology as PsychologyIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  QuestionAnswer as QuestionIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Article as ArticleIcon,
  Code as CodeIcon,
  FeedRounded as NewsIcon
} from '@mui/icons-material';

const EnhancedResearchCard = ({ research, onFollowUpClick, onSourceClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [showSources, setShowSources] = useState(false);

  if (!research) return null;

  const { 
    topic, 
    synthesis, 
    sources = [], 
    followUpQuestions = [], 
    context,
    primaryFocus,
    timestamp 
  } = research;

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'info';
    }
  };

  // Get credibility color
  const getCredibilityColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // Get source type icon
  const getSourceIcon = (type) => {
    switch (type) {
      case 'research-paper':
      case 'academic':
        return <SchoolIcon fontSize="small" />;
      case 'news-article':
      case 'news':
        return <NewsIcon fontSize="small" />;
      case 'q&a':
      case 'technical':
        return <CodeIcon fontSize="small" />;
      case 'ai-synthesis':
        return <PsychologyIcon fontSize="small" />;
      default:
        return <ArticleIcon fontSize="small" />;
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          border: '1px solid rgba(99, 102, 241, 0.3)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <PsychologyIcon color="primary" />
              {topic}
            </Typography>
            
            {primaryFocus && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Focus: {primaryFocus}
              </Typography>
            )}
          </Box>

          {/* Confidence Indicator */}
          {synthesis?.confidence && (
            <Chip
              label={`${synthesis.confidence} confidence`}
              size="small"
              color={getConfidenceColor(synthesis.confidence)}
              icon={synthesis.confidence === 'high' ? <VerifiedIcon /> : <WarningIcon />}
            />
          )}
        </Box>

        {/* AI Synthesis */}
        {synthesis?.synthesis && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 2 }}>
              {synthesis.synthesis}
            </Typography>

            {/* Key Points */}
            {synthesis.keyPoints && synthesis.keyPoints.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Key Points:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {synthesis.keyPoints.slice(0, 3).map((point, index) => (
                    <Chip
                      key={index}
                      label={point}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                  {synthesis.keyPoints.length > 3 && (
                    <Chip
                      label={`+${synthesis.keyPoints.length - 3} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Practical Takeaways */}
            {synthesis.practicalTakeaways && synthesis.practicalTakeaways.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  💡 Practical Takeaways:
                </Typography>
                <List dense sx={{ pl: 2 }}>
                  {synthesis.practicalTakeaways.slice(0, 2).map((takeaway, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText 
                        primary={takeaway}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {/* Sources Summary */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Sources:
            </Typography>
            <Badge badgeContent={sources.length} color="primary">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowSources(!showSources)}
                sx={{ minWidth: 'auto' }}
              >
                {showSources ? 'Hide' : 'Show'}
              </Button>
            </Badge>
          </Box>

          {/* Average Credibility Score */}
          {sources.length > 0 && sources.some(s => s.credibility?.score) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Avg. Credibility:
              </Typography>
              <Chip
                label={`${Math.round(
                  sources
                    .filter(s => s.credibility?.score)
                    .reduce((sum, s) => sum + s.credibility.score, 0) / 
                  sources.filter(s => s.credibility?.score).length
                )}%`}
                size="small"
                color={getCredibilityColor(
                  sources
                    .filter(s => s.credibility?.score)
                    .reduce((sum, s) => sum + s.credibility.score, 0) / 
                  sources.filter(s => s.credibility?.score).length
                )}
              />
            </Box>
          )}
        </Box>

        {/* Sources List */}
        <Collapse in={showSources}>
          <Box sx={{ mb: 2 }}>
            {sources.slice(0, 5).map((source, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  mb: 1,
                  bgcolor: 'rgba(248, 250, 252, 0.5)',
                  borderRadius: 1,
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(248, 250, 252, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ mt: 0.5 }}>
                    {getSourceIcon(source.type)}
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                        {source.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {source.credibility?.score && (
                          <Chip
                            label={`${source.credibility.score}%`}
                            size="small"
                            color={getCredibilityColor(source.credibility.score)}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={() => window.open(source.url, '_blank')}
                          sx={{ p: 0.5 }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {source.summary?.substring(0, 150)}
                      {source.summary?.length > 150 && '...'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={source.source}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                      
                      <Chip
                        label={source.type}
                        size="small"
                        variant="outlined"
                        color="secondary"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
            
            {sources.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                ... and {sources.length - 5} more sources
              </Typography>
            )}
          </Box>
        </Collapse>

        {/* Follow-up Questions */}
        {followUpQuestions && followUpQuestions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuestionIcon fontSize="small" />
              Follow-up Questions:
            </Typography>
            <Stack spacing={1}>
              {followUpQuestions.slice(0, 3).map((question, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  size="small"
                  onClick={() => onFollowUpClick && onFollowUpClick(question)}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(99, 102, 241, 0.05)'
                    }
                  }}
                >
                  {question}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Researched {new Date(timestamp).toLocaleTimeString()}
          </Typography>
          
          {synthesis?.deeperExploration && synthesis.deeperExploration.length > 0 && (
            <Tooltip title="Areas for deeper exploration">
              <Chip
                icon={<TrendingUpIcon />}
                label={`${synthesis.deeperExploration.length} deeper topics`}
                size="small"
                variant="outlined"
                color="info"
              />
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default EnhancedResearchCard;