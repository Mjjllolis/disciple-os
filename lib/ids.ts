import { randomBytes, randomUUID } from "crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes

/** URL-safe token used for public survey links. */
export function publicToken(length = 10): string {
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}

export function newId(): string {
    return randomUUID();
}

/** Turns "Church at Addis" into "church-at-addis". */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
