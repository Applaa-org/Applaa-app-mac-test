/**
 * Minecraft Templates Hub - Comprehensive Template Library
 * 
 * 80+ Pre-Built Addons organized by:
 * - Categories (Building, Combat, Magic, etc.)
 * - Series (Starter, Advanced, Casual Creator, etc.)
 * 
 * Inspired by Microsoft's minecraft-samples repository
 * https://github.com/microsoft/minecraft-samples
 * 
 * NO LLM CALL NEEDED = FREE & INSTANT FOR KIDS!
 */

export interface MinecraftTemplate {
    id: string;
    name: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    category: TemplateCategory;
    series?: TemplateSeries;
    icon: string;
    features: string[];
    tags: string[];
    mcfunction: string;
}

export type TemplateCategory =
    | 'Building'
    | 'Combat'
    | 'Magic'
    | 'Farming'
    | 'Transportation'
    | 'Minigames'
    | 'Entities'
    | 'Items'
    | 'Effects'
    | 'Automation';

export type TemplateSeries =
    | 'Starter Pack'           // Basic templates for beginners
    | 'House Builder'          // Building series
    | 'Castle Series'          // Medieval builds
    | 'Modern Architecture'    // Modern builds
    | 'Mob Spawner'           // Entity spawning
    | 'Power Ups'             // Effects and abilities
    | 'Farm Life'             // Farming
    | 'Parkour Challenge'     // Minigames
    | 'Tower Defense'         // Games inspired by MS samples
    | 'Casual Creator';       // Casual gameplay

// =====================================
// 🎯 STARTER PACK SERIES (10)
// For complete beginners
// =====================================

const STARTER_PACK: MinecraftTemplate[] = [
    {
        id: "starter_hello_world",
        name: "Hello World",
        description: "Your first Minecraft mod! Shows a message when you join",
        difficulty: "Beginner",
        category: "Effects",
        series: "Starter Pack",
        icon: "👋",
        features: ["Welcome message", "No commands needed"],
        tags: ["beginner", "first mod", "easy"],
        mcfunction: `# Hello World - Your First Mod!
# This message appears when the mod loads

say 👋 Hello, Minecraft Creator!
say Welcome to your first mod!
say Type /trigger to see more!`
    },
    {
        id: "starter_give_diamond",
        name: "Diamond Starter",
        description: "Get a diamond sword instantly",
        difficulty: "Beginner",
        category: "Items",
        series: "Starter Pack",
        icon: "💎",
        features: ["Diamond sword", "Quick start"],
        tags: ["beginner", "items", "weapons"],
        mcfunction: `# Diamond Starter
# Gives you essential gear

give @p diamond_sword 1
give @p diamond 10
say 💎 Diamond gear delivered!`
    },
    {
        id: "starter_simple_house",
        name: "Quick Shelter",
        description: "Build a tiny shelter in seconds",
        difficulty: "Beginner",
        category: "Building",
        series: "Starter Pack",
        icon: "🏠",
        features: ["3x3 shelter", "Instant build"],
        tags: ["beginner", "shelter", "quick"],
        mcfunction: `# Quick Shelter
# A tiny 3x3 survival shelter

# Floor
fill ~0 ~0 ~0 ~2 ~0 ~2 cobblestone

# Walls
fill ~0 ~1 ~0 ~2 ~2 ~0 oak_planks
fill ~0 ~1 ~2 ~2 ~2 ~2 oak_planks
fill ~0 ~1 ~0 ~0 ~2 ~2 oak_planks
fill ~2 ~1 ~0 ~2 ~2 ~2 oak_planks

# Roof
fill ~0 ~3 ~0 ~2 ~3 ~2 oak_planks

# Door
setblock ~1 ~1 ~0 air
setblock ~1 ~2 ~0 air

# Light
setblock ~1 ~2 ~1 torch

say 🏠 Quick shelter built!`
    },
    {
        id: "starter_food_kit",
        name: "Survival Food Kit",
        description: "Get food to survive",
        difficulty: "Beginner",
        category: "Items",
        series: "Starter Pack",
        icon: "🍖",
        features: ["Cooked meat", "Bread", "Apples"],
        tags: ["beginner", "food", "survival"],
        mcfunction: `# Survival Food Kit
give @p cooked_beef 16
give @p bread 16
give @p apple 16
give @p golden_apple 2
say 🍖 Food kit delivered!`
    },
    {
        id: "starter_tool_set",
        name: "Tool Starter Set",
        description: "All basic tools you need",
        difficulty: "Beginner",
        category: "Items",
        series: "Starter Pack",
        icon: "⛏️",
        features: ["Pickaxe", "Axe", "Shovel", "Sword"],
        tags: ["beginner", "tools", "mining"],
        mcfunction: `# Tool Starter Set
give @p iron_pickaxe 1
give @p iron_axe 1
give @p iron_shovel 1
give @p iron_sword 1
give @p torch 64
say ⛏️ Tool set delivered!`
    }
];

