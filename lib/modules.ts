import { sizeMultiplier } from "./churchProfile";
import type { Church, ModuleEntitlements, ModuleId } from "./types";

export interface ModuleDef {
    id: ModuleId;
    name: string;
    blurb: string;
    /** Route the church lands on when they open the module. */
    href: string;
    /**
     * Included for every church without an admin switching it on. Survey
     * analytics is the core product; the rest are add-ons that get sold.
     */
    includedByDefault: boolean;
    /** How this module bills, shown verbatim on the pricing and billing pages. */
    pricing: { unit: string; credits: number };
}

export const MODULES: Record<ModuleId, ModuleDef> = {
    survey_analytics: {
        id: "survey_analytics",
        name: "Survey Analytics",
        blurb: "Digital surveys, anonymous responses, AI theme clustering, and charts.",
        href: "/dashboard",
        includedByDefault: true,
        pricing: { unit: "response analyzed", credits: 1 },
    },
    sermon_builder: {
        id: "sermon_builder",
        name: "Sermon Builder",
        blurb: "Turn survey themes into sermon outlines and multi-week series.",
        href: "/dashboard/sermons",
        includedByDefault: false,
        pricing: { unit: "sermon generated", credits: 25 },
    },
    image_studio: {
        id: "image_studio",
        name: "Image Studio",
        blurb: "Series art, sermon slides, and social graphics generated on demand.",
        href: "/dashboard/images",
        includedByDefault: false,
        pricing: { unit: "image generated", credits: 40 },
    },
    tours: {
        id: "tours",
        name: "Tours & Visits",
        blurb: "Guest visit booking and multi-stop mission trip planning.",
        href: "/dashboard/tours",
        includedByDefault: false,
        pricing: { unit: "included", credits: 0 },
    },
};

export const MODULE_LIST: ModuleDef[] = Object.values(MODULES);

/** Credits charged for one job of a given module. */
export const PRICING = {
    survey_analytics: { perResponse: 1, minimum: 1 },
    /** A series costs per-week; a standalone sermon is one week. */
    sermon_builder: { perSermon: 25, perDeck: 15 },
    image_studio: { perImage: 40 },
    tours: { flat: 0 },
} as const;

export function priceSurveyAnalysis(responseCount: number): number {
    return Math.max(PRICING.survey_analytics.minimum, responseCount * PRICING.survey_analytics.perResponse);
}

type Sized = Pick<Church, "sizeTier"> | null | undefined;

/** Sermons and images cost more for larger churches (see SIZE_TIERS). */
export function priceSermons(count: number, church?: Sized): number {
    return Math.max(1, count) * Math.ceil(PRICING.sermon_builder.perSermon * sizeMultiplier(church));
}

/** A full slide deck for one sermon; previewing styles is free. */
export function priceSlides(church?: Sized): number {
    return Math.ceil(PRICING.sermon_builder.perDeck * sizeMultiplier(church));
}

export function priceImages(count: number, church?: Sized): number {
    return Math.max(1, count) * Math.ceil(PRICING.image_studio.perImage * sizeMultiplier(church));
}

/** Credits per unit of a module for this church, for display. Analysis isn't size-scaled. */
export function unitPrice(moduleId: ModuleId, church?: Sized): number {
    if (moduleId === "sermon_builder") return priceSermons(1, church);
    if (moduleId === "image_studio") return priceImages(1, church);
    return MODULES[moduleId].pricing.credits;
}

/** True when the church may use the module right now. */
export function hasModule(entitlements: ModuleEntitlements | undefined, moduleId: ModuleId): boolean {
    const def = MODULES[moduleId];
    if (!def) return false;
    const entry = entitlements?.[moduleId];
    if (entry) return entry.enabled;
    return def.includedByDefault;
}

/** The full on/off picture for a church, including defaults. */
export function resolveEntitlements(entitlements: ModuleEntitlements | undefined) {
    return MODULE_LIST.map((def) => ({
        ...def,
        enabled: hasModule(entitlements, def.id),
        explicit: Boolean(entitlements?.[def.id]),
        note: entitlements?.[def.id]?.note ?? "",
    }));
}
