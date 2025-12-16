"use client";

import { SelectHTMLAttributes } from "react";

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">;

export default function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  placeholder = "Select an option",
  className = "",
  labelClassName = "",
  ...props
}: FormSelectProps) {
  return (
    <label className={`text-sm text-[var(--color-text-muted)] ${labelClassName}`}>
      {label}
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none disabled:opacity-50 ${error ? "border-red-400 ring-1 ring-red-400/50" : ""} ${className}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-slate-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  );
}
