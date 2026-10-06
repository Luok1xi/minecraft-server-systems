// ============================================================
// 渊神的第二声 · 洞穴之夜 V4.0
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 低负载：
// - 没有 Tick
// - 没有地下玩家轮询
// - 玩家主动回应时只检查一次维度与 Y 坐标
// - 装备在召唤瞬间随机，全部附魔且掉落率为 0
// - 待机声只预排少量次数；攻击 / 受伤声由 hurt 事件驱动
// ============================================================

var CAVE_PROSPECTOR_LOADOUTS = [
  {
    tool:'{id:"minecraft:iron_pickaxe",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:2s},{id:"minecraft:efficiency",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:iron_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:feather_falling",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:leather_leggings",Count:1b,tag:{Unbreakable:1b,display:{color:5190170},Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:leather_chestplate",Count:1b,tag:{Unbreakable:1b,display:{color:8018482},Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:thorns",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    note:'旧铁镐 · 防护矿衣'
  },
  {
    tool:'{id:"minecraft:diamond_pickaxe",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:1s},{id:"minecraft:efficiency",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:chainmail_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:blast_protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:iron_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:leather_chestplate",Count:1b,tag:{Unbreakable:1b,display:{color:2631720},Enchantments:[{id:"minecraft:blast_protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    note:'钻石镐 · 防爆旧甲'
  },
  {
    tool:'{id:"minecraft:iron_pickaxe",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:3s},{id:"minecraft:efficiency",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:iron_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:fire_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:chainmail_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:iron_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:thorns",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    note:'锋利铁镐 · 沉重混装甲'
  }
]

function caveUniqueTag() {
  return 'cave_instance_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 100000))
}

function caveProspectorBuild(playerName, testEntity) {
  var xOffset = Math.random() < 0.5 ? 9 : -9
  var zOffset = Math.random() < 0.5 ? 7 : -7
  var uniqueTag = caveUniqueTag()
  var tags = '"divine_event_entity","divine_cave_elite","cave_prospector","' + uniqueTag + '"'
  var loadout = CAVE_PROSPECTOR_LOADOUTS[Math.floor(Math.random() * CAVE_PROSPECTOR_LOADOUTS.length)]

  if (testEntity) tags += ',"divine_test_entity"'

  var command = 'execute at ' + playerName + ' run summon minecraft:zombie ~' + xOffset + ' ~1 ~' + zOffset + ' ' +
    '{Tags:[' + tags + '],PersistenceRequired:1b,CanPickUpLoot:0b,Silent:1b,' +
    'CustomName:\'{"text":"未归的勘探员","color":"gold","bold":true}\',' +
    'CustomNameVisible:1b,Health:58.0f,' +
    'HandItems:[' + loadout.tool + ',{}],HandDropChances:[0.0f,0.0f],' +
    'ArmorItems:[' + loadout.boots + ',' + loadout.legs + ',' + loadout.chest + ',{id:"minecraft:skeleton_skull",Count:1b,tag:{Enchantments:[{id:"minecraft:vanishing_curse",lvl:1s}],HideFlags:1}}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f],' +
    'Attributes:[' +
      '{Name:"minecraft:generic.max_health",Base:58.0},' +
      '{Name:"minecraft:generic.movement_speed",Base:0.305},' +
      '{Name:"minecraft:generic.attack_damage",Base:4.5},' +
      '{Name:"minecraft:generic.armor",Base:3.0},' +
      '{Name:"minecraft:generic.knockback_resistance",Base:0.28},' +
      '{Name:"minecraft:generic.follow_range",Base:38.0}' +
    ']}'

  return {
    command:command,
    uniqueTag:uniqueTag,
    loadoutNote:loadout.note
  }
}

function caveSpawnSounds(server, uniqueTag) {
  if (!server || !uniqueTag) return

  if (global.divineQueueCommand) {
    global.divineQueueCommand(server, 2, 'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound minecraft:block.anvil.land hostile @a[distance=..28] ~ ~ ~ 0.34 0.62')
    global.divineQueueCommand(server, 6, 'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound minecraft:entity.warden.heartbeat hostile @a[distance=..28] ~ ~ ~ 0.72 0.74')
    global.divineQueueCommand(server, 230, 'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound minecraft:block.pointed_dripstone.drip_water_into_cauldron hostile @a[distance=..22] ~ ~ ~ 0.38 0.58')
    global.divineQueueCommand(server, 470, 'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound minecraft:block.stone.hit hostile @a[distance=..20] ~ ~ ~ 0.36 0.50')
    global.divineQueueCommand(server, 710, 'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound minecraft:entity.warden.heartbeat hostile @a[distance=..22] ~ ~ ~ 0.38 0.62')
  }
}

function spawnCaveEliteForPlayer(player, testEntity) {
  if (!player || !player.server) return false

  var server = player.server
  var build = caveProspectorBuild(String(player.username), testEntity == true)
  var result = server.runCommandSilent(build.command)

  if (result <= 0) {
    player.tell(Text.red('勘探员召唤失败。请换到稍微开阔的位置。'))
    return false
  }

  server.runCommandSilent('effect give ' + player.username + ' minecraft:darkness 3 0 true')
  server.runCommandSilent('effect give ' + player.username + ' minecraft:night_vision 35 0 true')
  caveSpawnSounds(server, build.uniqueTag)

  if (testEntity) {
    server.runCommandSilent(
      'tellraw ' + player.username + ' ' + JSON.stringify([
        {text:'⛏ 测试体：未归的勘探员\n',color:'gold',bold:true},
        {text:'58 生命 · 约 10 近战伤害 · 随机全附魔矿工装 · 白骨头颅\n',color:'gray'},
        {text:'本次装备：' + build.loadoutNote + '\n',color:'yellow'},
        {text:'测试体不会发放事件奖励；/dev clear 可清理。',color:'dark_gray',italic:true}
      ])
    )
  }

  return true
}

