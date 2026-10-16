import Anthropic from "@anthropic-ai/sdk";

/**
 * All text generation (survey themes, insights, sermons, the categorizer) goes
 * through Claude here. Image generation stays on OpenAI in lib/images.ts.
 */
export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

let cached: Anthropic | null = null;

function client(): Anthropic {
    // CLAUDE_API_KEY is what .env.local uses; ANTHROPIC_API_KEY is the SDK's standard name.
    const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("CLAUDE_API_KEY is not set.");
    cached ??= new Anthropic({ apiKey });
    return cached;
}

/**
 * Asks Claude for a JSON object and returns it parsed, or `fallback` if the
 * reply isn't usable JSON (callers validate the shape they need).
 *
 * effort: "low" for mechanical work (assigning answers to known themes,
 * classification), "medium" for judgment (finding themes, writing briefings
 * and sermons).
 */
export async function generateJson<T>(opts: {
    system: string;
    prompt: string;
    fallback: T;
    effort?: "low" | "medium" | "high";
    maxTokens?: number;
}): Promise<T> {
    const response = await client().beta.messages.create({
        model: AI_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        output_config: { effort: opts.effort ?? "medium" },
        // If a safety classifier declines a request, the API re-runs it on a
        // suitable fallback model in the same call instead of failing.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: opts.system + " Respond with only a single JSON object: no prose, no code fences.",
        messages: [{ role: "user", content: opts.prompt }],
    });

    if (response.stop_reason === "refusal") {
        throw new Error("The AI declined this request. Please rephrase it and try again.");
    }
    if (response.stop_reason === "max_tokens") {
        throw new Error("The AI's answer was cut off. Please try again with less input.");
    }

    const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    return parseJson(text, opts.fallback);
}

/** Tolerates a stray code fence or text around the object. */
function parseJson<T>(raw: string, fallback: T): T {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return fallback;
    try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
    } catch {
        return fallback;
    }
}
