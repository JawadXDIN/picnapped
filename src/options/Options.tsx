// src/options/Options.tsx
// Picnapped Chrome Extension - Full Options & Management Dashboard

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./options.css";
import { Toggle } from "../components/Toggle";
import { ImageCard } from "../components/ImageCard";
import { ImageUploader } from "../components/ImageUploader";
import {
  Image as ImageIcon,
  Globe,
  Settings as SettingsIcon,
  Shuffle,
  Trash2,
  Plus,
  Search,
  Download,
  Upload as UploadIcon,
  RotateCcw,
  Check,
  AlertTriangle,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import {
  getSettings,
  saveSettings,
  PicnappedSettings,
  WebsiteRule,
  ReplacementMode,
  addWebsiteRule,
  updateWebsiteRule,
  deleteWebsiteRule,
  exportSettings,
  importSettings,
} from "../storage/settings-storage";
import {
  getAllStoredImages,
  uploadImageFile,
  uploadImageFromUrl,
  removeImage,
  renameImage,
  DEFAULT_IMAGE_IDS,
  StoredImage,
  getImageCountAndSize,
  clearAllImages,
} from "../storage/image-storage";
import { isValidHostname, normalizeHostname } from "../utils/hostname-matcher";

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

type Tab = "library" | "rules" | "settings";

const OptionsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [settings, setSettings] = useState<PicnappedSettings | null>(null);
  const [images, setImages] = useState<StoredImage[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showNotif = useCallback((msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      const stored = await getAllStoredImages();
      setImages([
        ...BUILT_IN_IMAGES,
        ...stored.filter((img) => !Object.values(DEFAULT_IMAGE_IDS).includes(img.id)),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (partial: Partial<PicnappedSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await chrome.runtime.sendMessage({ type: "PICNAPPED_SAVE_SETTINGS", settings: partial });
    showNotif("Settings saved");
  };

  const TABS = [
    { id: "library" as Tab, label: "Image Library", icon: ImageIcon },
    { id: "rules" as Tab, label: "Website Rules", icon: Globe },
    { id: "settings" as Tab, label: "Preferences", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Top Navbar */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-purple-600/30">
              📷
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">Picnapped</h1>
                <span className="text-xs bg-purple-900/60 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-500/30">
                  Dashboard
                </span>
              </div>
              <p className="text-xs text-purple-400 font-medium">No image is safe.</p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-gray-850 p-1.5 rounded-2xl border border-gray-800">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center gap-2 border ${
            notification.type === "success"
              ? "bg-gray-900 border-green-500/50 text-green-400"
              : "bg-gray-900 border-red-500/50 text-red-400"
          }`}
        >
          {notification.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Main Body */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-24 text-gray-500">Loading library...</div>
        ) : activeTab === "library" ? (
          <LibraryTab
            images={images}
            activeImageId={settings?.activeImageId || null}
            collectionIds={settings?.collectionImageIds || []}
            onLoadData={loadData}
            onSaveSettings={handleSaveSettings}
            onNotify={showNotif}
          />
        ) : activeTab === "rules" ? (
          <RulesTab
            settings={settings!}
            images={images}
            onSaveSettings={handleSaveSettings}
            onNotify={showNotif}
          />
        ) : (
          <SettingsTab
            settings={settings!}
            onSaveSettings={handleSaveSettings}
            onNotify={showNotif}
            onLoadData={loadData}
          />
        )}
      </main>
    </div>
  );
};

// ==================== LIBRARY TAB ====================
interface LibraryTabProps {
  images: StoredImage[];
  activeImageId: string | null;
  collectionIds: string[];
  onLoadData: () => Promise<void>;
  onSaveSettings: (s: Partial<PicnappedSettings>) => Promise<void>;
  onNotify: (msg: string, type?: "success" | "error") => void;
}

const LibraryTab: React.FC<LibraryTabProps> = ({
  images,
  activeImageId,
  collectionIds,
  onLoadData,
  onSaveSettings,
  onNotify,
}) => {
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filtered = images.filter((img) => img.name.toLowerCase().includes(search.toLowerCase()));

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadImageFile(file);
      await onLoadData();
      onNotify(`Uploaded: ${stored.name}`);
    } catch (e) {
      setUploadError(String(e));
      onNotify(String(e), "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadUrl = async (url: string) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const stored = await uploadImageFromUrl(url);
      await onLoadData();
      onNotify(`Imported: ${stored.name}`);
    } catch (e) {
      setUploadError(String(e));
      onNotify(String(e), "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;
    const isBuiltIn = Object.values(DEFAULT_IMAGE_IDS).includes(id);
    await onSaveSettings({
      activeImageId: id,
      activeImageName: img.name,
      mode: isBuiltIn ? "default" : "custom",
    });
    onNotify(`Active replacement: ${img.name}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      await removeImage(id);
      await onLoadData();
      onNotify("Image deleted");
    } catch (e) {
      onNotify(String(e), "error");
    }
  };

  const handleRename = async (id: string, name: string) => {
    await renameImage(id, name);
    await onLoadData();
    onNotify("Image renamed");
  };

  const toggleCollection = async (id: string) => {
    const isIn = collectionIds.includes(id);
    const updated = isIn ? collectionIds.filter((i) => i !== id) : [...collectionIds, id];
    await onSaveSettings({ collectionImageIds: updated });
    onNotify(isIn ? "Removed from random pool" : "Added to random pool");
  };

  const handleShuffle = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "PICNAPPED_SHUFFLE_COLLECTION" });
      onNotify("Shuffled random rotation pool!");
    } catch {
      onNotify("Shuffle failed", "error");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">My Image Collection</h2>
          <p className="text-xs text-gray-400 mt-1">
            {images.length} images available · {collectionIds.length} in Random rotation pool
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShuffle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-800/40 text-xs font-semibold transition-all"
            title="Re-shuffle random mode order"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Pool</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-400" />
          <span>Add Images to Library</span>
        </h3>
        <ImageUploader
          onUploadFile={handleUpload}
          onUploadUrl={handleUploadUrl}
          isUploading={isUploading}
          error={uploadError}
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter images by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 text-white text-xs pl-10 pr-4 py-3 rounded-2xl border border-gray-800 focus:outline-none focus:border-purple-500 placeholder-gray-500 transition-colors"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((img) => (
          <div key={img.id} className="space-y-1.5">
            <ImageCard
              image={img}
              isActive={img.id === activeImageId}
              onSetActive={handleSetActive}
              onDelete={handleDelete}
              onRename={handleRename}
            />
            <button
              onClick={() => toggleCollection(img.id)}
              className={`w-full text-[11px] py-1.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1 border ${
                collectionIds.includes(img.id)
                  ? "bg-purple-950/40 border-purple-500/40 text-purple-300"
                  : "bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              {collectionIds.includes(img.id) ? (
                <>
                  <Check className="w-3 h-3 text-purple-400" /> In Random Pool
                </>
              ) : (
                <>+ Add to Pool</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== RULES TAB ====================
interface RulesTabProps {
  settings: PicnappedSettings;
  images: StoredImage[];
  onSaveSettings: (s: Partial<PicnappedSettings>) => Promise<void>;
  onNotify: (msg: string, type?: "success" | "error") => void;
}

const RulesTab: React.FC<RulesTabProps> = ({ settings, images, onSaveSettings, onNotify }) => {
  const [hostname, setHostname] = useState("");
  const [selectedImageId, setSelectedImageId] = useState(settings.activeImageId || "");
  const [ruleMode, setRuleMode] = useState<ReplacementMode>("custom");
  const [hostnameError, setHostnameError] = useState("");

  const handleAddRule = async () => {
    const normalized = normalizeHostname(hostname);
    if (!isValidHostname(normalized)) {
      setHostnameError("Please enter a valid hostname (e.g., youtube.com, reddit.com)");
      return;
    }
    setHostnameError("");

    const img = images.find((i) => i.id === selectedImageId);
    await addWebsiteRule({
      hostname: normalized,
      imageId: selectedImageId || DEFAULT_IMAGE_IDS.TUNG,
      imageName: img?.name || "Tung Tung Sahoor",
      mode: ruleMode,
      enabled: true,
    });

    await chrome.runtime.sendMessage({ type: "PICNAPPED_SAVE_SETTINGS", settings: {} });
    onNotify(`Rule added for ${normalized}`);
    setHostname("");
    await onSaveSettings({});
  };

  const handleDeleteRule = async (id: string) => {
    await deleteWebsiteRule(id);
    await chrome.runtime.sendMessage({ type: "PICNAPPED_SAVE_SETTINGS", settings: {} });
    onNotify("Rule deleted");
    await onSaveSettings({});
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    await updateWebsiteRule(id, { enabled });
    await chrome.runtime.sendMessage({ type: "PICNAPPED_SAVE_SETTINGS", settings: {} });
    onNotify(enabled ? "Rule enabled" : "Rule disabled");
    await onSaveSettings({});
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Website-Specific Customizations</h2>
        <p className="text-xs text-gray-400 mt-1">
          Target individual websites with designated memes (e.g., YouTube = Shrek, Reddit = Cat Meme).
        </p>
      </div>

      {/* Global Access Mode Switch */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span>Website Access Scope</span>
        </h3>
        <p className="text-xs text-gray-400">Choose whether Picnapped replaces images on all sites or only targets rules below.</p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          {(["all", "selected"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSaveSettings({ websiteAccessMode: mode })}
              className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                settings.websiteAccessMode === mode
                  ? "bg-purple-950/40 border-purple-500 text-purple-300 shadow-md shadow-purple-900/20"
                  : "bg-gray-850 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              <span>{mode === "all" ? "🌍 Replace on All Websites" : "🎯 Only on Selected Websites"}</span>
              {settings.websiteAccessMode === mode && <Check className="w-4 h-4 text-purple-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Rule */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-400" />
          <span>Add Custom Website Rule</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Domain Hostname</label>
            <input
              type="text"
              placeholder="e.g. youtube.com"
              value={hostname}
              onChange={(e) => {
                setHostname(e.target.value);
                setHostnameError("");
              }}
              className="w-full bg-gray-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
            />
            {hostnameError && <p className="text-red-400 text-[10px] mt-1">{hostnameError}</p>}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Assigned Meme / Image</label>
            <select
              value={selectedImageId}
              onChange={(e) => setSelectedImageId(e.target.value)}
              className="w-full bg-gray-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
            >
              {images.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Mode for this Site</label>
            <select
              value={ruleMode}
              onChange={(e) => setRuleMode(e.target.value as ReplacementMode)}
              className="w-full bg-gray-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
            >
              <option value="custom">Specific Image</option>
              <option value="random">Random Rotation Pool</option>
              <option value="default">Default Meme</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleAddRule}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Save Website Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Domain Rules</h3>
        {settings.websiteRules.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs bg-gray-900/30 rounded-2xl border border-gray-850">
            No website-specific rules configured yet.
          </div>
        ) : (
          settings.websiteRules.map((rule) => {
            const img = images.find((i) => i.id === rule.imageId);
            return (
              <div
                key={rule.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  rule.enabled
                    ? "bg-gray-900/60 border-gray-800 shadow-sm"
                    : "bg-gray-950/40 border-gray-850 opacity-60"
                }`}
              >
                {img ? (
                  <img src={img.dataUrl} alt={img.name} className="w-12 h-12 rounded-xl object-cover border border-gray-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-xs">📷</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{rule.hostname}</p>
                  <p className="text-xs text-purple-400">
                    {rule.imageName} · <span className="capitalize">{rule.mode}</span>
                  </p>
                </div>
                <Toggle checked={rule.enabled} onChange={(v) => handleToggleRule(rule.id, v)} size="sm" />
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Exclusions */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Exclusion List</span>
        </h3>
        <p className="text-xs text-gray-400">Enter hostnames (one per line) where Picnapped should NEVER replace any image.</p>
        <textarea
          rows={4}
          placeholder="banking.com&#10;healthportal.org&#10;internal-tools.net"
          value={settings.exclusionList.join("\n")}
          onChange={(e) => {
            const list = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && isValidHostname(s));
            onSaveSettings({ exclusionList: list });
          }}
          className="w-full bg-gray-800 text-white text-xs p-3 rounded-2xl border border-gray-700 focus:outline-none focus:border-purple-500 font-mono resize-none"
        />
      </div>
    </div>
  );
};

// ==================== SETTINGS TAB ====================
interface SettingsTabProps {
  settings: PicnappedSettings;
  onSaveSettings: (s: Partial<PicnappedSettings>) => Promise<void>;
  onNotify: (msg: string, type?: "success" | "error") => void;
  onLoadData: () => Promise<void>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSaveSettings, onNotify, onLoadData }) => {
  const [storageInfo, setStorageInfo] = useState<{ count: number; totalBytes: number } | null>(null);

  useEffect(() => {
    getImageCountAndSize().then(setStorageInfo);
  }, []);

  const handleExport = async () => {
    const json = await exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "picnapped-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    onNotify("Settings exported to file");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importSettings(text);
        await onLoadData();
        onNotify("Settings imported successfully!");
      } catch (err) {
        onNotify(String(err), "error");
      }
    };
    input.click();
  };

  const handleClearImages = async () => {
    if (!confirm("Delete all uploaded pictures from IndexedDB? Built-in memes will remain.")) return;
    await clearAllImages();
    await onSaveSettings({
      activeImageId: DEFAULT_IMAGE_IDS.TUNG,
      activeImageName: "Tung Tung Sahoor",
      collectionImageIds: [DEFAULT_IMAGE_IDS.TUNG, DEFAULT_IMAGE_IDS.CAT],
    });
    await onLoadData();
    const info = await getImageCountAndSize();
    setStorageInfo(info);
    onNotify("Uploaded images cleared");
  };

  const handleReset = async () => {
    if (!confirm("Reset ALL settings, rules, and exclusions to default?")) return;
    await chrome.runtime.sendMessage({
      type: "PICNAPPED_SAVE_SETTINGS",
      settings: {
        enabled: false,
        mode: "default",
        activeImageId: DEFAULT_IMAGE_IDS.TUNG,
        activeImageName: "Tung Tung Sahoor",
        collectionImageIds: [DEFAULT_IMAGE_IDS.TUNG, DEFAULT_IMAGE_IDS.CAT],
        websiteRules: [],
        exclusionList: [],
        websiteAccessMode: "all",
        selectedWebsites: [],
        replaceAllImages: true,
        replaceAvatars: true,
        replaceLogos: false,
        replaceThumbnails: true,
        replaceCssBackgrounds: false,
      },
    });
    await onLoadData();
    onNotify("All settings reset to defaults");
  };

  type BoolKey = {
    [K in keyof PicnappedSettings]: PicnappedSettings[K] extends boolean ? K : never;
  }[keyof PicnappedSettings];

  const SettingRow: React.FC<{ label: string; desc?: string; settingKey: BoolKey }> = ({
    label,
    desc,
    settingKey,
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
      <div>
        <p className="text-xs font-semibold text-white">{label}</p>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <Toggle
        checked={settings[settingKey] as boolean}
        onChange={(v) => onSaveSettings({ [settingKey]: v })}
        size="sm"
      />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Extension Preferences</h2>
        <p className="text-xs text-gray-400 mt-1">Configure layout behavior, element filtering, and data retention.</p>
      </div>

      {/* Image Behavior */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl space-y-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Image Replacement Filters</span>
        </h3>
        <SettingRow label="Replace general page images" settingKey="replaceAllImages" />
        <SettingRow label="Replace avatars & user profiles" settingKey="replaceAvatars" />
        <SettingRow label="Replace thumbnails & preview cards" settingKey="replaceThumbnails" />
        <SettingRow label="Replace logos & site branding" settingKey="replaceLogos" />
        <SettingRow label="Replace CSS background-image" desc="Optional: modifies CSS inline backgrounds" settingKey="replaceCssBackgrounds" />

        <div className="pt-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Image Fit Styling</p>
            <p className="text-[11px] text-gray-500">How replacement images fill their destination dimensions</p>
          </div>
          <select
            value={settings.imageFit}
            onChange={(e) => onSaveSettings({ imageFit: e.target.value as any })}
            className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
          >
            <option value="cover">Cover (Fill & Crop nicely)</option>
            <option value="contain">Contain (Full image)</option>
            <option value="fill">Fill (Exact stretch)</option>
          </select>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Data Storage & Privacy</span>
        </h3>

        {storageInfo && (
          <div className="p-3.5 rounded-2xl bg-gray-850 border border-gray-800 text-xs text-gray-300">
            <p className="font-semibold text-white">Local IndexedDB Status</p>
            <p className="text-gray-400 mt-0.5">
              {storageInfo.count} custom image files stored · {(storageInfo.totalBytes / 1024 / 1024).toFixed(2)} MB used locally.
            </p>
            <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 100% private. No external cloud servers or tracking.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-750 text-gray-300 rounded-xl text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Config JSON</span>
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-750 text-gray-300 rounded-xl text-xs font-semibold transition-all"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            <span>Import Config JSON</span>
          </button>
          <button
            onClick={handleClearImages}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-950/30 hover:bg-orange-900/40 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Stored Images</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Factory Reset</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-600 pb-8">
        Picnapped v1.0.0 · Chrome Manifest V3 · No image is safe.
      </div>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<OptionsApp />);
}