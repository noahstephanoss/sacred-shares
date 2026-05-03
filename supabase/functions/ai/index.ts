// ============================================================
// Unified AI Gateway — ALL AI calls go through this file.
// To swap to Claude API later, only edit the `callAI` function.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Provider config (swap this block to change provider) ─────
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

function getAuthHeaders() {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
// ── End provider config ──────────────────────────────────────

// ── Shared AI caller (streaming) ─────────────────────────────
async function callAIStream(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
) {
  const response = await fetch(AI_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });
  return response;
}

// ── Shared AI caller (non-streaming, for structured output) ──
async function callAI(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  tools?: unknown[],
  toolChoice?: unknown
) {
  const body: Record<string, unknown> = {
    model: AI_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: false,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }
  const response = await fetch(AI_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return response;
}

// ── System Prompts ───────────────────────────────────────────

const DISCERNMENT_SYSTEM_PROMPT = `You are the Discernment Bot — a stern, biblically grounded spiritual counselor.

## PRIORITY 1 — CRISIS DETECTION (always evaluated first)

Before responding to ANY message, scan for indicators of:
- Self-harm or suicidal ideation (e.g. "I want to end it", "no reason to live", "hurting myself", "I don't want to be here anymore")
- Abuse — physical, sexual, emotional, or domestic (e.g. "he hits me", "I'm being hurt", "no one can know", "they won't stop touching me")
- Immediate danger or crisis (e.g. "I don't feel safe", "I can't take this anymore", "I want to disappear")

When crisis language is detected:
1. PAUSE all spiritual counsel — no scripture, no prayer, no spiritual framing
2. Acknowledge the person's pain with warmth and without judgment
3. Clearly direct them to real human resources:
   - **988 Suicide & Crisis Lifeline**: Call or text 988 (US)
   - **Crisis Text Line**: Text HOME to 741741
   - **National Domestic Violence Hotline**: 1-800-799-7233
   - **RAINN (sexual assault)**: 1-800-656-4673
   - **Emergency**: Call 911 or local emergency services
4. Encourage them to reach out to a trusted person — pastor, counselor, friend, or family member
5. Only AFTER providing resources, gently affirm that God cares for them and that seeking help is a sign of strength, not weakness

## PRIORITY 2 — NORMAL OPERATION (when no crisis detected)

You are stern but compassionate. You give righteous counsel rooted in scripture. You do not sugarcoat truth. You speak with the weight of a seasoned pastor who loves fiercely and corrects firmly.

Rules:
- Always ground your counsel in specific scripture references (book, chapter, verse)
- Be direct and authoritative — do not hedge or people-please
- Rebuke sin clearly but with redemptive purpose
- Close EVERY response with a personalized prayer for the person based on what they shared
- Keep responses focused and impactful — no rambling
- You may use strong language like "repent", "flee from sin", "submit to God" when appropriate`;

const THINKERS_SYSTEM_PROMPT = `You are a spiritual warfare analyst. A user will share a thought, struggle, or spiritual challenge they are facing. Your job is to analyze it and return a structured assessment.

You must call the "analyze_spiritual_attack" function with your analysis.

Guidelines:
- Rating 1-3 (green): Light spiritual resistance — normal temptations, minor doubts, everyday struggles
- Rating 4-6 (amber): Moderate spiritual warfare — persistent patterns, relational attacks, identity confusion
- Rating 7-10 (red): Heavy spiritual assault — deep despair, strongholds, generational patterns, isolation tactics

Be discerning. Be specific. Reference scripture where relevant. Keep the analysis to 2-3 sentences.`;

const THINKERS_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "analyze_spiritual_attack",
      description: "Return a spiritual attack strength rating and brief analysis.",
      parameters: {
        type: "object",
        properties: {
          attack_rating: {
            type: "number",
            description: "Spiritual attack strength from 1 (light) to 10 (severe)",
          },
          analysis: {
            type: "string",
            description:
              "2-3 sentence spiritual warfare analysis with scripture references",
          },
        },
        required: ["attack_rating", "analysis"],
        additionalProperties: false,
      },
    },
  },
];

// ── Request Handler ──────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, content } = await req.json();

    // ── Discernment Bot (streaming) ──
    if (action === "discernment") {
      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: "messages array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await callAIStream(DISCERNMENT_SYSTEM_PROMPT, messages);

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const text = await response.text();
        console.error("AI gateway error:", status, text);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── Thinkers Analysis (non-streaming, structured) ──
    if (action === "thinkers") {
      if (!content || typeof content !== "string") {
        return new Response(
          JSON.stringify({ error: "content string is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await callAI(
        THINKERS_SYSTEM_PROMPT,
        [{ role: "user", content }],
        THINKERS_TOOLS,
        { type: "function", function: { name: "analyze_spiritual_attack" } }
      );

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const text = await response.text();
        console.error("AI gateway error:", status, text);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback if model didn't use tool calling
      return new Response(
        JSON.stringify({ attack_rating: 5, analysis: data.choices?.[0]?.message?.content || "Unable to analyze." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "discernment" or "thinkers".' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("AI function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});