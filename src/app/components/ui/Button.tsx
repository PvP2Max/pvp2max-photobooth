"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  onClick,
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition";

  const variantClasses = {
    primary: "bg-[var(--gradient-brand)] text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.32)] hover:opacity-95",
    secondary: "bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] hover:bg-[var(--color-surface-elevated)]",
    danger: "bg-[rgba(249,115,115,0.14)] text-[var(--color-text)] ring-1 ring-[rgba(249,115,115,0.35)] hover:bg-[rgba(249,115,115,0.2)]",
    ghost: "bg-white/10 text-[var(--color-text)] ring-1 ring-white/15 hover:bg-white/15",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const disabledClasses = disabled || loading ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
