/**
 * Canonical WBRE Category & Code Configuration
 * Single source of truth for all record categories and their 3-letter tracking codes.
 */

export interface CategoryDefinition {
  name: string;
  code: string;
  aliases?: string[];
}

export const OFFICIAL_CATEGORIES: readonly CategoryDefinition[] = [
  {
    name: "Science & Technology",
    code: "TEC",
    aliases: ["Technology & Innovation", "Science & Research", "Technology", "Science"],
  },
  {
    name: "Sports & Endurance",
    code: "SPT",
    aliases: ["Sports & Athletics", "Sports", "Athletics", "Endurance"],
  },
  {
    name: "Education",
    code: "EDU",
    aliases: ["Education & Academics", "Academics"],
  },
  {
    name: "Entrepreneurship",
    code: "BUS",
    aliases: ["Business & Leadership", "Business", "Leadership"],
  },
  {
    name: "Social Impact",
    code: "SOC",
    aliases: ["Social", "Impact"],
  },
  {
    name: "Environment",
    code: "ENV",
    aliases: ["Environment & Sustainability", "Sustainability"],
  },
  {
    name: "Arts & Culture",
    code: "ART",
    aliases: ["Arts", "Culture"],
  },
  {
    name: "Innovation",
    code: "INN",
    aliases: ["Innovative Ventures"],
  },
  {
    name: "Youth Achievement",
    code: "YTH",
    aliases: ["Youth", "Young Achiever"],
  },
  {
    name: "Humanitarian Service",
    code: "HUM",
    aliases: ["Humanitarian & Social", "Humanitarian"],
  },
  {
    name: "Media & Entertainment",
    code: "MED",
    aliases: ["Media", "Entertainment"],
  },
] as const;

const CODE_MAP = new Map<string, string>();

for (const cat of OFFICIAL_CATEGORIES) {
  CODE_MAP.set(cat.name.toLowerCase().trim(), cat.code);
  if (cat.aliases) {
    for (const alias of cat.aliases) {
      CODE_MAP.set(alias.toLowerCase().trim(), cat.code);
    }
  }
}

/**
 * Resolves a 3-letter canonical uppercase category code.
 * Defaults to "REC" (Record) if unmapped.
 */
export function getCategoryCode(category: string | null | undefined): string {
  if (!category) return "REC";
  const normalized = category.toLowerCase().trim();

  if (CODE_MAP.has(normalized)) {
    return CODE_MAP.get(normalized)!;
  }

  // Check substring matches
  for (const [key, code] of CODE_MAP.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }

  // Derive 3 uppercase letters from first word or fallback
  const cleaned = normalized.replace(/[^a-z]/g, "");
  return cleaned.length >= 3 ? cleaned.slice(0, 3).toUpperCase() : "REC";
}
