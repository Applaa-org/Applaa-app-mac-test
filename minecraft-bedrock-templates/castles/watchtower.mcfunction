# Watchtower
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

say 🗼 Watchtower complete!
