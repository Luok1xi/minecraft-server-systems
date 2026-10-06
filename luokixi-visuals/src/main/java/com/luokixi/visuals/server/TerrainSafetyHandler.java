package com.luokixi.visuals.server;

import com.luokixi.visuals.LuokixiVisuals;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.event.entity.EntityMobGriefingEvent;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

/**
 * 事件怪物只负责战斗，不允许利用原型生物的 mobGriefing 修改服务器建筑/地形。
 * 这里仅按 KubeJS 明确加上的标签拦截，不改变普通末影人、劫掠兽等原版行为。
 */
@Mod.EventBusSubscriber(modid = LuokixiVisuals.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class TerrainSafetyHandler {
    private TerrainSafetyHandler() {
    }

    @SubscribeEvent
    public static void onMobGriefing(EntityMobGriefingEvent event) {
        Entity entity = event.getEntity();
        if (entity == null) {
            return;
        }
        if (entity.getTags().contains("divine_void_child")
                || entity.getTags().contains("divine_nightmare")
                || entity.getTags().contains("blood_beast")
                || entity.getTags().contains("blood_shadow")) {
            event.setResult(Event.Result.DENY);
        }
    }
}
