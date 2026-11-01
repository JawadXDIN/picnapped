// src/content/image-replacer.ts
// Core image replacement engine with <picture>, SVG <image>, and strict restoration support

import { getImagesInElement, getSvgImagesInElement, DetectionOptions } from "./image-detector";

export interface ReplacerConfig {
  imageFit?: "cover" | "contain" | "fill";
  preserveAspectRatio?: boolean;
}

interface SavedImageState {
  src: string;
  srcset: string;
  sizes: string;
  dataSrc: string;
  dataLazySrc: string;
  appliedReplacementUrl: string;
  styleObjectFit: string;
  styleObjectPosition: string;
  styleAspectRatio: string;
}

interface SavedSourceState {
  srcset: string;
  sizes: string;
  appliedReplacementUrl: string;
}

interface SavedSvgState {
  href: string;
  xlinkHref: string;
  appliedReplacementUrl: string;
}

// Memory tracking using WeakMaps
const originalAttributes = new WeakMap<HTMLImageElement, SavedImageState>();
const originalSources = new WeakMap<HTMLSourceElement, SavedSourceState>();
const originalSvgImages = new WeakMap<SVGImageElement, SavedSvgState>();

const replacedImages = new WeakSet<HTMLImageElement>();
const replacedSvgImages = new WeakSet<SVGImageElement>();

/**
 * Replace a standard HTML <img> element, including its parent <picture> if present
 */
export function replaceImage(
  img: HTMLImageElement,
  replacementUrl: string,
  config?: ReplacerConfig
): boolean {
  try {
    // 1. Save original attributes if not already tracked
    if (!originalAttributes.has(img)) {
      originalAttributes.set(img, {
        src: img.getAttribute("src") || "",
        srcset: img.getAttribute("srcset") || "",
        sizes: img.getAttribute("sizes") || "",
        dataSrc: img.getAttribute("data-src") || "",
        dataLazySrc: img.getAttribute("data-lazy-src") || "",
        appliedReplacementUrl: replacementUrl,
        styleObjectFit: img.style.objectFit || "",
        styleObjectPosition: img.style.objectPosition || "",
        styleAspectRatio: img.style.aspectRatio || "",
      });
    } else {
      const state = originalAttributes.get(img)!;
      state.appliedReplacementUrl = replacementUrl;
    }

    img.dataset.picnappedReplaced = "true";
    img.dataset.picnappedCurrentUrl = replacementUrl;

    // 2. Clear responsive srcset and lazy-loading attributes
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.removeAttribute("data-src");
    img.removeAttribute("data-lazy-src");

    // 3. Fallback error handler if image fails to load
    const handleBrokenImage = () => {
      img.removeEventListener("error", handleBrokenImage);
      const fallback = chrome.runtime.getURL("default-images/tung-tung-sahoor.jpg");
      if (img.src !== fallback) {
        img.src = fallback;
      }
    };
    img.addEventListener("error", handleBrokenImage, { once: true });

    // 4. Set replacement source
    img.src = replacementUrl;

    // 5. Apply styling while preserving layout
    const fit = config?.imageFit || "cover";
    img.style.objectFit = fit;
    img.style.objectPosition = "center";

    if (config?.preserveAspectRatio && img.naturalWidth && img.naturalHeight) {
      img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    }

    // 6. Handle parent <picture> container
    const pictureParent = img.parentElement?.tagName.toLowerCase() === "picture" ? img.parentElement : null;
    if (pictureParent) {
      const sources = pictureParent.querySelectorAll("source");
      sources.forEach((source) => {
        if (!originalSources.has(source)) {
          originalSources.set(source, {
            srcset: source.getAttribute("srcset") || "",
            sizes: source.getAttribute("sizes") || "",
            appliedReplacementUrl: replacementUrl,
          });
        }
        source.dataset.picnappedReplaced = "true";
        source.dataset.picnappedCurrentUrl = replacementUrl;
        source.setAttribute("srcset", replacementUrl);
      });
    }

    replacedImages.add(img);
    return true;
  } catch (e) {
    console.warn("[Picnapped] Error replacing img:", e);
    return false;
  }
}

/**
 * Replace SVG <image> elements
 */
