"use client";

import { createTheme } from "@mui/material/styles";

const ink = "#1f1a17";
const ink2 = "#5b534c";
const brand = "#23395d";
const border = "#e8e2d9";

const sans = "var(--font-sans), system-ui, -apple-system, 'Segoe UI', sans-serif";
const serif = "var(--font-serif), Georgia, serif";

/** Headings use the serif; everything a person reads or types uses the sans. */
const heading = { fontFamily: serif, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.15 };

export const theme = createTheme({
    palette: {
        mode: "light",
        primary: { main: brand, dark: "#182945", light: "#3c5683", contrastText: "#fff" },
        secondary: { main: "#b58a3c", contrastText: "#fff" },
        text: { primary: ink, secondary: ink2 },
        background: { default: "#faf8f5", paper: "#ffffff" },
        divider: border,
        success: { main: "#2f7d5b" },
        warning: { main: "#b7791f" },
        error: { main: "#b42318" },
    },
    shape: { borderRadius: 10 },
    typography: {
        fontFamily: sans,
        h1: heading,
        h2: heading,
        h3: heading,
        h4: { ...heading, fontWeight: 600 },
        h5: { ...heading, fontWeight: 600 },
        // Small headings stay in the sans: the serif reads poorly at card-title size.
        h6: { fontFamily: sans, fontWeight: 600, fontSize: "1.05rem", letterSpacing: "-0.01em" },
        subtitle1: { fontWeight: 500 },
        button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
        overline: { fontWeight: 600, letterSpacing: "0.12em" },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: "#faf8f5" } },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 999, paddingInline: 18 },
                sizeLarge: { paddingBlock: 11, paddingInline: 26, fontSize: "1rem" },
                outlined: { borderColor: border, "&:hover": { borderColor: ink2, backgroundColor: "rgba(31,26,23,.03)" } },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { backgroundImage: "none" },
                outlined: { borderColor: border },
            },
        },
        MuiCard: {
            defaultProps: { variant: "outlined" },
            styleOverrides: { root: { borderRadius: 16, borderColor: border } },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    backgroundColor: "#fff",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cfc6b8" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1.5 },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 999, fontWeight: 500 },
                outlined: { borderColor: border },
            },
        },
        MuiAlert: {
            styleOverrides: { root: { borderRadius: 12 } },
        },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 18 } },
        },
        MuiMenu: {
            styleOverrides: {
                paper: { borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 12px 32px -12px rgba(31,26,23,.25)" },
            },
        },
        // Papers default to elevation 0, so the suggestion popup needs its own edge.
        MuiAutocomplete: {
            styleOverrides: {
                paper: { marginTop: 4, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 12px 32px -12px rgba(31,26,23,.25)" },
                groupLabel: { fontWeight: 600, color: ink2, lineHeight: "32px" },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderColor: border },
                head: { fontWeight: 600, color: ink2, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" },
            },
        },
        MuiTab: {
            styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
        },
        MuiTooltip: {
            styleOverrides: { tooltip: { backgroundColor: ink, borderRadius: 8, fontSize: "0.78rem" } },
        },
        MuiLinearProgress: {
            styleOverrides: { root: { borderRadius: 999, height: 6 } },
        },
        MuiLink: {
            defaultProps: { underline: "hover" },
            styleOverrides: { root: { color: brand, fontWeight: 500 } },
        },
    },
});
