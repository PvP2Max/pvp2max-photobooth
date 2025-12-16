"use client";

import { InputHTMLAttributes } from "react";

type FormFileInputProps = {
  label: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  labelClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function FormFileInput({
  label,
  name,
  accept = "image/*",
  multiple = false,
  required = false,
  disabled = false,
  error,
  helpText,
  className = "",
  labelClassName = "",
  ...props
}: FormFileInputProps) {
  return (
    <label className={`text-sm text-[var(--color-text-muted)] ${labelClassName}`}>
      {label}
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        multiple={multiple}
        disabled={disabled}
        className={`mt-2 w-full rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-3 text-sm text-[var(--color-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(155,92,255,0.18)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-400 ring-1 ring-red-400/50" : ""} ${className}`}
        {...props}
      />
      {helpText && !error && (
        <p className="mt-2 text-xs text-[var(--color-text-soft)]">{helpText}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  );
}
