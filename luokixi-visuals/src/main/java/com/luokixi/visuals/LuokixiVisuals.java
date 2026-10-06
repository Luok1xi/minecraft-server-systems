package com.luokixi.visuals;

import com.luokixi.visuals.network.VisualNetwork;
import com.luokixi.visuals.sound.ModSounds;
import com.mojang.logging.LogUtils;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

@Mod(LuokixiVisuals.MOD_ID)
public final class LuokixiVisuals {
    public static final String MOD_ID = "luokixivisuals";
    public static final Logger LOGGER = LogUtils.getLogger();

    public LuokixiVisuals() {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();
        ModSounds.register(modEventBus);
        VisualNetwork.init();
        LOGGER.info("LuokixiVisuals 1.5.1 NO-LOBBY CLEAN initialized");
    }
}
