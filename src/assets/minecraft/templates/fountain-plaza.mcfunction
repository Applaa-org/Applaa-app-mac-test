# Fountain Plaza

fill ~-10 ~0 ~-10 ~10 ~10 ~10 air
fill ~-10 ~0 ~-10 ~10 ~0 ~10 grass_block

# Plaza floor
fill ~-6 ~1 ~-6 ~6 ~1 ~6 smooth_quartz
fill ~-6 ~1 ~-6 ~6 ~1 ~-6 chiseled_quartz_block
fill ~-6 ~1 ~6 ~6 ~1 ~6 chiseled_quartz_block
fill ~-6 ~1 ~-6 ~-6 ~1 ~6 chiseled_quartz_block
fill ~6 ~1 ~-6 ~6 ~1 ~6 chiseled_quartz_block

# Fountain base
fill ~-2 ~2 ~-2 ~2 ~2 ~2 quartz_block
fill ~-1 ~3 ~-1 ~1 ~3 ~1 quartz_block

# Water bowl
fill ~-2 ~3 ~-2 ~2 ~3 ~2 air
fill ~-1 ~3 ~-1 ~1 ~3 ~1 water

# Center spout (simple pillar + glow)
fill ~0 ~4 ~0 ~0 ~6 ~0 quartz_pillar
setblock ~0 ~7 ~0 sea_lantern

# Corner lights
setblock ~-5 ~2 ~-5 sea_lantern
setblock ~5 ~2 ~-5 sea_lantern
setblock ~-5 ~2 ~5 sea_lantern
setblock ~5 ~2 ~5 sea_lantern

say Fountain Plaza complete! ⛲