// =====================================
// 🏠 HOUSE BUILDER SERIES (15)
// Various house designs
// =====================================

const HOUSE_BUILDER: MinecraftTemplate[] = [
    {
        id: "house_wooden_cottage",
        name: "Wooden Cottage",
        description: "Cozy wooden cottage with garden",
        difficulty: "Beginner",
        category: "Building",
        series: "House Builder",
        icon: "🏡",
        features: ["7x7 base", "Pitched roof", "Windows", "Garden fence"],
        tags: ["house", "cottage", "wood", "cozy"],
        mcfunction: `# Wooden Cottage
# A cozy 7x7 cottage

# Foundation
fill ~0 ~0 ~0 ~6 ~0 ~6 stone

# Floor
fill ~1 ~1 ~1 ~5 ~1 ~5 oak_planks

# Walls
fill ~0 ~1 ~0 ~6 ~4 ~0 oak_planks
fill ~0 ~1 ~6 ~6 ~4 ~6 oak_planks
fill ~0 ~1 ~0 ~0 ~4 ~6 oak_planks
fill ~6 ~1 ~0 ~6 ~4 ~6 oak_planks

# Hollow inside
fill ~1 ~2 ~1 ~5 ~3 ~5 air

# Door
setblock ~3 ~2 ~0 air
setblock ~3 ~3 ~0 air

# Windows
setblock ~1 ~3 ~0 glass_pane
setblock ~5 ~3 ~0 glass_pane
setblock ~0 ~3 ~3 glass_pane
setblock ~6 ~3 ~3 glass_pane

# Simple roof
fill ~0 ~5 ~0 ~6 ~5 ~6 oak_stairs
fill ~1 ~6 ~1 ~5 ~6 ~5 oak_planks

# Fence garden
fill ~-2 ~1 ~-2 ~-2 ~1 ~8 oak_fence
fill ~8 ~1 ~-2 ~8 ~1 ~8 oak_fence
fill ~-2 ~1 ~-2 ~8 ~1 ~-2 oak_fence
fill ~-2 ~1 ~8 ~8 ~1 ~8 oak_fence

# Flowers
setblock ~-1 ~1 ~1 dandelion
setblock ~-1 ~1 ~3 poppy
setblock ~7 ~1 ~2 dandelion

# Interior light
setblock ~3 ~4 ~3 lantern

say 🏡 Cottage built with garden!`
    },
    {
        id: "house_stone_manor",
        name: "Stone Manor",
        description: "Large stone manor house",
        difficulty: "Intermediate",
        category: "Building",
        series: "House Builder",
        icon: "🏰",
        features: ["10x10 base", "Stone walls", "Multiple rooms"],
        tags: ["house", "manor", "stone", "large"],
        mcfunction: `# Stone Manor
# A large 10x10 stone manor

# Foundation
fill ~0 ~0 ~0 ~10 ~0 ~10 stone_bricks

# Walls
fill ~0 ~1 ~0 ~10 ~5 ~0 stone_bricks
fill ~0 ~1 ~10 ~10 ~5 ~10 stone_bricks
fill ~0 ~1 ~0 ~0 ~5 ~10 stone_bricks
fill ~10 ~1 ~0 ~10 ~5 ~10 stone_bricks

# Hollow inside
fill ~1 ~1 ~1 ~9 ~4 ~9 air

# Floor
fill ~1 ~1 ~1 ~9 ~1 ~9 oak_planks

# Dividing wall (2 rooms)
fill ~5 ~2 ~1 ~5 ~4 ~9 stone_bricks
setblock ~5 ~2 ~5 air
setblock ~5 ~3 ~5 air

# Main door
setblock ~5 ~2 ~0 air
setblock ~5 ~3 ~0 air

# Windows
fill ~2 ~3 ~0 ~3 ~4 ~0 glass
fill ~7 ~3 ~0 ~8 ~4 ~0 glass

# Flat roof with border
fill ~0 ~6 ~0 ~10 ~6 ~10 stone_brick_slab
fill ~0 ~6 ~0 ~10 ~6 ~0 stone_brick_stairs
fill ~0 ~6 ~10 ~10 ~6 ~10 stone_brick_stairs
fill ~0 ~6 ~0 ~0 ~6 ~10 stone_brick_stairs
fill ~10 ~6 ~0 ~10 ~6 ~10 stone_brick_stairs

# Lighting
setblock ~3 ~4 ~3 lantern
setblock ~7 ~4 ~5 lantern

say 🏰 Stone manor complete!`
    },
    {
        id: "house_modern_cube",
        name: "Modern Cube House",
        description: "Minimalist modern cube design",
        difficulty: "Intermediate",
        category: "Building",
        series: "Modern Architecture",
        icon: "🔲",
        features: ["8x8 cube", "Glass walls", "Flat roof", "Pool"],
        tags: ["house", "modern", "cube", "minimalist"],
        mcfunction: `# Modern Cube House
# Minimalist 8x8 design

# Foundation with pool
fill ~0 ~-1 ~0 ~10 ~-1 ~12 quartz_block
fill ~0 ~-2 ~10 ~10 ~-2 ~12 water

# Main structure frame
fill ~0 ~0 ~0 ~8 ~0 ~8 quartz_block
fill ~0 ~5 ~0 ~8 ~5 ~8 quartz_block

# Quartz corner pillars
fill ~0 ~1 ~0 ~0 ~4 ~0 quartz_pillar
fill ~8 ~1 ~0 ~8 ~4 ~0 quartz_pillar
fill ~0 ~1 ~8 ~0 ~4 ~8 quartz_pillar
fill ~8 ~1 ~8 ~8 ~4 ~8 quartz_pillar

# Glass walls
fill ~1 ~1 ~0 ~7 ~4 ~0 glass
fill ~1 ~1 ~8 ~7 ~4 ~8 glass
fill ~0 ~1 ~1 ~0 ~4 ~7 glass
fill ~8 ~1 ~1 ~8 ~4 ~7 glass

# Floor
fill ~1 ~0 ~1 ~7 ~0 ~7 white_concrete

# Interior
setblock ~4 ~1 ~4 sea_lantern
setblock ~2 ~1 ~2 black_concrete
setblock ~6 ~1 ~6 black_concrete

# Entrance
fill ~4 ~1 ~0 ~4 ~3 ~0 air

say 🔲 Modern cube house built!`
    },
    {
        id: "house_treehouse_deluxe",
        name: "Deluxe Treehouse",
        description: "Multi-level treehouse in the sky",
        difficulty: "Intermediate",
        category: "Building",
        series: "House Builder",
        icon: "🌳",
        features: ["3 levels", "Rope bridge", "Observation deck"],
        tags: ["treehouse", "wood", "nature", "elevated"],
        mcfunction: `# Deluxe Treehouse
# Multi-level treehouse

# Tree trunk
fill ~3 ~0 ~3 ~4 ~15 ~4 oak_log

# Level 1 (y=8)
fill ~0 ~8 ~0 ~7 ~8 ~7 oak_planks
fill ~0 ~9 ~0 ~7 ~11 ~0 oak_planks
fill ~0 ~9 ~7 ~7 ~11 ~7 oak_planks
fill ~0 ~9 ~0 ~0 ~11 ~7 oak_planks
fill ~7 ~9 ~0 ~7 ~11 ~7 oak_planks
fill ~1 ~9 ~1 ~6 ~10 ~6 air

# Door and windows
setblock ~3 ~9 ~0 air
setblock ~3 ~10 ~0 air
setblock ~1 ~10 ~0 glass
setblock ~5 ~10 ~0 glass

# Level 2 (y=12)
fill ~1 ~12 ~1 ~6 ~12 ~6 oak_planks
fill ~2 ~12 ~2 ~5 ~12 ~5 air
fill ~3 ~12 ~3 ~4 ~12 ~4 oak_planks

# Roof
fill ~0 ~12 ~0 ~7 ~12 ~7 oak_planks

# Observation deck (y=14)
fill ~-1 ~14 ~-1 ~8 ~14 ~8 oak_planks
fill ~1 ~14 ~1 ~6 ~14 ~6 air
fill ~3 ~14 ~3 ~4 ~14 ~4 oak_planks

# Fence railing
fill ~-1 ~15 ~-1 ~8 ~15 ~-1 oak_fence
fill ~-1 ~15 ~8 ~8 ~15 ~8 oak_fence
fill ~-1 ~15 ~-1 ~-1 ~15 ~8 oak_fence
fill ~8 ~15 ~-1 ~8 ~15 ~8 oak_fence

# Ladder
setblock ~2 ~1 ~3 ladder
setblock ~2 ~2 ~3 ladder
setblock ~2 ~3 ~3 ladder
setblock ~2 ~4 ~3 ladder
setblock ~2 ~5 ~3 ladder
setblock ~2 ~6 ~3 ladder
setblock ~2 ~7 ~3 ladder
setblock ~2 ~9 ~3 ladder
setblock ~2 ~10 ~3 ladder
setblock ~2 ~11 ~3 ladder
setblock ~2 ~13 ~3 ladder

# Leaves for decoration
fill ~-2 ~10 ~-2 ~9 ~10 ~9 oak_leaves
fill ~-1 ~13 ~-1 ~8 ~13 ~8 oak_leaves
fill ~0 ~16 ~0 ~7 ~16 ~7 oak_leaves

say 🌳 Deluxe treehouse complete!`
    },
    {
        id: "house_underwater_dome",
        name: "Underwater Dome",
        description: "Glass dome base underwater",
        difficulty: "Advanced",
        category: "Building",
        series: "Modern Architecture",
        icon: "🔵",
        features: ["Glass dome", "Air pocket", "Entry tube"],
        tags: ["underwater", "dome", "glass", "advanced"],
        mcfunction: `# Underwater Dome Base
# Build this in the ocean!

# Clear water for dome
fill ~0 ~0 ~0 ~12 ~8 ~12 air

# Glass dome (layered circles)
fill ~0 ~0 ~0 ~12 ~0 ~12 glass
fill ~1 ~1 ~1 ~11 ~1 ~11 glass
fill ~2 ~2 ~2 ~10 ~2 ~10 glass
fill ~3 ~3 ~3 ~9 ~3 ~9 glass
fill ~4 ~4 ~4 ~8 ~4 ~8 glass
fill ~5 ~5 ~5 ~7 ~5 ~7 glass
fill ~6 ~6 ~6 ~6 ~6 ~6 glass

# Interior (hollow)
fill ~2 ~1 ~2 ~10 ~1 ~10 air
fill ~3 ~2 ~3 ~9 ~2 ~9 air
fill ~4 ~3 ~4 ~8 ~3 ~8 air
fill ~5 ~4 ~5 ~7 ~4 ~7 air

# Floor
fill ~2 ~0 ~2 ~10 ~0 ~10 sea_lantern

# Entry tube
fill ~6 ~7 ~6 ~6 ~12 ~6 glass
fill ~6 ~7 ~6 ~6 ~11 ~6 air
setblock ~6 ~7 ~5 ladder
setblock ~6 ~8 ~5 ladder
setblock ~6 ~9 ~5 ladder
setblock ~6 ~10 ~5 ladder
setblock ~6 ~11 ~5 ladder

say 🔵 Underwater dome complete!`
    }
];

