package com.luokixi.visuals.server;

import com.luokixi.visuals.LuokixiVisuals;
import com.luokixi.visuals.network.VisualNetwork;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

@Mod.EventBusSubscriber(modid = LuokixiVisuals.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class VisualStateManager {
    private static final Map<UUID, FireEntry> ACTIVE_FIRE = new HashMap<>();
    private static final Map<UUID, BossSkinEntry> ACTIVE_BOSS_SKINS = new HashMap<>();

    private VisualStateManager() {}

    @SubscribeEvent
    public static void registerCommands(RegisterCommandsEvent event) {
        event.getDispatcher().register(
                Commands.literal("luokixi_visual")
                        .requires(source -> source.hasPermission(2))
                        .then(Commands.literal("fire")
                                .then(Commands.argument("target", EntityArgument.entity())
                                        .then(Commands.argument("level", IntegerArgumentType.integer(0, 3))
                                                .then(Commands.argument("duration", IntegerArgumentType.integer(0, 20 * 60))
                                                        .executes(context -> {
                                                            Entity entity = EntityArgument.getEntity(context, "target");
                                                            if (!(entity instanceof LivingEntity living)) {
                                                                context.getSource().sendFailure(Component.literal("目标不是生物。"));
                                                                return 0;
                                                            }
                                                            startFire(living, IntegerArgumentType.getInteger(context, "level"), IntegerArgumentType.getInteger(context, "duration"));
                                                            return 1;
                                                        })))))
                        .then(Commands.literal("fire_stop")
                                .then(Commands.argument("target", EntityArgument.entity())
                                        .executes(context -> {
                                            stopFire(EntityArgument.getEntity(context, "target"));
                                            return 1;
                                        })))
                        .then(Commands.literal("execution")
                                .then(Commands.argument("target", EntityArgument.entity())
                                        .then(Commands.argument("resonance", IntegerArgumentType.integer(0, 3))
                                                .executes(context -> {
                                                    VisualNetwork.sendExecution(EntityArgument.getEntity(context, "target"), IntegerArgumentType.getInteger(context, "resonance"));
                                                    return 1;
                                                }))))
                        .then(Commands.literal("boss_skin")
                                .then(Commands.argument("target", EntityArgument.entity())
                                        .then(Commands.literal("void_child")
                                                .executes(context -> setBossSkin(EntityArgument.getEntity(context, "target"), "void_child")))
                                        .then(Commands.literal("nightmare")
                                                .executes(context -> setBossSkin(EntityArgument.getEntity(context, "target"), "nightmare")))))
                        .then(Commands.literal("boss_skin_stop")
                                .then(Commands.argument("target", EntityArgument.entity())
                                        .executes(context -> {
                                            stopBossSkin(EntityArgument.getEntity(context, "target"));
                                            return 1;
                                        })))
                        .then(Commands.literal("status")
                                .executes(context -> {
                                    context.getSource().sendSuccess(
                                            () -> Component.literal("LuokixiVisuals 1.5.1 NO-LOBBY · 活跃神火/黑焰：" + ACTIVE_FIRE.size()
                                                    + " · Boss 材质：" + ACTIVE_BOSS_SKINS.size()
                                                    + " · 大厅功能：已移除"),
                                            false
                                    );
                                    return 1;
                                }))
        );
    }

    public static void startFire(LivingEntity entity, int level, int durationTicks) {
        MinecraftServer server = entity.getServer();
        if (server == null) return;
        int safeLevel = Math.max(0, Math.min(3, level));
        long expiresAt = durationTicks <= 0 ? 0L : server.overworld().getGameTime() + durationTicks;
        ACTIVE_FIRE.put(entity.getUUID(), new FireEntry(entity, safeLevel, expiresAt));
        VisualNetwork.sendFire(entity, safeLevel, true);
    }

    public static void stopFire(Entity entity) {
        if (entity == null) return;
        FireEntry removed = ACTIVE_FIRE.remove(entity.getUUID());
        VisualNetwork.sendFire(entity, removed == null ? 0 : removed.level, false);
    }

    public static int setBossSkin(Entity entity, String skin) {
        if (entity == null || !("void_child".equals(skin) || "nightmare".equals(skin))) return 0;
        ACTIVE_BOSS_SKINS.put(entity.getUUID(), new BossSkinEntry(entity, skin));
        VisualNetwork.sendBossSkin(entity, skin, true);
        return 1;
    }

    public static void stopBossSkin(Entity entity) {
        if (entity == null) return;
        BossSkinEntry removed = ACTIVE_BOSS_SKINS.remove(entity.getUUID());
        VisualNetwork.sendBossSkin(entity, removed == null ? "" : removed.skin, false);
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;
        MinecraftServer server = event.getServer();
        if (server.getTickCount() % 10 != 0) return;

        long gameTime = server.overworld().getGameTime();
        Iterator<Map.Entry<UUID, FireEntry>> fireIterator = ACTIVE_FIRE.entrySet().iterator();
        while (fireIterator.hasNext()) {
            FireEntry entry = fireIterator.next().getValue();
            LivingEntity entity = entry.entity;
            if (entity.isRemoved() || !entity.isAlive() || (entry.expiresAt > 0L && gameTime >= entry.expiresAt)) {
                if (!entity.isRemoved()) VisualNetwork.sendFire(entity, entry.level, false);
                fireIterator.remove();
                continue;
            }
            VisualNetwork.sendFire(entity, entry.level, true);
        }

        Iterator<Map.Entry<UUID, BossSkinEntry>> skinIterator = ACTIVE_BOSS_SKINS.entrySet().iterator();
        while (skinIterator.hasNext()) {
            BossSkinEntry entry = skinIterator.next().getValue();
            Entity entity = entry.entity;
            if (entity.isRemoved() || !entity.isAlive()) {
                if (!entity.isRemoved()) VisualNetwork.sendBossSkin(entity, entry.skin, false);
                skinIterator.remove();
                continue;
            }
            VisualNetwork.sendBossSkin(entity, entry.skin, true);
        }
    }

    private record FireEntry(LivingEntity entity, int level, long expiresAt) {}
    private record BossSkinEntry(Entity entity, String skin) {}
}
