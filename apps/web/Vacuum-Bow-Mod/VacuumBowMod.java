import java.util.List;

/**
 * Vacuum Bow Mod
 * When an arrow lands, teleport all mobs within a 10-block radius to the arrow's location
 * and play a wind particle effect.
 */
public class VacuumBowMod {

    // This method is called when an arrow hits something
    public void onArrowHit(double x, double y, double z) {
        // Find all mobs within 10 blocks of the arrow's landing position
        List<Entity> nearbyMobs = World.getEntitiesWithinRadius(x, y, z, 10, "mob");
        
        // Teleport each mob to the arrow's location
        for (Entity mob : nearbyMobs) {
            mob.setPosition(x, y, z);
        }
        
        // Play wind particle effect at the arrow's location
        World.spawnParticle("wind", x, y, z);
        
        // Play a sound effect
        World.playSound(x, y, z, "entity.endermen.teleport", 1.0f, 1.0f);
    }
    
    // This method is called when a player joins the game
    public void onPlayerJoin() {
        Player.sendMessage("Welcome to the Vacuum Bow Mod!");
        Player.sendMessage("Shoot arrows to vacuum up nearby mobs!");
    }
    
    // This method is called when the player types a command
    public void onChatCommand(String command, String[] args) {
        if (command.equalsIgnoreCase("vacuumhelp")) {
            Player.sendMessage("§aVacuum Bow Mod Instructions:");
            Player.sendMessage("§b1. Craft a normal bow and arrows");
            Player.sendMessage("§b2. Shoot an arrow at the ground");
            Player.sendMessage("§b3. All mobs within 10 blocks will teleport to the arrow");
            Player.sendMessage("§b4. Wind particles will appear as mobs are vacuumed");
        }
    }
}