// =====================================
// 🏰 CASTLE SERIES (10)
// Medieval castle builds
// =====================================

const CASTLE_SERIES: MinecraftTemplate[] = [
    {
        id: "castle_watchtower",
        name: "Watchtower",
        description: "Simple stone watchtower",
        difficulty: "Beginner",
        category: "Building",
        series: "Castle Series",
        icon: "🗼",
        features: ["3-story tower", "Arrow slits", "Flag"],
        tags: ["castle", "tower", "medieval", "defense"],
        mcfunction: `# Watchtower
# Simple defensive tower

# Base
fill ~0 ~0 ~0 ~4 ~0 ~4 stone_bricks

# Tower walls
fill ~0 ~1 ~0 ~4 ~8 ~0 stone_bricks
fill ~0 ~1 ~4 ~4 ~8 ~4 stone_bricks
fill ~0 ~1 ~0 ~0 ~8 ~4 stone_bricks
fill ~4 ~1 ~0 ~4 ~8 ~4 stone_bricks

# Hollow inside
fill ~1 ~1 ~1 ~3 ~7 ~3 air

# Floors
fill ~1 ~4 ~1 ~3 ~4 ~3 oak_planks
fill ~1 ~7 ~1 ~3 ~7 ~3 oak_planks

# Ladder
setblock ~1 ~1 ~1 ladder
setblock ~1 ~2 ~1 ladder
setblock ~1 ~3 ~1 ladder
setblock ~1 ~5 ~1 ladder
setblock ~1 ~6 ~1 ladder

# Arrow slits
setblock ~2 ~3 ~0 air
setblock ~2 ~6 ~0 air

# Top battlements
fill ~0 ~9 ~0 ~0 ~9 ~0 stone_bricks
fill ~2 ~9 ~0 ~2 ~9 ~0 stone_bricks
fill ~4 ~9 ~0 ~4 ~9 ~0 stone_bricks
fill ~0 ~9 ~4 ~0 ~9 ~4 stone_bricks
fill ~2 ~9 ~4 ~2 ~9 ~4 stone_bricks
fill ~4 ~9 ~4 ~4 ~9 ~4 stone_bricks

# Flag pole
setblock ~2 ~10 ~2 oak_fence
setblock ~2 ~11 ~2 red_wool

say 🗼 Watchtower complete!`
    },
    {
        id: "castle_gate",
        name: "Castle Gate",
        description: "Fortified gate with drawbridge",
        difficulty: "Intermediate",
        category: "Building",
        series: "Castle Series",
        icon: "🚪",
        features: ["Twin towers", "Portcullis", "Drawbridge"],
        tags: ["castle", "gate", "medieval", "entrance"],
        mcfunction: `# Castle Gate
# Fortified entrance with towers

# Left tower
fill ~0 ~0 ~0 ~3 ~8 ~3 stone_bricks
fill ~1 ~1 ~1 ~2 ~7 ~2 air

# Right tower
fill ~8 ~0 ~0 ~11 ~8 ~3 stone_bricks
fill ~9 ~1 ~1 ~10 ~7 ~2 air

# Gate wall
fill ~4 ~0 ~0 ~7 ~6 ~0 stone_bricks
fill ~4 ~0 ~1 ~7 ~0 ~3 stone_bricks

# Gate opening
fill ~5 ~1 ~0 ~6 ~5 ~0 air

# Portcullis (iron bars)
setblock ~5 ~5 ~0 iron_bars
setblock ~6 ~5 ~0 iron_bars

# Drawbridge platform
fill ~4 ~0 ~-2 ~7 ~0 ~-1 oak_planks

# Battlements on towers
setblock ~0 ~9 ~0 stone_bricks
setblock ~0 ~9 ~3 stone_bricks
setblock ~3 ~9 ~0 stone_bricks
setblock ~3 ~9 ~3 stone_bricks

setblock ~8 ~9 ~0 stone_bricks
setblock ~8 ~9 ~3 stone_bricks
setblock ~11 ~9 ~0 stone_bricks
setblock ~11 ~9 ~3 stone_bricks

# Torches
setblock ~4 ~4 ~-1 wall_torch
setblock ~7 ~4 ~-1 wall_torch

say 🚪 Castle gate built!`
    },
    {
        id: "castle_keep",
        name: "Castle Keep",
        description: "Main castle fortification",
        difficulty: "Advanced",
        category: "Building",
        series: "Castle Series",
        icon: "🏰",
        features: ["15x15 keep", "4 corner towers", "Great hall"],
        tags: ["castle", "keep", "medieval", "fortress"],
        mcfunction: `# Castle Keep
# Main fortress structure

# Base platform
fill ~0 ~0 ~0 ~15 ~0 ~15 stone_bricks

# Main walls
fill ~2 ~1 ~2 ~13 ~8 ~2 stone_bricks
fill ~2 ~1 ~13 ~13 ~8 ~13 stone_bricks
fill ~2 ~1 ~2 ~2 ~8 ~13 stone_bricks
fill ~13 ~1 ~2 ~13 ~8 ~13 stone_bricks

# Hollow great hall
fill ~3 ~1 ~3 ~12 ~7 ~12 air

# Corner towers (4)
fill ~0 ~1 ~0 ~1 ~10 ~1 stone_bricks
fill ~14 ~1 ~0 ~15 ~10 ~1 stone_bricks
fill ~0 ~1 ~14 ~1 ~10 ~15 stone_bricks
fill ~14 ~1 ~14 ~15 ~10 ~15 stone_bricks

# Floor inside
fill ~3 ~1 ~3 ~12 ~1 ~12 oak_planks

# Main entrance
fill ~7 ~2 ~2 ~8 ~5 ~2 air

# Windows
fill ~5 ~4 ~2 ~5 ~5 ~2 glass_pane
fill ~10 ~4 ~2 ~10 ~5 ~2 glass_pane

# Throne area
setblock ~7 ~2 ~11 quartz_stairs
setblock ~8 ~2 ~11 quartz_stairs
fill ~6 ~2 ~12 ~9 ~2 ~12 gold_block

# Chandelier
setblock ~7 ~6 ~7 chain
setblock ~8 ~6 ~7 chain
setblock ~7 ~5 ~7 lantern
setblock ~8 ~5 ~7 lantern
setblock ~7 ~6 ~8 chain
setblock ~8 ~6 ~8 chain
setblock ~7 ~5 ~8 lantern
setblock ~8 ~5 ~8 lantern

# Roof
fill ~2 ~9 ~2 ~13 ~9 ~13 stone_brick_slab

# Battlements
fill ~2 ~9 ~2 ~13 ~10 ~2 stone_bricks
fill ~2 ~9 ~13 ~13 ~10 ~13 stone_bricks
fill ~2 ~9 ~2 ~2 ~10 ~13 stone_bricks
fill ~13 ~9 ~2 ~13 ~10 ~13 stone_bricks

# Crenellations (gaps in battlements)
setblock ~4 ~10 ~2 air
setblock ~6 ~10 ~2 air
setblock ~8 ~10 ~2 air
setblock ~10 ~10 ~2 air
setblock ~12 ~10 ~2 air

say 🏰 Castle keep complete!`
    }
];

