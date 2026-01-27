# Quick Shelter
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

say 🏠 Quick shelter built!
