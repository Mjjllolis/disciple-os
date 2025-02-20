"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Typography, Avatar, Stack, Grid, Card, CardContent, Container } from "@mui/material";
import { motion } from "framer-motion";
import Footer from "./components/Footer";

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      {/* Hero Section */}
      <Box
        id="home"
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        sx={{
          position: "relative",
          width: "100vw",
          minHeight: "100vh",
          background: `linear-gradient(135deg, rgba(89, 89, 87, 0.8), rgba(30, 30, 30, 0.9)), url('/Worship.jpg') center/cover no-repeat`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "var(--light-cream)",
          overflow: "hidden",
          py: 8, // Padding for spacing
        }}
      >
        <Avatar
          src="/Worship.jpg"
          alt="Disciple OS"
          sx={{
            width: 150,
            height: 150,
            mx: "auto",
            mb: 3,
            borderRadius: "20%",
            border: "4px solid var(--soft-beige)",
          }}
        />
        <Typography variant="h3" fontWeight={900}>
          Empower Churches with Disciple OS
        </Typography>
        <Typography variant="h6" sx={{ maxWidth: 700, mx: "auto", lineHeight: 1.6 }}>
          A platform designed to help churches grow, engage, and manage their communities effortlessly.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button variant="contained" size="large" sx={{ borderRadius: "30px", px: 4, bgcolor: "var(--muted-blue)", color: "#fff" }} onClick={() => router.push("/signup")}>
            Get Started
          </Button>
          <Button variant="outlined" size="large" sx={{ borderRadius: "30px", px: 4, color: "var(--light-cream)", borderColor: "var(--light-cream)" }} onClick={() => router.push("/login")}>
            Login
          </Button>
        </Stack>
      </Box>

      {/* About Us Section */}
      <Box id="about" sx={{ width: "100vw", backgroundColor: "var(--light-cream)", py: 10, px: 3, position: "relative", overflow: "hidden" }}>
        {/* Background Image */}
        <Box
          component="img"
          src="/About.jpg"
          alt="About Us"
          sx={{
            width: "100%",
            height: "400px",
            objectFit: "cover",
            display: "block",
            filter: "brightness(0.9)",
          }}
        />

        {/* Gradient Overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: "linear-gradient(to right, var(--light-cream) 0%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 0) 100%)",
          }}
        />

        {/* Text Box Overlay */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "5%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            padding: "24px",
            maxWidth: "40%",
            borderRadius: "12px",
            boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.15)",
            zIndex: 2,
          }}
        >
          <Typography variant="h4" fontWeight={700} color="var(--deep-brown)" gutterBottom>
            About Us
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, color: "var(--dark-gray)", lineHeight: 1.6 }}>
            <span style={{ color: "var(--muted-blue)", fontWeight: 600 }}>Disciple OS</span> is a technology-driven platform
            dedicated to <strong>empowering churches</strong>. Our mission is to provide <strong>innovative tools </strong>
            that enhance <strong>community engagement</strong>, <strong>discipleship</strong>, and <strong>seamless
              church management</strong>.
          </Typography>
        </Box>
      </Box>

      {/* Mission Section */}
      <Box id="mission" sx={{ width: "100vw", py: 10, px: 3, background: `linear-gradient(135deg, var(--deep-brown), var(--dark-gray))`, color: "var(--light-cream)", textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight={700}>
            Our Mission
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, maxWidth: 800, mx: "auto" }}>
            Our mission is to equip churches with technology that fosters **spiritual growth**, **community building**, and **outreach impact**.
            We believe technology should serve the **body of Christ** in meaningful ways.
          </Typography>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" sx={{ width: "100vw", padding: "75px", py: 4, textAlign: "center", backgroundColor: "var(--light-cream)" }}>
        {/* <Typography variant="h4" fontWeight={700} gutterBottom color="var(--deep-brown)">
          Why Choose Disciple OS?
        </Typography> */}
        <Grid container spacing={6} justifyContent="center">
          {[
            { img: "/Computer.jpg", title: "Effortless Usability", description: "Simple and intuitive experience—no technical skills required." },
            { img: "/Chart.jpg", title: "Powerful Management", description: "Track attendance, donations, and activities in one dashboard." },
            { img: "/Grow.jpg", title: "Encourage Growth", description: "Tools to engage, disciple, and expand your church community." },
          ].map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ textAlign: "center", borderRadius: 6, boxShadow: 4, overflow: "hidden", backgroundColor: "var(--light-cream)" }}>
                <img src={feature.img} alt={feature.title} style={{ width: "100%", height: "400px", objectFit: "cover" }} />
                <CardContent>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 2, color: "var(--deep-brown)" }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, color: "var(--deep-brown)" }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Testimonials Section */}
      <Box id="testimonials" sx={{ width: "100vw", py: 10, px: 3, background: `linear-gradient(135deg, var(--dark-gray), var(--deep-brown))`, color: "#fff", textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight={700} gutterBottom>
            What Others Are Saying
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, maxWidth: 700, mx: "auto" }}>
            "Disciple OS transformed the way our church engages with members!"
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} mt={1}>
            - A Happy User
          </Typography>
        </Container>
      </Box>
    </>
  );
}
