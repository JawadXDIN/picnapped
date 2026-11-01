// src/background/service-worker.ts
// Manifest V3 background service worker

import { getSettings, saveSettings, PicnappedSettings } from "../storage/settings-storage";
import { getImageDataUrl, DEFAULT_IMAGE_IDS } from "../storage/image-storage";
import { hostnameMatchesRule, normalizeHostname } from "../utils/hostname-matcher";

// In-memory cache of resolved image URLs (imageId -> data URL)
const imageUrlCache = new Map<string, string>();
let randomSeed = Math.floor(Math.random() * 1000);

async function getResolvedImageUrl(imageId: string | null): Promise<string | null> {
  if (!imageId) return null;
  if (imageUrlCache.has(imageId)) return imageUrlCache.get(imageId)!;

  const url = await getImageDataUrl(imageId);
  if (url) {
    imageUrlCache.set(imageId, url);
    return url;
  }
  // Fallback to default Tung Tung Sahoor
  const defaultUrl = chrome.runtime.getURL("default-images/tung-tung-sahoor.jpg");
  imageUrlCache.set(imageId, defaultUrl);
  return defaultUrl;
}

async function buildContentSettings(
  settings: PicnappedSettings,
  hostname: string
): Promise<{
  settings: {
    enabled: boolean;
    replacementUrl: string | null;
    replaceCssBackgrounds: boolean;
    mode: string;
    collectionUrls?: string[];
    hostname: string;
    imageFit: "cover" | "contain" | "fill";
    preserveAspectRatio: boolean;
    replaceAllImages: boolean;
    replaceAvatars: boolean;
    replaceLogos: boolean;
    replaceThumbnails: boolean;
  };
  randomSeed: number;
}> {
  const baseOptions = {
    imageFit: settings.imageFit,
    preserveAspectRatio: settings.preserveAspectRatio,
    replaceAllImages: settings.replaceAllImages,
    replaceAvatars: settings.replaceAvatars,
    replaceLogos: settings.replaceLogos,
    replaceThumbnails: settings.replaceThumbnails,
    replaceCssBackgrounds: settings.replaceCssBackgrounds,
  };

  if (!settings.enabled) {
    return {
      settings: {
        enabled: false,
        replacementUrl: null,
        mode: "default",
        hostname,
        ...baseOptions,
      },
      randomSeed: 0,
    };
  }

  // Check exclusion list
  if (settings.exclusionList.some((excluded) => hostnameMatchesRule(hostname, excluded))) {
    return {
      settings: {
        enabled: false,
        replacementUrl: null,
        mode: "default",
        hostname,
        ...baseOptions,
      },
      randomSeed: 0,
    };
  }

  // Check website access mode ("all" vs "selected")
  if (settings.websiteAccessMode === "selected") {
    const isSelected = settings.selectedWebsites.some((site) => hostnameMatchesRule(hostname, site));
    if (!isSelected) {
      return {
        settings: {
          enabled: false,
          replacementUrl: null,
          mode: "default",
          hostname,
          ...baseOptions,
        },
        randomSeed: 0,
      };
    }
  }

  // Check website-specific rules
  const siteRule = settings.websiteRules.find(
    (rule) => rule.enabled && hostnameMatchesRule(hostname, rule.hostname)
  );

  let imageId = settings.activeImageId;
  let mode = settings.mode;

  if (siteRule) {
    imageId = siteRule.imageId;
    mode = siteRule.mode;
  }

  let replacementUrl: string | null = null;
  let collectionUrls: string[] | undefined;

  if (mode === "random") {
    const ids = settings.collectionImageIds;
    if (ids.length > 0) {
      const urls = await Promise.all(ids.map((id) => getResolvedImageUrl(id)));
      collectionUrls = urls.filter(Boolean) as string[];
      replacementUrl = collectionUrls[0] || null;
    }
  } else {
    replacementUrl = await getResolvedImageUrl(imageId);
  }

  return {
    settings: {
      enabled: true,
      replacementUrl,
      mode,
      collectionUrls,
      hostname,
      ...baseOptions,
    },
    randomSeed,
  };
}

// Push settings update to all active browser tabs
async function broadcastToAllTabs(settings: PicnappedSettings): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
      try {
        const hostname = new URL(tab.url).hostname;
        const contentData = await buildContentSettings(settings, hostname);
        await chrome.tabs.sendMessage(tab.id, {
          type: "PICNAPPED_UPDATE",
          ...contentData,
        });
      } catch {
        // Tab may not have content script loaded - safe to ignore
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // async callback
});

