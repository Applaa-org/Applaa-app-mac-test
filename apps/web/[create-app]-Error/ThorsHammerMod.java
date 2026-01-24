import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;
import net.minecraft.core.BlockPos;
import net.minecraft.world.phys.HitResult;

public class ThorsHammerMod {
    
    // This runs when a player right-clicks with an item
    public void onRightClick(Player player, Level world) {
        // Check if player is holding an iron axe
        if (player.getMainHandItem().getItem() == Items.IRON_AXE) {
            // Call our Thor's Hammer ability
            useThorsHammer(player, world);
        }
    }
    
    private void useThorsHammer(Player player, Level world) {
        // Strike lightning at where the player is looking
        strikeLightning(player, world);
        
        // Push away all nearby mobs
        pushAwayMobs(player, world);
    }
    
    private void strikeLightning(Player player, Level world) {
        // Get the position the player is looking at
        HitResult hitResult = player.pick(20.0D, 0.0F, false);
        BlockPos targetPos = new BlockPos(
            (int) hitResult.getLocation().x,
            (int) hitResult.getLocation().y,
            (int) hitResult.getLocation().z
        );
        
        // Spawn lightning bolt at that position
        world.addFreshEntity(new LightningBoltEntity(world, targetPos));
        
        // Optional: Make it more dramatic during storms
        if (world.isThundering()) {
            // Extra lightning during storms!
            world.addFreshEntity(new LightningBoltEntity(world, targetPos));
        }
    }
    
    private void pushAwayMobs(Player player, Level world) {
        // Get all entities near the player (within 10 blocks)
        for (Entity entity : world.getEntities()) {
            // Check if it's a living entity (mob) and not the player
            if (entity instanceof LivingEntity && entity != player) {
                // Calculate distance to player
                double distance = entity.distanceTo(player);
                
                // Only affect mobs within 10 blocks
                if (distance <= 10.0D) {
                    // Calculate direction vector from player to mob
                    Vec3 direction = entity.position().subtract(player.position()).normalize();
                    
                    // Push the mob away (multiply by 2 for strength)
                    entity.push(direction.x * 2.0D, 0.5D, direction.z * 2.0D);
                }
            }
        }
    }
    
    // Helper class for lightning bolt (simplified)
    static class LightningBoltEntity {
        public LightningBoltEntity(Level world, BlockPos pos) {
            // In real mod, this would create actual lightning
            // For this example, we'll just show a message
            System.out.println("Lightning struck at: " + pos.getX() + ", " + pos.getY() + ", " + pos.getZ());
        }
    }
}