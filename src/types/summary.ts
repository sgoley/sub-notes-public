/**
 * Summary Style Types
 *
 * Defines the available summary generation styles and their metadata
 */

export type SummaryStyle = 'balanced' | 'comprehensive' | 'fact-check' | 'timestamp-bullets' | 'narrative' | 'study';

export interface SummaryStyleOption {
  value: SummaryStyle;
  label: string;
  description: string;
}

export const SUMMARY_STYLE_OPTIONS: SummaryStyleOption[] = [
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Well-structured summary (750-1500 words)'
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'In-depth coverage with extensive details (2000-3500 words)'
  },
  {
    value: 'fact-check',
    label: 'Fact Check',
    description: 'Factual analysis with nuanced perspective (1500-2500 words)'
  },
  {
    value: 'timestamp-bullets',
    label: 'Timestamped Outline',
    description: 'Bullet points with video timestamps'
  },
  {
    value: 'narrative',
    label: 'Narrative',
    description: 'Long-form narrative (1500-2500 words)'
  },
  {
    value: 'study',
    label: 'Study Guide',
    description: 'Structured notes with definitions & citations'
  }
];
