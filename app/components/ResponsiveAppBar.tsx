"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import { usePathname, useRouter } from "next/navigation";
import { useChurch } from "./ChurchProvider";
import Logo from "./Logo";
import { hideChrome } from "./chrome";

const MARKETING_SECTIONS = [
    { label: "How it works", id: "how-it-works" },
    { label: "Modules", id: "modules" },
    { label: "Pricing", id: "pricing" },
    { label: "Mission", id: "mission" },
];

export default function ResponsiveAppBar() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const { modules, church } = useChurch();
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // The tab a click is heading to, highlighted straight away rather than
    // after the next page has loaded. Cleared once the route actually changes.
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    useEffect(() => setPendingHref(null), [pathname]);

    if (hideChrome(pathname)) return null;

    const onMarketingPage = pathname === "/" || pathname === "/pricing";
    const isAdmin = session?.user?.role === "super_admin";

    const go = (href: string) => {
        setPendingHref(href);
        setDrawerOpen(false);
        setAnchorElUser(null);
        router.push(href);
    };

    const handleLogout = async () => {
        setAnchorElUser(null);
        await signOut({ redirect: false });
        router.push("/login");
    };

    // Locked modules stay visible so churches can see what they could add.
    const appLinks = [
        { label: "Surveys", href: "/dashboard", locked: false },
        ...(modules ?? [])
            .filter((m) => m.id !== "survey_analytics")
            .map((m) => ({ label: m.name, href: m.href, locked: !m.enabled })),
        { label: "Credits", href: "/dashboard/billing", locked: false },
        { label: "Settings", href: "/dashboard/settings", locked: false },
    ];

    // "/dashboard" only counts as active for itself and the survey pages under it.
    const isActive = (href: string) => {
        const current = pendingHref ?? pathname;
        return href === "/dashboard"
            ? current === "/dashboard" || Boolean(current?.startsWith("/dashboard/surveys"))
            : Boolean(current?.startsWith(href));
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                backgroundColor: "rgba(250, 248, 245, 0.82)",
                backdropFilter: "saturate(180%) blur(12px)",
                color: "var(--ink)",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 1 }}>
                    {session?.user && !onMarketingPage && (
                        <IconButton
                            onClick={() => setDrawerOpen(true)}
                            sx={{ display: { xs: "inline-flex", md: "none" }, color: "var(--ink)" }}
                            aria-label="Open menu"
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Logo href={session?.user ? "/dashboard" : "/"} />

                    <Box
                        component="nav"
                        sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, justifyContent: "center", gap: 0.5 }}
                    >
                        {onMarketingPage
                            ? MARKETING_SECTIONS.map((s) => (
                                  <Button
                                      key={s.id}
                                      onClick={() =>
                                          pathname === "/"
                                              ? document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })
                                              : router.push(`/#${s.id}`)
                                      }
                                      sx={navBtn(false)}
                                  >
                                      {s.label}
                                  </Button>
                              ))
                            : session?.user &&
                              appLinks.map((l) => (
                                  <Button
                                      key={l.href}
                                      component={Link}
                                      href={l.href}
                                      onClick={() => setPendingHref(l.href)}
                                      sx={{ ...navBtn(isActive(l.href)), opacity: l.locked ? 0.55 : 1 }}
                                      endIcon={l.locked ? <LockOutlinedIcon sx={{ fontSize: "14px !important" }} /> : undefined}
                                  >
                                      {l.label}
                                  </Button>
                              ))}
                    </Box>

                    <Box sx={{ flexShrink: 0, ml: "auto", display: "flex", alignItems: "center", gap: 1.25 }}>
                        {session?.user && church && (
                            <Button
                                onClick={() => go("/dashboard/billing")}
                                startIcon={<TollOutlinedIcon sx={{ color: "var(--gold)" }} />}
                                sx={{
                                    display: { xs: "none", sm: "inline-flex" },
                                    color: "var(--ink)",
                                    backgroundColor: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    fontWeight: 600,
                                    py: 0.5,
                                    "&:hover": { backgroundColor: "var(--surface-muted)" },
                                }}
                            >
                                {church.credits.toLocaleString()}
                            </Button>
                        )}
                        {session?.user ? (
                            <IconButton
                                onClick={(e) => setAnchorElUser(e.currentTarget)}
                                sx={{ p: 0.25, border: "1px solid var(--border)" }}
                                aria-label="Account menu"
                            >
                                <Avatar sx={{ bgcolor: "var(--brand)", color: "#fff", width: 34, height: 34, fontSize: "0.95rem", fontWeight: 600 }}>
                                    {session.user.email?.charAt(0).toUpperCase() || "U"}
                                </Avatar>
                            </IconButton>
                        ) : (
                            <>
                                <Button onClick={() => go("/login")} sx={{ color: "var(--ink)", display: { xs: "none", sm: "inline-flex" } }}>
                                    Sign in
                                </Button>
                                <Button
                                    onClick={() => go("/signup")}
                                    variant="contained"
                                    sx={{ backgroundColor: "var(--ink)", "&:hover": { backgroundColor: "var(--ink-hover)" } }}
                                >
                                    Get started
                                </Button>
                            </>
                        )}
                    </Box>

                    <Menu
                        anchorEl={anchorElUser}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        open={Boolean(anchorElUser)}
                        onClose={() => setAnchorElUser(null)}
                        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
                    >
                        <Box sx={{ px: 2, py: 1.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {session?.user?.email}
                            </Typography>
                            {church && (
                                <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                                    {church.name}
                                </Typography>
                            )}
                        </Box>
                        <Divider />
                        <MenuItem onClick={() => go("/dashboard")}>Dashboard</MenuItem>
                        <MenuItem onClick={() => go("/dashboard/settings")}>Settings &amp; team</MenuItem>
                        <MenuItem onClick={() => go("/dashboard/billing")}>Credits</MenuItem>
                        {isAdmin && <MenuItem onClick={() => go("/admin")}>Platform admin</MenuItem>}
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ color: "var(--ink-2)" }}>
                            Sign out
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </Container>

            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 280, pt: 2.5 }} role="presentation">
                    <Box sx={{ px: 2.5, pb: 2 }}>
                        <Logo href="/dashboard" />
                        {church && (
                            <Typography variant="body2" sx={{ mt: 1.5, color: "var(--ink-2)" }}>
                                {church.name}
                            </Typography>
                        )}
                    </Box>
                    <Divider />
                    <List sx={{ px: 1 }}>
                        {appLinks.map((l) => (
                            <ListItemButton
                                key={l.href}
                                onClick={() => go(l.href)}
                                selected={isActive(l.href)}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemText
                                    primary={l.label}
                                    secondary={l.locked ? "Not enabled" : undefined}
                                    sx={{ opacity: l.locked ? 0.6 : 1 }}
                                />
                            </ListItemButton>
                        ))}
                        {isAdmin && (
                            <ListItemButton onClick={() => go("/admin")} sx={{ borderRadius: 2 }}>
                                <ListItemText primary="Platform admin" />
                            </ListItemButton>
                        )}
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
}

const navBtn = (active: boolean) =>
    ({
        color: active ? "var(--ink)" : "var(--ink-2)",
        backgroundColor: active ? "var(--surface-muted)" : "transparent",
        fontWeight: active ? 600 : 500,
        fontSize: "0.92rem",
        px: 1.75,
        "&:hover": { backgroundColor: "var(--surface-muted)", color: "var(--ink)" },
    }) as const;
