package com.luokixi.visuals.server;

import com.luokixi.visuals.LuokixiVisuals;
import net.minecraft.ChatFormatting;
import net.minecraft.advancements.CriteriaTriggers;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.stats.Stats;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = LuokixiVisuals.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class GodslayerTotemHandler {
    private static final String ITEM_ID = "kubejs:godslayer_totem";
    private static final String CHARGES_KEY = "DivineCharges";
    private static final String LAST_TICK_KEY = "luokixiGodslayerLastTick";

    private GodslayerTotemHandler() {
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onLivingDeath(LivingDeathEvent event) {
        if (event.isCanceled() || !(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }

        // 与原版不死图腾一致：/kill、虚空等绕过无敌的伤害不能被图腾拦截。
        if (event.getSource().is(DamageTypeTags.BYPASSES_INVULNERABILITY)) {
            return;
        }

        InteractionHand hand = findTotemHand(player);
        if (hand == null) {
            return;
        }

        long gameTime = player.serverLevel().getGameTime();
        CompoundTag persistent = player.getPersistentData();
        if (persistent.contains(LAST_TICK_KEY, Tag.TAG_ANY_NUMERIC)
                && persistent.getLong(LAST_TICK_KEY) == gameTime) {
            return;
        }
        persistent.putLong(LAST_TICK_KEY, gameTime);
        persistent.putLong("godslayerPreventStripUntil", System.currentTimeMillis() + 1500L);

        ItemStack held = player.getItemInHand(hand);
        ItemStack activationCopy = held.copy();
        int charges = readCharges(held);
        int nextCharges = charges - 1;

        event.setCanceled(true);

        player.awardStat(Stats.ITEM_USED.get(held.getItem()));
        CriteriaTriggers.USED_TOTEM.trigger(player, activationCopy);

        if (nextCharges <= 0) {
            held.shrink(1);
        } else {
            held.getOrCreateTag().putInt(CHARGES_KEY, nextCharges);
            updateChargeLore(held, nextCharges);
        }

        // 完整照搬 Minecraft 1.20.1 原版不死图腾的恢复数据。
        player.setHealth(1.0F);
        player.removeAllEffects();
        player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 900, 1));
        player.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 100, 1));
        player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 800, 0));

        // 35 是原版图腾事件：声音、绿色粒子和占据屏幕的完整动画都会触发。
        player.level().broadcastEntityEvent(player, (byte) 35);

        player.displayClientMessage(
                Component.literal(nextCharges > 0
                                ? "✦ 弑神图腾替你否决了死亡。剩余 " + nextCharges + "/5"
                                : "✦ 第五次复活完成，弑神图腾已经耗尽。")
                        .withStyle(ChatFormatting.GOLD),
                true
        );
    }

    private static InteractionHand findTotemHand(ServerPlayer player) {
        for (InteractionHand hand : InteractionHand.values()) {
            ItemStack stack = player.getItemInHand(hand);
            if (!stack.isEmpty()
                    && ITEM_ID.equals(BuiltInRegistries.ITEM.getKey(stack.getItem()).toString())
                    && readCharges(stack) > 0) {
                return hand;
            }
        }
        return null;
    }

    private static int readCharges(ItemStack stack) {
        CompoundTag tag = stack.getTag();
        if (tag == null || !tag.contains(CHARGES_KEY, Tag.TAG_ANY_NUMERIC)) {
            return 5;
        }
        return Math.max(0, Math.min(5, tag.getInt(CHARGES_KEY)));
    }

    private static void updateChargeLore(ItemStack stack, int charges) {
        CompoundTag display = stack.getOrCreateTagElement("display");
        ListTag lore = display.getList("Lore", Tag.TAG_STRING);
        String json = Component.Serializer.toJson(
                Component.literal("裂纹 · " + charges + "/5")
                        .withStyle(style -> style
                                .withColor(ChatFormatting.GOLD)
                                .withBold(true)
                                .withItalic(false))
        );

        boolean replaced = false;
        for (int index = 0; index < lore.size(); index++) {
            String line = lore.getString(index);
            if (line.contains("裂纹") && line.contains("/5")) {
                lore.set(index, StringTag.valueOf(json));
                replaced = true;
                break;
            }
        }

        if (!replaced) {
            lore.add(StringTag.valueOf(json));
        }
        display.put("Lore", lore);
    }
}
