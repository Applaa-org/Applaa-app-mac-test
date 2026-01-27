/*
 * Frostbite Sword Mod
 * Created for Minecraft Education
 */
public class FrostbiteSwordMod {

    // This runs when a player hits something with a weapon
    public void onPlayerAttack(Entity target, ItemStack weapon) {
        // Check if the weapon is our Frostbite Sword
        if (weapon != null && weapon.getDisplayName().equals("Frostbite Sword")) {
            
            // Surround the mob with packed ice
            Location mobLoc = target.getLocation();
            World.setBlock(mobLoc.getX()+1, mobLoc.getY(), mobLoc.getZ(), "packed_ice");
            World.setBlock(mobLoc.getX()-1, mobLoc.getY(), mobLoc.getZ(), "packed_ice");
            World.setBlock(mobLoc.getX(), mobLoc.getY(), mobLoc.getZ()+1, "packed_ice");
            World.setBlock(mobLoc.getX(), mobLoc.getY(), mobLoc.getZ()-1, "packed_ice");
            World.setBlock(mobLoc.getX(), mobLoc.getY()+1, mobLoc.getZ(), "packed_ice");
            World.setBlock(mobLoc.getX(), mobLoc.getY()-1, mobLoc.getZ(), "packed_ice");
            
            // Give the mob Slowness 10 for 5 seconds (100 ticks)
            target.addPotionEffect("slowness", 10, 100);
            
            // Show some cool particles
            World.spawnParticle("snowflake", mobLoc);
        }
    }
    
    // This runs when the player types a command
    public void onChatCommand(String command, String[] args) {
        if (command.equalsIgnoreCase("frostbite")) {
            // Give the player a Frostbite Sword
            ItemStack sword = new ItemStack("diamond_sword");
            sword.setDisplayName("Frostbite Sword");
            sword.setLore("Freezes enemies on hit!");
            Player.giveItem(sword);
            Player.sendMessage("You received a Frostbite Sword! Use it to freeze mobs.");
        }
    }
    
    // This runs when player joins the world
    public void onPlayerJoin() {
        Player.sendMessage("Welcome! Type /frostbite to get your Frostbite Sword");
    }
}