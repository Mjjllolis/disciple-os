"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import type { Job } from "@/lib/types";

/**
 * Runs a metered job and follows its progress.
 *
 * The job id is generated here and sent with the request, so polling can start
 * immediately rather than waiting for the (possibly minutes-long) POST to
 * return. That also makes a double-click a no-op instead of a double charge.
 */
export function useJob<TResult = unknown>() {
    const [job, setJob] = useState<Job | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    useEffect(() => stopPolling, [stopPolling]);

    const start = useCallback(
        async (path: string, payload: Record<string, unknown> = {}): Promise<TResult | null> => {
            const jobId =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

            setRunning(true);
            setError("");
            setJob(null);

            pollRef.current = setInterval(async () => {
                try {
                    const { job: latest } = await api<{ job: Job | null }>(`/api/jobs/${jobId}`);
                    if (latest) setJob(latest);
                } catch {
                    /* transient; the POST result is the source of truth */
                }
            }, 1500);

            try {
                const result = await api<TResult>(path, { json: { ...payload, jobId } });
                return result;
            } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't work.");
                // The last poll may have caught the job mid-run; don't leave its progress showing.
                setJob(null);
                return null;
            } finally {
                stopPolling();
                setRunning(false);
            }
        },
        [stopPolling]
    );

    return { start, job, running, error, setError };
}
