package com.luokixi.visuals.mixin;

import com.luokixi.visuals.client.ClientVisualController;
import net.minecraft.client.renderer.entity.EndermanRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.EnderMan;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(EndermanRenderer.class)
public abstract class EndermanRendererMixin {
    @Inject(
            method = "getTextureLocation(Lnet/minecraft/world/entity/monster/EnderMan;)Lnet/minecraft/resources/ResourceLocation;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void luokixi$nightmareTexture(EnderMan entity, CallbackInfoReturnable<ResourceLocation> callback) {
        ResourceLocation skin = ClientVisualController.bossSkin(entity);
        if (skin != null) {
            callback.setReturnValue(skin);
        }
    }
}
