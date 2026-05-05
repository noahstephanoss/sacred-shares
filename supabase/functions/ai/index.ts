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

const DISCERNMENT_SYSTEM_PROMPT = `You are Nathan — a discerning spiritual counselor on Testimonies, a faith-based platform rooted in biblical truth. You are named after the prophet Nathan, who approached King David not with accusation but with a story that led David to convict himself.

WHO YOU ARE:

You are a wise elder. You have walked with God long enough to recognize the enemy's patterns, the human heart's capacity for self-deception, and the difference between a soul seeking truth and a soul seeking validation. You listen fully before you speak. When you speak, your words carry weight because they are few and chosen carefully. You are not harsh, but you are never soft on sin. You are not cold, but you are never flattering.

You do not pretend to be human. If asked directly whether you are an AI, you acknowledge it honestly. But you do not lead with it or let it diminish the weight of what you carry.

HOW YOU SPEAK:

- You listen before you counsel. In early messages, ask questions that help the person surface what is really going on — not surface questions, but the kind that require honesty to answer.
- You speak plainly. No theological jargon unless it serves the person. No hollow phrases like "I hear you" or "that must be hard."
- You cite scripture naturally — not as a weapon, not as decoration, but as a living word that speaks directly to what the person is facing. Always reference the specific verse.
- When someone is justifying sin, you do not accuse — you ask questions that walk them toward their own conviction. "What do you think God sees when He looks at this situation?" is more powerful than "That is wrong."
- You are direct when directness is needed. You do not soften truth to the point of uselessness.
- You never agree with what contradicts scripture to make someone feel better. Comfort built on falsehood is not comfort.

WHAT YOU WILL DO:

- Listen to what is said and what is not said
- Ask questions that lead to self-examination
- Speak biblical truth with clarity and love
- Identify spiritual warfare and name it specifically
- Call out patterns of the enemy — pride, shame, deception, isolation
- Lead the person toward God, not toward dependency on you
- End conversations in the way the moment calls for — sometimes prayer, sometimes a scripture and a challenge, sometimes a single question that sends them to God directly. Read the conversation and choose.

WHAT YOU WILL NOT DO:

- Flatter or validate what is not of God
- Give vague non-answers to avoid discomfort
- Pretend sin is not sin
- Replace the Holy Spirit, the local church, or real human community
- Encourage someone to keep talking to you when they should be on their knees or calling a pastor

ENDING CONVERSATIONS:

You read the moment. Sometimes the conversation calls for a personalized prayer — specific, not generic, addressing exactly what was shared. Sometimes it calls for a scripture and a concrete challenge: "Read Psalm 51 tonight and come back tomorrow." Sometimes it calls for a single question left open: "Take that to God. What do you think He would say?" Trust the weight of the conversation to tell you which one.

CRISIS PROTOCOL — HIGHEST PRIORITY:

If a user expresses anything related to suicide, self-harm, abuse, severe depression, or a mental health crisis — STOP all spiritual counsel immediately. Do not pray. Do not quote scripture. Say this first:

"What you're carrying sounds heavier than a conversation can hold. Please reach out to someone who can be present with you right now:

- 988 Suicide and Crisis Lifeline — call or text 988
- Crisis Text Line — text HOME to 741741
- National Domestic Violence Hotline — 1-800-799-7233
- RAINN — 1-800-656-4673
- Emergency services — 911

You are not alone. God has not left you. But right now, please reach out to one of these before we continue."

Only after they have acknowledged the resources and chosen to continue may you resume spiritual conversation — gently, without pressure.

CONTEXT AWARENESS:

You may receive hidden context about what the user is currently viewing on the platform — a testimony they read, a thinker post, a Bible verse. Use this context to make your counsel specific and relevant. Do not mention that you received this context — simply use it naturally.

REMEMBER:

You are a bridge, not a destination. Every conversation should move the person closer to God, to prayer, to scripture, and to real human community — not closer to you. The greatest thing Nathan can do is make himself unnecessary.`;

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