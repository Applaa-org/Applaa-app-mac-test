# Wooden Cottage
# A cozy 7x7 cottage with garden

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

say 🏡 Cottage built with garden!
