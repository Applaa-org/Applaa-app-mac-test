# Massive 3D Pixel Art Heart Structure
# 15+ blocks tall and wide, hovering off ground
# Red wool/concrete with white wool highlights for glossy effect

# Clear area first
fill ~-10 ~0 ~-10 ~10 ~20 ~10 air

# Base position: hovering 2 blocks off ground
# Heart will be centered and built upward

# Layer 1 (bottom tip) - Y+2
fill ~0 ~2 ~0 ~0 ~2 ~0 red_concrete

# Layer 2 - Y+3
fill ~-1 ~3 ~-1 ~1 ~3 ~1 red_wool

# Layer 3 - Y+4
fill ~-2 ~4 ~-2 ~2 ~4 ~2 red_concrete
setblock ~-2 ~4 ~0 white_wool
setblock ~2 ~4 ~0 white_wool

# Layer 4 - Y+5
fill ~-3 ~5 ~-3 ~3 ~5 ~3 red_wool
fill ~-2 ~5 ~-2 ~2 ~5 ~2 red_concrete
setblock ~-3 ~5 ~0 white_wool
setblock ~3 ~5 ~0 white_wool
setblock ~0 ~5 ~-3 white_wool

# Layer 5 - Y+6
fill ~-4 ~6 ~-4 ~4 ~6 ~4 red_concrete
fill ~-3 ~6 ~-3 ~3 ~6 ~3 red_wool
setblock ~-4 ~6 ~0 white_wool
setblock ~4 ~6 ~0 white_wool
setblock ~0 ~6 ~-4 white_wool

# Layer 6 - Y+7
fill ~-5 ~7 ~-4 ~5 ~7 ~4 red_wool
fill ~-4 ~7 ~-3 ~4 ~7 ~3 red_concrete
setblock ~-5 ~7 ~0 white_wool
setblock ~5 ~7 ~0 white_wool
setblock ~0 ~7 ~-4 white_wool

# Layer 7 - Y+8
fill ~-6 ~8 ~-4 ~6 ~8 ~4 red_concrete
fill ~-5 ~8 ~-3 ~5 ~8 ~3 red_wool
setblock ~-6 ~8 ~0 white_wool
setblock ~6 ~8 ~0 white_wool
setblock ~-1 ~8 ~-4 white_wool
setblock ~1 ~8 ~-4 white_wool

# Layer 8 - Y+9 (widest part)
fill ~-7 ~9 ~-4 ~7 ~9 ~4 red_wool
fill ~-6 ~9 ~-3 ~6 ~9 ~3 red_concrete
setblock ~-7 ~9 ~0 white_wool
setblock ~7 ~9 ~0 white_wool
setblock ~-2 ~9 ~-4 white_wool
setblock ~2 ~9 ~-4 white_wool

# Layer 9 - Y+10 (start of top curves)
fill ~-7 ~10 ~-3 ~-4 ~10 ~3 red_concrete
fill ~4 ~10 ~-3 ~7 ~10 ~3 red_concrete
fill ~-3 ~10 ~-2 ~3 ~10 ~2 air
fill ~-6 ~10 ~-2 ~-5 ~10 ~2 red_wool
fill ~5 ~10 ~-2 ~6 ~10 ~2 red_wool
setblock ~-7 ~10 ~0 white_wool
setblock ~7 ~10 ~0 white_wool

# Layer 10 - Y+11 (heart top curves)
fill ~-7 ~11 ~-2 ~-4 ~11 ~2 red_wool
fill ~4 ~11 ~-2 ~7 ~11 ~2 red_wool
fill ~-3 ~11 ~-1 ~3 ~11 ~1 air
setblock ~-7 ~11 ~0 white_wool
setblock ~-4 ~11 ~0 white_wool
setblock ~4 ~11 ~0 white_wool
setblock ~7 ~11 ~0 white_wool

# Layer 11 - Y+12
fill ~-6 ~12 ~-2 ~-4 ~12 ~2 red_concrete
fill ~4 ~12 ~-2 ~6 ~12 ~2 red_concrete
setblock ~-6 ~12 ~0 white_wool
setblock ~6 ~12 ~0 white_wool

# Layer 12 - Y+13
fill ~-6 ~13 ~-1 ~-4 ~13 ~1 red_wool
fill ~4 ~13 ~-1 ~6 ~13 ~1 red_wool
setblock ~-5 ~13 ~0 white_wool
setblock ~5 ~13 ~0 white_wool

# Layer 13 - Y+14
fill ~-5 ~14 ~-1 ~-4 ~14 ~1 red_concrete
fill ~4 ~14 ~-1 ~5 ~14 ~1 red_concrete

# Layer 14 - Y+15 (top bumps)
fill ~-5 ~15 ~0 ~-4 ~15 ~0 red_wool
fill ~4 ~15 ~0 ~5 ~15 ~0 red_wool

# Layer 15 - Y+16 (very top)
setblock ~-4 ~16 ~0 red_concrete
setblock ~4 ~16 ~0 red_concrete

# Add depth layers (back side) for 3D effect
# Back layers Z+1 to Z+4
fill ~-6 ~6 ~1 ~6 ~9 ~4 red_concrete
fill ~-5 ~7 ~2 ~5 ~8 ~3 red_wool
fill ~-7 ~10 ~1 ~-4 ~11 ~3 red_wool
fill ~4 ~10 ~1 ~7 ~11 ~3 red_wool

# White highlights on back
setblock ~-6 ~8 ~4 white_wool
setblock ~6 ~8 ~4 white_wool
setblock ~0 ~7 ~4 white_wool

# Front depth layers Z-1 to Z-4 for full 3D
fill ~-6 ~6 ~-5 ~6 ~9 ~-5 red_wool
fill ~-5 ~7 ~-6 ~5 ~8 ~-5 red_concrete

# Top glossy highlights
setblock ~-5 ~14 ~0 white_wool
setblock ~5 ~14 ~0 white_wool
setblock ~0 ~8 ~0 white_wool
setblock ~-3 ~10 ~-3 white_wool
setblock ~3 ~10 ~-3 white_wool

say Massive 3D Pixel Art Heart created! ❤️
