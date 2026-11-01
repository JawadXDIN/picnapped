# 📷 Picnapped — No image is safe.

> A fully featured, production-ready browser extension (Manifest V3) that lets users replace images across any website with custom memes and pictures.

---

## 🌟 Features Overview

### 1. Core Image Replacement Engine
- **Element Coverage:**
  - Standard HTML `<img>` elements
  - Responsive images using `srcset` and `sizes`
  - Responsive `<picture>` elements (updates child `<source srcset>` tags)
  - Lazy-loaded images (`data-src`, `data-lazy-src`, `loading="lazy"`)
  - Dynamic Single Page Applications (SPA) and infinite scrolling
  - SVG `<image>` elements
  - CSS `background-image` elements (configurable)
- **Layout & Dimension Preservation:**
  - Maintains existing aspect ratios, sizing, positioning, border-radius, and layout.
  - Configurable `object-fit` styles (`cover`, `contain`, `fill`).
  - Automatic fallback to bundled default meme if a replacement URL fails to load.
- **Performance & Loop Protection:**
  - Debounced mutation batching using `requestIdleCallback`.
  - Uses `WeakMap` and element dataset tracking to eliminate infinite observer loops.
- **Intelligent Restoration Rule:**
  - Restores an element attribute **only** if it still contains the value applied by Picnapped, preserving legitimate dynamic website changes made while Picnapped was active.

---

### 2. Four Image Replacement Modes

1. **🪵 Default Meme Mode (Default)**
   - Pre-bundled with **Tung Tung Sahoor** (wooden log meme character).
   - Serves assets locally via `chrome.runtime.getURL()` with zero network dependency.
2. **🖼️ Custom Image Mode**
   - Upload any custom image directly from your computer (drag & drop supported).
   - Import directly from a web image URL.
   - Validates MIME types, file size (max 10MB), image decoding, and binary magic bytes (JPEG, PNG, GIF, WebP, SVG).
   - Strict SVG sanitization against script injection.
3. **🎲 Random Mode**
   - Select multiple images into a rotation pool.
   - Deterministic source-based hashing prevents existing images from flickering or re-randomizing during normal DOM updates or infinite scrolling.
   - Single-click **Shuffle Pool** button to re-seed the rotation.
4. **🌐 Website-Specific Mode**
   - Configure unique meme rules per domain (e.g., `youtube.com` → Tung Tung Sahoor, `reddit.com` → Cat Meme).
   - Strict normalized hostname matching.
   - Supports global access modes: **All Websites** vs. **Selected Websites Only**, plus a persistent **Exclusion List**.

---

### 3. Privacy & Storage
- **100% Local Processing:** No images, browsing activity, or settings ever leave your machine.
- **IndexedDB:** Large image files and data URLs are stored locally in browser IndexedDB.
- **chrome.storage.local:** Lightweight configuration, website rules, and exclusion lists.
- **Backup & Restore:** Full JSON export and import for all settings and rules.

---

## 🚀 How to Install in Your Browser

Picnapped works on **Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**, or any Chromium-based browser.

### Option 1: Download & Install (Easiest — No coding required)

1. **Download the project**:
   - Click the green **Code** button at the top of this GitHub repository.
   - Click **Download ZIP** and extract the ZIP file on your computer (or run `git clone https://github.com/JawadXDIN/picnapped.git`).
2. **Open Extensions page**:
   - **Chrome / Brave**: Go to `chrome://extensions`
   - **Microsoft Edge**: Go to `edge://extensions`
3. **Turn ON Developer mode**:
   - Toggle the **Developer mode** switch (top-right in Chrome/Brave, left sidebar in Edge).
4. **Load the Extension**:
   - Click the **Load unpacked** button.
   - Browse into the unzipped project folder, select the **`dist`** folder, and click **Select Folder**.
5. Pin **Picnapped** (📷) in your browser toolbar and click it to get started!

---

### Option 2: Build from Source

If you want to modify the code or rebuild the bundle yourself:

```bash
# 1. Clone the repository
git clone https://github.com/JawadXDIN/picnapped.git
cd picnapped

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
```

The compiled extension ready to load will be generated in the **`dist/`** directory.

---

## 📋 Testing Checklist

| Test Scenario | Action | Expected Result |
| :--- | :--- | :--- |
| **Global Enable** | Toggle ON in popup | Supported website images are replaced with Tung Tung Sahoor |
| **Restoration** | Click "Restore Tab" or Toggle OFF | Original images are immediately restored |
| **Custom Upload** | Drag & drop an image in popup or library | Image stored in IndexedDB and becomes active |
| **Random Mode** | Select Random Mode & add to pool | Different images from pool applied; no flickering on scroll |
| **Site-Specific** | Add rule for `wikipedia.org` | Only Wikipedia displays the assigned custom image |
| **Exclusion** | Click "Exclude Domain" | Current domain immediately stops replacing images |
| **Persistence** | Refresh page or restart browser | Settings, custom rules, and image library persist |