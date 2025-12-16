"use client";

import { InputHTMLAttributes } from "react";

type FormInputProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">;

export default function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = "",
  labelClassName = "",
  ...props
}: FormInputProps) {
  return (
    <label className={`text-sm text-[var(--color-text-muted)] ${labelClassName}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none ${error ? "border-red-400 ring-1 ring-red-400/50" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </label>
  );
}
