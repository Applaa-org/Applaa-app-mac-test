/*
 * Thor's Hammer Mod
 * Turn your iron axe into the mighty Mjölnir!
 */

public class ThorsHammerMod {
    
    // This runs when a player right-clicks with an item
    public void onPlayerRightClick(Player player, ItemStack itemInHand, BlockPos targetBlock) {
        // Check if player is holding an iron axe
        if (itemInHand != null && itemInHand.getType().equals("iron_axe")) {
            
            // Strike lightning at the block the player is looking at
            World.strikeLightning(targetBlock);
            
            // Create a cool particle effect
            World.spawnParticle("explode", targetBlock, 10);
            
            // Push all nearby mobs away (10 block radius)
            Entity[] nearbyEntities = World.getEntitiesNear(targetBlock, 10);
            
            for (Entity entity : nearbyEntities) {
                // Only affect mobs (not players or items)
                if (entity.getType().contains("mob") || entity.getType().contains("monster")) {
                    // Calculate direction away from player
                    double dx = entity.getX() - player.getX();
                    double dz = entity.getZ() - player.getZ();
                    
                    // Normalize and apply force
                    double distance = Math.sqrt(dx*dx + dz*dz);
                    if (distance > 0) {
                        dx = dx / distance * 2; // Push strength
                        dz = dz / distance * 2;
                        
                        entity.setVelocity(dx, 0.5, dz); // Push away with upward motion
                    }
                }
            }
            
            // Play thunder sound
            World.playSound(targetBlock, "entity.lightning_bolt.thunder", 1.0f);
        }
    }
    
    // Welcome message when player joins
    public void onPlayerJoin(Player player) {
        player.sendMessage("§bThor's Hammer Mod Loaded! Hold an iron axe and right-click to strike!");
    }
}