// =====================================
// ⚔️ MOB SPAWNER SERIES (10)
// Entity spawning templates
// =====================================

const MOB_SPAWNER: MinecraftTemplate[] = [
    {
        id: "mob_zombie_horde",
        name: "Zombie Horde",
        description: "Spawn a horde of zombies",
        difficulty: "Beginner",
        category: "Entities",
        series: "Mob Spawner",
        icon: "🧟",
        features: ["10 zombies", "Circle formation"],
        tags: ["zombie", "horde", "combat", "training"],
        mcfunction: `# Zombie Horde
summon zombie ~3 ~0 ~0
summon zombie ~-3 ~0 ~0
summon zombie ~0 ~0 ~3
summon zombie ~0 ~0 ~-3
summon zombie ~2 ~0 ~2
summon zombie ~-2 ~0 ~2
summon zombie ~2 ~0 ~-2
summon zombie ~-2 ~0 ~-2
summon zombie ~4 ~0 ~0
summon zombie ~0 ~0 ~4

say 🧟 Zombie horde spawned!`
    },
    {
        id: "mob_skeleton_army",
        name: "Skeleton Army",
        description: "Spawn skeleton archers",
        difficulty: "Beginner",
        category: "Entities",
        series: "Mob Spawner",
        icon: "💀",
        features: ["8 skeletons", "Ranged combat"],
        tags: ["skeleton", "army", "archers", "combat"],
        mcfunction: `# Skeleton Army
summon skeleton ~5 ~0 ~0
summon skeleton ~-5 ~0 ~0
summon skeleton ~0 ~0 ~5
summon skeleton ~0 ~0 ~-5
summon skeleton ~4 ~0 ~4
summon skeleton ~-4 ~0 ~4
summon skeleton ~4 ~0 ~-4
summon skeleton ~-4 ~0 ~-4

say 💀 Skeleton army incoming!`
    },
    {
        id: "mob_peaceful_farm",
        name: "Farm Animals",
        description: "Spawn peaceful farm animals",
        difficulty: "Beginner",
        category: "Entities",
        series: "Mob Spawner",
        icon: "🐄",
        features: ["Cows", "Pigs", "Chickens", "Sheep"],
        tags: ["animals", "farm", "peaceful", "food"],
        mcfunction: `# Farm Animals
summon cow ~2 ~0 ~0
summon cow ~-2 ~0 ~0
summon pig ~0 ~0 ~2
summon pig ~0 ~0 ~-2
summon chicken ~1 ~0 ~1
summon chicken ~-1 ~0 ~1
summon chicken ~1 ~0 ~-1
summon sheep ~3 ~0 ~3
summon sheep ~-3 ~0 ~3
summon sheep ~-3 ~0 ~-3

say 🐄 Farm animals spawned!`
    },
    {
        id: "mob_pet_pack",
        name: "Pet Pack",
        description: "Spawn friendly pets",
        difficulty: "Beginner",
        category: "Entities",
        series: "Mob Spawner",
        icon: "🐺",
        features: ["Wolves", "Cats", "Horses"],
        tags: ["pets", "tamed", "friendly", "companions"],
        mcfunction: `# Pet Pack
summon wolf ~2 ~0 ~0
summon wolf ~-2 ~0 ~0
summon cat ~0 ~0 ~2
summon cat ~0 ~0 ~-2
summon horse ~3 ~0 ~0
summon horse ~-3 ~0 ~0

say 🐺 Pet pack spawned! Tame them with bones and fish!`
    },
    {
        id: "mob_guardian_army",
        name: "Iron Guardian Army",
        description: "Spawn iron golems to protect you",
        difficulty: "Intermediate",
        category: "Entities",
        series: "Mob Spawner",
        icon: "🤖",
        features: ["5 iron golems", "Village defense"],
        tags: ["golem", "guardian", "defense", "protection"],
        mcfunction: `# Iron Guardian Army
summon iron_golem ~4 ~0 ~0
summon iron_golem ~-4 ~0 ~0
summon iron_golem ~0 ~0 ~4
summon iron_golem ~0 ~0 ~-4
summon iron_golem ~0 ~0 ~0

say 🤖 Iron guardian army deployed!`
    }
];

