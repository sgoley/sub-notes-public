/**
 * AI Model Types and Configuration
 *
 * Defines available Gemini models and their metadata
 */

export type GeminiModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash-exp'; // Deprecated March 31, 2026

export interface ModelOption {
  value: GeminiModel;
  label: string;
  description: string;
  isDeprecated?: boolean;
  deprecationDate?: string;
  inputCostPer1M: number;  // Cost in USD per 1M input tokens
  outputCostPer1M: number; // Cost in USD per 1M output tokens
}

export const GEMINI_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Recommended - Fast and balanced (default)',
    inputCostPer1M: 0.15,
    outputCostPer1M: 1.25,
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: 'Cheapest - Good for basic summaries',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Most capable - Best quality summaries',
    inputCostPer1M: 1.25,
    outputCostPer1M: 10.00,
  },
  {
    value: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash (Experimental)',
    description: 'Deprecated - Will be removed March 31, 2026',
    isDeprecated: true,
    deprecationDate: '2026-03-31',
    inputCostPer1M: 0.15,
    outputCostPer1M: 1.25,
  },
];

export const DEFAULT_MODEL: GeminiModel = 'gemini-2.5-flash';

export function getModelOption(model: GeminiModel): ModelOption | undefined {
  return GEMINI_MODEL_OPTIONS.find(opt => opt.value === model);
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: GeminiModel
): number {
  const modelOption = getModelOption(model);
  if (!modelOption) return 0;

  const inputCost = (inputTokens / 1_000_000) * modelOption.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelOption.outputCostPer1M;

  return (inputCost + outputCost) * 100; // Return in cents
}
