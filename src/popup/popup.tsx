// src/popup/popup.tsx
// Picnapped Chrome Extension Popup - Production UI/UX

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import { Toggle } from "../components/Toggle";
import { ModeSelector } from "../components/ModeSelector";
import { ImageUploader } from "../components/ImageUploader";
import { ImageCard } from "../components/ImageCard";
import {
  Sparkles,
  Upload,
  RotateCcw,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldOff,
  Pause,
  Play,
  Shuffle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  getSettings,
  saveSettings,
  PicnappedSettings,
  ReplacementMode,
} from "../storage/settings-storage";
import {
  getAllStoredImages,
  uploadImageFile,
  uploadImageFromUrl,
  removeImage,
  renameImage,
  getImageDataUrl,
  DEFAULT_IMAGE_IDS,
  StoredImage,
} from "../storage/image-storage";

const BUILT_IN_IMAGES: StoredImage[] = [
  {
    id: DEFAULT_IMAGE_IDS.TUNG,
    name: "Tung Tung Sahoor",
    dataUrl: chrome.runtime.getURL("default-images/tung-tung-sahoor.jpg"),
    mimeType: "image/jpeg",
    sizeBytes: 0,
    uploadedAt: 0,
    isDefault: true,
  },
  {
    id: DEFAULT_IMAGE_IDS.CAT,
    name: "Cat Meme",
    dataUrl: chrome.runtime.getURL("default-images/cat-meme.jpg"),
    mimeType: "image/jpeg",
    sizeBytes: 0,
    uploadedAt: 0,
    isDefault: true,
  },
];

type View = "main" | "library";

interface TabStatus {
  replaced: number;
  url: string;
  hostname: string;
  isPaused?: boolean;
}

