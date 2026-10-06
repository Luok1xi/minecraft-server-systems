package com.luokixi.visuals.network;

import com.luokixi.visuals.LuokixiVisuals;
import com.luokixi.visuals.client.ClientVisualController;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

import java.util.function.Supplier;

public final class VisualNetwork {
    // Lobby/YSM showcase networking was intentionally removed.
    // Protocol 7 is kept so this cleanup remains clearly separated from unrelated visual packet changes.
    private static final String PROTOCOL = "7";
    private static int nextId;

    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
            new ResourceLocation(LuokixiVisuals.MOD_ID, "visuals"),
            () -> PROTOCOL,
            PROTOCOL::equals,
            PROTOCOL::equals
    );

    private VisualNetwork() {}

    public static void init() {
        CHANNEL.registerMessage(nextId++, FireStatePacket.class, FireStatePacket::encode, FireStatePacket::decode, FireStatePacket::handle);
        CHANNEL.registerMessage(nextId++, ExecutionPacket.class, ExecutionPacket::encode, ExecutionPacket::decode, ExecutionPacket::handle);
        CHANNEL.registerMessage(nextId++, BossSkinPacket.class, BossSkinPacket::encode, BossSkinPacket::decode, BossSkinPacket::handle);
    }

    public static void sendFire(Entity entity, int level, boolean active) {
        CHANNEL.send(PacketDistributor.TRACKING_ENTITY_AND_SELF.with(() -> entity), new FireStatePacket(entity.getId(), level, active));
    }

    public static void sendExecution(Entity entity, int resonance) {
        if (!(entity.level() instanceof ServerLevel serverLevel)) return;
        CHANNEL.send(
                PacketDistributor.NEAR.with(() -> new PacketDistributor.TargetPoint(entity.getX(), entity.getY(), entity.getZ(), 96.0D, serverLevel.dimension())),
                new ExecutionPacket(entity.getX(), entity.getY(), entity.getZ(), entity.getBbWidth(), entity.getBbHeight(), resonance,
                        entity.getUUID().getLeastSignificantBits() ^ serverLevel.getGameTime())
        );
    }

    public static void sendBossSkin(Entity entity, String skin, boolean active) {
        CHANNEL.send(PacketDistributor.TRACKING_ENTITY_AND_SELF.with(() -> entity), new BossSkinPacket(entity.getId(), skin == null ? "" : skin, active));
    }

    public record FireStatePacket(int entityId, int level, boolean active) {
        private static void encode(FireStatePacket packet, FriendlyByteBuf buffer) {
            buffer.writeVarInt(packet.entityId);
            buffer.writeByte(packet.level);
            buffer.writeBoolean(packet.active);
        }
        private static FireStatePacket decode(FriendlyByteBuf buffer) {
            return new FireStatePacket(buffer.readVarInt(), buffer.readByte(), buffer.readBoolean());
        }
        private static void handle(FireStatePacket packet, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT, () -> () ->
                    ClientVisualController.acceptFireState(packet.entityId, packet.level, packet.active)));
            context.setPacketHandled(true);
        }
    }

    public record ExecutionPacket(double x, double y, double z, float width, float height, int resonance, long seed) {
        private static void encode(ExecutionPacket packet, FriendlyByteBuf buffer) {
            buffer.writeDouble(packet.x);
            buffer.writeDouble(packet.y);
            buffer.writeDouble(packet.z);
            buffer.writeFloat(packet.width);
            buffer.writeFloat(packet.height);
            buffer.writeByte(packet.resonance);
            buffer.writeLong(packet.seed);
        }
        private static ExecutionPacket decode(FriendlyByteBuf buffer) {
            return new ExecutionPacket(buffer.readDouble(), buffer.readDouble(), buffer.readDouble(), buffer.readFloat(), buffer.readFloat(), buffer.readByte(), buffer.readLong());
        }
        private static void handle(ExecutionPacket packet, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT, () -> () ->
                    ClientVisualController.acceptExecution(packet.x, packet.y, packet.z, packet.width, packet.height, packet.resonance, packet.seed)));
            context.setPacketHandled(true);
        }
    }

    public record BossSkinPacket(int entityId, String skin, boolean active) {
        private static void encode(BossSkinPacket packet, FriendlyByteBuf buffer) {
            buffer.writeVarInt(packet.entityId);
            buffer.writeUtf(packet.skin, 32);
            buffer.writeBoolean(packet.active);
        }
        private static BossSkinPacket decode(FriendlyByteBuf buffer) {
            return new BossSkinPacket(buffer.readVarInt(), buffer.readUtf(32), buffer.readBoolean());
        }
        private static void handle(BossSkinPacket packet, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT, () -> () ->
                    ClientVisualController.acceptBossSkin(packet.entityId, packet.skin, packet.active)));
            context.setPacketHandled(true);
        }
    }
}
