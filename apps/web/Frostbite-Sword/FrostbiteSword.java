import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.InteractionHand;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;

// Simple tool tier for our frost sword
class FrostToolTier implements Tier {
    public int getUses() { return 2000; }
    public float getSpeed() { return 8.0f; }
    public float getAttackDamageBonus() { return 6.0f; }
    public int getLevel() { return 3; }
    public int getEnchantmentValue() { return 20; }
    public net.minecraft.world.item.crafting.Ingredient getRepairIngredient() { return net.minecraft.world.item.crafting.Ingredient.of(net.minecraft.world.level.block.Blocks.PACKED_ICE); }
}

public class FrostbiteSword extends SwordItem {
    
    public FrostbiteSword() {
        super(new FrostToolTier(), 3, -2.4f, new Item.Properties().tab(CreativeModeTab.TAB_COMBAT));
    }
    
    // When we hit an entity with our sword
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        Level world = target.level();
        
        // Only do this on the server side
        if (!world.isClientSide()) {
            BlockPos targetPos = target.blockPosition();
            
            // Apply slowness effect for 5 seconds (100 ticks)
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 100, 9));
            
            // Play icy sound
            world.playSound(null, targetPos, SoundEvents.GLASS_BREAK, SoundSource.PLAYERS, 1.0F, 1.0F);
            
            // Place packed ice around the mob in a small cube
            for (int x = -1; x <= 1; x++) {
                for (int y = 0; y <= 2; y++) {
                    for (int z = -1; z <= 1; z++) {
                        BlockPos pos = targetPos.offset(x, y, z);
                        
                        // Don't replace the block the mob is standing on
                        if (pos.equals(targetPos.below())) continue;
                        
                        // Only place ice if there's air there
                        if (world.isEmptyBlock(pos)) {
                            world.setBlockAndUpdate(pos, Blocks.PACKED_ICE.defaultBlockState());
                        }
                    }
                }
            }
        }
        
        return super.hurtEnemy(stack, target, attacker);
    }
    
    // Command to give the player the frostbite sword
    public void onChatCommand(String command, String[] args, Player player) {
        if (command.equalsIgnoreCase("give") && args.length > 0 && args[0].equalsIgnoreCase("frostbite_sword")) {
            ItemStack sword = new ItemStack(this);
            sword.setHoverName(Component.literal("Frostbite Sword"));
            player.getInventory().add(sword);
            player.displayClientMessage(Component.literal("You received the Frostbite Sword!"), false);
        }
    }
    
    // Make sure we register our item properly
    public static final FrostbiteSword ITEM = new FrostbiteSword();
}