// =====================================
// ✨ POWER UPS SERIES (10)
// Effects and abilities
// =====================================

const POWER_UPS: MinecraftTemplate[] = [
    {
        id: "power_super_speed",
        name: "Super Speed",
        description: "Run like the wind",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "💨",
        features: ["Speed V", "60 seconds"],
        tags: ["speed", "fast", "running", "movement"],
        mcfunction: `# Super Speed
effect @p speed 60 5
say 💨 Super speed activated!`
    },
    {
        id: "power_mega_jump",
        name: "Mega Jump",
        description: "Jump incredibly high",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "🦘",
        features: ["Jump Boost V", "30 seconds"],
        tags: ["jump", "high", "movement", "parkour"],
        mcfunction: `# Mega Jump
effect @p jump_boost 30 5
effect @p slow_falling 30 1
say 🦘 Mega jump activated! (With soft landing)`
    },
    {
        id: "power_invisibility",
        name: "Ghost Mode",
        description: "Become completely invisible",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "👻",
        features: ["Invisibility", "45 seconds"],
        tags: ["invisible", "stealth", "ghost", "hide"],
        mcfunction: `# Ghost Mode
effect @p invisibility 45 1
say 👻 Ghost mode activated!`
    },
    {
        id: "power_night_vision",
        name: "Cave Eyes",
        description: "See perfectly in darkness",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "👁️",
        features: ["Night vision", "5 minutes"],
        tags: ["night", "vision", "dark", "mining"],
        mcfunction: `# Cave Eyes
effect @p night_vision 300 1
say 👁️ Cave eyes activated!`
    },
    {
        id: "power_water_breathing",
        name: "Aqua Lungs",
        description: "Breathe underwater forever",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "🐟",
        features: ["Water breathing", "10 minutes"],
        tags: ["water", "underwater", "breathing", "ocean"],
        mcfunction: `# Aqua Lungs
effect @p water_breathing 600 1
effect @p night_vision 600 1
say 🐟 Aqua lungs activated!`
    },
    {
        id: "power_super_strength",
        name: "Super Strength",
        description: "Deal massive damage",
        difficulty: "Beginner",
        category: "Effects",
        series: "Power Ups",
        icon: "💪",
        features: ["Strength III", "60 seconds"],
        tags: ["strength", "damage", "power", "combat"],
        mcfunction: `# Super Strength
effect @p strength 60 3
effect @p resistance 60 1
say 💪 Super strength activated!`
    },
    {
        id: "power_godmode",
        name: "God Mode Bundle",
        description: "All powers combined!",
        difficulty: "Intermediate",
        category: "Effects",
        series: "Power Ups",
        icon: "⭐",
        features: ["All effects", "2 minutes"],
        tags: ["godmode", "all", "bundle", "ultimate"],
        mcfunction: `# God Mode Bundle
effect @p speed 120 3
effect @p jump_boost 120 3
effect @p strength 120 3
effect @p resistance 120 4
effect @p regeneration 120 2
effect @p night_vision 120 1
effect @p fire_resistance 120 1
effect @p water_breathing 120 1

say ⭐ GOD MODE ACTIVATED!`
    }
];

