# LuokixiVisuals 1.5.1 NO-LOBBY

Minecraft 1.20.1 / Forge 47.4.22.

This cleanup build intentionally removes every lobby/YSM showcase feature added to LuokixiVisuals.
The lobby is now owned only by KubeJS + Advanced Fake Player + YSM.

Preserved:
- relic sounds and visual effects
- divine/black fire state
- execution visual packet
- boss skins/scales
- TerrainSafetyHandler
- GodslayerTotemHandler
- existing mixins for boss visuals

Removed:
- YsmShowcaseBridge
- ClientCompatibilityDoctor lobby check
- ShowcaseStatePacket
- showcase_set / showcase_clear / showcase_sync
- client projection ring and YSM preview rendering
- projection particles

Use the same jar on server and clients.
