import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import ThemeRegistry from "./components/ThemeRegistry";
import ResponsiveAppBar from "./components/ResponsiveAppBar";
import AuthProvider from "./components/AuthProvider";
import { ChurchProvider } from "./components/ChurchProvider";
import { ToastProvider } from "./components/Toast";
import Footer from "./components/Footer";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    style: ["normal", "italic"],
    variable: "--font-serif",
    display: "swap",
});

export const metadata: Metadata = {
    title: "DiscipleShip International",
    description:
        "Digital surveys, AI insight, sermon planning, and visit scheduling for local churches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${sans.variable} ${serif.variable}`}>
            <body>
                {/* Collects MUI's styles during SSR so pages don't flash unstyled. */}
                <AppRouterCacheProvider>
                    <AuthProvider>
                        <ThemeRegistry>
                            <ChurchProvider>
                                <ToastProvider>
                                    <ResponsiveAppBar />
                                    <main style={{ flex: 1 }}>{children}</main>
                                    <Footer />
                                </ToastProvider>
                            </ChurchProvider>
                        </ThemeRegistry>
                    </AuthProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