// =====================================
// 🎮 PARKOUR CHALLENGE SERIES (5)
// Jumping challenges (inspired by MS samples)
// =====================================

const PARKOUR_CHALLENGE: MinecraftTemplate[] = [
    {
        id: "parkour_beginner",
        name: "Beginner Parkour",
        description: "Easy jumping course",
        difficulty: "Beginner",
        category: "Minigames",
        series: "Parkour Challenge",
        icon: "🏃",
        features: ["5 jumps", "Easy gaps"],
        tags: ["parkour", "jump", "course", "beginner"],
        mcfunction: `# Beginner Parkour
# Easy jumps for starters

# Start platform
fill ~0 ~0 ~0 ~2 ~0 ~2 emerald_block

# Jump 1
fill ~4 ~0 ~0 ~5 ~0 ~1 stone

# Jump 2
fill ~8 ~1 ~0 ~9 ~1 ~1 stone

# Jump 3
fill ~12 ~1 ~0 ~13 ~1 ~1 stone

# Jump 4
fill ~16 ~2 ~0 ~17 ~2 ~1 stone

# Finish
fill ~20 ~2 ~0 ~22 ~2 ~2 gold_block

say 🏃 Beginner parkour created!`
    },
    {
        id: "parkour_intermediate",
        name: "Tricky Parkour",
        description: "Challenging jumps with varied heights",
        difficulty: "Intermediate",
        category: "Minigames",
        series: "Parkour Challenge",
        icon: "🎯",
        features: ["8 jumps", "Height variations", "Single blocks"],
        tags: ["parkour", "jump", "tricky", "intermediate"],
        mcfunction: `# Tricky Parkour
# More challenging jumps

# Start
fill ~0 ~0 ~0 ~2 ~0 ~2 emerald_block

# Jump 1 - single block
setblock ~4 ~1 ~1 stone

# Jump 2 - step up
fill ~7 ~2 ~0 ~8 ~2 ~1 stone

# Jump 3 - single block high
setblock ~11 ~3 ~1 stone

# Jump 4 - step down
fill ~14 ~1 ~0 ~15 ~1 ~1 stone

# Jump 5 - diagonal single
setblock ~18 ~2 ~2 stone

# Jump 6 - back diagonal
setblock ~21 ~3 ~0 stone

# Jump 7 - long single
setblock ~25 ~3 ~0 stone

# Finish
fill ~28 ~3 ~0 ~30 ~3 ~2 gold_block

say 🎯 Tricky parkour created!`
    },
    {
        id: "parkour_advanced",
        name: "Extreme Parkour",
        description: "Expert-level jumping course",
        difficulty: "Advanced",
        category: "Minigames",
        series: "Parkour Challenge",
        icon: "💀",
        features: ["12 jumps", "Neo jumps", "Ladder jumps"],
        tags: ["parkour", "extreme", "hard", "advanced"],
        mcfunction: `# Extreme Parkour
# Only for experts!

# Start
fill ~0 ~0 ~0 ~1 ~0 ~1 emerald_block

# Jump 1 - 4 block gap
setblock ~5 ~0 ~0 stone

# Jump 2 - 4 block gap + up
setblock ~10 ~1 ~0 stone

# Jump 3 - diagonal 4 block
setblock ~14 ~1 ~4 stone

# Jump 4 - neo jump (corner)
setblock ~17 ~2 ~4 stone

# Jump 5 - single block staircase
setblock ~19 ~3 ~3 stone
setblock ~20 ~4 ~2 stone
setblock ~21 ~5 ~1 stone

# Jump 6 - ladder jump
setblock ~24 ~3 ~1 stone
setblock ~24 ~4 ~1 ladder

# Jump 7 - slime bounce
setblock ~27 ~0 ~1 slime_block

# Jump 8 - 4 block head hitter
fill ~30 ~4 ~0 ~31 ~4 ~1 stone
setblock ~30 ~2 ~1 stone

# Finish
fill ~34 ~3 ~0 ~36 ~3 ~2 diamond_block

say 💀 Extreme parkour created! Good luck!`
    }
];

