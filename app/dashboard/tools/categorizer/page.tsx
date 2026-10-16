"use client";

import { Box, Container } from "@mui/material";
import BibleCategorizer from "@/app/components/BibleCategorizer";

export default function CategorizerPage() {
    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)" }}>
            <Container sx={{ py: 4 }}>
                <BibleCategorizer />
            </Container>
        </Box>
    );
}