export function replaceSvgImage(imageEl: SVGImageElement, replacementUrl: string): boolean {
  try {
    if (!originalSvgImages.has(imageEl)) {
      originalSvgImages.set(imageEl, {
        href: imageEl.getAttribute("href") || "",
        xlinkHref: imageEl.getAttribute("xlink:href") || "",
        appliedReplacementUrl: replacementUrl,
      });
    }

    imageEl.dataset.picnappedReplaced = "true";
    imageEl.dataset.picnappedCurrentUrl = replacementUrl;

    if (imageEl.hasAttribute("href")) {
      imageEl.setAttribute("href", replacementUrl);
    }
    if (imageEl.hasAttribute("xlink:href")) {
      imageEl.setAttribute("xlink:href", replacementUrl);
    }
    if (!imageEl.hasAttribute("href") && !imageEl.hasAttribute("xlink:href")) {
      imageEl.setAttribute("href", replacementUrl);
    }

    replacedSvgImages.add(imageEl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore an HTML <img> element and its parent <picture> <source> tags
 * Follows strict restoration rule: only restore if the attribute still contains the replacement value!
 */
export function restoreImage(img: HTMLImageElement): boolean {
  try {
    const original = originalAttributes.get(img);
    if (!original) return false;
    if (img.dataset.picnappedReplaced !== "true") return false;

    // Only restore src if the website did NOT change it while Picnapped was enabled
    const currentSrc = img.src;
    const appliedUrl = original.appliedReplacementUrl || img.dataset.picnappedCurrentUrl;

    if (currentSrc === appliedUrl || !currentSrc.startsWith("http")) {
      if (original.src) img.setAttribute("src", original.src);
      else img.removeAttribute("src");
    }

    if (original.srcset) img.setAttribute("srcset", original.srcset);
    if (original.sizes) img.setAttribute("sizes", original.sizes);
    if (original.dataSrc) img.setAttribute("data-src", original.dataSrc);
    if (original.dataLazySrc) img.setAttribute("data-lazy-src", original.dataLazySrc);

    // Restore inline style properties
    if (original.styleObjectFit) img.style.objectFit = original.styleObjectFit;
    else img.style.removeProperty("object-fit");

    if (original.styleObjectPosition) img.style.objectPosition = original.styleObjectPosition;
    else img.style.removeProperty("object-position");

    if (original.styleAspectRatio) img.style.aspectRatio = original.styleAspectRatio;
    else img.style.removeProperty("aspect-ratio");

    delete img.dataset.picnappedReplaced;
    delete img.dataset.picnappedCurrentUrl;

    // Restore parent <picture> <source> tags
    const pictureParent = img.parentElement?.tagName.toLowerCase() === "picture" ? img.parentElement : null;
    if (pictureParent) {
      const sources = pictureParent.querySelectorAll("source");
      sources.forEach((source) => {
        const origSource = originalSources.get(source);
        if (origSource) {
          if (source.getAttribute("srcset") === origSource.appliedReplacementUrl) {
            if (origSource.srcset) source.setAttribute("srcset", origSource.srcset);
            else source.removeAttribute("srcset");
          }
          if (origSource.sizes) source.setAttribute("sizes", origSource.sizes);
          originalSources.delete(source);
        }
        delete source.dataset.picnappedReplaced;
        delete source.dataset.picnappedCurrentUrl;
      });
    }

    originalAttributes.delete(img);
    replacedImages.delete(img);
    return true;
  } catch (e) {
    console.warn("[Picnapped] Error restoring img:", e);
    return false;
  }
}

/**
 * Restore SVG <image> element
 */
export function restoreSvgImage(imageEl: SVGImageElement): boolean {
  try {
    const original = originalSvgImages.get(imageEl);
    if (!original) return false;

    if (original.href) imageEl.setAttribute("href", original.href);
    else imageEl.removeAttribute("href");

    if (original.xlinkHref) imageEl.setAttribute("xlink:href", original.xlinkHref);
    else imageEl.removeAttribute("xlink:href");

    delete imageEl.dataset.picnappedReplaced;
    delete imageEl.dataset.picnappedCurrentUrl;
    originalSvgImages.delete(imageEl);
    replacedSvgImages.delete(imageEl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Batch replace all matching images in a DOM container
 */
export function replaceAllImages(
  root: Document | Element,
  getUrlForElement: (el: HTMLImageElement | SVGImageElement) => string | null,
  options?: DetectionOptions,
  config?: ReplacerConfig
): number {
  let count = 0;

  // 1. HTML img elements
  const imgs = getImagesInElement(root, options);
  for (const img of imgs) {
    if (!replacedImages.has(img)) {
      const url = getUrlForElement(img);
      if (url && replaceImage(img, url, config)) {
        count++;
      }
    }
  }

  // 2. SVG image elements
  const svgImgs = getSvgImagesInElement(root, options);
  for (const svgImg of svgImgs) {
    if (!replacedSvgImages.has(svgImg)) {
      const url = getUrlForElement(svgImg);
      if (url && replaceSvgImage(svgImg, url)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Restore all replaced images and SVG images across the document
 */
export function restoreAllImages(): number {
  let count = 0;
  const allImgs = document.querySelectorAll('img[data-picnapped-replaced="true"]');
  allImgs.forEach((el) => {
    if (restoreImage(el as HTMLImageElement)) count++;
  });

  const allSvgImgs = document.querySelectorAll('svg image[data-picnapped-replaced="true"]');
  allSvgImgs.forEach((el) => {
    if (restoreSvgImage(el as SVGImageElement)) count++;
  });

  return count;
}

export function isImageReplaced(img: HTMLImageElement): boolean {
  return replacedImages.has(img);
}

export function isSvgImageReplaced(img: SVGImageElement): boolean {
  return replacedSvgImages.has(img);
}