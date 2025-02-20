"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Container, Grid, Typography, Avatar, Card, CardContent, Stack } from "@mui/material";

export default function HomePage() {
  const router = useRouter();

  return (
    <Container maxWidth="lg" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", py: 6 }}>

      {/* Hero Section */}
      <Box sx={{ width: "100%", maxWidth: 900, textAlign: "center", mb: 8 }}>
        <Avatar src="/Worship.jpg" alt="Disciple OS" sx={{ width: 150, height: 150, mx: "auto", mb: 3, borderRadius: "50%" }} />
        <Typography variant="h3" fontWeight={900} color="primary.dark" gutterBottom>
          Empower Churches with Disciple OS
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: "auto", lineHeight: 1.6 }}>
          A platform designed to help churches grow, engage, and manage their communities effortlessly.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button variant="contained" color="primary" size="large" sx={{ borderRadius: "50px" }} onClick={() => router.push("/signup")}>
            Get Started
          </Button>
          <Button variant="outlined" color="primary" size="large" sx={{ borderRadius: "50px" }} onClick={() => router.push("/login")}>
            Login
          </Button>
        </Stack>
      </Box>

      {/* Feature Section */}
      <Grid container spacing={4} justifyContent="center">
        {[1, 2, 3].map((index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ p: 3, textAlign: "center", backgroundColor: "#F7F9FC", borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h5" color="primary.dark">
                  Feature {index}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Brief description about this feature. You can edit this section.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Testimonials Section */}
      <Box sx={{ width: "100%", backgroundColor: "#EAF2F8", py: 6, borderRadius: 3, mt: 8, textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography variant="h4" color="primary.dark" gutterBottom>
            What Others Are Saying
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: "auto" }}>
            "Disciple OS transformed the way our church engages with members!"
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} mt={1}>
            - A Happy User
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: "center", py: 3, mt: 5, color: "text.secondary", fontSize: "0.9rem" }}>
        &copy; {new Date().getFullYear()} Disciple OS. All rights reserved.
      </Box>
    </Container>
  );
}
