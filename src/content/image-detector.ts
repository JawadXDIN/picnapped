// src/content/image-detector.ts
// Detects images on the page that should be replaced based on user filters

export interface DetectionOptions {
  replaceAllImages?: boolean;
  replaceAvatars?: boolean;
  replaceLogos?: boolean;
  replaceThumbnails?: boolean;
}

const MIN_REPLACE_SIZE = 8; // px - skip tiny tracking pixels/spacers

export function isAvatar(img: Element): boolean {
  const hints = [
    img.className,
    img.id,
    img.getAttribute("alt") || "",
    img.getAttribute("aria-label") || "",
  ];
  const text = hints.join(" ").toLowerCase();
  if (/avatar|profile|user-pic|user_photo|author-img|user-avatar|user_avatar|account-thumb/.test(text)) {
    return true;
  }
  const parent = img.parentElement;
  if (parent) {
    const parentText = (parent.className + " " + parent.id).toLowerCase();
    if (/avatar|profile|user-pic|author/.test(parentText)) return true;
  }
  return false;
}

export function isLogo(img: Element): boolean {
  const hints = [
    img.className,
    img.id,
    img.getAttribute("alt") || "",
    img.getAttribute("aria-label") || "",
  ];
  const text = hints.join(" ").toLowerCase();
  if (/logo|brand|site-icon|navbar-brand|favicon/.test(text)) {
    return true;
  }
  const parent = img.parentElement;
  if (parent) {
    const parentText = (parent.className + " " + parent.id).toLowerCase();
    if (/logo|brand|site-icon|navbar-brand/.test(parentText)) return true;
  }
  return false;
}

export function isThumbnail(img: Element): boolean {
  const hints = [
    img.className,
    img.id,
    img.getAttribute("alt") || "",
    img.getAttribute("aria-label") || "",
  ];
  const text = hints.join(" ").toLowerCase();
  if (/thumb|preview|card-img|poster|teaser/.test(text)) {
    return true;
  }
  const parent = img.parentElement;
  if (parent) {
    const parentText = (parent.className + " " + parent.id).toLowerCase();
    if (/thumb|preview|card-img|poster|teaser/.test(parentText)) return true;
  }
  return false;
}

export function shouldReplaceImg(img: HTMLImageElement, options?: DetectionOptions): boolean {
  // Skip already-processed or extension UI elements
  if (img.dataset.picnappedProcessed === "true") return false;
  if (img.closest("[data-picnapped-ui]")) return false;
  if (img.dataset.picnappedReplaced === "true") return false;

  // Skip images with neither src nor srcset nor lazy load attributes
  if (!img.src && !img.srcset && !img.getAttribute("data-src") && !img.getAttribute("data-lazy-src")) {
    return false;
  }

  // Skip tiny spacer / tracking pixels
  const rect = img.getBoundingClientRect();
  if (rect.width < MIN_REPLACE_SIZE && rect.height < MIN_REPLACE_SIZE) {
    if (img.width < MIN_REPLACE_SIZE && img.height < MIN_REPLACE_SIZE) {
      return false;
    }
  }

  // Filtering rules based on user options
  if (options) {
    const isAv = isAvatar(img);
    const isLg = isLogo(img);
    const isTb = isThumbnail(img);

    // If specific filter is turned off, do not replace
    if (isLg && options.replaceLogos === false) return false;
    if (isAv && options.replaceAvatars === false) return false;
    if (isTb && options.replaceThumbnails === false) return false;

    // If replaceAllImages is false, only replace if explicitly enabled
    if (options.replaceAllImages === false) {
      if (isAv && options.replaceAvatars) return true;
      if (isLg && options.replaceLogos) return true;
      if (isTb && options.replaceThumbnails) return true;
      return false;
    }
  }

  return true;
}

export function shouldReplaceSvgImage(imageEl: SVGImageElement, options?: DetectionOptions): boolean {
  if (imageEl.dataset.picnappedReplaced === "true") return false;
  if (imageEl.closest("[data-picnapped-ui]")) return false;
  const href = imageEl.getAttribute("href") || imageEl.getAttribute("xlink:href");
  if (!href) return false;

  if (options && options.replaceLogos === false && isLogo(imageEl)) {
    return false;
  }
  return true;
}

export function getImagesInElement(
  root: Document | Element | ShadowRoot,
  options?: DetectionOptions
): HTMLImageElement[] {
  const imgs: HTMLImageElement[] = [];
  const elements = root.querySelectorAll("img");
  elements.forEach((img) => {
    if (shouldReplaceImg(img as HTMLImageElement, options)) {
      imgs.push(img as HTMLImageElement);
    }
  });
  return imgs;
}

export function getSvgImagesInElement(
  root: Document | Element | ShadowRoot,
  options?: DetectionOptions
): SVGImageElement[] {
  const svgImages: SVGImageElement[] = [];
  const elements = root.querySelectorAll("svg image");
  elements.forEach((el) => {
    if (shouldReplaceSvgImage(el as SVGImageElement, options)) {
      svgImages.push(el as SVGImageElement);
    }
  });
  return svgImages;
}

export function getBackgroundElements(root: Document | Element): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const all = root.querySelectorAll("*");
  all.forEach((el) => {
    if (el instanceof HTMLElement) {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (
        bg &&
        bg !== "none" &&
        bg.includes("url(") &&
        !bg.includes("data:image") &&
        !el.dataset.picnappedProcessed &&
        !el.dataset.picnappedBgReplaced
      ) {
        elements.push(el);
      }
    }
  });
  return elements;
}