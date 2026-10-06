// Blood Moon V10.6.5 · 真人目标过滤 / 共享安全落点 / 跨维度生成修复
// ============================================================
// 死神的点名 · 血月 V5.0
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 低负载：
// - 没有 Tick
// - 没有附近实体扫描
// - 每次自然血月按权重随机 1~10 只特殊个体；高数量明显更稀有
// - 待机声只在生成时预排少量次数
// - 攻击 / 受伤声由 EntityEvents.hurt 事件驱动
// - 装备在召唤瞬间随机生成，全部附魔且掉落率为 0
// ============================================================

var BLOOD_ELITES = {
  zombie:{
    index:0,entity:'minecraft:zombie',name:'被点名者',health:110,speed:0.31,attack:8.0,armor:4.0,
    note:'110 生命 · 附魔铁甲 · 附魔剑盾 · 正面压迫'
  },
  archer:{
    index:1,entity:'minecraft:skeleton',name:'无坟弓手',health:96,speed:0.32,attack:7.0,armor:3.0,
    note:'96 生命 · 随机附魔火矢弓 · 远距离压制'
  },
  spider:{
    index:2,entity:'minecraft:spider',name:'红线织者',health:88,speed:0.43,attack:12.0,armor:6.0,
    note:'88 生命 · 高速贴身 · 随机强化效果'
  },
  beast:{
    index:3,entity:'minecraft:ravager',name:'血月巨兽',health:260,speed:0.30,attack:20.0,armor:12.0,
    note:'260 生命 · 重型冲锋 · 高击退抗性 · 不破坏地形'
  },
  shadow:{
    index:4,entity:'minecraft:enderman',name:'血月幽影',health:140,speed:0.39,attack:14.0,armor:5.0,
    note:'140 生命 · 短距闪烁 · 侧后方干扰'
  }
}