function caveEntityHasTag(entity, tag) {
  try { return entity && entity.tags && entity.tags.contains(tag) } catch (error) { return false }
}

function caveHurtAttacker(event) {
  try { if (event.source.actual) return event.source.actual } catch (ignored) {}
  try { if (event.source.entity) return event.source.entity } catch (ignored2) {}
  try { if (event.source.player) return event.source.player } catch (ignored3) {}
  return null
}

function caveSoundCooldown(entity, key, milliseconds) {
  if (!entity) return false

  try {
    var now = Date.now()
    var last = Number(entity.persistentData.getLong(key))
    if (last > 0 && now - last < milliseconds) return false
    entity.persistentData.putLong(key, now)
    return true
  } catch (error) {
    return true
  }
}

function cavePlayEntitySound(entity, sound, volume, pitch) {
  if (!entity || !entity.server) return

  try {
    entity.server.runCommandSilent(
      'execute as ' + entity.uuid + ' at @s run playsound ' + sound + ' hostile @a[distance=..24] ~ ~ ~ ' + volume + ' ' + pitch
    )
  } catch (error) {}
}

EntityEvents.hurt(function (event) {
  try {
    var victim = event.entity
    var attacker = caveHurtAttacker(event)

    if (victim && caveEntityHasTag(victim, 'divine_cave_elite') && caveSoundCooldown(victim, 'caveHurtSound', 950)) {
      cavePlayEntitySound(victim, 'minecraft:block.deepslate.break', 0.42, 0.56)
      cavePlayEntitySound(victim, 'minecraft:entity.warden.heartbeat', 0.24, 0.84)
    }

    if (attacker && caveEntityHasTag(attacker, 'divine_cave_elite') && caveSoundCooldown(attacker, 'caveAttackSound', 700)) {
      cavePlayEntitySound(attacker, 'minecraft:block.anvil.hit', 0.44, 0.58)
      cavePlayEntitySound(attacker, 'minecraft:block.stone.break', 0.30, 0.48)
    }
  } catch (error) {
    console.log('[CaveNight] Hurt sound handler failed: ' + error)
  }
})

function startCaveNight(server) {
  if (!server || server.persistentData.getBoolean('caveNightActive')) return false

  server.persistentData.putBoolean('caveNightActive', true)

  if (global.divineQueueCommand) {
    global.divineQueueCommand(server, 140, 'execute as @a at @s run playsound minecraft:entity.warden.heartbeat player @s ~ ~ ~ 0.52 0.72')
    global.divineQueueCommand(server, 154, 'execute as @a at @s run playsound minecraft:block.sculk_sensor.clicking_stop player @s ~ ~ ~ 0.58 0.64')
  }

  if (global.divineQueueTell) {
    global.divineQueueTell(server, '@a', 176, [
      {text:'奈瑟只问一次\n',color:'dark_aqua',bold:true},
      {text:'第二双靴子已经停在岩层那一边。它不会上来找你。\n\n',color:'gray'},
      {text:'[ 回应岩层下的名字 ]',color:'aqua',bold:true,clickEvent:{action:'run_command',value:'/caveomen'},hoverEvent:{action:'show_text',contents:{text:'主世界 Y≤35 时有效；每人每轮一次',color:'gray'}}}
    ])
  }

  return true
}

function cleanupCaveNight(server) {
  if (!server) return

  server.persistentData.putBoolean('caveNightActive', false)
  server.runCommandSilent('kill @e[tag=divine_cave_elite]')
  console.log('[CaveNight] Cleaned')
}

function caveRespond(player) {
  if (!player || !player.server) return false

  var server = player.server

  if (!server.persistentData.getBoolean('caveNightActive')) {
    player.tell(Text.gray('岩层下只剩普通的回声。'))
    return false
  }

  var runId = server.persistentData.getInt('divineRunId')

  if (player.persistentData.getInt('caveOmenRunId') == runId) {
    player.tell(Text.gray('奈瑟今晚已经听见过你的回答。'))
    return false
  }

  var overworld = server.getLevel('minecraft:overworld')

  if (player.level != overworld || player.y > 35) {
    player.tell(Text.darkAqua('声音还没有穿过足够厚的岩层。再往下，奈瑟才听得清。'))
    return false
  }

  player.persistentData.putInt('caveOmenRunId', runId)
  spawnCaveEliteForPlayer(player, false)

  player.tell(Text.gold('✦ 远处有人用你的声音，把名字重复了一遍。'))
  player.tell(Text.gray('未归者的矿具与旧衣每次并不相同；击败它，有机会得到幻形碎片与破损勘探记录。'))
  return true
}

function giveSurveyNote(player) {
  if (!player) return

  player.give(Item.of(
    'minecraft:paper',
    '{DivineSurveyNote:1b,display:{Name:\'{"text":"破损的勘探记录","color":"yellow","italic":false}\',Lore:[\'{"text":"纸张边缘沾满了地底的泥土。","color":"gray","italic":false}\',\'{"text":"“有些洞穴并不想被找到。”","color":"dark_gray","italic":true}\']}}'
  ))

  player.tell(Text.yellow('✦ 你找到了未归者留下的一页记录。'))
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  event.register(
    Commands.literal('caveomen')
      .executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return caveRespond(player) ? 1 : 0
      })
  )
})

global.startCaveNight = startCaveNight
global.cleanupCaveNight = cleanupCaveNight
global.caveRespond = caveRespond
global.giveSurveyNote = giveSurveyNote
global.spawnCaveEliteForPlayer = spawnCaveEliteForPlayer
