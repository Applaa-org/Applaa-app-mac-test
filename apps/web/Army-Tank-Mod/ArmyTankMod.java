/*
 * Army Tank Mod
 * Turn your minecart into a powerful tank!
 */
public class ArmyTankMod {
    
    // Check if player is in a minecart and give resistance
    public void onPlayerTick() {
        if (Player.isRiding("minecart")) {
            Player.addPotionEffect("resistance", 5, 100); // Resistance 5 for 5 seconds
        }
    }
    
    // Handle the /fire command
    public void onChatCommand(String command, String[] args) {
        if (command.equalsIgnoreCase("fire")) {
            // Shoot a large fireball in the direction the player is looking
            Entity.fireball = World.spawnEntity("fireball", Player.getPosition());
            
            // Make the fireball shoot in the direction the player is facing
            double[] direction = Player.getLookDirection();
            Entity.setVelocity(fireball, direction[0] * 2, direction[1] * 2, direction[2] * 2);
            
            Player.sendMessage("§cFIRE! §6Tank firing mode activated!");
            
            // Play a sound effect
            World.playSound(Player.getPosition(), "entity.ghast.shoot", 1.0f);
        }
    }
    
    // Welcome message when player joins
    public void onPlayerJoin() {
        Player.sendMessage("§a§lArmy Tank Mod Loaded!");
        Player.sendMessage("§bRide a minecart for Resistance 5!");
        Player.sendMessage("§cType /fire to shoot fireballs!");
    }
}