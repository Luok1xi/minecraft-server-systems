// ============================================================
// 归乡罗盘 V10.8.2
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 文件：
// kubejs/server_scripts/home_compass.js
//
// 功能：
// - 普通指南针完全不受影响
// - 只识别 HomeCompass:1b
// - 登录 / 复活时缺少则补发；每次启用自动补发的重生都会询问，不依赖本次是否“新发”物品
// - 带消失诅咒，并隐藏附魔标签
// - 家的位置始终跟随主世界 /setworldspawn
// - 家附近 150 格不传送
// - 远处右键进行 1 秒归途仪式
// - 支持右键空气 / 方块 / 实体
// - 自动处理一次右键产生的 AIR + BLOCK 双触发
// - 防止连续右键启动多个传送任务
// - 不限制战斗
// - 不设置长冷却
// - /gohome 随时拿回罗盘并重新开启自动补发
// ============================================================


// ============================================================
// 配置
// ============================================================

const HOME_COMPASS_NEAR_RADIUS = 150

// 20 tick = 1 秒
const HOME_COMPASS_CAST_TICKS = 20

// 防止 AIR / BLOCK 在同一次右键里重复执行
const HOME_COMPASS_CLICK_LOCK_TICKS = 2

// 0/缺失 = 兼容旧玩家，视为开启；1 = 开启；2 = 玩家明确关闭。
const HOME_COMPASS_AUTO_KEY = 'homeCompassAutoMode'


// ============================================================
// 临时状态
// ============================================================

// 玩家是否正在进行归途仪式
let homeCompassCasting = {}

// 单次右键去重锁
let homeCompassClickLock = {}


// ============================================================
// 创建归乡罗盘
// ============================================================

function createHomeCompass() {

    return Item.of(
        'minecraft:compass',
        `{
            HomeCompass:1b,
            HideFlags:1,
            Enchantments:[
                {
                    id:"minecraft:vanishing_curse",
                    lvl:1s
                }
            ],
            display:{
                Name:'{"text":"✦ 归乡罗盘","color":"gold","italic":false}',
                Lore:[
                    '{"text":"无论走了多远，它总记得回家的方向。","color":"gray","italic":false}',
                    '{"text":"","italic":false}',
                    '{"text":"右键 · 返回主城","color":"yellow","italic":false}'
                ]
            }
        }`
    )
}


// ============================================================
// 判断是否为归乡罗盘
// ============================================================

function isHomeCompass(item) {

    if (!item) {
        return false
    }


    if (
        item.id !=
        'minecraft:compass'
    ) {
        return false
    }


    const nbt =
        item.nbt


    if (!nbt) {
        return false
    }


    // 这个读取方式已经在你的服务器日志中实际验证成功
    try {

        if (
            nbt.HomeCompass == 1 ||
            nbt.HomeCompass == true
        ) {
            return true
        }

    } catch (error) {

    }


    // 备用读取方式
    try {

        if (
            nbt.getBoolean(
                'HomeCompass'
            )
        ) {
            return true
        }

    } catch (error) {

    }


    return false
}


// ============================================================
// 玩家身上是否已有归乡罗盘
// ============================================================

function playerHasHomeCompass(player) {

    if (
        !player ||
        !player.server
    ) {
        return false
    }


    // clear ... 0 只检测，不删除物品
    const result =
        player.server.runCommandSilent(
            `clear ${player.username} minecraft:compass{HomeCompass:1b} 0`
        )


    return result > 0
}


// ============================================================
// 自动补发偏好
// ============================================================

function homeCompassAutoMode(player) {

    if (!player) {
        return 0
    }

    let mode = 0

    try {
        mode = player.persistentData.getInt(HOME_COMPASS_AUTO_KEY)
    } catch (error) {
    }

    if (mode != 1 && mode != 2) {
        mode = 0
    }

    return mode
}

function homeCompassAutoEnabled(player) {
    return homeCompassAutoMode(player) != 2
}

function homeCompassSetAuto(player, enabled) {

    if (!player) {
        return
    }

    try {
        player.persistentData.putInt(HOME_COMPASS_AUTO_KEY, enabled ? 1 : 2)
    } catch (error) {
    }
}

