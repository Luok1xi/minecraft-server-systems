package com.luokixi.visuals.mixin;

import com.luokixi.visuals.client.ClientVisualController;
import net.minecraft.client.renderer.entity.IronGolemRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.animal.IronGolem;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(IronGolemRenderer.class)
public abstract class IronGolemRendererMixin {
    @Inject(
            method = "getTextureLocation(Lnet/minecraft/world/entity/animal/IronGolem;)Lnet/minecraft/resources/ResourceLocation;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void luokixi$voidChildTexture(IronGolem entity, CallbackInfoReturnable<ResourceLocation> callback) {
        ResourceLocation skin = ClientVisualController.bossSkin(entity);
        if (skin != null) {
            callback.setReturnValue(skin);
        }
    }
}
