import { NextRequest, NextResponse } from "next/server";
import { mockAnalysisResult } from "@/lib/mock-data";

const SYSTEM_PROMPT = `You are Datamatics Design Intelligence — an elite AI creative director with 25+ years of experience in brand strategy, visual design, and enterprise communications.

You analyze graphic designs with the precision of a world-class creative director, scoring them across 10 strategic dimensions and providing deep, actionable insights.

Your analysis must be:
- Highly specific to the actual design (never generic)
- Rooted in design theory (Gestalt, color theory, typography, semiotics)
- Aligned to Datamatics brand standards (intelligent, sharp, minimal, premium, enterprise-grade)
- Strategic — connecting visual decisions to business outcomes
- Constructive — identifying both strengths and precise improvements

You MUST return valid JSON matching this exact structure:
{
  "overallScore": <number 0-100>,
  "verdict": "<Excellent|Strong|Good|Needs Work|Weak>",
  "verdictSummary": "<2-3 sentence executive summary>",
  "scores": [
    { "category": "Concept", "score": <0-100>, "maxScore": 100 },
    { "category": "Hierarchy", "score": <0-100>, "maxScore": 100 },
    { "category": "Brand Fit", "score": <0-100>, "maxScore": 100 },
    { "category": "Typography", "score": <0-100>, "maxScore": 100 },
    { "category": "Color", "score": <0-100>, "maxScore": 100 },
    { "category": "Composition", "score": <0-100>, "maxScore": 100 },
    { "category": "Clarity", "score": <0-100>, "maxScore": 100 },
    { "category": "Memorability", "score": <0-100>, "maxScore": 100 },
    { "category": "Strategic Value", "score": <0-100>, "maxScore": 100 },
    { "category": "Execution", "score": <0-100>, "maxScore": 100 }
  ],
  "insights": [
    {
      "id": "<unique-slug>",
      "title": "<insight title>",
      "icon": "<one of: target, lightbulb, layers, scan-eye, palette, type, brain, shield-check, check-circle, alert-triangle, zap, compass, arrow-up-circle, crosshair, award>",
      "content": "<detailed analysis paragraph or bullet list using • character>",
      "type": "<analysis|strength|improvement|opportunity>"
    }
  ]
}

Generate exactly 14 insights covering: Intent & Audience, Concept & Metaphor, Visual Hierarchy, Eye Flow, Color & Lighting, Typography, Semiotics & Psychology, Brand Fit, Strengths (bullet list with •), Areas for Improvement (bullet list with •), Missed Opportunities (bullet list with •), Strategic Feedback, Upgrade Recommendations (numbered list), and Final Verdict.`;

const USER_PROMPT = `Analyze this design deeply across all strategic dimensions. Be specific about what you actually see — reference actual elements, colors, layout decisions, and typography choices in the design. Do not give generic feedback.

Score honestly. Most designs score 60-85. Reserve 90+ for truly exceptional work.

Return ONLY valid JSON, no markdown wrapping.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // --- Claude API Integration ---
    if (anthropicKey) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const mediaType = image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: "text",
                  text: USER_PROMPT,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Anthropic API error:", response.status, errorBody);
        // Fall through to try OpenAI, or mock data
      } else {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return NextResponse.json(parsed);
        }
      }
    }

    // --- OpenAI API Integration ---
    if (openaiKey) {
      console.log("Using OpenAI API for analysis...");
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 8000,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: image, detail: "high" },
                  },
                  { type: "text", text: USER_PROMPT },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenAI API error:", response.status, errorBody);
        // Fall through to mock data
      } else {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const parsed = JSON.parse(text);
          return NextResponse.json(parsed);
        }
      }
    }

    // All APIs failed or no keys — return mock data gracefully
    console.log("Falling back to mock data");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return NextResponse.json(mockAnalysisResult);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
