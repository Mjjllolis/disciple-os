"use client"; // ✅ Ensure this is a client component

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MantineProvider } from "@mantine/core";
import CssBaseline from "@mui/material/CssBaseline";
import React from "react";

// Define Material UI theme
const muiTheme = createTheme({
    palette: {
        mode: "light",
    },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider >
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </MantineProvider>
    );
}
