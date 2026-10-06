// ============================================================
// 神谕奖励中心 V5.1 · KubeJS V10.6.0
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 性能原则：
// - 整套战斗系统只有这 1 个 EntityEvents.death 监听器
// - 没有 Tick、没有附近实体扫描
// - 奖励只在生物真正死亡时计算一次
// - 所有稀有奖励都有单夜硬上限，避免刷怪塔无限灌资源
// ============================================================

var DIVINE_TOKEN_ITEM = 'minecraft:amethyst_shard'
var DIVINE_TOKEN_NBT = '{DivineToken:1b,HideFlags:1,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],display:{Name:\'{"text":"✦ 幻形碎片","color":"light_purple","italic":false}\',Lore:[\'{"text":"诸神离去以后，仍留在凡世的一小片回声。","color":"gray","italic":false}\',\'{"text":"可以用于开启三纺女的旧匣。","color":"dark_gray","italic":false}\']}}'

var WAR_REWARD_CAP = 50
var WAR_RARE_ROLL_CAP = 40
var BLOOD_HUNT_CAP = 8

var WAR_UNDEAD = {
  'minecraft:zombie':true,
  'minecraft:husk':true,
  'minecraft:drowned':true,
  'minecraft:zombie_villager':true,
  'minecraft:skeleton':true,
  'minecraft:stray':true,
  'minecraft:wither_skeleton':true,
  'minecraft:phantom':true,
  'minecraft:zoglin':true,
  'minecraft:zombified_piglin':true
}

function getDivineTokenCount(player) {
  if (!player || !player.server) return 0

  return player.server.runCommandSilent(
    'clear ' + player.username + ' ' + DIVINE_TOKEN_ITEM + '{DivineToken:1b} 0'
  )
}

function giveDivineTokenSilent(player, amount) {
  if (!player || !player.server || !amount || amount <= 0) return false

  player.server.runCommandSilent(
    'give ' + player.username + ' ' + DIVINE_TOKEN_ITEM + DIVINE_TOKEN_NBT + ' ' + amount
  )

  return true
}

function giveDivineToken(player, amount) {
  if (!giveDivineTokenSilent(player, amount)) return false

  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' +
    JSON.stringify([
      {text:'✦ ',color:'light_purple'},
      {text:'幻形碎片',color:'light_purple',bold:true},
      {text:' ×' + amount,color:'gray'}
    ])
  )

  player.server.runCommandSilent(
    'execute at ' + player.username + ' run playsound minecraft:block.amethyst_block.chime player ' + player.username + ' ~ ~ ~ 0.62 1.34'
  )

  player.server.runCommandSilent(
    'execute at ' + player.username + ' run playsound minecraft:entity.experience_orb.pickup player ' + player.username + ' ~ ~ ~ 0.42 1.46'
  )

  return true
}

function takeDivineTokens(player, amount) {
  if (!player || !player.server || amount <= 0) return false
  if (getDivineTokenCount(player) < amount) return false

  var removed = player.server.runCommandSilent(
    'clear ' + player.username + ' ' + DIVINE_TOKEN_ITEM + '{DivineToken:1b} ' + amount
  )

  return removed >= amount
}

function giveDivineCollectible(player, itemId, nbt) {
  if (!player) return
  player.give(Item.of(itemId, nbt))
}

function divineEntityHasTag(entity, tag) {
  try {
    return entity && entity.tags && entity.tags.contains(tag)
  } catch (error) {
    return false
  }
}

function divineCompanionDeathCleanup(entity) {
  if (!entity || !divineEntityHasTag(entity, 'divine_companion')) return false

  try {
    var server = entity.server
    var dimension = String(entity.level.dimension)
    var x = Math.floor(Number(entity.x))
    var y = Math.floor(Number(entity.y))
    var z = Math.floor(Number(entity.z))
    var command = 'execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z + ' run kill @e[type=minecraft:item,distance=..4,nbt={Item:{tag:{DivineCompanionSaddle:1b}}}]'

    server.runCommandSilent(command)
    if (global.divineQueueCommand) global.divineQueueCommand(server, 2, command)
  } catch (error) {
    console.log('[DivineRewards] Companion saddle cleanup failed: ' + error)
  }

  return true
}

function divineEntityTypeId(entity) {
  try {
    var direct = String(entity.type)
    if (direct && direct.indexOf(':') >= 0) return direct
  } catch (error) {
  }

  try {
    var fallback = String(entity.id)
    if (fallback && fallback.indexOf(':') >= 0) return fallback
  } catch (error2) {
  }

  return ''
}