function removeHomeCompass(player) {

    if (!player || !player.server) {
        return 0
    }

    try {
        return player.server.runCommandSilent(
            `clear ${player.username} minecraft:compass{HomeCompass:1b}`
        )
    } catch (error) {
        return 0
    }
}


// ============================================================
// 缺少时补发
// 返回 true 代表本次真的新发了一枚。
// ============================================================

function giveHomeCompassIfMissing(player) {

    if (!player) {
        return false
    }

    if (
        playerHasHomeCompass(
            player
        )
    ) {
        return false
    }

    player.give(
        createHomeCompass()
    )

    player.tell(
        Text.gold(
            '✦ 归乡罗盘回到了你的手中。'
        )
    )

    player.server.runCommandSilent(
        `execute at ${player.username} run playsound minecraft:block.amethyst_block.chime player ${player.username} ~ ~ ~ 0.35 1.4`
    )

    return true
}

function askHomeCompassPreference(player) {

    if (!player || !player.server) {
        return
    }

    player.server.runCommandSilent(
        'tellraw ' + player.username + ' ' + JSON.stringify([
            {text:'\n需要归乡罗盘吗？\n',color:'gold',bold:true},
            {text:'它会在你重生后重新回到背包。如果你更想省下这一格，也可以让它暂时离开。\n',color:'gray'},
            {text:'[ 不要再发给我了！ ]',color:'red',bold:true,clickEvent:{action:'run_command',value:'/gohome stop'},hoverEvent:{action:'show_text',contents:{text:'收走罗盘，并停止以后自动补发',color:'gray'}}},
            {text:'   '},
            {text:'[ 我很需要这个 ]',color:'green',bold:true,clickEvent:{action:'run_command',value:'/gohome keep'},hoverEvent:{action:'show_text',contents:{text:'保留罗盘，并继续在重生后补发',color:'gray'}}}
        ])
    )
}

function stopHomeCompassAuto(player) {

    if (!player || !player.server) {
        return false
    }

    homeCompassSetAuto(player, false)
    removeHomeCompass(player)

    player.server.runCommandSilent(
        'tellraw ' + player.username + ' ' + JSON.stringify([
            {text:'✦ 归乡罗盘被收了回去。\n',color:'gray'},
            {text:'如果你突然想要了，请在聊天框输入指令 ',color:'dark_gray'},
            {text:'/gohome',color:'gold',bold:true,clickEvent:{action:'suggest_command',value:'/gohome'}},
            {text:' 即可拿回属于你的一切！',color:'dark_gray'}
        ])
    )

    return true
}

function keepHomeCompassAuto(player) {

    if (!player || !player.server) {
        return false
    }

    homeCompassSetAuto(player, true)
    giveHomeCompassIfMissing(player)
    player.tell(Text.green('✦ 好。以后重生时，归乡罗盘还会回来。'))
    return true
}


// ============================================================
// 获取家的位置
// ============================================================

function getHomeCompassTarget(server) {

    const overworld =
        server.getLevel(
            'minecraft:overworld'
        )


    if (!overworld) {
        return null
    }


    const spawn =
        overworld.sharedSpawnPos


    if (!spawn) {
        return null
    }


    return {

        level: overworld,

        x: spawn.x,

        y: spawn.y,

        z: spawn.z

    }
}


// ============================================================
// 水平距离
// ============================================================

function getHomeCompassDistance(
    player,
    target
) {

    const dx =
        player.x -
        target.x


    const dz =
        player.z -
        target.z


    return Math.sqrt(
        dx * dx +
        dz * dz
    )
}


// ============================================================
// Actionbar
// ============================================================

function homeCompassActionbar(
    player,
    text,
    color
) {

    player.server.runCommandSilent(
        `title ${player.username} actionbar {"text":"${text}","color":"${color}"}`
    )
}


// ============================================================
// 归途仪式粒子
// ============================================================

function homeCompassPortalParticles(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    player.server.runCommandSilent(
        `execute at ${player.username} run particle minecraft:portal ~ ~1 ~ 0.55 0.8 0.55 0.08 28 force ${player.username}`
    )
}


// ============================================================
// 到达粒子
// ============================================================

function homeCompassArrivalParticles(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    player.server.runCommandSilent(
        `execute at ${player.username} run particle minecraft:end_rod ~ ~1 ~ 0.45 0.7 0.45 0.04 30 force ${player.username}`
    )


    player.server.runCommandSilent(
        `execute at ${player.username} run particle minecraft:portal ~ ~1 ~ 0.6 0.8 0.6 0.08 35 force ${player.username}`
    )
}


