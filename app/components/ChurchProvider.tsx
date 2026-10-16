"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/apiClient";
import type { Church, ModuleId, Role } from "@/lib/types";

export interface ModuleState {
    id: ModuleId;
    name: string;
    blurb: string;
    href: string;
    enabled: boolean;
    pricing: { unit: string; credits: number };
}

interface MePayload {
    user: { uid: string; email: string | null; name: string | null; role: Role; churchId: string | null };
    church: Church | null;
    modules: ModuleState[];
    needsOnboarding: boolean;
}

interface ChurchContextValue extends Partial<MePayload> {
    loading: boolean;
    error: string;
    reload(): Promise<void>;
    has(moduleId: ModuleId): boolean;
}

const ChurchContext = createContext<ChurchContextValue | null>(null);

export function ChurchProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [data, setData] = useState<MePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        try {
            setData(await api<MePayload>("/api/me"));
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load your account.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated") void reload();
        if (status === "unauthenticated") setLoading(false);
    }, [status, reload]);

    const value = useMemo<ChurchContextValue>(
        () => ({
            ...data,
            loading,
            error,
            reload,
            has: (moduleId) => Boolean(data?.modules?.find((m) => m.id === moduleId)?.enabled),
        }),
        [data, loading, error, reload]
    );

    return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
}

export function useChurch(): ChurchContextValue {
    const ctx = useContext(ChurchContext);
    if (!ctx) throw new Error("useChurch must be used inside <ChurchProvider>");
    return ctx;
}
