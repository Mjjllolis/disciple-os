import { slideBackgroundSvg, SPLIT_PANEL } from "./slideArt";
import { withDefaults } from "./slideStyles";
import type { Slide, SlideStyle } from "./types";

/** Rasterises a slide's SVG artwork to a PNG data URL (1920×1080) in the browser. */
async function artworkPng(style: SlideStyle, variant: number): Promise<string> {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(slideBackgroundSvg(style, variant))}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 1920, 1080);
    return canvas.toDataURL("image/png");
}

/**
 * Exports a deck to PowerPoint in the browser. Mirrors SlideView: the slide is
 * 13.33in wide (960pt), so 1cqw there is 9.6pt here. The artwork (gradient,
 * motif, grain) becomes a picture background; the text stays editable on top.
 */
export async function downloadPptx(title: string, slides: Slide[], raw: SlideStyle): Promise<void> {
    const style = withDefaults(raw);
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = title;

    const hex = (c: string) => c.replace("#", "");
    const pt = (cqw: number) => Math.round(cqw * 9.6);
    const align = style.layout === "centered" ? "center" : "left";
    const split = style.motif === "split";
    const upper = (t: string) => (style.headingCase === "upper" ? t.toUpperCase() : t);
    // Two artworks (plain and mirrored), rendered once and reused.
    const art = await Promise.all([artworkPng(style, 0), artworkPng(style, 1)]);

    type Run = { text: string; options: Record<string, unknown> };
    const run = (text: string, size: number, opts: Record<string, unknown> = {}): Run => ({
        text,
        options: {
            fontFace: style.bodyFont,
            fontSize: pt(size),
            color: hex(style.text),
            breakLine: true,
            paraSpaceAfter: 10,
            ...opts,
        },
    });
    const head = (text: string, size: number, opts: Record<string, unknown> = {}) =>
        run(upper(text), size, { fontFace: style.headingFont, bold: true, ...opts });
    const label = (text: string) => run(text.toUpperCase(), 1.6, { bold: true, color: hex(style.accent), charSpacing: 3 });

    for (const [i, s] of slides.entries()) {
        const runs: Run[] = [];
        switch (s.kind) {
            case "title":
                runs.push(head(s.heading ?? "", 6.4));
                if (s.body) runs.push(run(s.body, 2.3, { color: hex(style.muted) }));
                break;
            case "big_idea":
                runs.push(label("The big idea"), head(s.body ?? "", 4.6, { bold: false, italic: true }));
                break;
            case "scripture":
                runs.push(head(`“${s.body ?? ""}”`, 3.5, { bold: false, italic: true }));
                if (s.reference) runs.push(label(s.reference));
                break;
            case "point":
                runs.push(head(String(s.number ?? ""), 9, { bold: false, italic: true, color: hex(style.accent) }));
                runs.push(head(s.heading ?? "", 5));
                if (s.body) runs.push(run(s.body, 2.4, { color: hex(style.muted) }));
                break;
            case "list":
                runs.push(head(s.heading ?? "", 4.6));
                for (const b of s.bullets ?? []) runs.push(run(b, 2.6, { bullet: { indent: 18 }, align: "left" }));
                break;
            case "closing":
                runs.push(head(s.heading ?? "", 4.6));
                if (s.body) runs.push(run(s.body, 2.8, { fontFace: style.headingFont, italic: true, color: hex(style.muted) }));
                break;
            default:
                runs.push(head(s.body ?? s.heading ?? "", 5.2, { bold: false }));
        }

        const slide = pptx.addSlide();
        // pptxgenjs wants the data URL without its "data:" prefix.
        slide.background = { data: art[i % 2].replace(/^data:/, "") };
        const x = split ? 13.33 * SPLIT_PANEL + 0.8 : 0.9;
        slide.addText(runs, { x, y: 0.6, w: 13.33 - x - 0.9, h: 6.3, align, valign: "middle", margin: 0 });
    }

    const safe = title.replace(/[^\w\s-]/g, "").trim().slice(0, 60) || "sermon";
    await pptx.writeFile({ fileName: `${safe} slides.pptx` });
}