function divineIsHostile(entity) {
  if (!entity) return false
  if (divineEntityHasTag(entity, 'divine_blood_elite')) return true
  if (divineEntityHasTag(entity, 'divine_cave_elite')) return true

  try {
    if (entity.isMonster && typeof entity.isMonster == 'function') return entity.isMonster()
  } catch (error) {
  }

  var id = divineEntityTypeId(entity)
  var hostiles = {
    'minecraft:zombie':true,'minecraft:husk':true,'minecraft:drowned':true,'minecraft:zombie_villager':true,
    'minecraft:skeleton':true,'minecraft:stray':true,'minecraft:wither_skeleton':true,
    'minecraft:spider':true,'minecraft:cave_spider':true,'minecraft:creeper':true,
    'minecraft:enderman':true,'minecraft:endermite':true,'minecraft:silverfish':true,
    'minecraft:witch':true,'minecraft:slime':true,'minecraft:magma_cube':true,
    'minecraft:blaze':true,'minecraft:ghast':true,'minecraft:phantom':true,
    'minecraft:pillager':true,'minecraft:vindicator':true,'minecraft:evoker':true,
    'minecraft:ravager':true,'minecraft:vex':true,'minecraft:guardian':true,
    'minecraft:elder_guardian':true,'minecraft:shulker':true,'minecraft:hoglin':true,
    'minecraft:zoglin':true,'minecraft:piglin_brute':true,'minecraft:warden':true,
    'minecraft:wither':true,'minecraft:ender_dragon':true
  }

  return hostiles[id] == true
}

function divineIsUndead(entity) {
  return WAR_UNDEAD[divineEntityTypeId(entity)] == true
}

function divineResetCounterForRun(player, runKey, countKey, runId) {
  if (player.persistentData.getInt(runKey) == runId) return

  player.persistentData.putInt(runKey, runId)
  player.persistentData.putInt(countKey, 0)
}

function divineResetWarState(player, runId) {
  if (player.persistentData.getInt('warRewardRunId') == runId) return

  player.persistentData.putInt('warRewardRunId', runId)
  player.persistentData.putInt('warRewardCount', 0)
  player.persistentData.putInt('warRareRollCount', 0)
  player.persistentData.putInt('warDiamondCount', 0)
  player.persistentData.putInt('warScrapCount', 0)
  player.persistentData.putInt('warIngotCount', 0)
  player.persistentData.putInt('warMobRareCount', 0)
}

function divineRewardTell(player, title, body, color, sound, pitch) {
  if (!player || !player.server) return

  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' +
    JSON.stringify([
      {text:title + '\n',color:color,bold:true},
      {text:body,color:'gray',italic:true}
    ])
  )

  player.server.runCommandSilent(
    'execute at ' + player.username + ' run playsound ' + sound + ' player ' + player.username + ' ~ ~ ~ 0.82 ' + pitch
  )
}

function divineGive(player, itemId, amount) {
  if (!player || !amount || amount <= 0) return
  player.give(Item.of(itemId, amount))

  // 公共历史只记录本系统实际发出的钻石，不需要扫描玩家背包。
  if (itemId == 'minecraft:diamond' && global.historyRecordDiamonds) {
    try { global.historyRecordDiamonds(player, amount, '神谕奖励') } catch (ignored) {}
  }
}

function divineRareDropTell(player, text, color) {
  if (!player) return
  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' + JSON.stringify([
      {text:'⚔ ',color:'dark_red'},
      {text:text,color:color || 'gold',bold:true},
      {text:' —— 瓦尔卡恩从尸骸里挑出了一件不该轻易留下的东西。',color:'gray',italic:true}
    ])
  )
  player.server.runCommandSilent(
    'execute at ' + player.username + ' run playsound minecraft:entity.player.levelup player ' + player.username + ' ~ ~ ~ 0.62 1.22'
  )
}

function divineWarFinalMark(player) {
  var nbt = '{DivineWarMark:1b,HideFlags:1,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],display:{Name:\'{"text":"断剑上的铁誓","color":"dark_red","italic":false}\',Lore:[\'{"text":"瓦尔卡恩记下了你今夜的第三十次胜利。","color":"gray","italic":false}\',\'{"text":"它没有力量，只有见证。","color":"dark_gray","italic":true}\']}}'
  giveDivineCollectible(player, 'minecraft:iron_nugget', nbt)
}

