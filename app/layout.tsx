import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "./components/ThemeRegistry";
import ResponsiveAppBar from "./components/ResponsiveAppBar";
import AuthProvider from "./components/AuthProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider> {/* ✅ Wrap entire app inside AuthProvider */}
          <ThemeRegistry>
            <ResponsiveAppBar />
            {children}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
