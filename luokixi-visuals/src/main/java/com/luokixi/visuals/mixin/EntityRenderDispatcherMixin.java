package com.luokixi.visuals.mixin;

import com.luokixi.visuals.client.ClientVisualController;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(value = EntityRenderDispatcher.class, priority = 1100)
public abstract class EntityRenderDispatcherMixin {
    private static final ThreadLocal<Integer> LUOKIXI_RENDER_DEPTH = ThreadLocal.withInitial(() -> 0);

    @Inject(
            method = "render",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/client/renderer/entity/EntityRenderer;render(Lnet/minecraft/world/entity/Entity;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
                    shift = At.Shift.BEFORE
            )
    )
    private void luokixi$beforeEntityRenderer(
            Entity entity, double x, double y, double z, float yaw, float partialTick,
            PoseStack poseStack, MultiBufferSource buffers, int packedLight, CallbackInfo callbackInfo
    ) {
        float bossScale = ClientVisualController.bossScale(entity);
        if (Math.abs(bossScale - 1.0F) <= 0.001F) {
            return;
        }
        poseStack.pushPose();
        LUOKIXI_RENDER_DEPTH.set(LUOKIXI_RENDER_DEPTH.get() + 1);
        poseStack.scale(bossScale, bossScale, bossScale);
    }

    @Inject(
            method = "render",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/client/renderer/entity/EntityRenderer;render(Lnet/minecraft/world/entity/Entity;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
                    shift = At.Shift.AFTER
            )
    )
    private void luokixi$afterEntityRenderer(
            Entity entity, double x, double y, double z, float yaw, float partialTick,
            PoseStack poseStack, MultiBufferSource buffers, int packedLight, CallbackInfo callbackInfo
    ) {
        if (Math.abs(ClientVisualController.bossScale(entity) - 1.0F) <= 0.001F) {
            return;
        }
        int depth = LUOKIXI_RENDER_DEPTH.get();
        if (depth <= 0) {
            return;
        }
        poseStack.popPose();
        if (depth == 1) {
            LUOKIXI_RENDER_DEPTH.remove();
        } else {
            LUOKIXI_RENDER_DEPTH.set(depth - 1);
        }
    }
}
