/**
 * Minecraft Prompt Enhancer
 *
 * Takes simple user prompts and enhances them with Minecraft-specific
 * details to generate better mods.
 */

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  category: PromptCategory;
  blocks: string[];
  structure: StructureDetails;
  behavior?: BehaviorDetails;
}

export type PromptCategory =
  | "structure"
  | "entity"
  | "item"
  | "redstone"
  | "farming"
  | "building"
  | "adventure";

export interface StructureDetails {
  type:
    | "house"
    | "tower"
    | "farm"
    | "castle"
    | "village"
    | "dungeon"
    | "statue"
    | "bridge"
    | "garden"
    | "custom";
  width: number;
  height: number;
  depth: number;
  floors?: number;
  hasRoof: boolean;
  hasWindows: boolean;
  hasDoor: boolean;
  materials: string[];
}

export interface BehaviorDetails {
  spawnRules?: string;
  aiGoals?: string[];
  dropItems?: string[];
  health?: number;
  attackDamage?: number;
  specialAbilities?: string[];
}

const BLOCK_PALETTE: Record<string, string[]> = {
  stone: ["stone", "cobblestone", "stone_bricks", "smooth_stone"],
  wood: [
    "oak_planks",
    "spruce_planks",
    "birch_planks",
    "wood",
    "log",
    "oak_log",
  ],
  glass: ["glass", "glass_pane", "white_stained_glass"],
  nature: ["dirt", "grass_block", "leaves", "sand", "gravel"],
  metal: ["iron_block", "gold_block", "diamond_block", "coal_block"],
  special: ["water", "lava", "torch", "ladder", "fence", "gate", "door", "air"],
};

export function analyzePrompt(prompt: string): {
  category: PromptCategory;
  keywords: string[];
  impliedDetails: any;
} {
  const lowerPrompt = prompt.toLowerCase();
  const keywords: string[] = [];
  let category: PromptCategory = "structure";

  if (
    lowerPrompt.includes("spawn") ||
    lowerPrompt.includes("zombie") ||
    lowerPrompt.includes("creature")
  ) {
    category = "entity";
    keywords.push("entity", "spawn");
  } else if (
    lowerPrompt.includes("farm") ||
    lowerPrompt.includes("crop") ||
    lowerPrompt.includes("wheat")
  ) {
    category = "farming";
    keywords.push("farming", "crops");
  } else if (lowerPrompt.includes("redstone") || lowerPrompt.includes("trap")) {
    category = "redstone";
    keywords.push("redstone");
  }

  const structureKeywords = [
    "house",
    "tower",
    "castle",
    "bridge",
    "statue",
    "shelter",
    "watchtower",
  ];
  const foundStructure = structureKeywords.find((s) => lowerPrompt.includes(s));

  if (foundStructure) {
    category = "building";
  }

  const materials = ["stone", "wood", "brick", "cobblestone", "glass"];
  const foundMaterials = materials.filter((m) => lowerPrompt.includes(m));

  return {
    category,
    keywords: [...keywords, ...foundMaterials],
    impliedDetails: {
      structureType: foundStructure || "custom",
      hasSpecificMaterial: foundMaterials.length > 0,
    },
  };
}

