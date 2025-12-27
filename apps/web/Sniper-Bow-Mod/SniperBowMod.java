/*
 * Sniper Bow Mod
 * Makes arrows fly straight and fast like a laser!
 */

public class SniperBowMod {

    // This runs when an arrow is shot from a bow
    public void onArrowShot(Entity arrow) {
        // Make arrow go 5x faster
        arrow.setVelocity(arrow.getMotionX() * 5, arrow.getMotionY() * 5, arrow.getMotionZ() * 5);
        
        // Remove gravity so arrow flies straight
        arrow.setGravity(0);
        
        // Show cool message in chat
        Player.sendMessage("§aTarget Locked!");
        
        // Add some particle effects for extra coolness
        World.spawnParticle("crit", arrow.getX(), arrow.getY(), arrow.getZ());
    }

    // This runs when player joins the game
    public void onPlayerJoin() {
        Player.sendMessage("§bWelcome to Sniper Bow Mod! Shoot arrows for Target Locked action!");
    }
}