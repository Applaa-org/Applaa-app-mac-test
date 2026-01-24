/**
 * Minecraft Mod Recipes Library
 * Pre-built, tested code snippets that kids can mix and match
 * Used by both Preview (TypeScript) and Build (Java) modes
 */

// ============================================================================
// RECIPE TYPES
// ============================================================================

export interface ModRecipe {
    id: string;
    name: string;
    description: string;
    category: RecipeCategory;
    difficulty: 'easy' | 'medium' | 'hard';

    // Code in both formats
    typescript: string;     // For MakeCode preview
    java: string;           // For real mod building

    // Metadata
    command?: string;       // e.g., "/fly"
    tags: string[];
    kidExplanation: string; // Simple explanation for kids
}

export type RecipeCategory =
    | 'commands'
    | 'effects'
    | 'items'
    | 'builders'
    | 'weather'
    | 'mobs'
    | 'movement';

// ============================================================================
// COMMANDS RECIPES
// ============================================================================

export const COMMAND_RECIPES: ModRecipe[] = [
    {
        id: 'fly_command',
        name: 'Fly Command',
        description: 'Toggle flying on/off with /fly',
        category: 'commands',
        difficulty: 'easy',
        command: '/fly',
        tags: ['flight', 'movement', 'popular'],
        kidExplanation: 'Type /fly in chat and you can fly like a superhero! Type it again to stop.',

        typescript: `
// Fly Command - Toggle flying!
player.onChat("fly", function() {
    if (player.isFlying()) {
        player.setFlying(false)
        player.say("Flying OFF! 🚫")
    } else {
        player.setFlying(true)
        player.say("Flying ON! 🚀")
    }
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/fly")) {
        Player player = event.getPlayer();
        boolean wasFlying = player.getAbilities().flying;
        player.getAbilities().flying = !wasFlying;
        player.getAbilities().mayfly = !wasFlying;
        player.sendSystemMessage(Component.literal(wasFlying ? "Flying OFF! 🚫" : "Flying ON! 🚀"));
        player.onUpdateAbilities();
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'heal_command',
        name: 'Heal Command',
        description: 'Restore full health with /heal',
        category: 'commands',
        difficulty: 'easy',
        command: '/heal',
        tags: ['health', 'survival', 'popular'],
        kidExplanation: 'When you\'re hurt, type /heal to get all your hearts back!',

        typescript: `
// Heal Command - Get all your hearts back!
player.onChat("heal", function() {
    player.setHealth(20)  // 20 = full health
    player.say("💚 Fully healed!")
    mobs.applyEffect(EffectType.Regeneration, mobs.target(LOCAL_PLAYER), 5, 1)
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/heal")) {
        Player player = event.getPlayer();
        player.setHealth(player.getMaxHealth());
        player.getFoodData().setFoodLevel(20);
        player.sendSystemMessage(Component.literal("💚 Fully healed!"));
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'tnt_rain_command',
        name: 'TNT Rain',
        description: 'Make TNT rain from the sky with /tntrain',
        category: 'commands',
        difficulty: 'medium',
        command: '/tntrain',
        tags: ['explosion', 'chaos', 'fun', 'popular'],
        kidExplanation: 'Type /tntrain and watch as TNT blocks fall from the sky and explode! BOOM! 💥',

        typescript: `
// TNT Rain - Make explosions fall from the sky!
player.onChat("tntrain", function() {
    player.say("💥 TNT RAIN INCOMING!")
    for (let i = 0; i < 10; i++) {
        let x = player.position().getValue(Axis.X) + randint(-10, 10)
        let y = player.position().getValue(Axis.Y) + 30
        let z = player.position().getValue(Axis.Z) + randint(-10, 10)
        blocks.place(TNT, pos(x, y, z))
    }
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/tntrain")) {
        Player player = event.getPlayer();
        Level level = player.level();
        player.sendSystemMessage(Component.literal("💥 TNT RAIN INCOMING!"));
        
        for (int i = 0; i < 10; i++) {
            double x = player.getX() + (Math.random() * 20 - 10);
            double y = player.getY() + 30;
            double z = player.getZ() + (Math.random() * 20 - 10);
            
            PrimedTnt tnt = new PrimedTnt(level, x, y, z, player);
            level.addFreshEntity(tnt);
        }
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'speed_command',
        name: 'Super Speed',
        description: 'Run incredibly fast with /speed',
        category: 'commands',
        difficulty: 'easy',
        command: '/speed',
        tags: ['speed', 'movement', 'popular'],
        kidExplanation: 'Type /speed and run like The Flash! You\'ll zoom around super fast!',

        typescript: `
// Super Speed - Run like The Flash!
player.onChat("speed", function() {
    mobs.applyEffect(EffectType.Speed, mobs.target(LOCAL_PLAYER), 60, 5)
    player.say("⚡ ZOOM! Super speed activated!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/speed")) {
        Player player = event.getPlayer();
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 1200, 4));
        player.sendSystemMessage(Component.literal("⚡ ZOOM! Super speed activated!"));
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'lightning_command',
        name: 'Lightning Strike',
        description: 'Strike lightning where you\'re looking with /lightning',
        category: 'commands',
        difficulty: 'medium',
        command: '/lightning',
        tags: ['weather', 'destruction', 'cool'],
        kidExplanation: 'Point at something and type /lightning - ZAPP! A bolt of lightning hits it!',

        typescript: `
// Lightning Strike - Zap anything you look at!
player.onChat("lightning", function() {
    let target = player.position().toWorld()
    mobs.spawn(LIGHTNING_BOLT, target)
    player.say("⚡ LIGHTNING STRIKE!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/lightning")) {
        Player player = event.getPlayer();
        ServerLevel level = (ServerLevel) player.level();
        
        BlockHitResult hit = player.pick(100, 1.0f, false);
        BlockPos pos = hit.getBlockPos();
        
        LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level);
        bolt.moveTo(pos.getX(), pos.getY(), pos.getZ());
        level.addFreshEntity(bolt);
        
        player.sendSystemMessage(Component.literal("⚡ LIGHTNING STRIKE!"));
        event.setCanceled(true);
    }
}`
    }
];

// ============================================================================
// EFFECTS RECIPES
// ============================================================================

export const EFFECT_RECIPES: ModRecipe[] = [
    {
        id: 'super_jump',
        name: 'Super Jump',
        description: 'Jump 5x higher than normal',
        category: 'effects',
        difficulty: 'easy',
        tags: ['jump', 'movement', 'popular'],
        kidExplanation: 'When you jump, you go SO HIGH - like a superhero!',

        typescript: `
// Super Jump Effect
player.onChat("superjump", function() {
    mobs.applyEffect(EffectType.JumpBoost, mobs.target(LOCAL_PLAYER), 120, 5)
    player.say("🦘 SUPER JUMP activated!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/superjump")) {
        Player player = event.getPlayer();
        player.addEffect(new MobEffectInstance(MobEffects.JUMP, 2400, 4));
        player.sendSystemMessage(Component.literal("🦘 SUPER JUMP activated!"));
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'invisibility',
        name: 'Invisibility Cloak',
        description: 'Become invisible to all mobs',
        category: 'effects',
        difficulty: 'easy',
        tags: ['stealth', 'hiding', 'spy'],
        kidExplanation: 'Like Harry Potter\'s cloak - you become completely invisible!',

        typescript: `
// Invisibility Cloak
player.onChat("invisible", function() {
    mobs.applyEffect(EffectType.Invisibility, mobs.target(LOCAL_PLAYER), 60, 1)
    player.say("👻 Now you see me... now you don't!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/invisible")) {
        Player player = event.getPlayer();
        player.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 1200, 0));
        player.sendSystemMessage(Component.literal("👻 Now you see me... now you don't!"));
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'fire_immunity',
        name: 'Fire Immunity',
        description: 'Walk through fire and lava safely',
        category: 'effects',
        difficulty: 'easy',
        tags: ['survival', 'nether', 'fire'],
        kidExplanation: 'You can swim in lava like a pool - fire can\'t hurt you!',

        typescript: `
// Fire Immunity - Lava swimming!
player.onChat("fireproof", function() {
    mobs.applyEffect(EffectType.FireResistance, mobs.target(LOCAL_PLAYER), 300, 1)
    player.say("🔥 You're FIREPROOF! Go swim in lava!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/fireproof")) {
        Player player = event.getPlayer();
        player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 6000, 0));
        player.sendSystemMessage(Component.literal("🔥 You're FIREPROOF! Go swim in lava!"));
        event.setCanceled(true);
    }
}`
    }
];

// ============================================================================
// BUILDER RECIPES
// ============================================================================

export const BUILDER_RECIPES: ModRecipe[] = [
    {
        id: 'instant_house',
        name: 'Instant House',
        description: 'Build a house with one command',
        category: 'builders',
        difficulty: 'medium',
        command: '/house',
        tags: ['building', 'shelter', 'popular'],
        kidExplanation: 'Type /house and POOF! A nice house appears right in front of you!',

        typescript: `
// Instant House Builder
player.onChat("house", function() {
    let start = player.position()
    
    // Floor
    blocks.fill(OAK_PLANKS, start, pos(start.getValue(Axis.X) + 5, start.getValue(Axis.Y), start.getValue(Axis.Z) + 5))
    
    // Walls
    for (let height = 1; height <= 4; height++) {
        blocks.fill(OAK_LOG, 
            pos(start.getValue(Axis.X), start.getValue(Axis.Y) + height, start.getValue(Axis.Z)),
            pos(start.getValue(Axis.X) + 5, start.getValue(Axis.Y) + height, start.getValue(Axis.Z)))
    }
    
    player.say("🏠 House built!")
})`,
        java: `
@SubscribeEvent
public void onChatCommand(CommandEvent event) {
    if (event.getMessage().equalsIgnoreCase("/house")) {
        Player player = event.getPlayer();
        Level level = player.level();
        BlockPos start = player.blockPosition();
        
        // Build floor
        for (int x = 0; x < 6; x++) {
            for (int z = 0; z < 6; z++) {
                level.setBlock(start.offset(x, 0, z), Blocks.OAK_PLANKS.defaultBlockState(), 3);
            }
        }
        
        // Build walls
        for (int y = 1; y <= 4; y++) {
            for (int x = 0; x < 6; x++) {
                level.setBlock(start.offset(x, y, 0), Blocks.OAK_LOG.defaultBlockState(), 3);
                level.setBlock(start.offset(x, y, 5), Blocks.OAK_LOG.defaultBlockState(), 3);
            }
            for (int z = 0; z < 6; z++) {
                level.setBlock(start.offset(0, y, z), Blocks.OAK_LOG.defaultBlockState(), 3);
                level.setBlock(start.offset(5, y, z), Blocks.OAK_LOG.defaultBlockState(), 3);
            }
        }
        
        // Roof
        for (int x = 0; x < 6; x++) {
            for (int z = 0; z < 6; z++) {
                level.setBlock(start.offset(x, 5, z), Blocks.OAK_PLANKS.defaultBlockState(), 3);
            }
        }
        
        player.sendSystemMessage(Component.literal("🏠 House built!"));
        event.setCanceled(true);
    }
}`
    },
    {
        id: 'auto_bridge',
        name: 'Auto Bridge',
        description: 'Automatically build bridges as you walk',
        category: 'builders',
        difficulty: 'medium',
        tags: ['building', 'bridges', 'utility'],
        kidExplanation: 'When you hold a gold block, bridges magically appear under your feet!',

        typescript: `
// Auto Bridge - Walk across air!
loops.forever(function() {
    if (player.selectedItem() == GOLD_BLOCK) {
        let pos = player.position()
        blocks.place(GLASS, pos(pos.getValue(Axis.X), pos.getValue(Axis.Y) - 1, pos.getValue(Axis.Z)))
    }
    loops.pause(100)
})`,
        java: `
@SubscribeEvent
public void onPlayerTick(TickEvent.PlayerTickEvent event) {
    Player player = event.player;
    if (player.getMainHandItem().is(Items.GOLD_BLOCK)) {
        BlockPos below = player.blockPosition().below();
        Level level = player.level();
        
        if (level.getBlockState(below).isAir()) {
            level.setBlock(below, Blocks.GLASS.defaultBlockState(), 3);
        }
    }
}`
    }
];

// ============================================================================
// ALL RECIPES COMBINED
// ============================================================================

export const ALL_RECIPES: ModRecipe[] = [
    ...COMMAND_RECIPES,
    ...EFFECT_RECIPES,
    ...BUILDER_RECIPES
];

// ============================================================================
// RECIPE HELPERS
// ============================================================================

export function getRecipesByCategory(category: RecipeCategory): ModRecipe[] {
    return ALL_RECIPES.filter(r => r.category === category);
}

export function getRecipesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): ModRecipe[] {
    return ALL_RECIPES.filter(r => r.difficulty === difficulty);
}

export function searchRecipes(query: string): ModRecipe[] {
    const lower = query.toLowerCase();
    return ALL_RECIPES.filter(r =>
        r.name.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower) ||
        r.tags.some(t => t.includes(lower))
    );
}

export function getPopularRecipes(): ModRecipe[] {
    return ALL_RECIPES.filter(r => r.tags.includes('popular'));
}

/**
 * Combine multiple recipes into a single mod
 */
export function combineRecipes(recipeIds: string[]): {
    typescript: string;
    java: string;
} {
    const recipes = recipeIds
        .map(id => ALL_RECIPES.find(r => r.id === id))
        .filter(Boolean) as ModRecipe[];

    const typescript = recipes.map(r => r.typescript).join('\n\n');
    const java = recipes.map(r => r.java).join('\n\n');

    return { typescript, java };
}
