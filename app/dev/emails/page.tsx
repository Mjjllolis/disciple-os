import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Box, Button, Chip, Container, Paper, Stack, Typography } from "@mui/material";
import { adminDb } from "@/lib/firebaseAdmin";
import { captureLocally, DEV_EMAILS, type Mail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Local test inbox. Exists only under `npm run dev`: everywhere else it
 * 404s, and lib/email.ts sends real mail instead of storing it.
 */

type StoredMail = Mail & { id: string; from: string; createdAt: string };

async function clearInbox() {
    "use server";
    if (!captureLocally()) return;
    const docs = await adminDb().collection(DEV_EMAILS).listDocuments();
    const batch = adminDb().batch();
    docs.forEach((d) => batch.delete(d));
    await batch.commit();
    revalidatePath("/dev/emails");
}

/** Renders URLs in a plain-text body as links. */
function Linkified({ text }: { text: string }) {
    return (
        <>
            {text.split(/(https?:\/\/\S+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                    <Box
                        key={i}
                        component="a"
                        href={part}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ color: "var(--brand)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                        {part}
                    </Box>
                ) : (
                    part
                )
            )}
        </>
    );
}

export default async function DevEmailsPage() {
    if (!captureLocally()) notFound();

    const snap = await adminDb().collection(DEV_EMAILS).orderBy("createdAt", "desc").limit(100).get();
    const mails = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StoredMail);

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="md">
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2}>
                    <Box>
                        <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                            Local only
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                            Test inbox
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "var(--ink-2)" }}>
                            Every email the app sends while running on the emulators lands here instead of a real inbox.
                        </Typography>
                    </Box>
                    {mails.length > 0 && (
                        <form action={clearInbox}>
                            <Button type="submit" variant="outlined" sx={{ color: "var(--ink)" }}>
                                Clear
                            </Button>
                        </form>
                    )}
                </Stack>

                {mails.length === 0 ? (
                    <Paper variant="outlined" sx={{ mt: 4, p: 6, borderRadius: 4, textAlign: "center", borderStyle: "dashed", backgroundColor: "transparent" }}>
                        <Typography variant="h5">No emails yet</Typography>
                        <Typography sx={{ mt: 1, color: "var(--ink-2)" }}>
                            Try &ldquo;Forgot password?&rdquo; on the sign-in page, invite someone from Settings, or book a visit.
                        </Typography>
                    </Paper>
                ) : (
                    <Stack gap={2} sx={{ mt: 4 }}>
                        {mails.map((m) => (
                            <Paper key={m.id} variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                                <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                                    <Typography variant="h6">{m.subject}</Typography>
                                    <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                                        {new Date(m.createdAt).toLocaleString()}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
                                    <Chip size="small" label={`To: ${m.to}`} />
                                    <Chip size="small" variant="outlined" label={`From: ${m.from}`} />
                                </Stack>
                                <Typography
                                    component="div"
                                    sx={{ mt: 2, whiteSpace: "pre-wrap", color: "var(--ink)", fontSize: "0.95rem", lineHeight: 1.6 }}
                                >
                                    <Linkified text={m.body} />
                                </Typography>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}
