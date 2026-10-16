import OpenAI from "openai";
import { uploadImage } from "./storage";
import type { ImagePurpose } from "./types";

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

/** Aspect ratios that actually get used in a church production workflow. */
export const IMAGE_SIZES: Record<ImagePurpose, { size: string; label: string }> = {
    series_art: { size: "1024x1024", label: "Square — series art, app tiles" },
    sermon_slide: { size: "1536x1024", label: "Wide — projection slides" },
    social_post: { size: "1024x1024", label: "Square — Instagram, Facebook" },
    flyer: { size: "1024x1536", label: "Tall — flyers, stories, bulletins" },
};

const PURPOSE_DIRECTION: Record<ImagePurpose, string> = {
    series_art:
        "Cover art for a sermon series. Bold, symbolic, and readable as a small thumbnail. " +
        "Leave calm negative space in the middle where a title will be overlaid later.",
    sermon_slide:
        "A background slide shown behind text in a worship auditorium. Low contrast and " +
        "unbusy, darker toward the centre so white text stays legible on top of it.",
    social_post:
        "A social media graphic for a church account. Warm, inviting, and clear at small sizes.",
    flyer:
        "A tall flyer background for print and phone screens. Leave the lower third quieter " +
        "so event details can be placed there.",
};

function client(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    return new OpenAI({ apiKey });
}

/**
 * Church imagery has a specific failure mode: models love to render text, and
 * they render it misspelled. We ask for no lettering at all and let the church
 * overlay real type in their own tools.
 */
function buildPrompt(purpose: ImagePurpose, prompt: string, styleNote?: string): string {
    return (
        `${PURPOSE_DIRECTION[purpose]}\n\n` +
        `Subject: ${prompt}\n` +
        (styleNote ? `Style: ${styleNote}\n` : "") +
        `\nDo not render any words, letters, numbers, or logos anywhere in the image. ` +
        `No watermarks. No depictions of Jesus' face. Avoid cliché stock-photo staging.`
    );
}

export async function generateImage(params: {
    churchId: string;
    purpose: ImagePurpose;
    prompt: string;
    styleNote?: string;
}): Promise<{ url: string; storagePath: string; size: string; revisedPrompt: string | null }> {
    const openai = client();
    const size = IMAGE_SIZES[params.purpose].size;

    const res = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt: buildPrompt(params.purpose, params.prompt, params.styleNote),
        size: size as "1024x1024" | "1536x1024" | "1024x1536",
        n: 1,
    });

    const first = res.data?.[0];
    if (!first) throw new Error("The image model returned nothing. Please try again.");

    // gpt-image-1 returns base64; older models return a short-lived URL.
    let bytes: Buffer;
    if (first.b64_json) {
        bytes = Buffer.from(first.b64_json, "base64");
    } else if (first.url) {
        const download = await fetch(first.url);
        if (!download.ok) throw new Error("Could not download the generated image.");
        bytes = Buffer.from(await download.arrayBuffer());
    } else {
        throw new Error("The image model returned an unrecognized response.");
    }

    const path = `churches/${params.churchId}/images/${crypto.randomUUID()}.png`;
    const uploaded = await uploadImage({ path, data: bytes, contentType: "image/png" });

    return {
        url: uploaded.url,
        storagePath: uploaded.path,
        size,
        revisedPrompt: first.revised_prompt ?? null,
    };
}
