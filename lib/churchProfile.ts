import type { Church } from "./types";

/**
 * Suggestions for the denomination field, grouped by tradition. Each group
 * leads with its general name ("Baptist") before the specific bodies. The
 * field also accepts anything typed, so the list never has to be complete.
 */
export const DENOMINATION_GROUPS: { group: string; options: string[] }[] = [
    {
        group: "Baptist",
        options: ["Baptist", "Southern Baptist", "Independent Baptist", "American Baptist", "Missionary Baptist", "Free Will Baptist"],
    },
    {
        group: "Non-denominational & Evangelical",
        options: ["Non-denominational", "Evangelical", "Evangelical Free", "Bible Church", "Christian & Missionary Alliance", "Evangelical Covenant"],
    },
    {
        group: "Pentecostal & Charismatic",
        options: ["Pentecostal", "Charismatic", "Assemblies of God", "Church of God (Cleveland)", "Church of God in Christ", "Foursquare", "Vineyard"],
    },
    {
        group: "Methodist & Holiness",
        options: ["Methodist", "Holiness", "United Methodist", "Global Methodist", "African Methodist Episcopal", "Wesleyan", "Nazarene", "Free Methodist"],
    },
    {
        group: "Reformed & Presbyterian",
        options: ["Presbyterian", "Reformed", "PCA", "PC(USA)", "EPC", "Christian Reformed", "Reformed Church in America"],
    },
    {
        group: "Lutheran & Anglican",
        options: ["Lutheran", "Anglican", "Lutheran (LCMS)", "Lutheran (ELCA)", "Anglican (ACNA)", "Episcopal"],
    },
    {
        group: "Other traditions",
        options: ["Church of Christ", "Christian Church / Disciples", "Mennonite", "Seventh-day Adventist", "Catholic", "Orthodox"],
    },
];

/** Flat list for the autocomplete, each option tagged with its group. */
export const DENOMINATION_OPTIONS = DENOMINATION_GROUPS.flatMap((g) =>
    g.options.map((name) => ({ name, group: g.group }))
);

/**
 * Average weekly attendance, as categories. Larger churches pay more per item
 * for flat-priced AI work (sermons, images); survey analysis is not
 * multiplied, because it already scales with the number of responses.
 */
export interface SizeTier {
    id: string;
    label: string;
    multiplier: number;
}

export const SIZE_TIERS: SizeTier[] = [
    { id: "under_100", label: "Under 100", multiplier: 1 },
    { id: "100_249", label: "100–249", multiplier: 1.5 },
    { id: "250_499", label: "250–499", multiplier: 2 },
    { id: "500_999", label: "500–999", multiplier: 3 },
    { id: "1000_1999", label: "1,000–1,999", multiplier: 4 },
    { id: "2000_plus", label: "2,000+", multiplier: 5 },
];

export function sizeTier(church: Pick<Church, "sizeTier"> | null | undefined): SizeTier | undefined {
    return SIZE_TIERS.find((t) => t.id === church?.sizeTier);
}

/** A church that hasn't picked a size is priced as the smallest tier. */
export function sizeMultiplier(church: Pick<Church, "sizeTier"> | null | undefined): number {
    return sizeTier(church)?.multiplier ?? 1;
}
