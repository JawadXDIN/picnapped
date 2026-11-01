import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-manifest-and-assets",
      closeBundle() {
        // Copy manifest
        copyFileSync("public/manifest.json", "dist/manifest.json");

        // Copy default images
        const imgDir = "dist/default-images";
        if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
        try { copyFileSync("public/default-images/tung-tung-sahoor.jpg", `${imgDir}/tung-tung-sahoor.jpg`); } catch {}
        try { copyFileSync("public/default-images/cat-meme.jpg", `${imgDir}/cat-meme.jpg`); } catch {}

        // Copy icons
        const iconDir = "dist/icons";
        if (!existsSync(iconDir)) mkdirSync(iconDir, { recursive: true });
        const iconSizes = [16, 32, 48, 128];
        iconSizes.forEach(size => {
          try { copyFileSync(`public/icons/icon${size}.png`, `${iconDir}/icon${size}.png`); } catch {}
        });

        // Ensure popup/popup.html and options/options.html are placed at expected manifest locations
        const popupDir = "dist/popup";
        if (!existsSync(popupDir)) mkdirSync(popupDir, { recursive: true });
        if (existsSync("dist/src/popup/popup.html")) {
          copyFileSync("dist/src/popup/popup.html", "dist/popup/popup.html");
        }

        const optionsDir = "dist/options";
        if (!existsSync(optionsDir)) mkdirSync(optionsDir, { recursive: true });
        if (existsSync("dist/src/options/options.html")) {
          copyFileSync("dist/src/options/options.html", "dist/options/options.html");
        }
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        options: resolve(__dirname, "src/options/options.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background/service-worker.js";
          if (chunk.name === "content") return "content/index.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});