function divineWarFiftiethMark(player) {
  var nbt = '{DivineWarLaurel:1b,HideFlags:1,Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],display:{Name:\'{"text":"未败者的月桂","color":"gold","italic":false}\',Lore:[\'{"text":"第五十道刻痕以后，斗神把铁册合上了。","color":"gray","italic":false}\',\'{"text":"“够了。今夜没人还能说你没有举起过剑。”","color":"dark_red","italic":true}\']}}'
  giveDivineCollectible(player, 'minecraft:gold_nugget', nbt)
}

function divineWarMilestone(player, count) {
  if (count == 5) {
    player.addXP(20)
    divineGive(player, 'minecraft:emerald', 3)

    divineRewardTell(
      player,
      '⚔ 五次胜利 · 斗神微微颔首',
      '三枚绿石从铁册页缝里滚了出来。远处的鼓声停了半拍。',
      'red',
      'minecraft:entity.player.levelup',
      1.08
    )
  }
  else if (count == 15) {
    player.addXP(45)
    giveDivineToken(player, 1)
    divineGive(player, 'minecraft:diamond', 1)

    divineRewardTell(
      player,
      '⚔ 十五次胜利 · 铁誓回应',
      '一枚钻石和一片紫色回声从敌人的影子里滚出来。瓦尔卡恩没有解释。',
      'dark_red',
      'minecraft:item.trident.thunder',
      1.18
    )
  }
  else if (count == 30) {
    player.addXP(80)
    giveDivineToken(player, 2)
    divineGive(player, 'minecraft:netherite_scrap', 1)
    divineWarFinalMark(player)

    divineRewardTell(
      player,
      '⚔ 三十次胜利 · 今夜的名字已被记下',
      '远方的战鼓彻底停了。断剑的缺口替你记住了今夜。',
      'gold',
      'minecraft:ui.toast.challenge_complete',
      1.0
    )
  }
  else if (count == 50) {
    player.addXP(120)
    giveDivineToken(player, 3)
    divineGive(player, 'minecraft:netherite_scrap', 2)
    divineWarFiftiethMark(player)

    divineRewardTell(
      player,
      '⚔ 五十次胜利 · 铁册合拢',
      '瓦尔卡恩终于把笔放下。今夜之后，祂不再需要别人证明你是否握过剑。',
      'gold',
      'minecraft:ui.toast.challenge_complete',
      0.82
    )

    // 50 杀额外给一次 4★ 命线，但仍由旧匣自己的系统结算。
    try {
      if (global.oracleDevForce && typeof global.oracleDevForce == 'function') {
        global.oracleDevForce(player, '4★')
      }
    } catch (error) {
      console.log('[DivineRewards] War 50 oracle reward failed: ' + error)
    }
  }
}

function divineWarRareResource(player, entityId, undead) {
  var rareRolls = player.persistentData.getInt('warRareRollCount')
  if (rareRolls >= WAR_RARE_ROLL_CAP) return

  player.persistentData.putInt('warRareRollCount', rareRolls + 1)

  // 亡灵更容易从斗神的铁册里“掉出”高价值矿物。
  if (undead) {
    if (player.persistentData.getInt('warIngotCount') < 1 && Math.random() < 0.00035) {
      player.persistentData.putInt('warIngotCount', 1)
      divineGive(player, 'minecraft:netherite_ingot', 1)
      divineRareDropTell(player, '下界合金锭 ×1', 'gold')
      return
    }

    if (player.persistentData.getInt('warScrapCount') < 2 && Math.random() < 0.0022) {
      player.persistentData.putInt('warScrapCount', player.persistentData.getInt('warScrapCount') + 1)
      divineGive(player, 'minecraft:netherite_scrap', 1)
      divineRareDropTell(player, '下界合金碎片 ×1', 'dark_gray')
      return
    }

    if (player.persistentData.getInt('warDiamondCount') < 3 && Math.random() < 0.014) {
      player.persistentData.putInt('warDiamondCount', player.persistentData.getInt('warDiamondCount') + 1)
      divineGive(player, 'minecraft:diamond', 1)
      divineRareDropTell(player, '钻石 ×1', 'aqua')
      return
    }
  }

  divineWarMobRareDrop(player, entityId)
}