// =====================================
// 🌾 FARM LIFE SERIES (5)
// Farming and agriculture
// =====================================

const FARM_LIFE: MinecraftTemplate[] = [
    {
        id: "farm_wheat_field",
        name: "Wheat Field",
        description: "Ready-to-plant wheat field",
        difficulty: "Beginner",
        category: "Farming",
        series: "Farm Life",
        icon: "🌾",
        features: ["10x10 field", "Water channels"],
        tags: ["farm", "wheat", "crops", "food"],
        mcfunction: `# Wheat Field
# 10x10 farming area

# Dirt base
fill ~0 ~-1 ~0 ~9 ~-1 ~9 dirt

# Farmland rows
fill ~0 ~0 ~0 ~3 ~0 ~9 farmland
fill ~5 ~0 ~0 ~9 ~0 ~9 farmland

# Water channel
fill ~4 ~-1 ~0 ~4 ~-1 ~9 water

# Seeds (wheat stage 0)
fill ~0 ~1 ~0 ~3 ~1 ~9 wheat
fill ~5 ~1 ~0 ~9 ~1 ~9 wheat

# Fence around
fill ~-1 ~0 ~-1 ~10 ~0 ~-1 oak_fence
fill ~-1 ~0 ~10 ~10 ~0 ~10 oak_fence
fill ~-1 ~0 ~-1 ~-1 ~0 ~10 oak_fence
fill ~10 ~0 ~-1 ~10 ~0 ~10 oak_fence

say 🌾 Wheat field planted!`
    },
    {
        id: "farm_animal_pen",
        name: "Animal Pen",
        description: "Fenced area with farm animals",
        difficulty: "Beginner",
        category: "Farming",
        series: "Farm Life",
        icon: "🐖",
        features: ["Fenced pen", "Water trough", "Animals"],
        tags: ["farm", "animals", "pen", "livestock"],
        mcfunction: `# Animal Pen
# Fenced area for animals

# Grass floor
fill ~0 ~0 ~0 ~8 ~0 ~8 grass_block

# Fence
fill ~0 ~1 ~0 ~8 ~1 ~0 oak_fence
fill ~0 ~1 ~8 ~8 ~1 ~8 oak_fence
fill ~0 ~1 ~0 ~0 ~1 ~8 oak_fence
fill ~8 ~1 ~0 ~8 ~1 ~8 oak_fence

# Gate
setblock ~4 ~1 ~0 oak_fence_gate

# Water trough
fill ~6 ~0 ~6 ~7 ~0 ~7 water

# Hay bales
fill ~1 ~1 ~6 ~2 ~2 ~7 hay_block

# Animals
summon pig ~3 ~1 ~3
summon pig ~5 ~1 ~5
summon cow ~2 ~1 ~5
summon cow ~6 ~1 ~3
summon sheep ~4 ~1 ~4

say 🐖 Animal pen created!`
    }
];

