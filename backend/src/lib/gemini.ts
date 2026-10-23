export type LLMProvider = "gemini" | "openrouter";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openai/gpt-4.1-mini",
};

export interface LLMUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMResult {
  text: string;
  usage: LLMUsage;
  provider: LLMProvider;
  model: string;
}

function getSelection(): { provider: LLMProvider; model: string } {
  const configuredProvider = (process.env.LLM_PROVIDER || "gemini").trim().toLowerCase();
  if (configuredProvider !== "gemini" && configuredProvider !== "openrouter") {
    throw new Error(`Unsupported LLM_PROVIDER: ${configuredProvider}. Use gemini or openrouter.`);
  }

  const provider = configuredProvider as LLMProvider;
  const model = (process.env.LLM_MODEL || DEFAULT_MODELS[provider]).trim();
  return { provider, model };
}

export async function generateContent(prompt: string, maxOutputTokens = 8192): Promise<LLMResult> {
  const { provider, model } = getSelection();
  if (provider === "gemini") {
    return generateViaGemini(prompt, model, maxOutputTokens);
  }
  return generateViaOpenRouter(prompt, model, maxOutputTokens);
}

async function generateViaGemini(prompt: string, model: string, maxOutputTokens: number): Promise<LLMResult> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
  const usage: LLMUsage = {
    promptTokens: data?.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
  };
  return { text, usage, provider: "gemini", model };
}

async function generateViaOpenRouter(prompt: string, model: string, maxOutputTokens: number): Promise<LLMResult> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  };
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxOutputTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
      ? content.map((part: { text?: string }) => part?.text ?? "").join("")
      : "";
  const usage: LLMUsage = {
    promptTokens: data?.usage?.prompt_tokens ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
    totalTokens: data?.usage?.total_tokens ?? 0,
  };
  return { text, usage, provider: "openrouter", model };
}

export function buildSummaryPrompt(summaryStyle: string, contentText: string): string {
  switch (summaryStyle) {
    case "timestamp-bullets":
      return `You are a helpful assistant that creates timestamped outlines of content.

Create a structured outline organized by major topics/questions discussed. For each topic:
1. Add a **Topic Header** with the actual timestamp from the transcript in [HH:MM:SS] or [MM:SS] format
2. List 3-7 bullet points covering key insights from that section
3. Use nested bullets for sub-points when relevant

IMPORTANT: Use the ACTUAL timestamps that appear in the transcript. Look for patterns like [00:15:30] or timestamps in the text.

Format:
## [00:05:30] Topic Name
- Main point about the topic
  - Supporting detail or example
- Another key insight
- Specific data or quote

Make it scannable and well-organized. Total length: 500-1000 words.

Content (with timestamps):
${contentText}`;

    case "narrative":
      return `You are a helpful assistant that creates immersive narrative summaries.

Write a flowing, engaging narrative (1500-2500 words) that:
1. Introduces the content and creator naturally (like starting a story)
2. Weaves together concepts and ideas in a story-like format
3. Explores the "why" behind ideas and their implications deeply
4. Connects different topics showing how they relate to each other
5. Concludes with synthesis and reflection on the bigger picture

Use a conversational, approachable tone. Avoid bullet points and rigid structure - make it feel like you're explaining fascinating ideas to a friend over coffee.

Content:
${contentText}`;

    case "study":
      return `You are a helpful assistant that creates structured study guides for academic learning.

Create a comprehensive study guide in this format:

## Key Concepts & Definitions
- **Term/Concept**: Clear, precise definition

## Important Formulas/Methods/Frameworks
- Formula/Method name: \`equation or process\`
- Application: When and how to use it

## Key People/Authors/Contributors
- Name (Role/Title): Main contribution or notable quote

## Critical Dates/Events/Milestones
- Date/Period: What happened and why it's significant

## Citations & References
- Books, papers, or resources explicitly mentioned

## Practice Questions
- 3-5 questions to test understanding

Length: 1000-1500 words.

Content:
${contentText}`;

    case "fact-check":
      return `You are a rigorous fact-checking assistant. Analyze the content and produce a structured fact-check summary (1500-2500 words) with:

1. **Summary of Main Talking Points**
2. **Factual Analysis**: For each major claim - is it supported, disputed, or speculative?
3. **Nuanced Perspective**: Present confirmed evidence without extreme positions
4. **Context & Background**: Relevant historical or scientific context
5. **Key Takeaways**: What's well-established vs open to debate

Use markdown headers and bullet points. Bold verdicts like **Supported**, **Disputed**, **Misleading**.

Content:
${contentText}`;

    case "comprehensive":
      return `You are a helpful assistant that creates highly detailed, comprehensive summaries. This MUST be 2000-3500 words.

## Overview
150-250 words introducing the content and its significance.

## Author/Creator
100-150 words about who created this and their credentials.

## Main Topics
1000-1500 words covering ALL major topics discussed in depth with examples.

## Key Takeaways
300-500 words on the most important lessons. Each takeaway gets 2-3 sentences.

## Notable Moments
200-300 words on particularly interesting segments.

## Additional Insights
150-250 words with deeper analysis and implications.

REMINDER: Your response must be 2000-3500 words. Keep writing until all sections are thoroughly covered.

Content:
${contentText}`;

    default: // balanced
      return `You are a helpful assistant that creates comprehensive yet concise summaries of content transcripts.

Create a detailed summary (750-1500 words) with these sections:

## Overview
Brief introduction to the content.

## Author/Creator
Who created this and their background (if applicable).

## Main Topics
Comprehensive coverage of all major topics with key points and insights.

## Key Takeaways
Most important lessons and insights.

## Notable Moments
Particularly interesting or memorable segments.

Format in clean, readable markdown with headers, bullet points, and bold emphasis.

Content:
${contentText}`;
  }
}

export function buildHighlightsPrompt(summaryMarkdown: string): string {
  return `Given this content summary, extract 3-5 key highlights as a JSON array of objects with "icon" and "text" fields.

Icons must be one of: 💡 🎯 ⚠️ 📊 🔑 💰 🚀 ⭐ 🔥 📝

Return ONLY valid JSON, no markdown:
[{"icon":"💡","text":"Key insight here"},...]

Summary:
${summaryMarkdown}`;
}
