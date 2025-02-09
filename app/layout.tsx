"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import { SessionProvider } from "next-auth/react";

const theme = createTheme({});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <MantineProvider theme={theme}>
            {children}
          </MantineProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
