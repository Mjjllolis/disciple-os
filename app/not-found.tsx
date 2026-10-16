import { Box, Button, Container, Paper, Typography } from "@mui/material";

export default function NotFound() {
    return (
        <Box sx={{ minHeight: "70vh", backgroundColor: "var(--light-cream)", display: "flex", alignItems: "center", py: 6 }}>
            <Container maxWidth="sm">
                <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid var(--soft-beige)", textAlign: "center" }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: "var(--muted-blue)" }}>404</Typography>
                    <Typography variant="h6" sx={{ mt: 1, color: "var(--deep-brown)" }}>
                        We couldn&apos;t find that page
                    </Typography>
                    <Typography sx={{ mt: 1.5, color: "var(--dark-gray)" }}>
                        The link may be old, or the survey or booking may have been closed.
                    </Typography>
                    <Button href="/" variant="contained" sx={{ mt: 4, backgroundColor: "var(--muted-blue)" }}>
                        Go home
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
}
