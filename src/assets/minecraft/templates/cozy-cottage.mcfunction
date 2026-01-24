# Cozy Cottage (9x7 footprint)

# Clear area
fill ~-6 ~0 ~-6 ~6 ~10 ~6 air

# Grass base
fill ~-6 ~0 ~-6 ~6 ~0 ~6 grass_block

# Floor
fill ~-4 ~1 ~-3 ~4 ~1 ~3 spruce_planks

# Walls (hollow box)
fill ~-4 ~2 ~-3 ~4 ~5 ~-3 oak_planks
fill ~-4 ~2 ~3 ~4 ~5 ~3 oak_planks
fill ~-4 ~2 ~-3 ~-4 ~5 ~3 oak_planks
fill ~4 ~2 ~-3 ~4 ~5 ~3 oak_planks

# Hollow inside
fill ~-3 ~2 ~-2 ~3 ~5 ~2 air

# Door opening
fill ~0 ~2 ~-3 ~0 ~3 ~-3 air

# Windows
fill ~-3 ~3 ~-3 ~-2 ~4 ~-3 glass_pane
fill ~2 ~3 ~-3 ~3 ~4 ~-3 glass_pane
fill ~-3 ~3 ~3 ~-2 ~4 ~3 glass_pane
fill ~2 ~3 ~3 ~3 ~4 ~3 glass_pane

# Roof (simple gable)
fill ~-5 ~6 ~-4 ~5 ~6 ~4 spruce_stairs
fill ~-5 ~7 ~-3 ~5 ~7 ~3 spruce_stairs
fill ~-4 ~8 ~-2 ~4 ~8 ~2 spruce_planks

fill ~-5 ~6 ~-4 ~-5 ~6 ~4 spruce_stairs
fill ~-5 ~7 ~-3 ~-5 ~7 ~3 spruce_stairs

fill ~5 ~6 ~-4 ~5 ~6 ~4 spruce_stairs
fill ~5 ~7 ~-3 ~5 ~7 ~3 spruce_stairs

# Chimney
fill ~3 ~2 ~1 ~3 ~7 ~1 bricks
fill ~3 ~8 ~1 ~3 ~8 ~1 campfire

# Path + garden border
fill ~0 ~1 ~-6 ~0 ~1 ~-4 path_block
fill ~-6 ~1 ~-6 ~6 ~1 ~-6 cobblestone

# Flowers
setblock ~-5 ~1 ~-5 poppy
setblock ~-4 ~1 ~-5 dandelion
setblock ~-3 ~1 ~-5 azure_bluet
setblock ~3 ~1 ~-5 cornflower
setblock ~4 ~1 ~-5 oxeye_daisy

say Cozy Cottage built! 🏡
