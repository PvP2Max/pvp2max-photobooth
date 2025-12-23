"use client";

import { useState } from "react";
import Image from "next/image";

interface AIBackgroundGeneratorProps {
  eventId: string;
  creditsRemaining: number;
  onGenerated: () => void;
  onClose: () => void;
}

const styles = [
  { id: "photographic", name: "Photographic", description: "Realistic photos" },
  { id: "digital-art", name: "Digital Art", description: "Modern digital artwork" },
  { id: "fantasy-art", name: "Fantasy Art", description: "Magical scenes" },
  { id: "cinematic", name: "Cinematic", description: "Movie-like lighting" },
  { id: "anime", name: "Anime", description: "Japanese animation" },
  { id: "neon-punk", name: "Neon Punk", description: "Cyberpunk neon" },
];

const suggestions = [
  "A magical forest with glowing fireflies at twilight",
  "A futuristic cityscape with neon lights and flying cars",
  "An elegant ballroom with crystal chandeliers and marble floors",
  "A tropical beach at sunset with palm trees and golden sky",
  "A cozy winter cabin with snow falling outside the window",
  "A vibrant garden party with colorful flowers and string lights",
];

export function AIBackgroundGenerator({ eventId, creditsRemaining, onGenerated, onClose }: AIBackgroundGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photographic");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; id: string } | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt || prompt.length < 10) {
      setError("Prompt must be at least 10 characters");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/events/${eventId}/backgrounds/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, name: name || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ url: data.data.url, id: data.data.id });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate background");
      }
    } catch (e) {
      setError("Failed to generate background");
    } finally {
      setGenerating(false);
    }
  }

  function handleDone() {
    onGenerated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Generate AI Background</h2>
            <p className="text-sm text-gray-500">{creditsRemaining} credits remaining</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-green-600 font-medium mb-4">Background generated successfully!</p>
              <Image
                src={result.url}
                alt="Generated background"
                width={600}
                height={338}
                className="rounded-lg mx-auto"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
              >
                Generate Another
              </button>
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt *</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your background in detail..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    {s.substring(0, 40)}...
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`p-3 text-left rounded-lg border-2 transition ${
                      style === s.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Give this background a name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating || !prompt || creditsRemaining <= 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Background"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
