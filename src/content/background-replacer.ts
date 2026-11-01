// src/content/background-replacer.ts
// Handles CSS background-image replacement

const originalBackgrounds = new WeakMap<HTMLElement, string>();
const replacedBackgrounds = new WeakSet<HTMLElement>();

export function replaceBackground(el: HTMLElement, replacementUrl: string): boolean {
  try {
    const computed = window.getComputedStyle(el).backgroundImage;
    if (!computed || computed === "none" || computed.includes("data:")) return false;

    if (!originalBackgrounds.has(el)) {
      originalBackgrounds.set(el, el.style.backgroundImage || "");
    }

    el.style.backgroundImage = `url("${replacementUrl}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.dataset.picnappedBgReplaced = "true";
    replacedBackgrounds.add(el);
    return true;
  } catch {
    return false;
  }
}

export function restoreBackground(el: HTMLElement): boolean {
  try {
    if (el.dataset.picnappedBgReplaced !== "true") return false;
    const original = originalBackgrounds.get(el);
    if (original !== undefined) {
      el.style.backgroundImage = original;
    } else {
      el.style.removeProperty("background-image");
    }
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    delete el.dataset.picnappedBgReplaced;
    originalBackgrounds.delete(el);
    replacedBackgrounds.delete(el);
    return true;
  } catch {
    return false;
  }
}

export function restoreAllBackgrounds(): number {
  let count = 0;
  const all = document.querySelectorAll("[data-picnapped-bg-replaced]");
  all.forEach((el) => {
    if (restoreBackground(el as HTMLElement)) count++;
  });
  return count;
}