const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<PicnappedSettings | null>(null);
  const [images, setImages] = useState<StoredImage[]>([]);
  const [activeImageDataUrl, setActiveImageDataUrl] = useState<string | null>(null);
  const [view, setView] = useState<View>("main");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type?: "info" | "success" | "warn" } | null>(null);
  const [tabStatus, setTabStatus] = useState<TabStatus | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showUploaderModal, setShowUploaderModal] = useState(false);

  const showNotif = useCallback((text: string, type: "info" | "success" | "warn" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // Load settings, images, and active tab status
  const loadData = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      const stored = await getAllStoredImages();
      const allImages = [
        ...BUILT_IN_IMAGES,
        ...stored.filter((img) => !Object.values(DEFAULT_IMAGE_IDS).includes(img.id)),
      ];
      setImages(allImages);

      if (s.activeImageId) {
        const url = await getImageDataUrl(s.activeImageId);
        setActiveImageDataUrl(url);
      }

      // Check current tab status
      try {
        const statusRes = await chrome.runtime.sendMessage({ type: "PICNAPPED_GET_ACTIVE_TAB_STATUS" });
        if (statusRes && statusRes.ok) {
          setTabStatus({
            replaced: statusRes.replaced || 0,
            url: statusRes.url || "",
            hostname: statusRes.hostname || "",
            isPaused: statusRes.isPaused,
          });
          if (statusRes.isPaused) setIsPaused(true);
        }
      } catch {}
    } catch (e) {
      console.error("[Picnapped Popup] Load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (enabled: boolean) => {
    if (!settings) return;
    const updated = { ...settings, enabled };
    setSettings(updated);
    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: { enabled },
    });
    showNotif(enabled ? "Picnapped enabled!" : "Picnapped disabled", enabled ? "success" : "info");
    // Refresh tab status after toggle
    setTimeout(loadData, 300);
  };

  const handleModeChange = async (mode: ReplacementMode) => {
    if (!settings) return;
    const updated = { ...settings, mode };
    setSettings(updated);
    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: { mode },
    });
    showNotif(`Mode set to ${mode.replace("-", " ")}`);
    setTimeout(loadData, 300);
  };

  const handleSetActiveImage = async (imageId: string) => {
    if (!settings) return;
    const img = images.find((i) => i.id === imageId);
    if (!img) return;
    const isBuiltIn = Object.values(DEFAULT_IMAGE_IDS).includes(imageId);
    const newMode: ReplacementMode = settings.mode === "random" ? "random" : isBuiltIn ? "default" : "custom";

    setSettings({ ...settings, activeImageId: imageId, activeImageName: img.name, mode: newMode });
    setActiveImageDataUrl(img.dataUrl);

    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: { activeImageId: imageId, activeImageName: img.name, mode: newMode },
    });
    showNotif(`Active image: ${img.name}`);
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadImageFile(file);
      await loadData();
      await handleSetActiveImage(stored.id);
      setShowUploaderModal(false);
      showNotif(`Uploaded "${stored.name}"`);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadUrl = async (url: string) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadImageFromUrl(url);
      await loadData();
      await handleSetActiveImage(stored.id);
      setShowUploaderModal(false);
      showNotif("Imported web image");
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    await removeImage(id);
    await loadData();
    showNotif("Image deleted", "info");
  };

  const handleRenameImage = async (id: string, name: string) => {
    await renameImage(id, name);
    await loadData();
    showNotif("Image renamed");
  };

  const handleRestoreCurrentTab = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "PICNAPPED_RESTORE_CURRENT_TAB" });
      showNotif("Restored images on this tab");
      setTimeout(loadData, 200);
    } catch {
      showNotif("Could not restore tab", "warn");
    }
  };

  const handleRestoreAllTabs = async () => {
    try {
      const r = (await chrome.runtime.sendMessage({ type: "PICNAPPED_RESTORE_ALL_TABS" })) as { tabCount?: number };
      showNotif(`Restored images on ${r?.tabCount || 0} tabs`);
    } catch {
      showNotif("Error restoring tabs", "warn");
    }
  };

  const handleExcludeCurrentSite = async () => {
    try {
      const res = (await chrome.runtime.sendMessage({ type: "PICNAPPED_EXCLUDE_CURRENT_SITE" })) as {
        ok: boolean;
        excluded?: string;
        alreadyExcluded?: boolean;
      };
      if (res.ok) {
        if (res.alreadyExcluded) {
          showNotif(`${res.excluded} already excluded`, "info");
        } else {
          showNotif(`Excluded ${res.excluded}! Images restored.`, "warn");
        }
      }
    } catch {
      showNotif("Could not exclude site", "warn");
    }
  };

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await chrome.runtime.sendMessage({ type: "PICNAPPED_RESUME_CURRENT_TAB" });
        setIsPaused(false);
        showNotif("Resumed image replacement!");
      } else {
        await chrome.runtime.sendMessage({ type: "PICNAPPED_PAUSE_CURRENT_TAB" });
        setIsPaused(true);
        showNotif("Paused on this tab", "info");
      }
      setTimeout(loadData, 300);
    } catch {
      showNotif("Pause action failed", "warn");
    }
  };

  const handleShuffleCollection = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "PICNAPPED_SHUFFLE_COLLECTION" });
      showNotif("Shuffled random collection!");
    } catch {
      showNotif("Shuffle failed", "warn");
    }
  };

  const handleSettingToggle = async (key: keyof PicnappedSettings, value: boolean) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: { [key]: value },
    });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  if (isLoading || !settings) {
    return (
      <div className="w-[380px] h-[580px] flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 animate-pulse flex items-center justify-center text-2xl">
            📷
          </div>
          <p className="text-gray-400 text-xs mt-3 font-medium">Loading Picnapped...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] min-h-[580px] max-h-[600px] bg-gray-950 text-white flex flex-col select-none relative font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 bg-gray-800/95 border border-purple-500/40 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in">
          {notification.type === "warn" ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )}
          <span className="font-medium flex-1 truncate">{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-900 via-purple-950/40 to-gray-900 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-base shadow-lg shadow-purple-600/30">
            📷
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white">Picnapped</h1>
              <span className="text-[10px] text-gray-500 font-mono">v1.0</span>
            </div>
            <p className="text-[11px] text-purple-400 font-medium">No image is safe.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
              settings.enabled
                ? "bg-green-500/15 border-green-500/30 text-green-400"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {settings.enabled ? "ACTIVE" : "DISABLED"}
          </div>
          <Toggle checked={settings.enabled} onChange={handleToggle} size="md" />
        </div>
      </div>

      {/* Active Tab Replaced Count Banner */}
      {settings.enabled && tabStatus && (
        <div className="bg-purple-950/40 border-b border-purple-900/30 px-4 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-gray-300 truncate max-w-[220px]">
            {tabStatus.hostname ? tabStatus.hostname : "Active page"}
          </span>
          <span className="font-semibold text-purple-300">
            {tabStatus.replaced} images replaced
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {view === "main" ? (
          <>
            {/* Active Image Showcase Card */}
            <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/80 shadow-inner">
              <div className="relative h-32 bg-gray-950 overflow-hidden group">
                {activeImageDataUrl ? (
                  <img
                    src={activeImageDataUrl}
                    alt={settings.activeImageName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    No replacement image selected
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

                <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-white text-xs font-bold truncate drop-shadow">
                      {settings.activeImageName}
                    </p>
                    <p className="text-[11px] text-purple-300/90 font-medium">
                      Mode: <span className="capitalize">{settings.mode.replace("-", " ")}</span>
                      {settings.mode === "random" && ` (${settings.collectionImageIds.length} in pool)`}
                    </p>
                  </div>

                  {settings.mode === "random" && (
                    <button
                      onClick={handleShuffleCollection}
                      className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow transition-transform active:scale-95"
                      title="Shuffle random pool"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Image Picker Strip */}
              <div className="p-2.5 flex items-center gap-2 overflow-x-auto bg-gray-900 border-t border-gray-800/80">
                {images.slice(0, 6).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSetActiveImage(img.id)}
                    className={`flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-all relative ${
                      settings.activeImageId === img.id
                        ? "border-purple-500 shadow-md shadow-purple-500/30 scale-105"
                        : "border-gray-700/80 hover:border-gray-500 opacity-80 hover:opacity-100"
                    }`}
                    title={img.name}
                  >
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  </button>
                ))}
                <button
                  onClick={() => setView("library")}
                  className="flex-shrink-0 w-11 h-11 rounded-xl border border-dashed border-gray-700 hover:border-purple-500 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all text-xs font-bold"
                  title="View all in library"
                >
                  +{Math.max(0, images.length - 6) || ""}
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Replacement Mode
              </h2>
              <ModeSelector activeMode={settings.mode} onChange={handleModeChange} />
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowUploaderModal(!showUploaderModal)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/40 transition-all text-xs font-semibold"
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Upload Image</span>
                </button>

                <button
                  onClick={() => setView("library")}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:bg-blue-900/40 transition-all text-xs font-semibold"
                >
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>Manage Pool</span>
                </button>

                <button
                  onClick={handleRestoreCurrentTab}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-850 border border-gray-750 text-gray-300 hover:bg-gray-800 transition-all text-xs font-semibold"
                >
                  <RotateCcw className="w-4 h-4 text-gray-400" />
                  <span>Restore Tab</span>
                </button>

                <button
                  onClick={handleRestoreAllTabs}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-850 border border-gray-750 text-gray-300 hover:bg-gray-800 transition-all text-xs font-semibold"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                  <span>Restore All</span>
                </button>

                <button
                  onClick={handleExcludeCurrentSite}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 hover:bg-amber-900/30 transition-all text-xs font-semibold"
                >
                  <ShieldOff className="w-4 h-4 text-amber-400" />
                  <span>Exclude Domain</span>
                </button>

                <button
                  onClick={handleTogglePause}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs font-semibold ${
                    isPaused
                      ? "bg-green-950/40 border-green-500/40 text-green-300"
                      : "bg-gray-850 border-gray-750 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-gray-400" />}
                  <span>{isPaused ? "Resume Tab" : "Pause Tab"}</span>
                </button>
              </div>
            </div>

            {/* Quick Uploader Drawer */}
            {showUploaderModal && (
              <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold text-white">Upload New Replacement</h3>
                  <button
                    onClick={() => setShowUploaderModal(false)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <ImageUploader
                  onUploadFile={handleUploadFile}
                  onUploadUrl={handleUploadUrl}
                  isUploading={isUploading}
                  error={uploadError}
                />
              </div>
            )}

            {/* Filter Settings Accordion */}
            <div className="border border-gray-800 rounded-2xl bg-gray-900/60 overflow-hidden">
              <button
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-850/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Replacement Filters</span>
                </div>
                {showSettingsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSettingsDrawer && (
                <div className="p-3 border-t border-gray-800 space-y-2 text-xs animate-fade-in bg-gray-900/90">
                  {[
                    { key: "replaceAllImages" as const, label: "Replace general images" },
                    { key: "replaceAvatars" as const, label: "Replace profile pictures / avatars" },
                    { key: "replaceThumbnails" as const, label: "Replace thumbnails & cards" },
                    { key: "replaceLogos" as const, label: "Replace logos & site icons" },
                    { key: "replaceCssBackgrounds" as const, label: "Replace CSS background images" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-800/40">
                      <span className="text-gray-300 text-[11px]">{label}</span>
                      <Toggle
                        checked={settings[key] as boolean}
                        onChange={(val) => handleSettingToggle(key, val)}
                        size="sm"
                      />
                    </div>
                  ))}

                  <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-gray-300 text-[11px]">Image Fit Style</span>
                    <select
                      value={settings.imageFit}
                      onChange={(e) =>
                        handleSettingToggle("imageFit" as any, e.target.value as any)
                      }
                      className="bg-gray-800 text-white text-xs px-2.5 py-1 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                    >
                      <option value="cover">Cover (Fill & Crop)</option>
                      <option value="contain">Contain (Full view)</option>
                      <option value="fill">Fill (Stretch)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Library View */
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setView("main")}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                ← Back to Dashboard
              </button>
              <span className="text-[11px] text-gray-500">{images.length} images</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  isActive={img.id === settings.activeImageId}
                  onSetActive={handleSetActiveImage}
                  onDelete={handleDeleteImage}
                  onRename={handleRenameImage}
                />
              ))}
            </div>

            <div className="pt-2">
              <ImageUploader
                onUploadFile={handleUploadFile}
                onUploadUrl={handleUploadUrl}
                isUploading={isUploading}
                error={uploadError}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="px-4 py-2.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
        <div className="flex gap-1.5">
          <button
            onClick={() => setView("main")}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
              view === "main" ? "bg-purple-600/30 text-purple-300 border border-purple-500/40" : "text-gray-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView("library")}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
              view === "library" ? "bg-purple-600/30 text-purple-300 border border-purple-500/40" : "text-gray-400 hover:text-white"
            }`}
          >
            Library
          </button>
        </div>

        <button
          onClick={openOptions}
          className="text-xs text-gray-400 hover:text-white font-medium flex items-center gap-1 hover:underline"
        >
          <span>Full Options</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PopupApp />);
}