// src/components/ImageCard.tsx
import React, { useState } from "react";
import { Check, Edit3, Trash2 } from "lucide-react";
import { StoredImage, DEFAULT_IMAGE_IDS } from "../storage/image-storage";

interface ImageCardProps {
  image: StoredImage;
  isActive: boolean;
  onSetActive: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  showBadge?: boolean;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isActive,
  onSetActive,
  onDelete,
  onRename,
  showBadge = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(image.name);
  const isDefault = Object.values(DEFAULT_IMAGE_IDS).includes(image.id);

  const handleRename = () => {
    if (onRename && editName.trim()) {
      onRename(image.id, editName.trim());
      setIsEditing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "Bundled";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer bg-gray-800/60 ${
        isActive
          ? "border-purple-500 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/20"
          : "border-gray-700/60 hover:border-gray-500 hover:shadow-md"
      }`}
      onClick={() => onSetActive(image.id)}
    >
      <div className="aspect-square bg-gray-900 overflow-hidden relative">
        <img
          src={image.dataUrl}
          alt={image.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = chrome.runtime.getURL("default-images/tung-tung-sahoor.jpg");
          }}
        />
        {showBadge && isActive && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-md flex items-center gap-1">
            <Check className="w-3 h-3" /> Active
          </div>
        )}
        {isDefault && (
          <div className="absolute top-2 right-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            Default
          </div>
        )}
      </div>

      <div className="p-2.5 bg-gray-850 border-t border-gray-700/40">
        {isEditing ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-purple-500 focus:outline-none"
            />
            <button
              onClick={handleRename}
              className="p-1 rounded bg-purple-600 text-white hover:bg-purple-700"
              title="Save"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <p className="text-white text-xs font-semibold truncate flex-1" title={image.name}>
              {image.name}
            </p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isDefault && onRename && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                  title="Rename"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              {!isDefault && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(image.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
        {!isEditing && (
          <p className="text-gray-400 text-[11px] mt-0.5">
            {formatSize(image.sizeBytes)}
            {image.uploadedAt ? ` · ${new Date(image.uploadedAt).toLocaleDateString()}` : ""}
          </p>
        )}
      </div>
    </div>
  );
};