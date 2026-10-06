package com.luokixi.visuals.client;

import com.luokixi.visuals.LuokixiVisuals;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Axis;
import net.minecraft.client.Camera;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.model.ModelBakery;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.client.event.RenderLevelStageEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Mod.EventBusSubscriber(modid = LuokixiVisuals.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class ClientVisualController {
    private static final ResourceLocation EXECUTION_SLASH = new ResourceLocation(
            LuokixiVisuals.MOD_ID,
            "textures/effect/execution_slash.png"
    );
    private static final ResourceLocation VOID_CHILD_SKIN = new ResourceLocation(
            LuokixiVisuals.MOD_ID,
            "textures/entity/void_child.png"
    );
    private static final ResourceLocation NIGHTMARE_SKIN = new ResourceLocation(
            LuokixiVisuals.MOD_ID,
            "textures/entity/nightmare.png"
    );

    private static final RenderType VANILLA_FIRE_RENDER_TYPE = RenderType.entityCutoutNoCull(ModelBakery.FIRE_0.atlasLocation());
    private static final RenderType SLASH_RENDER_TYPE = RenderType.entityTranslucent(EXECUTION_SLASH);

    private static final int STATE_TTL = 35;
    private static final int BOSS_SKIN_TTL = 35;
    private static final Map<Integer, FireVisualState> FIRE_STATES = new HashMap<>();
    private static final Map<Integer, BossSkinVisualState> BOSS_SKINS = new HashMap<>();
    private static final List<ExecutionVisualState> EXECUTIONS = new ArrayList<>();
    private static final Random RANDOM = new Random();
    private static long clientTick;

    private ClientVisualController() {
    }

    public static void acceptFireState(int entityId, int level, boolean active) {
        if (!active) {
            FIRE_STATES.remove(entityId);
            return;
        }
        FIRE_STATES.put(entityId, new FireVisualState(Mth.clamp(level, 0, 3), clientTick + STATE_TTL));
    }

    public static void acceptExecution(
            double x,
            double y,
            double z,
            float width,
            float height,
            int resonance,
            long seed
    ) {
        EXECUTIONS.add(new ExecutionVisualState(
                new Vec3(x, y, z),
                Math.max(0.6F, width),
                Math.max(1.0F, height),
                Mth.clamp(resonance, 0, 3),
                clientTick,
                seed
        ));
    }

    public static void acceptBossSkin(int entityId, String skin, boolean active) {
        if (!active || skin == null || skin.isBlank()) {
            BOSS_SKINS.remove(entityId);
            return;
        }
        if (!"void_child".equals(skin) && !"nightmare".equals(skin)) {
            BOSS_SKINS.remove(entityId);
            return;
        }
        BOSS_SKINS.put(entityId, new BossSkinVisualState(skin, clientTick + BOSS_SKIN_TTL));
    }


    public static ResourceLocation bossSkin(Entity entity) {
        if (entity == null) {
            return null;
        }
        BossSkinVisualState state = BOSS_SKINS.get(entity.getId());
        if (state == null || state.expiresAt < clientTick) {
            return null;
        }
        if ("void_child".equals(state.skin)) {
            return VOID_CHILD_SKIN;
        }
        if ("nightmare".equals(state.skin)) {
            return NIGHTMARE_SKIN;
        }
        return null;
    }

    public static float bossScale(Entity entity) {
        if (entity == null) {
            return 1.0F;
        }
        BossSkinVisualState state = BOSS_SKINS.get(entity.getId());
        if (state == null || state.expiresAt < clientTick) {
            return 1.0F;
        }
        if ("void_child".equals(state.skin)) {
            return 1.16F;
        }
        if ("nightmare".equals(state.skin)) {
            return 1.06F;
        }
        return 1.0F;
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }

        clientTick++;
        FIRE_STATES.entrySet().removeIf(entry -> entry.getValue().expiresAt < clientTick);
        BOSS_SKINS.entrySet().removeIf(entry -> entry.getValue().expiresAt < clientTick);
        EXECUTIONS.removeIf(effect -> clientTick - effect.startTick > 10L);

        Minecraft minecraft = Minecraft.getInstance();
        ClientLevel level = minecraft.level;
        if (level == null || minecraft.isPaused()) {
            return;
        }

        spawnFireParticles(level);
        spawnExecutionParticles(level);
    }

    @SubscribeEvent
    public static void onLogout(ClientPlayerNetworkEvent.LoggingOut event) {
        FIRE_STATES.clear();
        BOSS_SKINS.clear();
        EXECUTIONS.clear();
    }

    @SubscribeEvent
    public static void onRenderLevel(RenderLevelStageEvent event) {
        if (event.getStage() != RenderLevelStageEvent.Stage.AFTER_ENTITIES) {
            return;
        }

        Minecraft minecraft = Minecraft.getInstance();
        ClientLevel level = minecraft.level;
        if (level == null) {
            return;
        }

        PoseStack poseStack = event.getPoseStack();
        Camera camera = event.getCamera();
        Vec3 cameraPosition = camera.getPosition();
        float partialTick = event.getPartialTick();
        MultiBufferSource.BufferSource buffers = minecraft.renderBuffers().bufferSource();

        renderFires(level, poseStack, buffers, cameraPosition, partialTick);
        renderExecutions(poseStack, buffers, camera, cameraPosition, partialTick);

        buffers.endBatch(VANILLA_FIRE_RENDER_TYPE);
        buffers.endBatch(SLASH_RENDER_TYPE);
    }

    private static void renderFires(
            ClientLevel level,
            PoseStack poseStack,
            MultiBufferSource buffers,
            Vec3 cameraPosition,
            float partialTick
    ) {
        // 直接复用 Minecraft 自己的 FIRE_0 / FIRE_1 atlas sprite。
        // Material#buffer 会把 0..1 UV 映射到原版动画火焰，所以这里没有自制 flame_mask，也没有紫色贴图替代品。
        VertexConsumer fire0 = ModelBakery.FIRE_0.buffer(buffers, RenderType::entityCutoutNoCull);
        VertexConsumer fire1 = ModelBakery.FIRE_1.buffer(buffers, RenderType::entityCutoutNoCull);
        Iterator<Map.Entry<Integer, FireVisualState>> iterator = FIRE_STATES.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<Integer, FireVisualState> mapEntry = iterator.next();
            Entity rawEntity = level.getEntity(mapEntry.getKey());
            if (!(rawEntity instanceof LivingEntity entity) || entity.isRemoved()) {
                continue;
            }

            double x = Mth.lerp(partialTick, entity.xOld, entity.getX()) - cameraPosition.x;
            double y = Mth.lerp(partialTick, entity.yOld, entity.getY()) - cameraPosition.y;
            double z = Mth.lerp(partialTick, entity.zOld, entity.getZ()) - cameraPosition.z;

            poseStack.pushPose();
            poseStack.translate(x, y, z);
            drawFireBody(
                    poseStack,
                    fire0,
                    fire1,
                    Math.max(0.65F, entity.getBbWidth()),
                    Math.max(1.0F, entity.getBbHeight()),
                    mapEntry.getValue().level,
                    entity.tickCount + partialTick
            );
            poseStack.popPose();
        }
    }

    private static void drawFireBody(
            PoseStack poseStack,
            VertexConsumer fire0,
            VertexConsumer fire1,
            float entityWidth,
            float entityHeight,
            int level,
            float age
    ) {
        int[][] colors;
        if (level >= 3) {
            // 满命黑焰：只把原版火焰 sprite 压暗，不再加入紫色。
            // 直接把原版 FIRE_0/FIRE_1 压到近黑/纯黑；不混入紫色，也不使用自制火焰贴图。
            colors = new int[][]{
                    {8, 8, 8, 220},
                    {1, 1, 1, 240},
                    {0, 0, 0, 252}
            };
        } else if (level == 2) {
            colors = new int[][]{
                    {255, 132, 54, 205},
                    {255, 86, 28, 228},
                    {255, 196, 92, 235}
            };
        } else if (level == 1) {
            colors = new int[][]{
                    {255, 170, 76, 196},
                    {255, 104, 32, 220},
                    {255, 218, 118, 230}
            };
        } else {
            // 本体直接保留接近原版火焰色彩。
            colors = new int[][]{
                    {255, 235, 210, 190},
                    {255, 190, 130, 215},
                    {255, 245, 220, 226}
            };
        }

        float baseRadius = Math.max(0.16F, entityWidth * 0.27F);
        float baseWidth = Math.max(0.46F, entityWidth * 0.76F);
        float height = Math.max(1.05F, entityHeight * (level >= 3 ? 1.12F : 1.05F));
        int[] sheetsPerLayer = level >= 3 ? new int[]{7, 6, 4} : new int[]{6, 5, 3};

        // 几层真正的原版火焰贴图交错围住实体。动画来自 Minecraft atlas 本身，
        // 这里只改变尺寸、位置和 tint，所以看到的是原版火焰在自然跳动，而不是紫色粒子团。
        for (int layer = 0; layer < colors.length; layer++) {
            int sheetCount = sheetsPerLayer[layer];
            float layerScale = layer == 0 ? 1.12F : (layer == 1 ? 0.92F : 0.70F);
            for (int index = 0; index < sheetCount; index++) {
                float wave = (float) Math.sin(age * (0.11F + layer * 0.015F) + index * 1.83F);
                float angle = index * (360.0F / sheetCount)
                        + layer * 17.0F
                        + age * (layer == 0 ? -0.16F : 0.11F);
                float localHeight = height * layerScale
                        * (0.72F + (index % 3) * 0.10F + wave * 0.045F);
                float localWidth = baseWidth * layerScale
                        * (0.82F + ((index + layer) % 2) * 0.13F);
                float yOffset = -0.04F + (index % 3) * entityHeight * 0.055F;
                float radius = baseRadius * layerScale * (0.78F + (index % 2) * 0.20F);
                VertexConsumer consumer = ((index + layer) & 1) == 0 ? fire0 : fire1;

                drawVanillaFireSheet(
                        poseStack,
                        consumer,
                        localWidth,
                        localHeight,
                        radius,
                        angle,
                        yOffset,
                        ((index + layer) & 2) != 0,
                        colors[layer][0],
                        colors[layer][1],
                        colors[layer][2],
                        colors[layer][3]
                );
            }
        }

        // 少量更高、更窄的火舌，继续使用 FIRE_0/FIRE_1，而不是任何自定义遮罩。
        int[] upper = level >= 3 ? colors[0] : colors[2];
        for (int index = 0; index < 3; index++) {
            drawVanillaFireSheet(
                    poseStack,
                    (index & 1) == 0 ? fire1 : fire0,
                    baseWidth * (0.44F + index * 0.05F),
                    height * (0.36F + index * 0.045F),
                    baseRadius * (0.50F + index * 0.07F),
                    34.0F + index * 118.0F - age * 0.10F,
                    entityHeight * (0.47F + (index % 2) * 0.11F),
                    (index & 1) != 0,
                    upper[0], upper[1], upper[2], upper[3]
            );
        }
    }

    private static void drawVanillaFireSheet(
            PoseStack poseStack,
            VertexConsumer consumer,
            float width,
            float height,
            float radius,
            float angle,
            float yOffset,
            boolean flipU,
            int red,
            int green,
            int blue,
            int alpha
    ) {
        poseStack.pushPose();
        poseStack.mulPose(Axis.YP.rotationDegrees(angle));
        poseStack.translate(0.0D, yOffset, radius);

        float halfWidth = width * 0.5F;
        float u0 = flipU ? 1.0F : 0.0F;
        float u1 = flipU ? 0.0F : 1.0F;
        PoseStack.Pose pose = poseStack.last();

        vertex(consumer, pose, -halfWidth, 0.0F, 0.0F, u0, 1.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, halfWidth, 0.0F, 0.0F, u1, 1.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, halfWidth, height, 0.0F, u1, 0.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, -halfWidth, height, 0.0F, u0, 0.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        poseStack.popPose();
    }

    private static void renderExecutions(
            PoseStack poseStack,
            MultiBufferSource buffers,
            Camera camera,
            Vec3 cameraPosition,
            float partialTick
    ) {
        VertexConsumer slashConsumer = buffers.getBuffer(SLASH_RENDER_TYPE);

        for (ExecutionVisualState effect : EXECUTIONS) {
            float age = clientTick + partialTick - effect.startTick;
            if (age < 0.0F || age > 7.0F) {
                continue;
            }

            // 处刑只保留一条“判定线”：极快出现，极快消失。没有法阵、红月、第二刀。
            float alpha;
            if (age < 1.0F) {
                alpha = Mth.clamp(age, 0.0F, 1.0F);
            } else {
                alpha = Mth.clamp((7.0F - age) / 6.0F, 0.0F, 1.0F);
            }
            float slashWidth = Math.max(2.6F, effect.width * 3.15F);
            float slashHeight = Math.max(0.10F, effect.height * 0.075F);

            poseStack.pushPose();
            poseStack.translate(
                    effect.position.x - cameraPosition.x,
                    effect.position.y - cameraPosition.y + effect.height * 0.53D,
                    effect.position.z - cameraPosition.z
            );
            poseStack.mulPose(Axis.YP.rotationDegrees(-camera.getYRot()));
            poseStack.mulPose(Axis.ZP.rotationDegrees(-17.0F));
            drawCenteredVerticalQuad(
                    poseStack,
                    slashConsumer,
                    slashWidth,
                    slashHeight,
                    126,
                    0,
                    effect.resonance >= 3 ? 30 : 18,
                    (int) (250.0F * alpha)
            );
            poseStack.popPose();
        }
    }

    private static void drawHorizontalQuad(
            PoseStack poseStack,
            VertexConsumer consumer,
            float radius,
            int red,
            int green,
            int blue,
            int alpha
    ) {
        PoseStack.Pose pose = poseStack.last();
        vertex(consumer, pose, -radius, 0.0F, -radius, 0.0F, 0.0F, red, green, blue, alpha, 0.0F, 1.0F, 0.0F);
        vertex(consumer, pose, -radius, 0.0F, radius, 0.0F, 1.0F, red, green, blue, alpha, 0.0F, 1.0F, 0.0F);
        vertex(consumer, pose, radius, 0.0F, radius, 1.0F, 1.0F, red, green, blue, alpha, 0.0F, 1.0F, 0.0F);
        vertex(consumer, pose, radius, 0.0F, -radius, 1.0F, 0.0F, red, green, blue, alpha, 0.0F, 1.0F, 0.0F);
    }

    private static void drawCenteredVerticalQuad(
            PoseStack poseStack,
            VertexConsumer consumer,
            float width,
            float height,
            int red,
            int green,
            int blue,
            int alpha
    ) {
        PoseStack.Pose pose = poseStack.last();
        float halfWidth = width * 0.5F;
        float halfHeight = height * 0.5F;
        vertex(consumer, pose, -halfWidth, -halfHeight, 0.0F, 0.0F, 1.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, halfWidth, -halfHeight, 0.0F, 1.0F, 1.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, halfWidth, halfHeight, 0.0F, 1.0F, 0.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
        vertex(consumer, pose, -halfWidth, halfHeight, 0.0F, 0.0F, 0.0F, red, green, blue, alpha, 0.0F, 0.0F, 1.0F);
    }

    private static void vertex(
            VertexConsumer consumer,
            PoseStack.Pose pose,
            float x,
            float y,
            float z,
            float u,
            float v,
            int red,
            int green,
            int blue,
            int alpha,
            float normalX,
            float normalY,
            float normalZ
    ) {
        consumer.vertex(pose.pose(), x, y, z)
                .color(red, green, blue, alpha)
                .uv(u, v)
                .overlayCoords(OverlayTexture.NO_OVERLAY)
                .uv2(LightTexture.FULL_BRIGHT)
                .normal(pose.normal(), normalX, normalY, normalZ)
                .endVertex();
    }

    private static void spawnFireParticles(ClientLevel level) {
        // 持续燃烧阶段刻意克制：每四 tick 最多生成一颗主体粒子；
        // 黑焰的“火”由渲染层负责，粒子只承担烟、灰烬和偶发能量逸散。
        if (clientTick % 4L != 0L) {
            return;
        }

        for (Map.Entry<Integer, FireVisualState> entry : FIRE_STATES.entrySet()) {
            Entity rawEntity = level.getEntity(entry.getKey());
            if (!(rawEntity instanceof LivingEntity entity) || !entity.isAlive()) {
                continue;
            }

            double spread = Math.max(0.34D, entity.getBbWidth() * 0.54D);
            double x = entity.getX() + (RANDOM.nextDouble() - 0.5D) * spread;
            double y = entity.getY() + 0.18D + RANDOM.nextDouble() * entity.getBbHeight() * 0.88D;
            double z = entity.getZ() + (RANDOM.nextDouble() - 0.5D) * spread;

            if (entry.getValue().level >= 3) {
                level.addParticle(
                        RANDOM.nextBoolean() ? ParticleTypes.LARGE_SMOKE : ParticleTypes.ASH,
                        x, y, z,
                        (RANDOM.nextDouble() - 0.5D) * 0.006D,
                        0.018D + RANDOM.nextDouble() * 0.012D,
                        (RANDOM.nextDouble() - 0.5D) * 0.006D
                );
            } else {
                level.addParticle(
                        RANDOM.nextBoolean() ? ParticleTypes.FLAME : ParticleTypes.SMOKE,
                        x, y, z,
                        0.0D, 0.014D, 0.0D
                );
            }
        }
    }

    private static void spawnExecutionParticles(ClientLevel level) {
        for (ExecutionVisualState effect : EXECUTIONS) {
            long age = clientTick - effect.startTick;
            if (age < 1L || age > 4L) {
                continue;
            }

            // 斩线附近只留极少量灰烬；声音和停顿承担绝大部分重量。
            if ((age + effect.seed) % 2L == 0L) {
                double spread = Math.max(0.30D, effect.width * 0.46D);
                level.addParticle(
                        ParticleTypes.ASH,
                        effect.position.x + (RANDOM.nextDouble() - 0.5D) * spread,
                        effect.position.y + effect.height * (0.42D + RANDOM.nextDouble() * 0.18D),
                        effect.position.z + (RANDOM.nextDouble() - 0.5D) * spread,
                        0.0D,
                        0.022D,
                        0.0D
                );
            }
        }
    }

    private record BossSkinVisualState(String skin, long expiresAt) {
    }

    private record FireVisualState(int level, long expiresAt) {
    }

    private record ExecutionVisualState(
            Vec3 position,
            float width,
            float height,
            int resonance,
            long startTick,
            long seed
    ) {
    }
}
