"use client";

import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}
