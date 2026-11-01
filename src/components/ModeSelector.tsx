// src/components/ModeSelector.tsx
import React from "react";
import { Sparkles, Image as ImageIcon, Shuffle, Globe } from "lucide-react";
import { ReplacementMode } from "../storage/settings-storage";

interface ModeSelectorProps {
  activeMode: ReplacementMode;
  onChange: (mode: ReplacementMode) => void;
}

const MODES = [
  { id: "default" as const, label: "Default Meme", icon: Sparkles, desc: "Tung Tung Sahoor" },
  { id: "custom" as const, label: "Custom Image", icon: ImageIcon, desc: "Your chosen picture" },
  { id: "random" as const, label: "Random Mode", icon: Shuffle, desc: "Random from collection" },
  { id: "site-specific" as const, label: "Per-Site Rules", icon: Globe, desc: "Custom per domain" },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ activeMode, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((mode) => {
        const IconComponent = mode.icon;
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 ${
              isActive
                ? "border-purple-500 bg-gradient-to-br from-purple-900/40 to-blue-900/30 shadow-md shadow-purple-500/20"
                : "border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/70"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg mt-0.5 ${
                isActive ? "bg-purple-600 text-white" : "bg-gray-700/60 text-gray-400"
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold leading-tight ${isActive ? "text-purple-300" : "text-white"}`}>
                {mode.label}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight truncate">{mode.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};