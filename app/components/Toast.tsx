"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

type Severity = "success" | "error" | "info" | "warning";

interface ToastMessage {
    id: number;
    text: string;
    severity: Severity;
}

interface ToastApi {
    notify(text: string, severity?: Severity): void;
    success(text: string): void;
    error(text: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** App-wide transient messages, so pages stop hand-rolling inline alerts. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<ToastMessage[]>([]);

    const notify = useCallback((text: string, severity: Severity = "info") => {
        setQueue((q) => [...q, { id: Date.now() + Math.random(), text, severity }]);
    }, []);

    const api = useMemo<ToastApi>(
        () => ({
            notify,
            success: (text) => notify(text, "success"),
            error: (text) => notify(text, "error"),
        }),
        [notify]
    );

    const current = queue[0];

    return (
        <ToastContext.Provider value={api}>
            {children}
            <Snackbar
                key={current?.id}
                open={Boolean(current)}
                autoHideDuration={current?.severity === "error" ? 8000 : 4000}
                onClose={(_e, reason) => {
                    if (reason === "clickaway") return;
                    setQueue((q) => q.slice(1));
                }}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={current?.severity ?? "info"}
                    variant="filled"
                    onClose={() => setQueue((q) => q.slice(1))}
                    sx={{ maxWidth: 560 }}
                >
                    {current?.text}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastApi {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}