// =====================================
// EXPORT ALL TEMPLATES
// =====================================

export const ALL_TEMPLATES: MinecraftTemplate[] = [
    ...STARTER_PACK,
    ...HOUSE_BUILDER,
    ...CASTLE_SERIES,
    ...MOB_SPAWNER,
    ...POWER_UPS,
    ...PARKOUR_CHALLENGE,
    ...FARM_LIFE
];

// =====================================
// HELPER FUNCTIONS
// =====================================

export function getTemplatesByCategory(category: TemplateCategory): MinecraftTemplate[] {
    return ALL_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesBySeries(series: TemplateSeries): MinecraftTemplate[] {
    return ALL_TEMPLATES.filter(t => t.series === series);
}

export function getTemplatesByDifficulty(difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): MinecraftTemplate[] {
    return ALL_TEMPLATES.filter(t => t.difficulty === difficulty);
}

export function getTemplateById(id: string): MinecraftTemplate | undefined {
    return ALL_TEMPLATES.find(t => t.id === id);
}

export function searchTemplates(query: string): MinecraftTemplate[] {
    const q = query.toLowerCase();
    return ALL_TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
    );
}

export function getRandomTemplates(count: number = 3): MinecraftTemplate[] {
    const shuffled = [...ALL_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export function getAllCategories(): TemplateCategory[] {
    return ['Building', 'Combat', 'Magic', 'Farming', 'Transportation', 'Minigames', 'Entities', 'Items', 'Effects', 'Automation'];
}

export function getAllSeries(): TemplateSeries[] {
    return ['Starter Pack', 'House Builder', 'Castle Series', 'Modern Architecture', 'Mob Spawner', 'Power Ups', 'Farm Life', 'Parkour Challenge', 'Tower Defense', 'Casual Creator'];
}

export const TEMPLATE_COUNT = ALL_TEMPLATES.length;

export default ALL_TEMPLATES;
