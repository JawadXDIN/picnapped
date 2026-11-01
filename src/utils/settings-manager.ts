// src/utils/settings-manager.ts
// Utility wrapper for communicating settings changes from popup/options to background

export async function broadcastSettingsUpdate(partial: Record<string, unknown>): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: partial,
    });
  } catch (e) {
    console.warn("[Picnapped] Could not broadcast settings update:", e);
  }
}

export async function invalidateImageCache(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: "PICNAPPED_INVALIDATE_CACHE" });
  } catch {}
}
