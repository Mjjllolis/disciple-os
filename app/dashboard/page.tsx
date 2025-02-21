"use client";

import { useState } from "react";
import { AppBar, Box, Button, CssBaseline, Container, Toolbar, Typography } from "@mui/material";
import BibleCategorizer from "../components/BibleCategorizer"; // Import the component

const headerHeight = 64;

export default function DashboardPage() {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--light-cream)" }}>
            <CssBaseline />

            {/* Header */}
            {/* <AppBar position="fixed" sx={{ height: `${headerHeight}px`, backgroundColor: "var(--muted-blue)", color: "var(--light-cream)", zIndex: 1100 }}>
                <Toolbar>
                    <Typography variant="h6" fontWeight="bold">
                        Bible Categorizer
                    </Typography>
                </Toolbar>
            </AppBar> */}

            {/* Main Content (Loads Bible Categorizer) */}
            <Container sx={{ marginTop: `${headerHeight}px`, p: 3 }}>
                <BibleCategorizer />
            </Container>
        </Box>
    );
}