# Medieval Castle Tower

fill ~-10 ~0 ~-10 ~10 ~20 ~10 air
fill ~-10 ~0 ~-10 ~10 ~0 ~10 grass_block

# Main tower (cylindrical approximation)
fill ~-4 ~1 ~-4 ~4 ~12 ~4 stone_bricks
fill ~-3 ~1 ~-3 ~3 ~12 ~3 air

# Battlements
fill ~-5 ~13 ~-5 ~5 ~13 ~5 stone_bricks
fill ~-4 ~13 ~-4 ~4 ~13 ~4 air
setblock ~-5 ~14 ~-5 stone_bricks
setblock ~5 ~14 ~-5 stone_bricks
setblock ~-5 ~14 ~5 stone_bricks
setblock ~5 ~14 ~5 stone_bricks
setblock ~-5 ~14 ~0 stone_bricks
setblock ~5 ~14 ~0 stone_bricks
setblock ~0 ~14 ~-5 stone_bricks
setblock ~0 ~14 ~5 stone_bricks

# Windows
setblock ~-4 ~4 ~0 glass_pane
setblock ~4 ~4 ~0 glass_pane
setblock ~0 ~4 ~-4 glass_pane
setblock ~0 ~4 ~4 glass_pane
setblock ~-4 ~8 ~0 glass_pane
setblock ~4 ~8 ~0 glass_pane
setblock ~0 ~8 ~-4 glass_pane
setblock ~0 ~8 ~4 glass_pane

# Entrance
fill ~0 ~1 ~-4 ~0 ~3 ~-4 air
fill ~-1 ~1 ~-4 ~1 ~1 ~-4 stone_bricks

# Flags on corners
fill ~-5 ~15 ~-5 ~-5 ~18 ~-5 oak_fence
setblock ~-5 ~17 ~-4 red_wool
setblock ~-5 ~16 ~-4 red_wool
fill ~5 ~15 ~-5 ~5 ~18 ~-5 oak_fence
setblock ~5 ~17 ~-4 blue_wool
setblock ~5 ~16 ~-4 blue_wool

# Stone path
fill ~0 ~1 ~-10 ~0 ~1 ~-5 cobblestone
fill ~-1 ~1 ~-10 ~1 ~1 ~-10 cobblestone

# Torches
setblock ~-3 ~2 ~-3 torch
setblock ~3 ~2 ~-3 torch
setblock ~-3 ~2 ~3 torch
setblock ~3 ~2 ~3 torch

say Medieval Castle Tower complete! 🏰