function divineWarMobRareDrop(player, entityId) {
  var cap = player.persistentData.getInt('warMobRareCount')
  if (cap >= 8) return

  var item = ''
  var amount = 1
  var label = ''
  var chance = 0

  if (entityId == 'minecraft:enderman') { item = 'minecraft:ender_pearl'; amount = 2; label = '末影珍珠'; chance = 0.20 }
  else if (entityId == 'minecraft:blaze') { item = 'minecraft:blaze_rod'; amount = 2; label = '烈焰棒'; chance = 0.20 }
  else if (entityId == 'minecraft:creeper') { item = 'minecraft:gunpowder'; amount = 4; label = '火药'; chance = 0.24 }
  else if (entityId == 'minecraft:witch') { item = Math.random() < 0.5 ? 'minecraft:glowstone_dust' : 'minecraft:redstone'; amount = 4; label = item == 'minecraft:redstone' ? '红石粉' : '荧石粉'; chance = 0.20 }
  else if (entityId == 'minecraft:slime') { item = 'minecraft:slime_ball'; amount = 4; label = '黏液球'; chance = 0.26 }
  else if (entityId == 'minecraft:magma_cube') { item = 'minecraft:magma_cream'; amount = 2; label = '岩浆膏'; chance = 0.24 }
  else if (entityId == 'minecraft:phantom') { item = 'minecraft:phantom_membrane'; amount = 2; label = '幻翼膜'; chance = 0.22 }
  else if (entityId == 'minecraft:ghast') { item = 'minecraft:ghast_tear'; amount = 1; label = '恶魂之泪'; chance = 0.09 }
  else if (entityId == 'minecraft:wither_skeleton') { item = 'minecraft:wither_skeleton_skull'; amount = 1; label = '凋灵骷髅头颅'; chance = 0.018 }
  else if (entityId == 'minecraft:drowned') { item = 'minecraft:trident'; amount = 1; label = '三叉戟'; chance = 0.006 }
  else if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') { item = 'minecraft:emerald'; amount = 3; label = '绿宝石'; chance = 0.18 }
  else if (entityId == 'minecraft:evoker') { item = 'minecraft:totem_of_undying'; amount = 1; label = '不死图腾'; chance = 0.008 }

  if (!item || Math.random() >= chance) return

  player.persistentData.putInt('warMobRareCount', cap + 1)
  divineGive(player, item, amount)
  divineRareDropTell(player, label + ' ×' + amount, 'gold')
}

// ============================================================
// 斗神奖赏
// ============================================================

function divineWarReward(player, entity) {
  if (!player || !player.server) return

  var server = player.server
  if (!server.persistentData.getBoolean('warBlessingActive')) return
  if (!divineIsHostile(entity)) return

  var runId = server.persistentData.getInt('divineRunId')
  divineResetWarState(player, runId)

  var count = player.persistentData.getInt('warRewardCount')
  if (count >= WAR_REWARD_CAP) return

  count++
  player.persistentData.putInt('warRewardCount', count)

  // 每次有效胜利给 3 点额外经验，最多记录 50 次。
  player.addXP(3)

  var entityId = divineEntityTypeId(entity)
  var undead = divineIsUndead(entity)

  if (global.historyRecordWarKill) {
    try { global.historyRecordWarKill(player, entityId, undead) } catch (ignored) {}
  }

  divineWarRareResource(player, entityId, undead)
  divineWarMilestone(player, count)
}

// ============================================================
// 血月普通猎杀
// ============================================================

function divineBloodHuntReward(player, entity) {
  if (!player || !player.server) return

  var server = player.server
  if (!server.persistentData.getBoolean('bloodMoonActive')) return
  if (!divineIsHostile(entity)) return

  var runId = server.persistentData.getInt('divineRunId')
  divineResetCounterForRun(player, 'bloodHuntRunId', 'bloodHuntCount', runId)

  var count = player.persistentData.getInt('bloodHuntCount')
  if (count >= BLOOD_HUNT_CAP) return

  count++
  player.persistentData.putInt('bloodHuntCount', count)
  player.addXP(2)

  if (count == BLOOD_HUNT_CAP) {
    giveDivineToken(player, 1)

    divineRewardTell(
      player,
      '☾ 八个名字被划去',
      '莫尔维恩暂时把你的名字放回了名册末尾。',
      'dark_red',
      'minecraft:block.bell.resonate',
      0.62
    )
  }
}

