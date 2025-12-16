import type { BackgroundState, Slot } from "./types";

interface BackgroundSelectorProps {
  backgrounds: BackgroundState[];
  activeSlot: Slot | undefined;
  onSelectBackground: (backgroundId: string) => void;
}

export default function BackgroundSelector({
  backgrounds,
  activeSlot,
  onSelectBackground,
}: BackgroundSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {backgrounds.map((background) => {
        const isSelected = activeSlot?.backgroundId === background.id;
        return (
          <button
            key={background.id}
            onClick={() => onSelectBackground(background.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              isSelected
                ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
            }`}
          >
            {background.name}
          </button>
        );
      })}
    </div>
  );
}