export function enhancePrompt(userPrompt: string): EnhancedPrompt {
  const analysis = analyzePrompt(userPrompt);
  const { category, keywords, impliedDetails } = analysis;

  let enhanced = "";
  let structure: StructureDetails;
  let behavior: BehaviorDetails | undefined;

  const material =
    keywords.find((k) =>
      ["stone", "wood", "brick", "cobblestone"].includes(k),
    ) || "stone";
  const materials = BLOCK_PALETTE[material] || BLOCK_PALETTE.stone;

  const sizeMap: Record<string, { w: number; h: number; d: number }> = {
    tower: { w: 6, h: 16, d: 6 },
    castle: { w: 20, h: 12, d: 20 },
    house: { w: 8, h: 6, d: 8 },
    farm: { w: 10, h: 5, d: 10 },
    bridge: { w: 12, h: 5, d: 4 },
    statue: { w: 8, h: 12, d: 8 },
  };

  const type = (impliedDetails.structureType as string) || "custom";
  const size = sizeMap[type] || { w: 10, h: 8, d: 10 };

  structure = {
    type: type as StructureDetails["type"],
    width: size.w,
    height: size.h,
    depth: size.d,
    floors: type === "castle" ? 3 : type === "tower" ? 1 : 2,
    hasRoof: true,
    hasWindows: true,
    hasDoor: true,
    materials,
  };

  const templates: Record<
    string,
    (s: StructureDetails, m: string[]) => string
  > = {
    house: (s, m) =>
      `
Build a ${m[0]} house:
- Foundation: ${s.width}x${s.depth} ${m[0]} platform
- Walls: ${m[0]} walls, ${s.height} blocks high
- Roof: ${m[0]} sloping roof
- Door: Wooden door centered on front
- Windows: ${m[2] || "glass"} windows
- Interior: Clear space with floor
    `.trim(),

    tower: (s, m) =>
      `
Create a ${m[0]} tower:
- Base: ${s.width}x${s.width} ${m[0]} foundation
- Height: Tower reaches ${s.height} blocks
- Walls: Solid ${m[0]} with arrow slits
- Interior: Hollow with ladder
- Top: Battlements and roof
    `.trim(),

    castle: (s, m) =>
      `
Build a ${m[0]} castle:
- Outer walls: ${s.width}x${s.depth} fortress, ${s.height} high with battlements
- Corner towers: 4 towers at corners, ${s.height + 4} blocks tall
- Main gate: Large wooden doors
- Interior: Courtyard with storage
    `.trim(),

    farm: () =>
      `
Create a farm:
- Layout: ${size.w}x${size.d} area with plots
- Soil: Farmland for crops
- Water: Central irrigation channel
- Lighting: Torches for growth
- Storage: Chest area
    `.trim(),

    bridge: (s, m) =>
      `
Create a ${m[0]} bridge:
- Length: ${s.width} blocks across
- Width: ${s.depth} blocks wide
- Structure: ${m[0]} supports
- Surface: Flat walkway with railings
    `.trim(),

    statue: (s, m) =>
      `
Craft a ${m[0]} statue:
- Base: ${s.width}x${s.depth} platform
- Height: ${s.height} blocks tall
- Shape: Humanoid figure
- Details: Different shades for features
    `.trim(),
  };

  if (category === "entity") {
    const isZombie = userPrompt.toLowerCase().includes("zombie");
    behavior = {
      spawnRules: "spawns in dark areas at night",
      aiGoals: ["wander", "hunt"],
      dropItems: isZombie ? ["rotten_flesh", "iron_ingot"] : ["experience"],
      health: 20,
      attackDamage: 4,
    };
    enhanced = `Create a custom ${isZombie ? "zombie" : "creature"} entity with health ${behavior.health}, drops ${behavior.dropItems?.join(", ")}`;
  } else {
    const templateFn = templates[type];
    if (templateFn) {
      enhanced = templateFn(structure, materials);
    } else {
      enhanced = `Build a ${materials[0]} structure of size ${size.w}x${size.h}x${size.d}`;
    }
  }

  return {
    original: userPrompt,
    enhanced,
    category,
    blocks: structure.materials,
    structure,
    behavior,
  };
}

export function generateMcfunctionFromEnhanced(
  enhancedPrompt: EnhancedPrompt,
): string {
  const { structure } = enhancedPrompt;
  const lines: string[] = [];

  lines.push(
    `# ${structure.type.charAt(0).toUpperCase() + structure.type.slice(1)}`,
  );
  lines.push(`# Enhanced from: ${enhancedPrompt.original}`);
  lines.push(``);

  const primaryBlock = structure.materials[0];
  const secondaryBlock = structure.materials[1] || primaryBlock;
  const accentBlock = structure.materials[2] || "glass";

  lines.push(`# Foundation`);
  lines.push(
    `fill ~0 ~0 ~0 ~${structure.width} ~0 ~${structure.depth} ${primaryBlock}`,
  );
  lines.push(``);

  if (structure.hasDoor) {
    lines.push(`# Door`);
    lines.push(`setblock ~${Math.floor(structure.width / 2)} ~1 ~0 air`);
    lines.push(`setblock ~${Math.floor(structure.width / 2)} ~2 ~0 air`);
    lines.push(``);
  }

  lines.push(`# Walls`);
  lines.push(
    `fill ~0 ~1 ~0 ~${structure.width} ~${Math.floor(structure.height / 2)} ~0 ${secondaryBlock}`,
  );
  lines.push(
    `fill ~0 ~1 ~${structure.depth} ~${structure.width} ~${Math.floor(structure.height / 2)} ~${structure.depth} ${secondaryBlock}`,
  );
  lines.push(
    `fill ~0 ~1 ~0 ~0 ~${Math.floor(structure.height / 2)} ~${structure.depth} ${secondaryBlock}`,
  );
  lines.push(
    `fill ~${structure.width} ~1 ~0 ~${structure.width} ~${Math.floor(structure.height / 2)} ~${structure.depth} ${secondaryBlock}`,
  );
  lines.push(``);

  if (structure.hasRoof) {
    lines.push(`# Roof`);
    lines.push(
      `fill ~0 ~${Math.ceil(structure.height / 2)} ~0 ~${structure.width} ~${Math.ceil(structure.height / 2)} ~${structure.depth} ${primaryBlock}`,
    );
    lines.push(``);
  }

  if (structure.hasWindows) {
    lines.push(`# Windows`);
    lines.push(`setblock ~2 ~2 ~0 ${accentBlock}`);
    lines.push(`setblock ~${structure.width - 2} ~2 ~0 ${accentBlock}`);
    lines.push(``);
  }

  lines.push(`# Interior`);
  lines.push(
    `fill ~1 ~1 ~1 ~${structure.width - 1} ~${Math.floor(structure.height / 2) - 1} ~${structure.depth - 1} air`,
  );
  lines.push(``);

  lines.push(`# Lighting`);
  lines.push(
    `setblock ~${Math.floor(structure.width / 2)} ~${structure.height - 1} ~${Math.floor(structure.depth / 2)} torch`,
  );
  lines.push(``);

  lines.push(`say ${structure.type} complete!`);

  return lines.join("\n");
}

export default enhancePrompt;