function divineBloodEliteName(entity) {
  if (divineEntityHasTag(entity, 'blood_zombie')) return '被点名者'
  if (divineEntityHasTag(entity, 'blood_archer')) return '无坟弓手'
  if (divineEntityHasTag(entity, 'blood_spider')) return '红线织者'
  if (divineEntityHasTag(entity, 'blood_beast')) return '血月巨兽'
  if (divineEntityHasTag(entity, 'blood_shadow')) return '血月幽影'
  return '血月精英'
}

function divineBloodEliteReward(player, entity) {
  var name = divineBloodEliteName(entity)

  player.addXP(divineEntityHasTag(entity, 'blood_beast') ? 70 : (divineEntityHasTag(entity, 'blood_shadow') ? 54 : 36))

  // V10.6.0：血月特殊个体正式成为抽奖代币来源，但重型/高速精英才给更高额度。
  if (divineEntityHasTag(entity, 'blood_beast')) giveDivineToken(player, 3)
  else if (divineEntityHasTag(entity, 'blood_shadow')) giveDivineToken(player, 2)
  else giveDivineToken(player, 1)

  if (divineEntityHasTag(entity, 'blood_zombie')) {
    if (Math.random() < 0.18) divineGive(player, 'minecraft:diamond', 1)
    if (Math.random() < 0.24) {
      player.give(Item.of(
        'minecraft:iron_nugget',
        '{DivineBloodRelic:"shield",display:{Name:\'{"text":"名册上的盾钉","color":"dark_red","italic":false}\',Lore:[\'{"text":"从被点名者残破盾缘上取下。","color":"gray","italic":false}\']}}'
      ))
    }
  }
  else if (divineEntityHasTag(entity, 'blood_archer')) {
    divineGive(player, 'minecraft:spectral_arrow', 12)
    if (Math.random() < 0.20) {
      player.give(Item.of(
        'minecraft:enchanted_book',
        '{StoredEnchantments:[{id:"minecraft:flame",lvl:1s}]}'
      ))
    }
  }
  else if (divineEntityHasTag(entity, 'blood_spider')) {
    divineGive(player, 'minecraft:cobweb', 3)
    if (Math.random() < 0.30) divineGive(player, 'minecraft:fermented_spider_eye', 2)
  }
  else if (divineEntityHasTag(entity, 'blood_beast')) {
    divineGive(player, 'minecraft:obsidian', 2 + Math.floor(Math.random() * 3))
    if (Math.random() < 0.24) divineGive(player, 'minecraft:crying_obsidian', 1)
  }
  else if (divineEntityHasTag(entity, 'blood_shadow')) {
    divineGive(player, 'minecraft:ender_pearl', 1 + Math.floor(Math.random() * 2))
    if (Math.random() < 0.20) divineGive(player, 'minecraft:echo_shard', 1)
  }

  if (Math.random() < 0.24) {
    player.give(Item.of(
      'minecraft:echo_shard',
      '{DivineBloodRelic:1b,display:{Name:\'{"text":"血月残响","color":"dark_red","italic":false}\',Lore:[\'{"text":"它记录着一声没有传到清晨的心跳。","color":"gray","italic":false}\']}}'
    ))

    player.tell(Text.darkRed('✦ 你从 ' + name + ' 身上取下了一枚血月残响。'))
  }

  if (global.historyRecordEliteKill) {
    var id = 'blood_spider'
    if (divineEntityHasTag(entity, 'blood_zombie')) id = 'blood_zombie'
    else if (divineEntityHasTag(entity, 'blood_archer')) id = 'blood_archer'
    else if (divineEntityHasTag(entity, 'blood_beast')) id = 'blood_beast'
    else if (divineEntityHasTag(entity, 'blood_shadow')) id = 'blood_shadow'
    try { global.historyRecordEliteKill(player, id, name) } catch (ignored) {}
  }
}

function divineCaveEliteReward(player, entity) {
  player.addXP(32)

  if (Math.random() < 0.65) giveDivineToken(player, 1)
  if (Math.random() < 0.10) divineGive(player, 'minecraft:diamond', 1)
  if (Math.random() < 0.04) divineGive(player, 'minecraft:ancient_debris', 1)

  if (Math.random() < 0.32) {
    try {
      if (global.giveSurveyNote && typeof global.giveSurveyNote == 'function') {
        global.giveSurveyNote(player)
      }
    } catch (error) {
      console.log('[DivineRewards] Survey note failed: ' + error)
    }
  }

  if (global.historyRecordEliteKill) {
    try { global.historyRecordEliteKill(player, 'cave_prospector', '未归的勘探员') } catch (ignored) {}
  }
}

