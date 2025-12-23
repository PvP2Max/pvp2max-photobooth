import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultBackgrounds = [
  { name: "Classic White", description: "Clean white background", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/solid-white.jpg" },
  { name: "Deep Black", description: "Dramatic black background", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/solid-black.jpg" },
  { name: "Navy Blue", description: "Professional navy backdrop", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/solid-navy.jpg" },
  { name: "Sunset Gradient", description: "Warm orange to pink gradient", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/gradient-sunset.jpg" },
  { name: "Ocean Gradient", description: "Cool blue to teal gradient", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/gradient-ocean.jpg" },
  { name: "Purple Haze", description: "Vibrant purple to pink gradient", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/gradient-purple.jpg" },
  { name: "Bokeh Lights", description: "Soft blurred party lights", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/texture-bokeh.jpg" },
  { name: "Confetti", description: "Colorful confetti celebration", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/texture-confetti.jpg" },
  { name: "Gold Glitter", description: "Luxurious gold sparkle", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/texture-gold.jpg" },
  { name: "Tropical Beach", description: "Sunny beach with palms", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/scene-beach.jpg" },
  { name: "City Skyline", description: "Modern city at night", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/scene-city.jpg" },
  { name: "Garden Party", description: "Beautiful outdoor garden", category: "BACKGROUND" as const, r2Key: "defaults/backgrounds/scene-garden.jpg" },
  { name: "Polaroid Frame", description: "Classic polaroid frame", category: "FRAME" as const, r2Key: "defaults/frames/polaroid.png" },
  { name: "Gold Ornate Frame", description: "Elegant gold frame", category: "FRAME" as const, r2Key: "defaults/frames/gold-ornate.png" },
  { name: "Floral Border", description: "Delicate flower border", category: "FRAME" as const, r2Key: "defaults/frames/floral-border.png" },
];

async function main() {
  console.log("Seeding database...");

  const deleted = await prisma.background.deleteMany({ where: { isDefault: true, eventId: null } });
  console.log(`Deleted ${deleted.count} existing defaults`);

  for (const bg of defaultBackgrounds) {
    await prisma.background.create({
      data: { ...bg, isDefault: true, isAiGenerated: false, isEnabled: true, eventId: null },
    });
    console.log(`Created: ${bg.name}`);
  }

  console.log(`Seeded ${defaultBackgrounds.length} backgrounds`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