// ============================================================
// 到家完成音效
//
// 节奏：
// 0 tick  -> 传送完成声
// 4 tick  -> 经验获得声
// 8 tick  -> 紫水晶收尾
// ============================================================

function playHomeCompassArrivalSounds(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    const server =
        player.server


    // --------------------------------------------------------
    // 第一层：传送完成
    // --------------------------------------------------------

    server.runCommandSilent(
        `execute at ${player.username} run playsound minecraft:entity.enderman.teleport player ${player.username} ~ ~ ~ 0.9 1.2`
    )


    // --------------------------------------------------------
    // 第二层：经验获取
    // --------------------------------------------------------

    server.scheduleInTicks(
        4,
        () => {

            if (
                !player ||
                !player.server
            ) {
                return
            }


            server.runCommandSilent(
                `execute at ${player.username} run playsound minecraft:entity.experience_orb.pickup player ${player.username} ~ ~ ~ 0.75 1.15`
            )
        }
    )


    // --------------------------------------------------------
    // 第三层：紫水晶收尾
    // --------------------------------------------------------

    server.scheduleInTicks(
        8,
        () => {

            if (
                !player ||
                !player.server
            ) {
                return
            }


            server.runCommandSilent(
                `execute at ${player.username} run playsound minecraft:block.amethyst_block.chime player ${player.username} ~ ~ ~ 0.45 1.35`
            )
        }
    )
}


// ============================================================
// 已经在家附近时的完成音效
// ============================================================

function playHomeCompassAlreadyHomeSounds(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    const server =
        player.server


    server.runCommandSilent(
        `execute at ${player.username} run playsound minecraft:entity.experience_orb.pickup player ${player.username} ~ ~ ~ 0.55 1.25`
    )


    server.scheduleInTicks(
        4,
        () => {

            if (
                !player ||
                !player.server
            ) {
                return
            }


            server.runCommandSilent(
                `execute at ${player.username} run playsound minecraft:block.amethyst_block.chime player ${player.username} ~ ~ ~ 0.4 1.4`
            )
        }
    )
}


// ============================================================
// 真正使用归乡罗盘
// ============================================================

