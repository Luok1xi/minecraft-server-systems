LuokixiVisuals 1.5.1 NO-LOBBY CLEAN

目标：
- 保留遗物音效 / 神火黑焰 / 处决视觉 / Boss 材质与缩放 / TerrainSafety / GodslayerTotem。
- 完全不参与大厅、YSM 展示、Advanced Fake Player 控制。
- 不包含 Forge MDK 的 ExampleMod。

构建：
1. 直接进入本工程根目录（能看到 build.gradle / settings.gradle / build_windows.bat / src）。
2. 双击 build_windows.bat。
3. 脚本会先检查 ExampleMod 和已删除的大厅旧类；发现残留会直接停止。
4. 编译成功后还会再次扫描最终 JAR。
5. 输出：build/libs/LuokixiVisuals-1.5.1-nolobby-clean.jar

注意：
- 不要把本项目的 src “覆盖”到 Forge MDK 的 src 上；那样 MDK 自带 ExampleMod 可能残留。
- 如果电脑没有 gradlew.bat，脚本会使用系统 Gradle。
- 如果既没有 Wrapper 也没有系统 Gradle，脚本会明确停止，不会假装编译成功。
