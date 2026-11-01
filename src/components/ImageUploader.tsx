// src/components/ImageUploader.tsx
import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, Link as LinkIcon, AlertCircle, Loader2, Plus } from "lucide-react";

interface ImageUploaderProps {
  onUploadFile: (file: File) => Promise<void>;
  onUploadUrl: (url: string) => Promise<void>;
  isUploading?: boolean;
  error?: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadFile,
  onUploadUrl,
  isUploading = false,
  error = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        if (file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          await onUploadFile(file);
        }
      }
    },
    [onUploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    await onUploadUrl(urlInput.trim());
    setUrlInput("");
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-purple-400 bg-purple-500/10 scale-[1.01]"
            : "border-gray-700 bg-gray-800/30 hover:border-purple-500/60 hover:bg-gray-800/50"
        } ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          ) : (
            <UploadCloud className="w-6 h-6 text-purple-400" />
          )}
        </div>
        <p className="text-sm font-semibold text-white">
          {isUploading ? "Validating & saving image..." : "Drop an image here or click to browse"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPG, PNG, GIF, WebP, SVG · Max 10MB · Stored 100% locally
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* URL Import */}
      <div>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors py-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          {showUrlInput ? "Hide URL input" : "Import from web image URL"}
        </button>

        {showUrlInput && (
          <div className="mt-2 flex gap-2 animate-fade-in">
            <input
              type="url"
              placeholder="https://example.com/meme.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="flex-1 bg-gray-800 text-white text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isUploading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white text-xs px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Import
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 text-red-300 text-xs px-3.5 py-2.5 rounded-xl animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};