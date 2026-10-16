import data from "./slideStyleLibrary.json";
import type { SlideStyle } from "./types";

/**
 * 100 ready-made slide styles, generated once by scripts/generate-slide-styles.ts
 * (re-run it to refresh). Browsing them costs nothing; any can be recoloured.
 */
export type LibraryStyle = SlideStyle & { category: string };

export const STYLE_LIBRARY = data as LibraryStyle[];

export const LIBRARY_CATEGORIES = [...new Set(STYLE_LIBRARY.map((s) => s.category))];
