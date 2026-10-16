"use client";

import { Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import type { Job } from "@/lib/types";

/** Live progress for a running job. Falls back to indeterminate before the
 *  first heartbeat lands, so there's never a dead-looking pause. */
export default function JobProgress({ job, running }: { job: Job | null; running: boolean }) {
    if (!running && !job) return null;
    if (job && (job.status === "complete" || job.status === "failed")) return null;

    const total = job?.progress?.total ?? 0;
    const step = job?.progress?.step ?? 0;
    const pct = total > 0 ? Math.min(100, Math.round((step / total) * 100)) : 0;

    return (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "var(--surface-muted)", mt: 2 }}>
            <Stack gap={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
                    <Typography sx={{ color: "var(--deep-brown)", fontWeight: 600 }}>
                        {job?.progress?.message ?? "Starting…"}
                    </Typography>
                    {total > 1 && (
                        <Typography variant="body2" sx={{ color: "var(--deep-brown)", opacity: 0.8, whiteSpace: "nowrap" }}>
                            step {step} of {total}
                        </Typography>
                    )}
                </Stack>
                <Box>
                    <LinearProgress
                        variant={total > 0 ? "determinate" : "indeterminate"}
                        value={pct}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "rgba(0,0,0,.08)",
                            "& .MuiLinearProgress-bar": { backgroundColor: "var(--muted-blue)" },
                        }}
                    />
                </Box>
                <Typography variant="caption" sx={{ color: "var(--deep-brown)", opacity: 0.75 }}>
                    Keep this tab open. If something goes wrong your credits are refunded automatically.
                </Typography>
            </Stack>
        </Paper>
    );
}
