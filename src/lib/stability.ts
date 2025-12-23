const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_BASE = "https://api.stability.ai";

export type GenerationStyle = "photographic" | "digital-art" | "fantasy-art" | "neon-punk" | "anime" | "cinematic" | "3d-model" | "pixel-art";

export type GenerateBackgroundOptions = {
  prompt: string;
  negativePrompt?: string;
  style?: GenerationStyle;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
};

export type GenerationResult = {
  success: boolean;
  buffer?: Buffer;
  seed?: number;
  error?: string;
};

export async function generateBackground(options: GenerateBackgroundOptions): Promise<GenerationResult> {
  if (!STABILITY_API_KEY) {
    return { success: false, error: "Stability API key not configured" };
  }

  const {
    prompt,
    negativePrompt = "people, faces, text, watermark, blurry, low quality",
    style = "photographic",
    width = 1920,
    height = 1080,
    steps = 30,
    cfgScale = 7,
    seed,
  } = options;

  const enhancedPrompt = `${prompt}, background image, no people, no faces, high quality, 8k, detailed`;

  try {
    const response = await fetch(`${STABILITY_API_BASE}/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [
          { text: enhancedPrompt, weight: 1 },
          { text: negativePrompt, weight: -1 },
        ],
        cfg_scale: cfgScale,
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        steps,
        samples: 1,
        style_preset: style,
        seed: seed || Math.floor(Math.random() * 2147483647),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    if (!data.artifacts || data.artifacts.length === 0) {
      return { success: false, error: "No image generated" };
    }

    const artifact = data.artifacts[0];
    return { success: true, buffer: Buffer.from(artifact.base64, "base64"), seed: artifact.seed };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Generation failed" };
  }
}

export const backgroundPromptSuggestions = {
  nature: ["Beautiful sunset over ocean waves, golden hour lighting", "Misty mountain forest with rays of sunlight", "Cherry blossom garden in full bloom"],
  abstract: ["Colorful abstract geometric patterns, modern art style", "Flowing liquid metal in gold and silver", "Cosmic nebula with stars and galaxies"],
  celebration: ["Festive balloons and confetti, party atmosphere", "Elegant gold and champagne celebration", "Fireworks display over city skyline at night"],
  professional: ["Modern minimalist office with city view", "Elegant marble and gold luxury interior", "Clean white studio with soft lighting"],
  fantasy: ["Enchanted forest with glowing mushrooms and fireflies", "Magical castle in the clouds at sunset", "Underwater kingdom with coral and sea creatures"],
};
