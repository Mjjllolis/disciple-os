import { Box, Container, Typography } from "@mui/material";

export default function Footer() {
    return (
        <Box component="footer" className="footer">
            <Container maxWidth="lg">
                <Typography variant="body2" className="footer-text">
                    &copy; {new Date().getFullYear()} Disciple OS. All rights reserved.
                </Typography>
            </Container>
        </Box>
    );
}
