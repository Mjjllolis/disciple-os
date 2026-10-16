import type { SlideMotif, SlideStyle } from "./types";

/**
 * The artwork behind a slide, as one SVG (1600×900): gradient, motif, and
 * optional grain. The same markup is the CSS background in the app and is
 * rasterised into the PowerPoint, so both look identical.
 *
 * `variant` mirrors the motif on alternate slides so a deck doesn't repeat
 * one picture sixteen times.
 */
export const SLIDE_MOTIFS: SlideMotif[] = ["rays", "arch", "horizon", "frame", "contours", "constellation", "cross", "split"];

/** Fraction of the width the split layout's colour panel takes. */
export const SPLIT_PANEL = 0.36;

const W = 1600;
const H = 900;

function motifShapes(style: SlideStyle, variant: number): string {
    const a = style.accent;
    const g = style.accent2;
    switch (style.motif) {
        case "rays": {
            // Shafts of light from the top corner.
            const rays = [0, 1, 2, 3, 4, 5]
                .map((i) => {
                    const spread = 140 + i * 170;
                    return `<polygon points="${W + 40},-60 ${W - spread - 120},${H + 60} ${W - spread + 60},${H + 60}" fill="${g}" opacity="${0.05 + (i % 2) * 0.04}"/>`;
                })
                .join("");
            return `<radialGradient id="glow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${g}" stop-opacity=".45"/><stop offset="1" stop-color="${g}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#glow)"/>${rays}`;
        }
        case "arch": {
            // A pointed cathedral arch framing the text, drawn twice for depth.
            const arch = (inset: number, op: number) =>
                `<path d="M${260 + inset},${H + 20} L${260 + inset},420 Q${260 + inset},${110 + inset} ${W / 2},${60 + inset} Q${W - 260 - inset},${110 + inset} ${W - 260 - inset},420 L${W - 260 - inset},${H + 20}" fill="none" stroke="${a}" stroke-width="${inset ? 2 : 4}" opacity="${op}"/>`;
            return `<radialGradient id="glow" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="${g}" stop-opacity=".22"/><stop offset="1" stop-color="${g}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#glow)"/>${arch(0, 0.45)}${arch(26, 0.25)}`;
        }
        case "horizon": {
            // A rising sun on the horizon with soft rings.
            const cx = variant ? W * 0.72 : W * 0.28;
            const rings = [210, 300, 400, 520]
                .map((r, i) => `<circle cx="${cx}" cy="${H - 40}" r="${r}" fill="none" stroke="${a}" stroke-width="2" opacity="${0.3 - i * 0.06}"/>`)
                .join("");
            return `<circle cx="${cx}" cy="${H - 40}" r="150" fill="${g}" opacity=".55"/>${rings}<rect y="${H - 40}" width="${W}" height="40" fill="${style.backgroundEnd}"/><line x1="0" y1="${H - 40}" x2="${W}" y2="${H - 40}" stroke="${a}" stroke-width="2" opacity=".5"/>`;
        }
        case "frame": {
            // An inset double border with diamond corners.
            const d = (x: number, y: number) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" transform="rotate(45 ${x} ${y})" fill="${a}"/>`;
            return `<rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="${a}" stroke-width="3" opacity=".7"/><rect x="76" y="76" width="${W - 152}" height="${H - 152}" fill="none" stroke="${a}" stroke-width="1.5" opacity=".4"/>${d(56, 56)}${d(W - 56, 56)}${d(56, H - 56)}${d(W - 56, H - 56)}`;
        }
        case "contours": {
            // Flowing lines across the lower third.
            const lines = Array.from({ length: 9 }, (_, i) => {
                const y = 560 + i * 34;
                const amp = 60 + i * 6;
                const flip = variant ? -1 : 1;
                return `<path d="M-50,${y} C 400,${y - amp * flip} 800,${y + amp * flip} 1200,${y - amp * 0.4 * flip} S 1700,${y + amp * flip} 1700,${y}" fill="none" stroke="${i % 3 === 0 ? g : a}" stroke-width="${i % 3 === 0 ? 3 : 1.5}" opacity="${0.18 + (i % 3 === 0 ? 0.15 : 0)}"/>`;
            }).join("");
            return lines;
        }
        case "constellation": {
            // A scatter of stars joined by faint lines, on one side.
            const pts = [
                [1180, 140], [1320, 220], [1460, 160], [1400, 340], [1250, 420], [1500, 480], [1340, 600], [1470, 720], [1200, 760],
            ].map(([x, y]) => [variant ? W - x : x, y]);
            const links = pts.slice(1).map((p, i) => `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${p[0]}" y2="${p[1]}" stroke="${a}" stroke-width="1.5" opacity=".35"/>`).join("");
            const stars = pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 7 : 4}" fill="${i % 3 === 0 ? g : a}" opacity=".9"/>`).join("");
            const dust = Array.from({ length: 40 }, (_, i) => {
                const x = (i * 397) % W;
                const y = (i * 211) % H;
                return `<circle cx="${x}" cy="${y}" r="${(i % 3) + 1}" fill="${a}" opacity=".18"/>`;
            }).join("");
            return dust + links + stars;
        }
        case "cross": {
            // A large, quiet cross to one side.
            const x = variant ? 300 : W - 300;
            return `<rect x="${x - 26}" y="90" width="52" height="${H - 140}" rx="4" fill="${g}" opacity=".16"/><rect x="${x - 190}" y="270" width="380" height="52" rx="4" fill="${g}" opacity=".16"/><rect x="${x - 26}" y="90" width="52" height="${H - 140}" rx="4" fill="none" stroke="${a}" stroke-width="2" opacity=".35"/><rect x="${x - 190}" y="270" width="380" height="52" rx="4" fill="none" stroke="${a}" stroke-width="2" opacity=".35"/>`;
        }
        case "split": {
            // A solid colour panel on the left with an accent edge.
            const pw = W * SPLIT_PANEL;
            return `<rect width="${pw}" height="${H}" fill="${style.backgroundEnd}"/><rect x="${pw - 6}" width="6" height="${H}" fill="${a}"/><circle cx="${pw * 0.5}" cy="${H * 0.5}" r="${pw * 0.32}" fill="none" stroke="${g}" stroke-width="2" opacity=".4"/>`;
        }
        default:
            return "";
    }
}

export function slideBackgroundSvg(style: SlideStyle, variant = 0): string {
    const grain = style.texture
        ? `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="${W}" height="${H}" filter="url(#grain)" opacity=".18"/>`
        : "";
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` +
        `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${style.background}"/><stop offset="1" stop-color="${style.backgroundEnd}"/></linearGradient></defs>` +
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>${motifShapes(style, variant)}${grain}</svg>`
    );
}

export function slideBackgroundUrl(style: SlideStyle, variant = 0): string {
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(slideBackgroundSvg(style, variant))}")`;
}
