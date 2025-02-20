"use client";

import * as React from "react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppBar, Box, Toolbar, IconButton, Typography, Menu, MenuItem, Button, Tooltip, Avatar, Container } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
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

    return (
        <AppBar position="static">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Typography
                        variant="h6"
                        noWrap
                        component="a"
                        href="/"
                        sx={{
                            mr: 2,
                            display: { xs: "none", md: "flex" },
                            fontFamily: "monospace",
                            fontWeight: 700,
                            letterSpacing: ".3rem",
                            color: "inherit",
                            textDecoration: "none",
                        }}
                    >
                        Disciple OS
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}>
                        {session?.user ? (
                            // If user is logged in, show avatar with first letter of email
                            <Box sx={{ flexGrow: 0 }}>
                                <Tooltip title="Open settings">
                                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                        <Avatar sx={{ bgcolor: "primary.main" }}>
                                            {session.user.email?.charAt(0).toUpperCase() || "U"}
                                        </Avatar>
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    sx={{ mt: "45px" }}
                                    id="menu-appbar"
                                    anchorEl={anchorElUser}
                                    anchorOrigin={{
                                        vertical: "top",
                                        horizontal: "right",
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                        vertical: "top",
                                        horizontal: "right",
                                    }}
                                    open={Boolean(anchorElUser)}
                                    onClose={handleCloseUserMenu}
                                >
                                    <MenuItem onClick={handleLogout}>
                                        <Typography sx={{ textAlign: "center" }}>Logout</Typography>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        ) : (
                            // If user is logged out, show Login & Sign Up buttons
                            <>
                                <Button onClick={() => router.push("/login")} sx={{ color: "white", mx: 1 }}>
                                    Login
                                </Button>
                                <Button onClick={() => router.push("/signup")} sx={{ color: "white", mx: 1 }}>
                                    Sign Up
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