var BLOOD_ZOMBIE_LOADOUTS = [
  {
    weapon:'{id:"minecraft:iron_sword",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:2s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:knockback",lvl:1s}]}}',
    shield:'{id:"minecraft:shield",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:vanishing_curse",lvl:1s}]}}',
    boots:'{id:"minecraft:iron_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:feather_falling",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:iron_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:iron_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:thorns",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  },
  {
    weapon:'{id:"minecraft:iron_sword",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    shield:'{id:"minecraft:shield",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:vanishing_curse",lvl:1s}]}}',
    boots:'{id:"minecraft:chainmail_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:iron_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:blast_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:iron_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:projectile_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  },
  {
    weapon:'{id:"minecraft:iron_sword",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:2s},{id:"minecraft:fire_aspect",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    shield:'{id:"minecraft:shield",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:vanishing_curse",lvl:1s}]}}',
    boots:'{id:"minecraft:iron_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:fire_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:chainmail_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:iron_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:fire_protection",lvl:3s},{id:"minecraft:thorns",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  }
]

var BLOOD_ARCHER_LOADOUTS = [
  {
    bow:'{id:"minecraft:bow",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:power",lvl:2s},{id:"minecraft:flame",lvl:1s},{id:"minecraft:punch",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:chainmail_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:projectile_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:leather_leggings",Count:1b,tag:{Unbreakable:1b,display:{color:2500134},Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:chainmail_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:projectile_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  },
  {
    bow:'{id:"minecraft:bow",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:power",lvl:3s},{id:"minecraft:flame",lvl:1s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:iron_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:feather_falling",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:chainmail_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:leather_chestplate",Count:1b,tag:{Unbreakable:1b,display:{color:1710618},Enchantments:[{id:"minecraft:projectile_protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  },
  {
    bow:'{id:"minecraft:bow",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:power",lvl:2s},{id:"minecraft:flame",lvl:1s},{id:"minecraft:punch",lvl:2s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    boots:'{id:"minecraft:chainmail_boots",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    legs:'{id:"minecraft:iron_leggings",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:blast_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}',
    chest:'{id:"minecraft:chainmail_chestplate",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:thorns",lvl:1s},{id:"minecraft:projectile_protection",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}]}}'
  }
]

function bloodRealPlayer(player) {
  if(!player)return false
  try{if(String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return false}catch(ignoredClass){}
  try{if(player.isSpectator&&player.isSpectator())return false}catch(ignoredSpectator){}
  return true
}

function bloodEligiblePlayers(server) {
  var result=[],i=0
  if(!server)return result
  try{
    var list=server.getPlayerList().getPlayers()
    for(i=0;i<list.size();i++){
      var player=list.get(i)
      if(bloodRealPlayer(player))result.push(player)
    }
    return result
  }catch(ignoredList){}
  try{
    for(i=0;i<server.players.size();i++){
      var fallback=server.players.get(i)
      if(bloodRealPlayer(fallback))result.push(fallback)
    }
  }catch(ignoredPlayers){}
  return result
}

function bloodPlayerName(player) {
  try{return String(player.username)}catch(ignored){}
  try{return String(player.getGameProfile().getName())}catch(ignored2){}
  return ''
}

function bloodDimension(player) {
  try{return String(player.level.dimension)}catch(ignored){}
  return 'minecraft:overworld'
}

function bloodPos(player) {
  try{return{x:Number(player.getX()),y:Number(player.getY()),z:Number(player.getZ())}}catch(ignored){}
  try{return{x:Number(player.x),y:Number(player.y),z:Number(player.z)}}catch(ignored2){}
  return{x:0,y:64,z:0}
}

function bloodSafeSpawnNear(player) {
  if(!player)return null
  try{
    if(global.divineFindSafeSpawnNear&&typeof global.divineFindSafeSpawnNear=='function'){
      var safe=global.divineFindSafeSpawnNear(player,7,15)
      if(safe)return safe
    }
  }catch(ignoredShared){}
  // 共享安全查找器异常时的保底路径。事件不再因为一个检查器失效而彻底瘫痪。
  var p=bloodPos(player),angle=Math.random()*Math.PI*2,radius=8+Math.random()*6
  return{x:Math.floor(p.x+Math.cos(angle)*radius)+0.5,y:Math.floor(p.y)+1,z:Math.floor(p.z+Math.sin(angle)*radius)+0.5,mode:'fallback'}
}

function bloodWeightedKey() {
  var roll=Math.random()*100
  if(roll<26)return 'zombie'
  if(roll<48)return 'archer'
  if(roll<68)return 'spider'
  if(roll<82)return 'beast'
  return 'shadow'
}

function bloodEliteByKey(key) {
  if (key && BLOOD_ELITES[key]) return BLOOD_ELITES[key]
  return BLOOD_ELITES[bloodWeightedKey()]
}

function bloodEliteKey(elite) {
  if (!elite) return 'zombie'
  if (elite.index == 1) return 'archer'
  if (elite.index == 2) return 'spider'
  if (elite.index == 3) return 'beast'
  if (elite.index == 4) return 'shadow'
  return 'zombie'
}

function bloodRollSpawnCount() {
  var roll=Math.random()
  if(roll<0.45)return 1+Math.floor(Math.random()*3)       // 1~3 常见
  if(roll<0.78)return 4+Math.floor(Math.random()*3)       // 4~6 较常见
  if(roll<0.93)return 7+Math.floor(Math.random()*2)       // 7~8 较少
  if(roll<0.98)return 9                                   // 9 稀有
  return 10                                               // 10 极少
}

function bloodUniqueTag() {
  return 'blood_instance_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 100000))
}

function bloodEliteBuild(player, key, testEntity) {
  if(!player)return null
  var playerName=bloodPlayerName(player)
  var safe=bloodSafeSpawnNear(player)
  if(!playerName||!safe)return null
  var dimension=bloodDimension(player)
  var elite = bloodEliteByKey(key)
  var resolvedKey = bloodEliteKey(elite)
  var uniqueTag = bloodUniqueTag()
  var tags = '"divine_event_entity","divine_blood_elite","blood_' + resolvedKey + '","' + uniqueTag + '"'
  var equipment = ''
  var armorEquipment = ''
  var visualMarker = ''
  var activeEffects = ''

  if (testEntity) tags += ',"divine_test_entity"'

  if (resolvedKey == 'zombie') {
    var loadout = BLOOD_ZOMBIE_LOADOUTS[Math.floor(Math.random() * BLOOD_ZOMBIE_LOADOUTS.length)]

    equipment = ',HandItems:[' + loadout.weapon + ',' + loadout.shield + '],HandDropChances:[0.0f,0.0f]'
    armorEquipment = ',ArmorItems:[' + loadout.boots + ',' + loadout.legs + ',' + loadout.chest + ',{id:"minecraft:creeper_head",Count:1b,tag:{Enchantments:[{id:"minecraft:vanishing_curse",lvl:1s}],HideFlags:1}}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]'
  }

  if (resolvedKey == 'archer') {
    var archerLoadout = BLOOD_ARCHER_LOADOUTS[Math.floor(Math.random() * BLOOD_ARCHER_LOADOUTS.length)]

    equipment = ',HandItems:[' + archerLoadout.bow + ',{}],HandDropChances:[0.0f,0.0f]'
    armorEquipment = ',ArmorItems:[' + archerLoadout.boots + ',' + archerLoadout.legs + ',' + archerLoadout.chest + ',{id:"minecraft:wither_skeleton_skull",Count:1b,tag:{Enchantments:[{id:"minecraft:vanishing_curse",lvl:1s}],HideFlags:1}}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]'
  }

  if (resolvedKey == 'spider') {
    visualMarker = ',Glowing:1b'

    var spiderRoll = Math.floor(Math.random() * 3)
    if (spiderRoll == 0) activeEffects = ',ActiveEffects:[{Id:1b,Amplifier:0b,Duration:999999,ShowParticles:0b}]'
    if (spiderRoll == 1) activeEffects = ',ActiveEffects:[{Id:11b,Amplifier:0b,Duration:999999,ShowParticles:0b}]'
    if (spiderRoll == 2) activeEffects = ',ActiveEffects:[{Id:5b,Amplifier:0b,Duration:999999,ShowParticles:0b}]'
  }

  if (resolvedKey == 'beast') {
    visualMarker = ',Glowing:1b'
    activeEffects = ',ActiveEffects:[{Id:11b,Amplifier:0b,Duration:999999,ShowParticles:0b}]'
  }

  if (resolvedKey == 'shadow') {
    visualMarker = ',Glowing:1b'
    activeEffects = ',ActiveEffects:[{Id:1b,Amplifier:0b,Duration:999999,ShowParticles:0b}]'
  }

  var command = 'execute in ' + dimension + ' run summon ' + elite.entity + ' ' + safe.x + ' ' + safe.y + ' ' + safe.z + ' ' +
    '{Tags:[' + tags + '],PersistenceRequired:1b,CanPickUpLoot:0b,Silent:1b,' +
    'CustomName:\'{"text":"' + elite.name + '","color":"dark_red","bold":true}\',' +
    'CustomNameVisible:1b,Health:' + elite.health + '.0f,' +
    'Attributes:[' +
      '{Name:"minecraft:generic.max_health",Base:' + elite.health + '.0},' +
      '{Name:"minecraft:generic.movement_speed",Base:' + elite.speed + '},' +
      '{Name:"minecraft:generic.attack_damage",Base:' + elite.attack + '},' +
      '{Name:"minecraft:generic.armor",Base:' + elite.armor + '},' +
      '{Name:"minecraft:generic.knockback_resistance",Base:' + (elite.index == 3 ? '0.78' : (elite.index == 0 ? '0.38' : (elite.index == 2 ? '0.28' : '0.22'))) + '},' +
      '{Name:"minecraft:generic.follow_range",Base:' + (elite.index == 1 ? '56.0' : (elite.index == 3 ? '48.0' : '44.0')) + '}' +
    ']' + equipment + armorEquipment + visualMarker + activeEffects + '}'

  return {
    command:command,
    key:resolvedKey,
    elite:elite,
    uniqueTag:uniqueTag,
    targetName:playerName,
    spawn:safe,
    dimension:dimension
  }
}

function bloodSoundAtTag(server, uniqueTag, sound, volume, pitch, dimension) {
  if (!server || !uniqueTag) return
  var prefix=dimension?'execute in '+dimension+' run ':''
  server.runCommandSilent(
    prefix+'execute as @e[tag=' + uniqueTag + ',limit=1] at @s run playsound ' + sound + ' hostile @a[distance=..32] ~ ~ ~ ' + volume + ' ' + pitch
  )
}


function bloodDimensionCommand(build, command) {
  if(!build||!build.dimension)return command
  return 'execute in '+build.dimension+' run '+command
}

function bloodSpawnSounds(server, build, baseDelay) {
  if (!server || !build) return

  var d = baseDelay || 0
  var tag = build.uniqueTag

  if (global.divineQueueCommand) {
    if (build.key == 'zombie') {
      global.divineQueueCommand(server, d + 2, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:item.shield.block hostile @a[distance=..32] ~ ~ ~ 0.82 0.68'))
      global.divineQueueCommand(server, d + 5, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.zombie.attack_iron_door hostile @a[distance=..32] ~ ~ ~ 0.50 0.58'))
      global.divineQueueCommand(server, d + 240, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.ravager.ambient hostile @a[distance=..24] ~ ~ ~ 0.24 0.60'))
      global.divineQueueCommand(server, d + 520, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:item.shield.block hostile @a[distance=..20] ~ ~ ~ 0.26 0.54'))
    }
    else if (build.key == 'archer') {
      global.divineQueueCommand(server, d + 2, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:item.firecharge.use hostile @a[distance=..32] ~ ~ ~ 0.72 0.72'))
      global.divineQueueCommand(server, d + 5, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.skeleton.converted_to_stray hostile @a[distance=..32] ~ ~ ~ 0.44 0.82'))
      global.divineQueueCommand(server, d + 260, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.stray.ambient hostile @a[distance=..24] ~ ~ ~ 0.28 0.74'))
      global.divineQueueCommand(server, d + 560, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:block.fire.ambient hostile @a[distance=..20] ~ ~ ~ 0.22 0.70'))
    }
    else if (build.key == 'spider') {
      global.divineQueueCommand(server, d + 2, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:block.sculk_shrieker.shriek hostile @a[distance=..32] ~ ~ ~ 0.28 1.30'))
      global.divineQueueCommand(server, d + 5, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.spider.ambient hostile @a[distance=..32] ~ ~ ~ 0.78 0.55'))
      global.divineQueueCommand(server, d + 210, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:block.sculk_sensor.clicking hostile @a[distance=..20] ~ ~ ~ 0.22 0.72'))
      global.divineQueueCommand(server, d + 470, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.spider.ambient hostile @a[distance=..24] ~ ~ ~ 0.30 0.44'))
    }
    else if (build.key == 'beast') {
      global.divineQueueCommand(server, d + 2, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.ravager.roar hostile @a[distance=..40] ~ ~ ~ 0.80 0.62'))
      global.divineQueueCommand(server, d + 5, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.warden.sonic_charge hostile @a[distance=..40] ~ ~ ~ 0.24 0.54'))
      global.divineQueueCommand(server, d + 260, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.ravager.step hostile @a[distance=..26] ~ ~ ~ 0.34 0.58'))
    }
    else {
      global.divineQueueCommand(server, d + 2, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.enderman.stare hostile @a[distance=..36] ~ ~ ~ 0.58 0.66'))
      global.divineQueueCommand(server, d + 5, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:block.sculk_sensor.clicking_stop hostile @a[distance=..36] ~ ~ ~ 0.34 0.74'))
      global.divineQueueCommand(server, d + 240, bloodDimensionCommand(build, 'execute as @e[tag=' + tag + ',limit=1] at @s run playsound minecraft:entity.enderman.ambient hostile @a[distance=..24] ~ ~ ~ 0.26 0.58'))
    }
  }
  else {
    if (build.key == 'zombie') bloodSoundAtTag(server, tag, 'minecraft:item.shield.block', 0.82, 0.68, build.dimension)
    else if (build.key == 'archer') bloodSoundAtTag(server, tag, 'minecraft:item.firecharge.use', 0.72, 0.72, build.dimension)
    else if (build.key == 'spider') bloodSoundAtTag(server, tag, 'minecraft:block.sculk_shrieker.shriek', 0.28, 1.30, build.dimension)
    else if (build.key == 'beast') bloodSoundAtTag(server, tag, 'minecraft:entity.ravager.roar', 0.80, 0.62, build.dimension)
    else bloodSoundAtTag(server, tag, 'minecraft:entity.enderman.stare', 0.58, 0.66, build.dimension)
  }
}

function bloodSpawnBuild(server, build, delayedSpawn) {
  if (!server || !build) return false

  if (delayedSpawn > 0 && global.divineQueueCommand) {
    global.divineQueueCommand(server, delayedSpawn, build.command)
    bloodSpawnSounds(server, build, delayedSpawn)
    if(build.key=='shadow'&&build.targetName){
      global.divineQueueCommand(server, delayedSpawn+2, bloodDimensionCommand(build, 'data merge entity @e[tag='+build.uniqueTag+',limit=1] {AngerTime:2147483647}'))
      global.divineQueueCommand(server, delayedSpawn+3, bloodDimensionCommand(build, 'data modify entity @e[tag='+build.uniqueTag+',limit=1] AngryAt set from entity '+build.targetName+' UUID'))
    }
    return true
  }

  var result = server.runCommandSilent(build.command)
  if (result > 0) {
    bloodSpawnSounds(server, build, 0)
    if(build.key=='shadow'&&build.targetName){
      try{server.runCommandSilent(bloodDimensionCommand(build, 'data merge entity @e[tag='+build.uniqueTag+',limit=1] {AngerTime:2147483647}'))}catch(ignoredAnger){}
      try{server.runCommandSilent(bloodDimensionCommand(build, 'data modify entity @e[tag='+build.uniqueTag+',limit=1] AngryAt set from entity '+build.targetName+' UUID'))}catch(ignoredTarget){}
    }
  }
  return result > 0
}

function spawnBloodEliteForPlayer(player, key) {
  if (!player || !player.server) return false

  var build = bloodEliteBuild(player, key, true)
  if(!build){
    player.tell(Text.red('测试精英召唤失败：没有找到可用落点。'))
    return false
  }
  var ok = bloodSpawnBuild(player.server, build, 0)

  if (!ok) {
    player.tell(Text.red('测试精英召唤命令失败；已在服务端控制台记录维度与落点。'))
    console.log('[BloodMoon] test summon failed: key='+build.key+', dim='+build.dimension+', pos='+JSON.stringify(build.spawn||{}))
    return false
  }

  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' + JSON.stringify([
      {text:'☾ 测试体：',color:'dark_red'},
      {text:build.elite.name + '\n',color:'red',bold:true},
      {text:build.elite.note + '\n',color:'gray'},
      {text:'本次装备已经随机；测试体不会发放血月、洞穴或斗神奖励。',color:'dark_gray',italic:true}
    ])
  )

  return true
}

function bloodEntityHasTag(entity, tag) {
  try { return entity && entity.tags && entity.tags.contains(tag) } catch (error) { return false }
}

function bloodHurtAttacker(event) {
  try { if (event.source.actual) return event.source.actual } catch (ignored) {}
  try { if (event.source.entity) return event.source.entity } catch (ignored2) {}
  try { if (event.source.player) return event.source.player } catch (ignored3) {}
  return null
}

function bloodSoundCooldown(entity, key, milliseconds) {
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

function bloodPlayEntitySound(entity, sound, volume, pitch) {
  if (!entity || !entity.server) return

  try {
    entity.server.runCommandSilent(
      'execute as ' + entity.uuid + ' at @s run playsound ' + sound + ' hostile @a[distance=..24] ~ ~ ~ ' + volume + ' ' + pitch
    )
  } catch (error) {
    try {
      entity.server.runCommandSilent(
        'execute at ' + entity.uuid + ' run playsound ' + sound + ' hostile @a[distance=..24] ~ ~ ~ ' + volume + ' ' + pitch
      )
    } catch (ignored) {}
  }
}

// 只有精英真正造成伤害或受到伤害时才运行。
EntityEvents.hurt(function (event) {
  try {
    var victim = event.entity
    var attacker = bloodHurtAttacker(event)

    if (victim && bloodEntityHasTag(victim, 'divine_blood_elite') && bloodSoundCooldown(victim, 'bloodHurtSound', 900)) {
      if (bloodEntityHasTag(victim, 'blood_zombie')) bloodPlayEntitySound(victim, 'minecraft:entity.iron_golem.damage', 0.45, 0.70)
      else if (bloodEntityHasTag(victim, 'blood_archer')) bloodPlayEntitySound(victim, 'minecraft:entity.wither_skeleton.hurt', 0.55, 0.76)
      else if (bloodEntityHasTag(victim, 'blood_spider')) bloodPlayEntitySound(victim, 'minecraft:entity.spider.hurt', 0.58, 0.54)
      else if (bloodEntityHasTag(victim, 'blood_beast')) { bloodPlayEntitySound(victim, 'minecraft:entity.ravager.hurt', 0.60, 0.62); bloodPlayEntitySound(victim, 'minecraft:block.deepslate.hit', 0.22, 0.54) }
      else { bloodPlayEntitySound(victim, 'minecraft:entity.enderman.hurt', 0.52, 0.64); bloodPlayEntitySound(victim, 'minecraft:block.sculk_sensor.clicking_stop', 0.20, 0.78) }
    }

    if (attacker && bloodEntityHasTag(attacker, 'divine_blood_elite') && bloodSoundCooldown(attacker, 'bloodAttackSound', 650)) {
      if (bloodEntityHasTag(attacker, 'blood_zombie')) {
        bloodPlayEntitySound(attacker, 'minecraft:item.shield.block', 0.48, 0.62)
        bloodPlayEntitySound(attacker, 'minecraft:entity.player.attack.strong', 0.52, 0.72)
      }
      else if (bloodEntityHasTag(attacker, 'blood_archer')) {
        bloodPlayEntitySound(attacker, 'minecraft:entity.skeleton.shoot', 0.62, 0.62)
        bloodPlayEntitySound(attacker, 'minecraft:entity.blaze.shoot', 0.28, 1.22)
      }
      else if (bloodEntityHasTag(attacker, 'blood_spider')) {
        bloodPlayEntitySound(attacker, 'minecraft:entity.spider.step', 0.56, 0.46)
        bloodPlayEntitySound(attacker, 'minecraft:block.sculk_sensor.clicking', 0.24, 0.88)
      }
      else if (bloodEntityHasTag(attacker, 'blood_beast')) {
        bloodPlayEntitySound(attacker, 'minecraft:entity.ravager.attack', 0.72, 0.62)
        bloodPlayEntitySound(attacker, 'minecraft:entity.iron_golem.attack', 0.26, 0.56)
      }
      else {
        bloodPlayEntitySound(attacker, 'minecraft:entity.enderman.teleport', 0.50, 0.72)
        bloodPlayEntitySound(attacker, 'minecraft:entity.player.attack.sweep', 0.22, 0.62)
      }
    }
  } catch (error) {
    console.log('[BloodMoon] Hurt sound handler failed: ' + error)
  }
})

function startBloodMoon(server) {
  if (!server || server.persistentData.getBoolean('bloodMoonActive')) return false

  server.persistentData.putBoolean('bloodMoonActive', true)
  server.runCommandSilent('effect give @a minecraft:darkness 5 0 true')

  if (global.divineQueueCommand) {
    global.divineQueueCommand(server, 140, 'execute as @a at @s run playsound minecraft:entity.wither.spawn player @s ~ ~ ~ 0.22 0.70')
    global.divineQueueCommand(server, 154, 'execute as @a at @s run playsound minecraft:block.bell.resonate player @s ~ ~ ~ 0.56 0.56')
  }

  if (global.divineQueueTell) {
    global.divineQueueTell(server, '@a', 176, [
      {text:'名册已经翻开\n',color:'dark_red',bold:true},
      {text:'今夜前八名倒在你手中的敌人会留下额外经验；第八名还会留下一枚幻形碎片。\n',color:'gray'},
      {text:'被点名者的衣甲与武器每次都不完全相同。听见陌生的声音时，不要只看月亮。',color:'red',italic:true}
    ])
  }

  var players = bloodEligiblePlayers(server)

  if (players.length <= 0) {
    if (global.divineQueueTell) {
      global.divineQueueTell(server, '@a', 224, {
        text:'红月等了一会儿，地表上没有人。名册里的一行墨迹慢慢干了。',
        color:'dark_red',
        italic:true
      })
    }
    return true
  }

  var focus = players[Math.floor(Math.random() * players.length)]
  var spawnCount = bloodRollSpawnCount()
  var keys=[],i=0
  for(i=0;i<spawnCount;i++)keys.push(bloodWeightedKey())
  // 大群血月至少混入一个重型/高速特殊个体，避免十只都只是普通强化怪。
  if(spawnCount>=6){
    var hasSignature=false
    for(i=0;i<keys.length;i++)if(keys[i]=='beast'||keys[i]=='shadow')hasSignature=true
    if(!hasSignature)keys[keys.length-1]=Math.random()<0.45?'beast':'shadow'
  }
  for(i=0;i<keys.length;i++){
    var build=bloodEliteBuild(focus,keys[i],false)
    if(!build)continue
    var delay=i==0?0:(8+i*10+Math.floor(Math.random()*8))
    bloodSpawnBuild(server,build,delay)
  }

  if (global.divineQueueTell) {
    global.divineQueueTell(server, String(focus.username), 232, [
      {text:'☾ 血月把你写在这一页的正中间。\n',color:'dark_red',bold:true},
      {text:'这一轮有 '+spawnCount+' 个特殊个体正在靠近；数量越多越少见。',color:'gray'}
    ])
  }

  console.log('[BloodMoon] Started; weighted special count 1~10, focus='+bloodPlayerName(focus)+', count='+spawnCount)
  return true
}

// 复用 world_events.js 唯一 Tick 的低频脉冲；不为每只怪物创建计时器。
function bloodMoonPulse(server,tick) {
  if(!server||!server.persistentData.getBoolean('bloodMoonActive'))return
  var t=Number(tick||0)
  if(t%80==0){
    // 巨兽短冲锋：只提高自身速度并发出重型声，不爆炸、不改方块。
    server.runCommandSilent('effect give @e[tag=blood_beast] minecraft:speed 2 2 true')
    server.runCommandSilent('execute as @e[tag=blood_beast] at @s run playsound minecraft:entity.ravager.roar hostile @a[distance=..32] ~ ~ ~ 0.46 0.70')
  }
  if(t%100==50){
    // 幽影围绕最近地表玩家重新分布；spreadplayers 负责寻找安全表面，不直接钻进墙体。
    try{server.runCommandSilent('execute as @e[tag=blood_shadow] at @s if entity @p[distance=..28] positioned as @p[distance=..28,sort=nearest,limit=1] run spreadplayers ~ ~ 3 9 false @s')}catch(ignoredSpread){}
    server.runCommandSilent('execute as @e[tag=blood_shadow] at @s run playsound minecraft:entity.enderman.teleport hostile @a[distance=..28] ~ ~ ~ 0.54 0.72')
    server.runCommandSilent('execute as @e[tag=blood_shadow] at @s run particle minecraft:reverse_portal ~ ~1 ~ 0.28 0.64 0.28 0.035 10 force')
  }
}

function cleanupBloodMoon(server) {
  if (!server) return

  server.persistentData.putBoolean('bloodMoonActive', false)
  server.runCommandSilent('kill @e[tag=divine_blood_elite]')
  console.log('[BloodMoon] Cleaned')
}

global.startBloodMoon = startBloodMoon
global.cleanupBloodMoon = cleanupBloodMoon
global.spawnBloodEliteForPlayer = spawnBloodEliteForPlayer
global.bloodMoonPulse = bloodMoonPulse
