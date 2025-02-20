"use client";

import * as React from "react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppBar, Box, Toolbar, IconButton, Typography, Menu, MenuItem, Button, Tooltip, Avatar, Container } from "@mui/material";
import { useRouter } from "next/navigation";

export default function ResponsiveAppBar() {
    const router = useRouter();
    const { data: session } = useSession();

    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    // ✅ Smooth scrolling function
    const handleScrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <AppBar position="sticky" sx={{ backgroundColor: "var(--soft-beige)", color: "var(--deep-brown)", boxShadow: "none", py: 2 }}>
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ px: 3, display: "flex", justifyContent: "space-between" }}>

                    {/* Logo */}
                    <Typography
                        variant="h5"
                        noWrap
                        sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            letterSpacing: ".2rem",
                            color: "inherit",
                            textDecoration: "none",
                            cursor: "pointer",
                        }}
                        onClick={() => router.push("/")}
                    >
                        Disciple OS
                    </Typography>

                    {/* Section Links (with smooth scrolling) */}
                    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", gap: 4 }}>
                        {[
                            { label: "Home", id: "home" },
                            { label: "About", id: "about" },
                            { label: "Mission", id: "mission" },
                            { label: "Features", id: "features" },
                            { label: "Testimonials", id: "testimonials" },
                        ].map((section) => (
                            <Button
                                key={section.id}
                                onClick={() => handleScrollToSection(section.id)}
                                sx={{
                                    color: "var(--deep-brown)",
                                    fontWeight: 300,
                                    fontSize: "1.1rem",
                                    padding: "12px 20px",
                                    borderRadius: "10px",
                                    transition: "background 0.3s ease",
                                    "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.1)" },
                                }}
                            >
                                {section.label}
                            </Button>
                        ))}
                    </Box>

                    {/* User Profile / Login & Sign Up */}
                    <Box sx={{ flexGrow: 0 }}>
                        {session?.user ? (
                            <Tooltip title="Open settings">
                                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                    <Avatar sx={{ bgcolor: "var(--muted-blue)", color: "var(--light-cream)" }}>
                                        {session.user.email?.charAt(0).toUpperCase() || "U"}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <>
                                <Button onClick={() => router.push("/login")} sx={{ color: "inherit", textDecoration: "none" }}>
                                    Login
                                </Button>
                                <Button onClick={() => router.push("/signup")} sx={{ color: "inherit", textDecoration: "none" }}>
                                    Sign Up
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* User Dropdown */}
                    <Menu
                        sx={{ mt: "45px" }}
                        id="menu-appbar"
                        anchorEl={anchorElUser}
                        anchorOrigin={{ vertical: "top", horizontal: "right" }}
                        keepMounted
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        open={Boolean(anchorElUser)}
                        onClose={handleCloseUserMenu}
                    >
                        <MenuItem onClick={handleLogout}>
                            <Typography sx={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 600 }}>Logout</Typography>
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
