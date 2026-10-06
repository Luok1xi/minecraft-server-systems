// ============================================================
// 神祇祝福 V3.3
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 所有效果只在事件开始或玩家登录时执行一次。
// 没有 Tick、没有实体扫描、没有背包轮询。
// 战斗奖赏统一由 event_rewards.js 的唯一死亡监听器处理。
// ============================================================

var DIVINE_DAY_SECONDS = 1200
var DIVINE_NIGHT_SECONDS = 600

function divineEffect(playerName, effect, seconds, amplifier) {
  return 'effect give ' + playerName + ' ' + effect + ' ' + seconds + ' ' + amplifier + ' true'
}

function divineBlessingCue(
  server,
  color,
  title,
  effectLine,
  body,
  uniqueSound,
  uniquePitch,
  particle
) {
  if (!server) return

  // 正面神谕采用三层声音：惊喜、神祇标志、轻响收尾。
  if (global.divineQueueCommand) {
    global.divineQueueCommand(
      server,
      138,
      'execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 0.92 1.04'
    )

    global.divineQueueCommand(
      server,
      151,
      'execute as @a at @s run playsound ' + uniqueSound + ' player @s ~ ~ ~ 0.66 ' + uniquePitch
    )

    global.divineQueueCommand(
      server,
      162,
      'execute as @a at @s run particle ' + particle + ' ~ ~1 ~ 0.42 0.55 0.42 0.03 14 force @s'
    )

    global.divineQueueCommand(
      server,
      169,
      'execute as @a at @s run playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 0.46 1.42'
    )
  }

  if (global.divineQueueTell) {
    global.divineQueueTell(server, '@a', 174, [
      {text:title + '\n',color:color,bold:true},
      {text:effectLine + '\n',color:color},
      {text:body,color:'gray',italic:true}
    ])
  }
}

// ============================================================
// 潮王 · 深水之日
//
// Luck II、Water Breathing 与 Dolphin's Grace 都由原版维护。
// 不监听鱼钩，不扫描水域或玩家状态。
// ============================================================

function startWaterBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('waterBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:luck', DIVINE_DAY_SECONDS, 1))
  server.runCommandSilent(divineEffect('@a', 'minecraft:water_breathing', DIVINE_DAY_SECONDS, 0))
  server.runCommandSilent(divineEffect('@a', 'minecraft:dolphins_grace', DIVINE_DAY_SECONDS, 0))

  divineBlessingCue(
    server,
    'aqua',
    '潮印覆腕',
    '幸运 II · 水下呼吸 I · 海豚的恩惠 I',
    '掌心像压过一枚冰冷的贝壳。奈瑞昂没保证你会捞到宝藏；他只是让水流少隐瞒一些东西。雨母若看见，大概又会说弟弟把好东西藏得太深。',
    'minecraft:block.conduit.activate',
    1.08,
    'minecraft:splash'
  )
}

function cleanupWaterBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('waterBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:luck')
  server.runCommandSilent('effect clear @a minecraft:water_breathing')
  server.runCommandSilent('effect clear @a minecraft:dolphins_grace')
}

// ============================================================
// 风王 · 七路之日
//
// 只强调陆地移动：速度 II + 跳跃提升 II。
// 不再与月后共享缓降，二者的手感会明显不同。
// ============================================================

function startWindBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('windBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:speed', DIVINE_DAY_SECONDS, 1))
  server.runCommandSilent(divineEffect('@a', 'minecraft:jump_boost', DIVINE_DAY_SECONDS, 1))

  divineBlessingCue(
    server,
    'white',
    '七路之风应声而来',
    '速度 II · 跳跃提升 II',
    '鞋带无声地抬起，路边的草尖齐齐倒向前方。埃奥伦不替你选路；他只让每一道门槛都矮一些。',
    'minecraft:item.elytra.flying',
    1.22,
    'minecraft:cloud'
  )
}

function cleanupWindBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('windBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:speed')
  server.runCommandSilent('effect clear @a minecraft:jump_boost')
}

// ============================================================
// 炉神 · 不燃之日
// ============================================================

function startFireBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('fireBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:fire_resistance', DIVINE_DAY_SECONDS, 0))

  divineBlessingCue(
    server,
    'gold',
    '炉灰里留下了一颗红星',
    '抗火 I',
    '热意沿着旧伤走了一圈，又安静下来。赫斯塔尔把火留在炉边；她那个总想把火放出去的弟弟，今天难得没来捣乱。',
    'minecraft:block.respawn_anchor.charge',
    1.18,
    'minecraft:flame'
  )
}

function cleanupFireBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('fireBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:fire_resistance')
}

// ============================================================
// 斗神 · 战意之夜
//
// 每次敌对生物死亡时才执行一次奖赏判定；平时零后台负载。
// ============================================================

function startWarBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('warBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:strength', DIVINE_NIGHT_SECONDS, 0))

  divineBlessingCue(
    server,
    'red',
    '铁誓落在掌骨上',
    '力量 I · 击杀经验与里程碑奖赏',
    '远处的战鼓只响了一拍。瓦尔卡恩不替任何人挥剑，但他会数清真正倒下的敌人。若天边又补一声雷，那是他弟弟在笑。',
    'minecraft:block.anvil.land',
    1.30,
    'minecraft:crit'
  )

  if (global.divineQueueTell) {
    global.divineQueueTell(server, '@a', 222, [
      {text:'铁册上的三道旧刻痕\n',color:'dark_red',bold:true},
      {text:'第五次，斗神抬眼；第十五次，铁誓回声；第三十次，断剑会替你留下见证。',color:'gray',italic:true}
    ])
  }
}

function cleanupWarBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('warBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:strength')
}

// ============================================================
// 月后 · 无坠之夜
//
// 与风王彻底分开：
// - 夜视：看清夜路
// - 缓降：坠落迟疑
// - 吸收：银纱护身
// - 前三分钟隐身：月影短暂遮名
// ============================================================

function startMoonBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('moonBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:night_vision', DIVINE_NIGHT_SECONDS, 0))
  server.runCommandSilent(divineEffect('@a', 'minecraft:slow_falling', DIVINE_NIGHT_SECONDS, 0))
  server.runCommandSilent(divineEffect('@a', 'minecraft:absorption', DIVINE_NIGHT_SECONDS, 0))
  server.runCommandSilent(divineEffect('@a', 'minecraft:invisibility', 180, 0))

  divineBlessingCue(
    server,
    'light_purple',
    '银纱覆面',
    '夜视 I · 缓降 I · 吸收 I · 月影 180 秒',
    '月光在肩头停了一会儿。露娜娅接过索拉恩留下的天空，替你遮住名字，也把悬崖边最后一步的重量拿走。',
    'minecraft:block.amethyst_cluster.hit',
    1.34,
    'minecraft:end_rod'
  )
}

function cleanupMoonBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('moonBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:night_vision')
  server.runCommandSilent('effect clear @a minecraft:slow_falling')
  server.runCommandSilent('effect clear @a minecraft:absorption')
  server.runCommandSilent('effect clear @a minecraft:invisibility')
}

// ============================================================
// 日王 · 金辉之日
//
// 只强调劳作：急迫 II。取消速度，避免与风王重叠。
// ============================================================

function startSunBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('sunBlessingActive', true)
  server.runCommandSilent(divineEffect('@a', 'minecraft:haste', DIVINE_DAY_SECONDS, 1))

  divineBlessingCue(
    server,
    'yellow',
    '金冠照在工具上',
    '急迫 II',
    '铁器边缘亮起一道细金线。索拉恩不替人举锤；他只让今日的每一下都更接近完工。等天色暗下来，剩下的路会交给露娜娅。',
    'minecraft:block.beacon.power_select',
    1.16,
    'minecraft:wax_on'
  )
}

function cleanupSunBlessing(server) {
  if (!server) return

  server.persistentData.putBoolean('sunBlessingActive', false)
  server.runCommandSilent('effect clear @a minecraft:haste')
}

// ============================================================
// 中途登录只补效果，不重播全服神谕
// ============================================================

function applyDivineEventToPlayer(player, id) {
  if (!player || !player.server) return

  var name = String(player.username)
  var server = player.server

  if (id == 'sea_bounty') {
    server.runCommandSilent(divineEffect(name, 'minecraft:luck', DIVINE_DAY_SECONDS, 1))
    server.runCommandSilent(divineEffect(name, 'minecraft:water_breathing', DIVINE_DAY_SECONDS, 0))
    server.runCommandSilent(divineEffect(name, 'minecraft:dolphins_grace', DIVINE_DAY_SECONDS, 0))
  }
  else if (id == 'wind_road') {
    server.runCommandSilent(divineEffect(name, 'minecraft:speed', DIVINE_DAY_SECONDS, 1))
    server.runCommandSilent(divineEffect(name, 'minecraft:jump_boost', DIVINE_DAY_SECONDS, 1))
  }
  else if (id == 'fire_hearth') {
    server.runCommandSilent(divineEffect(name, 'minecraft:fire_resistance', DIVINE_DAY_SECONDS, 0))
  }
  else if (id == 'war_trial') {
    server.runCommandSilent(divineEffect(name, 'minecraft:strength', DIVINE_NIGHT_SECONDS, 0))
  }
  else if (id == 'moon_silver') {
    server.runCommandSilent(divineEffect(name, 'minecraft:night_vision', DIVINE_NIGHT_SECONDS, 0))
    server.runCommandSilent(divineEffect(name, 'minecraft:slow_falling', DIVINE_NIGHT_SECONDS, 0))
    server.runCommandSilent(divineEffect(name, 'minecraft:absorption', DIVINE_NIGHT_SECONDS, 0))
    server.runCommandSilent(divineEffect(name, 'minecraft:invisibility', 180, 0))
  }
  else if (id == 'sun_labor') {
    server.runCommandSilent(divineEffect(name, 'minecraft:haste', DIVINE_DAY_SECONDS, 1))
  }
  else if (id == 'rain_harvest') {
    if (global.applyHarvestGiftToPlayer) global.applyHarvestGiftToPlayer(player)
  }
}

// ============================================================
// Global API
// ============================================================

global.startWaterBlessing = startWaterBlessing
global.cleanupWaterBlessing = cleanupWaterBlessing
global.startWindBlessing = startWindBlessing
global.cleanupWindBlessing = cleanupWindBlessing
global.startFireBlessing = startFireBlessing
global.cleanupFireBlessing = cleanupFireBlessing
global.startWarBlessing = startWarBlessing
global.cleanupWarBlessing = cleanupWarBlessing
global.startMoonBlessing = startMoonBlessing
global.cleanupMoonBlessing = cleanupMoonBlessing
global.startSunBlessing = startSunBlessing
global.cleanupSunBlessing = cleanupSunBlessing
global.applyDivineEventToPlayer = applyDivineEventToPlayer
