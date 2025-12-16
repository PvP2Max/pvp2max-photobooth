"use client";

type ToastProps = {
  messages: string[];
  onDismiss: () => void;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
};

export default function Toast({ messages, onDismiss, position = "bottom-right" }: ToastProps) {
  if (messages.length === 0) return null;

  const positionClasses = {
    "top-right": "top-6 right-6",
    "bottom-right": "bottom-6 right-6",
    "top-left": "top-6 left-6",
    "bottom-left": "bottom-6 left-6",
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-30 flex flex-col gap-2`}>
      {messages.map((toast, idx) => (
        <div
          key={idx}
          className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/30"
        >
          {toast}
        </div>
      ))}
      <button
        onClick={onDismiss}
        className="self-end text-xs text-white/80 underline"
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}
