"use client";

/** Thin fetch wrapper that surfaces the API's error message. */
export async function api<T = unknown>(
    path: string,
    init: RequestInit & { json?: unknown } = {}
): Promise<T> {
    const { json, ...rest } = init;
    const res = await fetch(path, {
        ...rest,
        method: rest.method ?? (json ? "POST" : "GET"),
        headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    let payload: unknown = null;
    try {
        payload = await res.json();
    } catch {
        /* empty body */
    }

    if (!res.ok) {
        const message =
            (payload as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
        throw new Error(message);
    }
    return payload as T;
}
