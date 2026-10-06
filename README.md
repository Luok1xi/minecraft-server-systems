# Minecraft 服务器玩法与 LuokixiVisuals

基于 Minecraft 1.20.1、Forge 47.4.22、KubeJS 的服务器玩法工程。这里保存 2026-10-06 整理的源码快照。

## 有哪些内容

- 世界事件与日期调度、血月和洞穴挑战、Boss 阶段。
- 战斗奖励、品质抽奖与保底、背包奖励缓存。
- 遗物共鸣、宠物契约、称号、衣柜与换装。
- 料理挑战、世界纪事、回城罗盘、FTB 领地生成保护。
- LuokixiVisuals 1.5.1 NO-LOBBY：视觉状态、网络同步、图腾复活、Boss 外观及事件怪物地形保护。

## 目录

| 目录 | 内容 |
|---|---|
| `kubejs/server_scripts/` | 20 个服务端脚本文件，包含退役占位与加载探针 |
| `kubejs/startup_scripts/` | 3 个启动脚本文件 |
| `kubejs/assets/`、`kubejs/data/`、`kubejs/config/` | 脚本配套资源和配置 |
| `luokixi-visuals/` | Java 17 / Gradle Forge 模组工程 |

服务端脚本来源为用户提供的 kubejs.zip；SHA-256：`28806057c657390961a7bdf9c2fcb23f6d3156773ca8a9dcd44885dd04b4ca1c`。

## 使用

1. 在已有的 Minecraft 1.20.1 / Forge 47.4.22 测试实例中安装 KubeJS 及脚本实际依赖的模组；本仓库不是完整整合包。
2. 备份世界后，将 `kubejs/` 放入实例对应目录。启动脚本改动需要完整重启，具体热重载能力以 KubeJS 为准。
3. 编译视觉模组需要 JDK 17。进入 `luokixi-visuals/`，Windows 执行 `gradlew.bat build`，其他系统执行 `./gradlew build`。客户端与服务器使用相同版本产物。
4. 先在测试世界核对事件、奖励与客户端效果，再接入正式服务器。脚本中的其他物品/实体 ID 还需对应模组。

本次整理只复制 LuokixiVisuals 自身 Java 包和资源，未混入同一下载目录下的 ExampleMod 与旧衣柜模组源码。原工程没有改动。

## 当前边界

23 个 JavaScript 文件曾通过基础语法检查；本次检查结果记录在 [上传前检查](UPLOAD_CHECKS.md)。语法通过不等于服务器联机验收。本次没有启动游戏、编译 Forge 或修改线上服务器。大厅动态图与旧展柜不列作当前功能。

源文件和第三方素材保留原许可，模组配置仍标注 All Rights Reserved；本次不额外授予开源许可。项目总览见 [PROJECTS.md](PROJECTS.md)。

