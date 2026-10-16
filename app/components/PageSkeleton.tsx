import { Box, Container, Skeleton, Stack } from "@mui/material";

/**
 * Shown the instant a dashboard link is clicked (via loading.tsx), so the page
 * reacts immediately while the next one loads.
 */
export default function PageSkeleton() {
    return (
        <Box sx={{ py: { xs: 4, md: 6 } }} aria-busy="true" aria-label="Loading">
            <Container maxWidth="lg">
                <Skeleton variant="text" width={90} height={20} />
                <Skeleton variant="text" width="45%" height={56} />
                <Skeleton variant="text" width="30%" height={24} />
                <Box sx={{ mt: 4, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} variant="rounded" height={112} sx={{ borderRadius: 4 }} />
                    ))}
                </Box>
                <Stack gap={1.5} sx={{ mt: 5 }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 3 }} />
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}
