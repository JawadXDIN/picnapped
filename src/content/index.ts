// src/content/index.ts
// Main content script - coordinates detection, replacement, restoration, and messaging

import { replaceAllImages, restoreAllImages, ReplacerConfig } from "./image-replacer";
import { restoreAllBackgrounds, replaceBackground } from "./background-replacer";
import { startObserver, stopObserver, updateObserverConfig } from "./mutation-observer";
import { getBackgroundElements, DetectionOptions } from "./image-detector";

interface ContentSettings {
  enabled: boolean;
  replacementUrl: string | null;
  replaceCssBackgrounds: boolean;
  mode: string;
  collectionUrls?: string[];
  hostname: string;
  imageFit?: "cover" | "contain" | "fill";
  preserveAspectRatio?: boolean;
  replaceAllImages?: boolean;
  replaceAvatars?: boolean;
  replaceLogos?: boolean;
  replaceThumbnails?: boolean;
}

let currentSettings: ContentSettings = {
  enabled: false,
  replacementUrl: null,
  replaceCssBackgrounds: false,
  mode: "default",
  hostname: window.location.hostname,
  imageFit: "cover",
  preserveAspectRatio: false,
  replaceAllImages: true,
  replaceAvatars: true,
  replaceLogos: false,
  replaceThumbnails: true,
};

let randomSeed = 0;
let isInitialized = false;
let isPaused = false;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Stable image URL resolver:
// In random mode, hashes original image source so dynamic mutations do NOT randomly re-shuffle existing images
function getUrlForElement(el: HTMLImageElement | SVGImageElement): string | null {
  if (!currentSettings.enabled || isPaused) return null;

  if (currentSettings.mode === "random" && currentSettings.collectionUrls?.length) {
    const key =
      el instanceof HTMLImageElement
        ? el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("srcset") || el.alt || ""
        : el.getAttribute("href") || el.getAttribute("xlink:href") || "";
    const index = (hashString(key) + randomSeed) % currentSettings.collectionUrls.length;
    return currentSettings.collectionUrls[index] || currentSettings.replacementUrl;
  }

  return currentSettings.replacementUrl;
}

function getDetectionOptions(): DetectionOptions {
  return {
    replaceAllImages: currentSettings.replaceAllImages,
    replaceAvatars: currentSettings.replaceAvatars,
    replaceLogos: currentSettings.replaceLogos,
    replaceThumbnails: currentSettings.replaceThumbnails,
  };
}

function getReplacerConfig(): ReplacerConfig {
  return {
    imageFit: currentSettings.imageFit,
    preserveAspectRatio: currentSettings.preserveAspectRatio,
  };
}

// Apply replacement to the entire page
function applyReplacement(): void {
  if (!currentSettings.enabled || isPaused) return;

  replaceAllImages(document, getUrlForElement, getDetectionOptions(), getReplacerConfig());

  if (currentSettings.replaceCssBackgrounds && currentSettings.replacementUrl) {
    const bgElements = getBackgroundElements(document);
    bgElements.forEach((el) => {
      if (currentSettings.replacementUrl) {
        replaceBackground(el, currentSettings.replacementUrl);
      }
    });
  }
}

// Handle messages from background service worker or popup
function handleMessage(
  message: { type: string; settings?: ContentSettings; randomSeed?: number },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  switch (message.type) {
    case "PICNAPPED_INIT":
    case "PICNAPPED_UPDATE": {
      const wasEnabled = currentSettings.enabled && !isPaused;
      if (message.settings) {
        currentSettings = { ...message.settings, hostname: window.location.hostname };
      }
      if (message.randomSeed !== undefined) {
        randomSeed = message.randomSeed;
      }

      if (currentSettings.enabled && !isPaused) {
        if (!wasEnabled) {
          startObserver(getUrlForElement, getDetectionOptions(), getReplacerConfig());
        } else {
          updateObserverConfig(getUrlForElement, getDetectionOptions(), getReplacerConfig());
        }
        applyReplacement();
      } else {
        stopObserver();
        restoreAllImages();
        restoreAllBackgrounds();
      }
      sendResponse({ ok: true });
      break;
    }

    case "PICNAPPED_RESTORE": {
      stopObserver();
      const imgCount = restoreAllImages();
      const bgCount = restoreAllBackgrounds();
      sendResponse({ ok: true, restored: imgCount + bgCount });
      break;
    }

    case "PICNAPPED_PAUSE": {
      isPaused = true;
      stopObserver();
      restoreAllImages();
      restoreAllBackgrounds();
      sendResponse({ ok: true, paused: true });
      break;
    }

    case "PICNAPPED_RESUME": {
      isPaused = false;
      if (currentSettings.enabled) {
        startObserver(getUrlForElement, getDetectionOptions(), getReplacerConfig());
        applyReplacement();
      }
      sendResponse({ ok: true, paused: false });
      break;
    }

    case "PICNAPPED_STATUS": {
      const replaced = document.querySelectorAll('[data-picnapped-replaced="true"]').length;
      sendResponse({
        ok: true,
        enabled: currentSettings.enabled && !isPaused,
        isPaused,
        replaced,
        mode: currentSettings.mode,
        url: window.location.href,
        hostname: window.location.hostname,
      });
      break;
    }

    default:
      sendResponse({ ok: false, error: "Unknown message type" });
  }
  return true;
}

// Initialize: connect with background service worker
async function initialize(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "PICNAPPED_GET_CONTENT_SETTINGS",
      hostname: window.location.hostname,
    });
    if (response?.settings) {
      currentSettings = { ...response.settings, hostname: window.location.hostname };
      if (response.randomSeed !== undefined) {
        randomSeed = response.randomSeed;
      }
      if (currentSettings.enabled) {
        startObserver(getUrlForElement, getDetectionOptions(), getReplacerConfig());
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", applyReplacement);
        } else {
          applyReplacement();
        }
      }
    }
  } catch {
    // Retry once in case service worker was spinning up
    setTimeout(initialize, 600);
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
initialize();

// Handle SPA route changes (YouTube, Reddit, Twitter, etc.)
let lastUrl = window.location.href;
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    if (currentSettings.enabled && !isPaused) {
      setTimeout(applyReplacement, 250);
    }
  }
});
navObserver.observe(document.documentElement, { childList: true, subtree: true });