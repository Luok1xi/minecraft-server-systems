package com.luokixi.visuals.sound;

import com.luokixi.visuals.LuokixiVisuals;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModSounds {
    public static final DeferredRegister<SoundEvent> SOUND_EVENTS =
            DeferredRegister.create(ForgeRegistries.SOUND_EVENTS, LuokixiVisuals.MOD_ID);

    public static final RegistryObject<SoundEvent> RELIC_RAIN_HIT = register("relic_rain_hit");
    public static final RegistryObject<SoundEvent> RELIC_WIND_HIT = register("relic_wind_hit");
    public static final RegistryObject<SoundEvent> RELIC_TIDE_HIT = register("relic_tide_hit");
    public static final RegistryObject<SoundEvent> RELIC_HEARTH_HIT = register("relic_hearth_hit");
    public static final RegistryObject<SoundEvent> RELIC_EARTH_HIT = register("relic_earth_hit");
    public static final RegistryObject<SoundEvent> RELIC_SUN_HIT = register("relic_sun_hit");
    public static final RegistryObject<SoundEvent> RELIC_MOON_HIT = register("relic_moon_hit");
    public static final RegistryObject<SoundEvent> RELIC_DEATH_NAIL = register("relic_death_nail");
    public static final RegistryObject<SoundEvent> RELIC_ABYSS_HIT = register("relic_abyss_hit");
    public static final RegistryObject<SoundEvent> RELIC_WAR_HIT = register("relic_war_hit");
    public static final RegistryObject<SoundEvent> RELIC_THUNDER_HIT = register("relic_thunder_hit");

    public static final RegistryObject<SoundEvent> DEATH_COUNT_3 = register("death_count_3");
    public static final RegistryObject<SoundEvent> DEATH_COUNT_2 = register("death_count_2");
    public static final RegistryObject<SoundEvent> DEATH_COUNT_1 = register("death_count_1");
    public static final RegistryObject<SoundEvent> DEATH_COUNT_0 = register("death_count_0");
    public static final RegistryObject<SoundEvent> DEATH_SLASH = register("death_slash");
    public static final RegistryObject<SoundEvent> DEATH_VERDICT = register("death_verdict");
    public static final RegistryObject<SoundEvent> EARTH_BANISH = register("earth_banish");

    private ModSounds() {
    }

    private static RegistryObject<SoundEvent> register(String name) {
        ResourceLocation id = new ResourceLocation(LuokixiVisuals.MOD_ID, name);
        return SOUND_EVENTS.register(name, () -> SoundEvent.createVariableRangeEvent(id));
    }

    public static void register(IEventBus modEventBus) {
        SOUND_EVENTS.register(modEventBus);
    }
}
