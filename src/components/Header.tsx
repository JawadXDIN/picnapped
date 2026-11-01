// src/components/Header.tsx
import React from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Picnapped",
  subtitle = "No image is safe.",
  showBack,
  onBack,
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
          title="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-sm font-bold">
          📷
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-purple-400 leading-none mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