function useHomeCompass(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    const server =
        player.server


    const target =
        getHomeCompassTarget(
            server
        )


    // ========================================================
    // 无法取得家的位置
    // ========================================================

    if (!target) {

        homeCompassActionbar(
            player,
            '✦ 罗盘暂时找不到家的方向。',
            'red'
        )


        server.runCommandSilent(
            `execute at ${player.username} run playsound minecraft:block.respawn_anchor.deplete player ${player.username} ~ ~ ~ 0.4 1.3`
        )


        return
    }


    // ========================================================
    // 不在主世界
    // ========================================================

    if (
        player.level !=
        target.level
    ) {

        homeCompassActionbar(
            player,
            '✦ 这里的空间干扰了罗盘的指针。',
            'gray'
        )


        server.runCommandSilent(
            `execute at ${player.username} run playsound minecraft:block.respawn_anchor.deplete player ${player.username} ~ ~ ~ 0.45 1.3`
        )


        return
    }


    // ========================================================
    // 距离
    // ========================================================

    const distance =
        getHomeCompassDistance(
            player,
            target
        )


    // ========================================================
    // 已经在家附近
    // ========================================================

    if (
        distance <=
        HOME_COMPASS_NEAR_RADIUS
    ) {

        homeCompassActionbar(
            player,
            '✦ 你已经到家了。',
            'gold'
        )


        // ----------------------------------------------------
        // 粒子
        // ----------------------------------------------------

        server.runCommandSilent(
            `execute at ${player.username} run particle minecraft:end_rod ~ ~1 ~ 0.35 0.45 0.35 0.02 12 force ${player.username}`
        )


        // ----------------------------------------------------
        // 到家完成音
        // ----------------------------------------------------

        playHomeCompassAlreadyHomeSounds(
            player
        )


        // ----------------------------------------------------
        // 很轻的“到家”恢复效果
        // ----------------------------------------------------

        server.runCommandSilent(
            `effect give ${player.username} minecraft:regeneration 2 0 true`
        )


        return
    }


    // ========================================================
    // 已经正在施法
    // ========================================================

    const key =
        player.username


    if (
        homeCompassCasting[key]
    ) {
        return
    }


    homeCompassCasting[key] =
        true


    // ========================================================
    // 开始归途仪式
    // ========================================================

    homeCompassActionbar(
        player,
        '✦ 罗盘正在寻找归途……',
        'gold'
    )


    // --------------------------------------------------------
    // 充能音
    // --------------------------------------------------------

    server.runCommandSilent(
        `execute at ${player.username} run playsound minecraft:block.respawn_anchor.charge player ${player.username} ~ ~ ~ 0.7 1.15`
    )


    // --------------------------------------------------------
    // 第一轮粒子
    // --------------------------------------------------------

    homeCompassPortalParticles(
        player
    )


    // ========================================================
    // 5 tick
    // ========================================================

    server.scheduleInTicks(
        5,
        () => {

            if (
                homeCompassCasting[key]
            ) {

                homeCompassPortalParticles(
                    player
                )
            }
        }
    )


    // ========================================================
    // 10 tick
    // ========================================================

    server.scheduleInTicks(
        10,
        () => {

            if (
                homeCompassCasting[key]
            ) {

                homeCompassPortalParticles(
                    player
                )
            }
        }
    )


    // ========================================================
    // 15 tick
    // ========================================================

    server.scheduleInTicks(
        15,
        () => {

            if (
                homeCompassCasting[key]
            ) {

                homeCompassPortalParticles(
                    player
                )
            }
        }
    )


    // ========================================================
    // 20 tick：真正传送
    // ========================================================

    server.scheduleInTicks(
        HOME_COMPASS_CAST_TICKS,
        () => {

            homeCompassCasting[key] =
                false


            if (
                !player ||
                !player.server
            ) {
                return
            }


            // ------------------------------------------------
            // 再次读取最新主城出生点
            // ------------------------------------------------

            const latestTarget =
                getHomeCompassTarget(
                    server
                )


            if (!latestTarget) {

                homeCompassActionbar(
                    player,
                    '✦ 归途失去了目标。',
                    'red'
                )

                return
            }


            // ------------------------------------------------
            // 施法期间换维度，取消
            // ------------------------------------------------

            if (
                player.level !=
                latestTarget.level
            ) {

                homeCompassActionbar(
                    player,
                    '✦ 归途被空间变化打断了。',
                    'gray'
                )


                server.runCommandSilent(
                    `execute at ${player.username} run playsound minecraft:block.respawn_anchor.deplete player ${player.username} ~ ~ ~ 0.45 1.2`
                )


                return
            }


            // =================================================
            // 出发音效
            // =================================================

            server.runCommandSilent(
                `execute at ${player.username} run playsound minecraft:entity.enderman.teleport player ${player.username} ~ ~ ~ 0.8 0.9`
            )


            // =================================================
            // 传送
            // =================================================

            server.runCommandSilent(
                `execute in minecraft:overworld run tp ${player.username} ${latestTarget.x + 0.5} ${latestTarget.y} ${latestTarget.z + 0.5}`
            )


            // =================================================
            // 到达粒子
            // =================================================

            homeCompassArrivalParticles(
                player
            )


            // =================================================
            // 到达音效
            // =================================================

            playHomeCompassArrivalSounds(
                player
            )


            // =================================================
            // 到家提示
            // =================================================

            homeCompassActionbar(
                player,
                '✦ 欢迎回家。',
                'gold'
            )
        }
    )
}


// ============================================================
// 单次右键统一入口
// ============================================================

function triggerHomeCompass(player) {

    if (
        !player ||
        !player.server
    ) {
        return
    }


    const key =
        player.username


    // ========================================================
    // AIR / BLOCK 双触发去重
    // ========================================================

    if (
        homeCompassClickLock[key]
    ) {
        return
    }


    homeCompassClickLock[key] =
        true


    // ========================================================
    // 执行功能
    // ========================================================

    useHomeCompass(
        player
    )


    // ========================================================
    // 2 tick 后解除点击锁
    // ========================================================

    player.server.scheduleInTicks(
        HOME_COMPASS_CLICK_LOCK_TICKS,
        () => {

            homeCompassClickLock[key] =
                false
        }
    )
}