function getWarTrialStatus(player) {
  if (!player || !player.server) {
    return {active:false,kills:0,cap:WAR_REWARD_CAP,runId:0,rareRolls:0,diamonds:0,scrap:0,ingot:0,mobRare:0}
  }

  return {
    active:player.server.persistentData.getBoolean('warBlessingActive'),
    kills:player.persistentData.getInt('warRewardCount'),
    cap:WAR_REWARD_CAP,
    runId:player.persistentData.getInt('warRewardRunId'),
    rareRolls:player.persistentData.getInt('warRareRollCount'),
    diamonds:player.persistentData.getInt('warDiamondCount'),
    scrap:player.persistentData.getInt('warScrapCount'),
    ingot:player.persistentData.getInt('warIngotCount'),
    mobRare:player.persistentData.getInt('warMobRareCount')
  }
}

// ============================================================
// 唯一死亡监听器
// ============================================================

EntityEvents.death(function (event) {
  try {
    var entity = event.entity
    if (!entity) return

    var entityId = divineEntityTypeId(entity)

    // 玩家死亡也通过这一个死亡监听器记入世界纪事，避免再增加第二个死亡监听器。
    if (entityId == 'minecraft:player') {
      // 挑战事件的失败/清理也复用这个唯一死亡监听器，避免另开一套监听导致重复结算。
      if (global.divineChallengePlayerDeath && typeof global.divineChallengePlayerDeath == 'function') {
        try { global.divineChallengePlayerDeath(entity) } catch (challengeDeathError) {
          console.log('[DivineRewards] Challenge player-death cleanup failed: ' + challengeDeathError)
        }
      }
      if (global.historyRecordDeath) {
        try { global.historyRecordDeath(entity) } catch (ignored) {}
      }
      return
    }

    // 同行者死亡不参与任何战斗奖励，并清理专属鞍，避免重复呼唤复制物品。
    if (divineCompanionDeathCleanup(entity)) return

    var killer = event.source.player

    // 统一挑战框架必须先看到 Boss/事件实体的死亡，即使它没有玩家击杀者，
    // 这样才能做异常死亡的失败清理并保证奖励只结算一次。
    var challengeHandled = false
    if (global.divineChallengeHandleDeath && typeof global.divineChallengeHandleDeath == 'function') {
      try { challengeHandled = !!global.divineChallengeHandleDeath(killer, entity) } catch (challengeError) {
        console.log('[DivineRewards] Challenge death handler failed: ' + challengeError)
      }
    }

    if (!killer) return

    // 管理员测试体只用于平衡，不发任何正式奖励，也不写历史。
    if (divineEntityHasTag(entity, 'divine_test_entity')) return

    // 公共历史中的“首位通关者”以第一次击败末影龙为准。
    if (global.historyRecordBossKill) {
      try {
        if (entityId == 'minecraft:ender_dragon') global.historyRecordBossKill(killer, entityId, '末影龙')
        else if (entityId == 'minecraft:wither') global.historyRecordBossKill(killer, entityId, '凋灵')
      } catch (ignored2) {}
    }

    var bloodElite = divineEntityHasTag(entity, 'divine_blood_elite')
    var caveElite = divineEntityHasTag(entity, 'divine_cave_elite')

    if (bloodElite) divineBloodEliteReward(killer, entity)
    else if (caveElite) divineCaveEliteReward(killer, entity)
    else divineBloodHuntReward(killer, entity)

    divineWarReward(killer, entity)

    // 遗物的击杀效果也挂在同一个监听器上。
    if (global.oracleRelicOnKill) {
      try { global.oracleRelicOnKill(killer, entity) } catch (relicError) {
        console.log('[DivineRewards] Relic kill effect failed: ' + relicError)
      }
    }
  } catch (error) {
    console.log('[DivineRewards] Guarded death handler error: ' + error)
  }
})

// ============================================================
// Global API / 旧脚本兼容
// ============================================================

global.giveAppearanceToken = giveDivineToken
global.giveDivineToken = giveDivineToken
global.giveDivineTokenSilent = giveDivineTokenSilent
global.getDivineTokenCount = getDivineTokenCount
global.takeDivineTokens = takeDivineTokens
global.giveDivineCollectible = giveDivineCollectible
global.divineIsHostile = divineIsHostile
global.divineIsUndead = divineIsUndead
global.getWarTrialStatus = getWarTrialStatus
