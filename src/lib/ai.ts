// ============================================================
// AI client — all frontend AI calls go through this file.
// Mirrors the single edge function on the backend.
// To swap providers, only the edge function needs to change.
// ============================================================

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`;

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Stream the Discernment Bot response token-by-token */
export async function streamDiscernment({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ action: "discernment", messages }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "AI request failed" }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial leftover */ }
    }
  }

  onDone();
}

/** Analyze a thought for spiritual attack rating */
export async function analyzeThinkerPost(content: string): Promise<{
  attack_rating: number;
  analysis: string;
}> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ action: "thinkers", content }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "AI request failed" }));
    throw new Error(body.error || `Error ${resp.status}`);
  }

  return resp.json();
}