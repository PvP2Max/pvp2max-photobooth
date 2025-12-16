"use client";

import { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
};

export default function Badge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  const variantClasses = {
    default: "bg-white/5 text-slate-200 ring-1 ring-white/10",
    success: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/50",
    warning: "bg-yellow-400/20 text-yellow-100 ring-1 ring-yellow-300/50",
    danger: "bg-red-400/20 text-red-100 ring-1 ring-red-300/50",
    info: "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/50",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-semibold transition ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