// ============================================================
// 右键空气
// ============================================================

ItemEvents.rightClicked(
    'minecraft:compass',
    event => {

        if (
            !isHomeCompass(
                event.item
            )
        ) {
            return
        }


        // 必须先执行，再 cancel
        triggerHomeCompass(
            event.player
        )


        event.cancel()
    }
)


// ============================================================
// 右键实体
// ============================================================

ItemEvents.entityInteracted(
    'minecraft:compass',
    event => {

        if (
            !isHomeCompass(
                event.item
            )
        ) {
            return
        }


        triggerHomeCompass(
            event.player
        )


        event.cancel()
    }
)


// ============================================================
// 右键方块
// ============================================================

BlockEvents.rightClicked(
    event => {

        const player =
            event.player


        if (!player) {
            return
        }


        let item =
            event.item


        // ====================================================
        // 某些 Block 右键事件里 event.item 会是 air
        // 所以继续检查主手 / 副手
        // ====================================================

        if (
            !isHomeCompass(
                item
            )
        ) {

            try {

                if (
                    isHomeCompass(
                        player.mainHandItem
                    )
                ) {

                    item =
                        player.mainHandItem

                } else if (
                    isHomeCompass(
                        player.offHandItem
                    )
                ) {

                    item =
                        player.offHandItem

                } else {

                    return
                }

            } catch (error) {

                return
            }
        }


        if (
            !isHomeCompass(
                item
            )
        ) {
            return
        }


        // 必须先执行，再 cancel
        triggerHomeCompass(
            player
        )


        event.cancel()
    }
)


// ============================================================
// 登录补发
// ============================================================

PlayerEvents.loggedIn(
    event => {

        const player =
            event.player

        try { if (player && String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer') >= 0) return } catch (ignoredFake) {}

        // 玩家明确关闭以后，登录也不再偷偷塞回来。
        event.server.scheduleInTicks(
            20,
            () => {

                if (!homeCompassAutoEnabled(player)) {
                    return
                }

                giveHomeCompassIfMissing(
                    player
                )
            }
        )
    }
)


// ============================================================
// 复活补发 + 询问
// ============================================================

PlayerEvents.respawned(
    event => {

        const player =
            event.player

        // 给死亡 / Corpse / 背包恢复流程一些时间。
        event.server.scheduleInTicks(
            18,
            () => {

                if (!homeCompassAutoEnabled(player)) {
                    return
                }

                // V10.8.2：询问不再绑死在 given == true。
                // keepInventory / 尸体 / 背包恢复类 Mod 可能让罗盘在本次重生时仍然存在，
                // 旧逻辑因此会“有罗盘但没有询问”。现在只要自动补发没有被关闭，
                // 每次重生都会给玩家这次选择。
                giveHomeCompassIfMissing(
                    player
                )

                askHomeCompassPreference(player)
            }
        )
    }
)


// ============================================================
// /gohome
// ============================================================

ServerEvents.commandRegistry(
    event => {

        const Commands = event.commands

        const root = Commands.literal('gohome')
            .executes(ctx => {

                const player = ctx.source.player

                if (!player) {
                    return 0
                }

                homeCompassSetAuto(player, true)

                const given = giveHomeCompassIfMissing(player)

                if (!given) {
                    player.tell(Text.gray('✦ 归乡罗盘已经在你的背包里；以后重生补发也已重新开启。'))
                } else {
                    player.tell(Text.gray('以后重生时，它也会继续回来。'))
                }

                return 1
            })

        root.then(
            Commands.literal('keep')
                .executes(ctx => {
                    const player = ctx.source.player
                    if (!player) {
                        return 0
                    }
                    return keepHomeCompassAuto(player) ? 1 : 0
                })
        )

        root.then(
            Commands.literal('stop')
                .executes(ctx => {
                    const player = ctx.source.player
                    if (!player) {
                        return 0
                    }
                    return stopHomeCompassAuto(player) ? 1 : 0
                })
        )

        event.register(root)
    }
)

global.giveHomeCompassIfMissing = giveHomeCompassIfMissing
global.homeCompassAutoEnabled = homeCompassAutoEnabled
global.homeCompassAutoMode = homeCompassAutoMode

console.log('[HomeCompass] V10.8.2 loaded: respawn preference prompt is independent from item re-give state.')
