/*
 * TNT Sword Mod
 * Created with Applaa
 * This mod makes your diamond sword spawn TNT when you hit mobs!
 */

public class TNTSwordMod {

    // This runs when a player hits something with their sword
    public void onPlayerAttack(Entity target, ItemStack weapon) {
        // Check if the weapon is a diamond sword
        if (weapon.getType().equals("diamond_sword")) {
            // Check if the target is a mob (not a player or block)
            if (target.isMob()) {
                // Get the mob's position
                Position pos = target.getPosition();
                
                // Spawn primed TNT at the mob's position with a short fuse (20 ticks = 1 second)
                World.spawnPrimedTNT(pos, 20); // 20 ticks = 1 second fuse
                
                // Show a particle effect where the TNT spawns
                World.spawnParticle("smoke", pos);
                
                // Play an explosion sound
                World.playSound(pos, "entity.tnt.primed");
            }
        }
    }

    // This runs when the player types a command
    public void onChatCommand(String command, String[] args) {
        if (command.equalsIgnoreCase("tntsword")) {
            // Give the player a diamond sword
            Player.giveItem("diamond_sword", 1);
            Player.sendMessage("Here's your TNT Sword! Hit mobs to make them explode!");
        }
    }

    // This runs when a player joins the world
    public void onPlayerJoin() {
        Player.sendMessage("Welcome to TNT Sword Mod! Type /tntsword to get your explosive sword!");
    }
}