async function handleMessage(
  message: {
    type: string;
    hostname?: string;
    settings?: Partial<PicnappedSettings>;
    imageId?: string;
  },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case "PICNAPPED_GET_CONTENT_SETTINGS": {
        const settings = await getSettings();
        const hostname = message.hostname || (sender.tab?.url ? new URL(sender.tab.url).hostname : "");
        const contentData = await buildContentSettings(settings, hostname);
        sendResponse(contentData);
        break;
      }

      case "PICNAPPED_SAVE_SETTINGS": {
        if (message.settings) {
          await saveSettings(message.settings);
          imageUrlCache.clear();
          const updated = await getSettings();
          await broadcastToAllTabs(updated);
        }
        sendResponse({ ok: true });
        break;
      }

      case "PICNAPPED_SHUFFLE_COLLECTION": {
        randomSeed = Math.floor(Math.random() * 10000);
        const settings = await getSettings();
        await broadcastToAllTabs(settings);
        sendResponse({ ok: true, newSeed: randomSeed });
        break;
      }

      case "PICNAPPED_EXCLUDE_CURRENT_SITE": {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.url) {
          const host = normalizeHostname(new URL(activeTab.url).hostname);
          const settings = await getSettings();
          if (!settings.exclusionList.includes(host)) {
            settings.exclusionList.push(host);
            await saveSettings({ exclusionList: settings.exclusionList });
            if (activeTab.id) {
              await chrome.tabs.sendMessage(activeTab.id, { type: "PICNAPPED_RESTORE" });
            }
            sendResponse({ ok: true, excluded: host });
            return;
          }
          sendResponse({ ok: true, alreadyExcluded: true, excluded: host });
          return;
        }
        sendResponse({ ok: false, error: "No active tab" });
        break;
      }

      case "PICNAPPED_PAUSE_CURRENT_TAB": {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          const res = await chrome.tabs.sendMessage(activeTab.id, { type: "PICNAPPED_PAUSE" });
          sendResponse(res);
        } else {
          sendResponse({ ok: false, error: "No active tab" });
        }
        break;
      }

      case "PICNAPPED_RESUME_CURRENT_TAB": {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          const res = await chrome.tabs.sendMessage(activeTab.id, { type: "PICNAPPED_RESUME" });
          sendResponse(res);
        } else {
          sendResponse({ ok: false, error: "No active tab" });
        }
        break;
      }

      case "PICNAPPED_RESTORE_ALL_TABS": {
        const tabs = await chrome.tabs.query({});
        let count = 0;
        for (const tab of tabs) {
          if (tab.id && tab.url && !tab.url.startsWith("chrome://")) {
            try {
              await chrome.tabs.sendMessage(tab.id, { type: "PICNAPPED_RESTORE" });
              count++;
            } catch {}
          }
        }
        sendResponse({ ok: true, tabCount: count });
        break;
      }

      case "PICNAPPED_RESTORE_CURRENT_TAB": {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          try {
            await chrome.tabs.sendMessage(activeTab.id, { type: "PICNAPPED_RESTORE" });
            sendResponse({ ok: true });
          } catch {
            sendResponse({ ok: false, error: "Could not send restore to active tab" });
          }
        } else {
          sendResponse({ ok: false, error: "No active tab" });
        }
        break;
      }

      case "PICNAPPED_INVALIDATE_CACHE": {
        imageUrlCache.clear();
        sendResponse({ ok: true });
        break;
      }

      case "PICNAPPED_GET_ACTIVE_TAB_STATUS": {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          try {
            const status = await chrome.tabs.sendMessage(activeTab.id, { type: "PICNAPPED_STATUS" });
            sendResponse(status);
          } catch {
            sendResponse({ ok: false, error: "No content script in tab" });
          }
        } else {
          sendResponse({ ok: false, error: "No active tab" });
        }
        break;
      }

      default:
        sendResponse({ ok: false, error: `Unknown message: ${message.type}` });
    }
  } catch (e) {
    console.error("[Picnapped BG] Error:", e);
    sendResponse({ ok: false, error: String(e) });
  }
}

// On install, setup initial default meme settings
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await saveSettings({
      enabled: false,
      mode: "default",
      activeImageId: DEFAULT_IMAGE_IDS.TUNG,
      activeImageName: "Tung Tung Sahoor",
      collectionImageIds: [DEFAULT_IMAGE_IDS.TUNG, DEFAULT_IMAGE_IDS.CAT],
    });
    console.log("[Picnapped] Extension initialized. No image is safe.");
  }
});