"use client"; // ✅ Ensures this is a Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
