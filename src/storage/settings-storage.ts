// src/storage/settings-storage.ts
// Handles all chrome.storage.local operations for Picnapped settings

export type ReplacementMode = "default" | "custom" | "random" | "site-specific";
export type ImageFit = "cover" | "contain" | "fill";

export interface WebsiteRule {
  id: string;
  hostname: string;
  imageId: string;
  imageName: string;
  mode: ReplacementMode;
  enabled: boolean;
  createdAt: number;
}

export interface PicnappedSettings {
  enabled: boolean;
  mode: ReplacementMode;
  activeImageId: string | null;
  activeImageUrl: string | null;
  activeImageName: string;
  collectionImageIds: string[];
  websiteRules: WebsiteRule[];
  exclusionList: string[];
  websiteAccessMode: "all" | "selected";
  selectedWebsites: string[];
  // Image replacement options
  replaceAllImages: boolean;
  replaceAvatars: boolean;
  replaceLogos: boolean;
  replaceThumbnails: boolean;
  replaceCssBackgrounds: boolean;
  // Display options
  imageFit: ImageFit;
  preserveAspectRatio: boolean;
  // Performance
  reducedAnimations: boolean;
  // State
  version: string;
}

const DEFAULT_SETTINGS: PicnappedSettings = {
  enabled: false,
  mode: "default",
  activeImageId: "__default_tung__",
  activeImageUrl: null,
  activeImageName: "Tung Tung Sahoor",
  collectionImageIds: ["__default_tung__", "__default_cat__"],
  websiteRules: [],
  exclusionList: [],
  websiteAccessMode: "all",
  selectedWebsites: [],
  replaceAllImages: true,
  replaceAvatars: true,
  replaceLogos: false,
  replaceThumbnails: true,
  replaceCssBackgrounds: false,
  imageFit: "cover",
  preserveAspectRatio: false,
  reducedAnimations: false,
  version: "1.0.0",
};

const STORAGE_KEY = "picnapped_settings";

export async function getSettings(): Promise<PicnappedSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("[Picnapped] Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<PicnappedSettings>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  } catch (error) {
    console.error("[Picnapped] Error saving settings:", error);
    throw error;
  }
}

export async function resetSettings(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  } catch (error) {
    console.error("[Picnapped] Error resetting settings:", error);
    throw error;
  }
}

export async function addWebsiteRule(rule: Omit<WebsiteRule, "id" | "createdAt">): Promise<WebsiteRule> {
  const settings = await getSettings();
  const newRule: WebsiteRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  settings.websiteRules = [...settings.websiteRules, newRule];
  await saveSettings({ websiteRules: settings.websiteRules });
  return newRule;
}

export async function updateWebsiteRule(id: string, updates: Partial<WebsiteRule>): Promise<void> {
  const settings = await getSettings();
  settings.websiteRules = settings.websiteRules.map((r) =>
    r.id === id ? { ...r, ...updates } : r
  );
  await saveSettings({ websiteRules: settings.websiteRules });
}

export async function deleteWebsiteRule(id: string): Promise<void> {
  const settings = await getSettings();
  settings.websiteRules = settings.websiteRules.filter((r) => r.id !== id);
  await saveSettings({ websiteRules: settings.websiteRules });
}

export async function exportSettings(): Promise<string> {
  const settings = await getSettings();
  return JSON.stringify(settings, null, 2);
}

export async function importSettings(json: string): Promise<void> {
  try {
    const parsed = JSON.parse(json);
    await saveSettings(parsed);
  } catch {
    throw new Error("Invalid settings JSON");
  }
}
