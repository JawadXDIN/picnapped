// src/content/mutation-observer.ts
// Intelligent MutationObserver with batching, loop-prevention, and stable replacement

import { replaceImage, replaceSvgImage, isImageReplaced, isSvgImageReplaced, ReplacerConfig } from "./image-replacer";
import { shouldReplaceImg, shouldReplaceSvgImage, DetectionOptions } from "./image-detector";

type GetElementUrlFn = (el: HTMLImageElement | SVGImageElement) => string | null;

let observer: MutationObserver | null = null;
let isBatchPending = false;
let pendingNodes: Set<Element> = new Set();
let getElementUrl: GetElementUrlFn = () => null;
let currentOptions: DetectionOptions | undefined;
let currentConfig: ReplacerConfig | undefined;
let isEnabled = false;

export function startObserver(
  getUrl: GetElementUrlFn,
  options?: DetectionOptions,
  config?: ReplacerConfig
): void {
  getElementUrl = getUrl;
  currentOptions = options;
  currentConfig = config;
  isEnabled = true;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    for (const mutation of mutations) {
      // Loop protection: skip mutations triggered by our own changes
      const target = mutation.target as HTMLElement;
      if (target?.dataset?.picnappedReplaced === "true") {
        continue;
      }
      if (mutation.type === "attributes") {
        if (target instanceof HTMLImageElement && !isImageReplaced(target)) {
          pendingNodes.add(target);
        } else if (target instanceof SVGImageElement && !isSvgImageReplaced(target)) {
          pendingNodes.add(target);
        }
      } else if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement || node instanceof SVGElement) {
            pendingNodes.add(node);
          }
        });
      }
    }

    if (!isBatchPending && pendingNodes.size > 0) {
      isBatchPending = true;
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(processBatch, { timeout: 400 });
      } else {
        setTimeout(processBatch, 80);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "data-src", "data-lazy-src", "data-original"],
  });
}

function processBatch(): void {
  isBatchPending = false;
  if (!isEnabled) {
    pendingNodes.clear();
    return;
  }

  const nodes = Array.from(pendingNodes);
  pendingNodes.clear();

  for (const node of nodes) {
    // 1. Direct HTMLImageElement
    if (node instanceof HTMLImageElement) {
      if (shouldReplaceImg(node, currentOptions) && !isImageReplaced(node)) {
        const url = getElementUrl(node);
        if (url) replaceImage(node, url, currentConfig);
      }
    }
    // 2. Direct SVGImageElement
    else if (node instanceof SVGImageElement) {
      if (shouldReplaceSvgImage(node, currentOptions) && !isSvgImageReplaced(node)) {
        const url = getElementUrl(node);
        if (url) replaceSvgImage(node, url);
      }
    }
    // 3. Parent container added
    else {
      const imgs = node.querySelectorAll?.("img");
      if (imgs) {
        imgs.forEach((img) => {
          const imgEl = img as HTMLImageElement;
          if (shouldReplaceImg(imgEl, currentOptions) && !isImageReplaced(imgEl)) {
            const url = getElementUrl(imgEl);
            if (url) replaceImage(imgEl, url, currentConfig);
          }
        });
      }

      const svgImgs = node.querySelectorAll?.("svg image");
      if (svgImgs) {
        svgImgs.forEach((svgImg) => {
          const svgEl = svgImg as SVGImageElement;
          if (shouldReplaceSvgImage(svgEl, currentOptions) && !isSvgImageReplaced(svgEl)) {
            const url = getElementUrl(svgEl);
            if (url) replaceSvgImage(svgEl, url);
          }
        });
      }
    }
  }
}

export function stopObserver(): void {
  isEnabled = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  pendingNodes.clear();
  isBatchPending = false;
}

export function updateObserverConfig(
  getUrl: GetElementUrlFn,
  options?: DetectionOptions,
  config?: ReplacerConfig
): void {
  getElementUrl = getUrl;
  currentOptions = options;
  currentConfig = config;
}