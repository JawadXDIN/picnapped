// src/components/Toggle.tsx
import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
}) => {
  const sizes = {
    sm: { track: "w-8 h-4", thumb: "w-3 h-3", translate: "translate-x-4" },
    md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: "translate-x-5" },
    lg: { track: "w-14 h-7", thumb: "w-6 h-6", translate: "translate-x-7" },
  };
  const s = sizes[size];

  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex items-center ${s.track} rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? "bg-purple-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`inline-block ${s.thumb} bg-white rounded-full shadow transform transition-transform duration-200 ${
            checked ? s.translate : "translate-x-0.5"
          }`}
        />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
};
