"use client";

import { useEffect, useState } from "react";
import { Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import QRCode from "qrcode";
import { useToast } from "./Toast";

/**
 * Share panel for a published survey. The QR code matters more than it looks:
 * churches put these in bulletins and on screens, which is how response rates
 * actually go up.
 */
export default function ShareSurvey({ url, title }: { url: string; title: string }) {
    const toast = useToast();
    const [qr, setQr] = useState("");

    useEffect(() => {
        if (!url) return;
        QRCode.toDataURL(url, { width: 512, margin: 1, color: { dark: "#4e4038", light: "#fffff4" } })
            .then(setQr)
            .catch(() => setQr(""));
    }, [url]);

    const download = () => {
        if (!qr) return;
        const a = document.createElement("a");
        a.href = qr;
        a.download = `${title.replace(/[^\w\s-]/g, "").slice(0, 50) || "survey"}-qr.png`;
        a.click();
    };

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, backgroundColor: "var(--surface-muted)" }}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={3} alignItems={{ sm: "center" }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, color: "var(--deep-brown)", mb: 1 }}>Share this survey</Typography>
                    <Stack direction="row" gap={1} alignItems="center">
                        <TextField
                            size="small"
                            fullWidth
                            value={url}
                            InputProps={{ readOnly: true }}
                            sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                        />
                        <Tooltip title="Copy link">
                            <IconButton
                                onClick={() => {
                                    void navigator.clipboard.writeText(url);
                                    toast.success("Link copied to your clipboard.");
                                }}
                            >
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "var(--deep-brown)", mt: 1, opacity: 0.85 }}>
                        Anyone with this link can respond anonymously. No account needed.
                    </Typography>
                </Box>

                {qr && (
                    <Stack alignItems="center" gap={1}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="QR code for this survey" width={132} height={132} style={{ borderRadius: 8 }} />
                        <Button size="small" startIcon={<DownloadIcon />} onClick={download} sx={{ color: "var(--deep-brown)" }}>
                            QR code
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
}
