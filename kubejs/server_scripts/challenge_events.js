// ============================================================
// LSI 统一挑战事件框架 V1.2 · KubeJS V10.6.5 · 安全落点热修
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 设计目标：
// - 不拥有 ServerEvents.tick；统一由 world_events.js 的唯一 Tick 入口驱动。
// - 事件 = 配置 + 运行状态；Boss = 配置 + 共用血条/阶段/清理。
// - 奖励只通过 event_rewards.js 的唯一 EntityEvents.death 监听器结算。
// - 所有事件实体都有唯一 instance tag；异常结束、/reload、重启时只清理本系统实体。
// - 不做全服每 tick 实体扫描。活跃实例通常只有 0~1 个；Boss 检查每 5 tick 一次。
// ============================================================

var DIVINE_CHALLENGE_FRAMEWORK_VERSION = 2
var DIVINE_CHALLENGE_RESPONSE_TICKS = 20 * 60
var DIVINE_CHALLENGE_BOSSBAR_RANGE = 72
var DIVINE_CHALLENGE_ESCAPE_RANGE_SQR = 96 * 96
var DIVINE_CHALLENGE_INSTANCES = {}
var DIVINE_CHALLENGE_NOW = 0
var DIVINE_CHALLENGE_SERIAL = 0
var DIVINE_CHALLENGE_BOOTSTRAPPED = false

// 事件配置。字段结构固定，后续新增事件优先追加配置而不是复制一套生命周期。
var DIVINE_CHALLENGE_EVENTS = {
  abyss_gaze:{
    eventId:'abyss_gaze',eventName:'渊神的凝视',eventType:'abyss',requiresResponse:true,
    spawnRules:{minRadius:7,maxRadius:13,maxEntities:6},
    monsterPool:['abyss_thrall','abyss_archer','abyss_shadow'],bossPool:[],
    rewardPool:{minTokens:8,maxTokens:18},
    sound:'abyss_offer',
    startMessage:'岩层下有什么东西睁开了眼。回应以后，它会把目光移到你身上。',
    successMessage:'那道目光先移开了。',
    failMessage:'凝视失去了目标。'
  },
  abyss_hunt:{
    eventId:'abyss_hunt',eventName:'深渊狩猎',eventType:'abyss',requiresResponse:true,
    spawnRules:{minRadius:8,maxRadius:14,maxEntities:4},
    monsterPool:['abyss_hound','abyss_thrall','abyss_shadow'],bossPool:[],
    rewardPool:{minTokens:10,maxTokens:24},
    sound:'abyss_offer',
    startMessage:'奈瑟没有叫你的名字。祂只是把“猎物”两个字推到了你面前。',
    successMessage:'追猎的脚步停了。你还站着。',
    failMessage:'深渊收回了这次狩猎。'
  },
  abyss_ritual:{
    eventId:'abyss_ritual',eventName:'深渊祭礼',eventType:'abyss',requiresResponse:true,
    spawnRules:{minRadius:9,maxRadius:14,maxEntities:1},
    monsterPool:[],bossPool:['abyss_ritualist'],
    rewardPool:{minTokens:12,maxTokens:28},
    sound:'abyss_offer',
    startMessage:'一场没有祭坛的祭礼只缺最后一个见证者。',
    successMessage:'祭礼断在最后一笔。',
    failMessage:'祭礼没有等到结尾。'
  },
  void_mother_challenge:{
    eventId:'void_mother_challenge',eventName:'虚空之母',eventType:'boss',requiresResponse:false,
    spawnRules:{minRadius:11,maxRadius:17,maxEntities:1},
    monsterPool:[],bossPool:['void_child','nightmare'],
    rewardPool:{minTokens:20,maxTokens:100,guaranteedSpecial:'void_mother_pearl'},
    sound:'void_mother_start',
    startMessage:'虚空之母已经从在线者中选中了一个名字。',
    successMessage:'裂口合上以前，一件禁忌之物从里面掉了出来。',
    failMessage:'虚空把未完成的猎场一并抹去了。'
  },
  ancient_bell:{
    eventId:'ancient_bell',eventName:'古代的丧钟',eventType:'boss',requiresResponse:true,
    spawnRules:{minRadius:12,maxRadius:18,maxEntities:1},
    monsterPool:[],bossPool:['ancient_warden'],
    rewardPool:{minTokens:20,maxTokens:60},
    sound:'ancient_bell_start',
    startMessage:'钟声停在第二下之前。回应它，第三下会从你附近传来。',
    successMessage:'第三下钟声没有再响。',
    failMessage:'丧钟重新沉进了地下。'
  }
}

var DIVINE_CHALLENGE_BOSSES = {
  void_child:{
    bossId:'void_child',name:'虚空之子',entity:'minecraft:iron_golem',maxHealth:500,phaseHealth:150,
    bossbarColor:'purple',bossbarStyle:'notched_10',skin:'void_child',
    baseSpeed:0.27,phaseSpeed:0.34,attack:20,phaseAttack:24,armor:12,knockback:0.72,
    skillBase:88,skillPhase:58
  },
  nightmare:{
    bossId:'nightmare',name:'梦魇',entity:'minecraft:enderman',maxHealth:300,phaseHealth:90,
    bossbarColor:'purple',bossbarStyle:'notched_10',skin:'nightmare',
    baseSpeed:0.34,phaseSpeed:0.43,attack:13,phaseAttack:16,armor:6,knockback:0.34,
    skillBase:70,skillPhase:42
  },
  ancient_warden:{
    bossId:'ancient_warden',name:'古代的丧钟 · 循声守卫',entity:'minecraft:warden',maxHealth:500,phaseHealth:0,
    bossbarColor:'blue',bossbarStyle:'notched_10',skin:'',
    baseSpeed:0.30,phaseSpeed:0.30,attack:30,phaseAttack:30,armor:0,knockback:1.0,
    skillBase:0,skillPhase:0
  }
}

function challengeRealPlayer(player) {
  if(!player)return false
  try{if(String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return false}catch(ignoredClass){}
  try{if(player.isSpectator&&player.isSpectator())return false}catch(ignoredSpectator){}
  return true
}

function challengeOnlinePlayers(server) {
  var out=[],i=0
  if(!server)return out
  try{
    var list=server.getPlayerList().getPlayers()
    for(i=0;i<list.size();i++)if(challengeRealPlayer(list.get(i)))out.push(list.get(i))
    return out
  }catch(ignored){}
  try{
    var players=server.players
    for(i=0;i<players.size();i++)if(challengeRealPlayer(players.get(i)))out.push(players.get(i))
  }catch(ignored2){}
  return out
}

function challengePlayer(server,name) {
  if(!server||!name)return null
  try{return server.getPlayerList().getPlayerByName(String(name))}catch(ignored){}
  try{return server.getPlayer(String(name))}catch(ignored2){}
  return null
}

function challengeChooseTarget(server) {
  var players=challengeOnlinePlayers(server)
  if(players.length<=0)return null
  return players[Math.floor(Math.random()*players.length)]
}

function challengePlayerName(player) {
  try{return String(player.username)}catch(ignored){}
  try{return String(player.getGameProfile().getName())}catch(ignored2){}
  return ''
}

function challengeDimension(entity) {
  try{return String(entity.level.dimension)}catch(ignored){}
  return 'minecraft:overworld'
}

function challengePos(entity) {
  try{return{x:Number(entity.getX()),y:Number(entity.getY()),z:Number(entity.getZ())}}catch(ignored){}
  try{return{x:Number(entity.x),y:Number(entity.y),z:Number(entity.z)}}catch(ignored2){}
  return{x:0,y:64,z:0}
}

function challengeSafeToken(text) {
  return String(text||'').toLowerCase().replace(/[^a-z0-9_\-.]/g,'_').substring(0,48)
}

function challengeNewId(eventId,targetName) {
  DIVINE_CHALLENGE_SERIAL++
  return challengeSafeToken(eventId)+'_'+challengeSafeToken(targetName)+'_'+String(Date.now())+'_'+String(DIVINE_CHALLENGE_SERIAL)
}

function challengeTagFor(id) { return 'challenge_instance_'+String(id).replace(/[^A-Za-z0-9_\-.]/g,'_') }
function challengeBossbarFor(id) { return 'luokixi:'+challengeSafeToken(id).substring(0,54) }

function challengeTell(player,json) {
  if(!player||!player.server)return
  try{player.server.runCommandSilent('tellraw '+challengePlayerName(player)+' '+JSON.stringify(json))}catch(ignored){}
}

function challengePlayToPlayer(player,sound,volume,pitch) {
  if(!player||!player.server||!sound)return
  try{player.server.runCommandSilent('execute at '+challengePlayerName(player)+' run playsound '+sound+' master '+challengePlayerName(player)+' ~ ~ ~ '+volume+' '+pitch)}catch(ignored){}
}

function challengeRunIn(server,dimension,command) {
  if(!server||!command)return 0
  var dim=String(dimension||'minecraft:overworld')
  try{return server.runCommandSilent('execute in '+dim+' run '+command)}catch(ignored){return 0}
}

function challengePlayAtTag(server,tag,sound,volume,pitch,radius,dimension) {
  if(!server||!tag||!sound)return
  challengeRunIn(server,dimension,'execute as @e[tag='+tag+',limit=1] at @s run playsound '+sound+' hostile @a[distance=..'+(radius||48)+'] ~ ~ ~ '+volume+' '+pitch)
}

function challengeSoundRecipe(player,recipe) {
  if(!player)return
  if(recipe=='abyss_offer'){
    challengePlayToPlayer(player,'minecraft:block.sculk_shrieker.shriek',0.24,0.68)
    challengePlayToPlayer(player,'minecraft:entity.warden.heartbeat',0.38,0.72)
  }else if(recipe=='void_mother_start'){
    challengePlayToPlayer(player,'minecraft:block.end_portal.spawn',0.34,0.60)
    challengePlayToPlayer(player,'minecraft:block.respawn_anchor.deplete',0.28,0.82)
  }else if(recipe=='ancient_bell_start'){
    challengePlayToPlayer(player,'minecraft:block.bell.resonate',0.78,0.46)
    challengePlayToPlayer(player,'minecraft:entity.warden.heartbeat',0.26,0.58)
  }
}

var DIVINE_BLOCK_POS_CLASS=null
var DIVINE_HEIGHTMAP_TYPES=null
try{DIVINE_BLOCK_POS_CLASS=Java.loadClass('net.minecraft.core.BlockPos')}catch(ignoredBlockPosClass){}
try{DIVINE_HEIGHTMAP_TYPES=Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')}catch(ignoredHeightmapClass){}

function challengeBlockPos(x,y,z) {
  if(!DIVINE_BLOCK_POS_CLASS)return null
  try{return new DIVINE_BLOCK_POS_CLASS(Math.floor(x),Math.floor(y),Math.floor(z))}catch(ignored){return null}
}

function challengeBlockState(level,x,y,z) {
  if(!level)return null
  var pos=challengeBlockPos(x,y,z)
  if(pos){
    try{return level.getBlockState(pos)}catch(ignoredState){}
  }
  return null
}

function challengeBlockId(level,x,y,z) {
  try{
    var block=level.getBlock(Math.floor(x),Math.floor(y),Math.floor(z))
    if(block){
      try{if(block.id!=null)return String(block.id)}catch(ignoredId){}
      try{if(block.getId)return String(block.getId())}catch(ignoredGetId){}
      var raw=String(block)
      var match=raw.match(/[a-z0-9_.-]+:[a-z0-9_./-]+/i)
      if(match&&match.length>0)return String(match[0]).toLowerCase()
    }
  }catch(ignoredBlock){}
  return 'minecraft:air'
}

function challengeAirLike(id) {
  id=String(id||'').toLowerCase()
  return id=='minecraft:air'||id=='minecraft:cave_air'||id=='minecraft:void_air'||
    id=='minecraft:tall_grass'||id=='minecraft:grass'||id=='minecraft:short_grass'||id=='minecraft:fern'||id=='minecraft:large_fern'||
    id=='minecraft:vine'||id=='minecraft:glow_lichen'||id=='minecraft:dead_bush'||id=='minecraft:snow'||
    id.indexOf('flower')>=0||id.indexOf('sapling')>=0||id.indexOf('mushroom')>=0
}

function challengeBadFloor(id) {
  id=String(id||'').toLowerCase()
  return id=='minecraft:lava'||id=='minecraft:water'||id=='minecraft:fire'||id=='minecraft:soul_fire'||
    id=='minecraft:magma_block'||id=='minecraft:cactus'||id=='minecraft:powder_snow'||id=='minecraft:campfire'||id=='minecraft:soul_campfire'||
    id=='minecraft:pointed_dripstone'||id.indexOf(':lava')>=0
}

function challengePassable(level,x,y,z) {
  var pos=challengeBlockPos(x,y,z),state=challengeBlockState(level,x,y,z)
  if(state){
    try{if(state.isAir())return true}catch(ignoredAir){}
    try{if(pos&&state.getCollisionShape(level,pos).isEmpty())return true}catch(ignoredShape){}
  }
  return challengeAirLike(challengeBlockId(level,x,y,z))
}

function challengeSafeFloor(level,x,y,z) {
  var id=challengeBlockId(level,x,y,z)
  if(challengeBadFloor(id))return false
  var pos=challengeBlockPos(x,y,z),state=challengeBlockState(level,x,y,z)
  if(state){
    try{if(state.isAir())return false}catch(ignoredAir){}
    try{if(!state.getFluidState().isEmpty())return false}catch(ignoredFluid){}
    try{if(pos&&state.getCollisionShape(level,pos).isEmpty())return false}catch(ignoredShape){}
    return true
  }
  return !challengeAirLike(id)
}

function challengeSafeColumn(level,x,y,z) {
  return challengeSafeFloor(level,x,y-1,z)&&
    challengePassable(level,x,y,z)&&
    challengePassable(level,x,y+1,z)&&
    challengePassable(level,x,y+2,z)
}

function challengeSurfaceY(level,x,z) {
  if(!level||!DIVINE_HEIGHTMAP_TYPES)return null
  try{
    var y=Number(level.getHeight(DIVINE_HEIGHTMAP_TYPES.MOTION_BLOCKING_NO_LEAVES,Math.floor(x),Math.floor(z)))
    if(!isNaN(y)&&isFinite(y))return Math.floor(y)
  }catch(ignoredHeightmap){}
  return null
}

function challengeSafeSpawnNear(player,minRadius,maxRadius) {
  if(!player)return null
  var p=challengePos(player),level=player.level,minY=-60,maxY=316
  try{minY=Number(level.getMinBuildHeight())+2;maxY=Number(level.getMaxBuildHeight())-4}catch(ignoredHeight){}
  minRadius=Math.max(2,Number(minRadius||6));maxRadius=Math.max(minRadius+1,Number(maxRadius||12))

  var attempt=0
  // 第一层：优先找与玩家同一洞穴/建筑高度附近的落脚点，不把地下事件硬送到地表。
  for(attempt=0;attempt<36;attempt++){
    var angle=Math.random()*Math.PI*2
    var radius=minRadius+Math.random()*Math.max(1,maxRadius-minRadius)
    var x=Math.floor(p.x+Math.cos(angle)*radius)
    var z=Math.floor(p.z+Math.sin(angle)*radius)
    var top=Math.min(maxY,Math.floor(p.y)+24)
    var bottom=Math.max(minY,Math.floor(p.y)-32)
    var y=0
    for(y=top;y>=bottom;y--){
      if(challengeSafeColumn(level,x,y,z))return{x:x+0.5,y:y,z:z+0.5,mode:'local'}
    }
  }

  // 第二层：用 Minecraft 自己的 MOTION_BLOCKING_NO_LEAVES 高度图找地表。
  for(attempt=0;attempt<28;attempt++){
    var angle2=Math.random()*Math.PI*2
    var radius2=minRadius+Math.random()*Math.max(1,maxRadius-minRadius+8)
    var sx=Math.floor(p.x+Math.cos(angle2)*radius2)
    var sz=Math.floor(p.z+Math.sin(angle2)*radius2)
    var sy=challengeSurfaceY(level,sx,sz)
    if(sy!=null&&sy>=minY&&sy<=maxY&&challengeSafeColumn(level,sx,sy,sz))return{x:sx+0.5,y:sy,z:sz+0.5,mode:'surface'}
  }

  // 最后兜底：玩家脚下本身可站就使用玩家附近；再尝试玩家 XZ 的地表。
  var px=Math.floor(p.x),pz=Math.floor(p.z),py=Math.floor(p.y)
  if(challengeSafeColumn(level,px,py,pz))return{x:px+0.5,y:py,z:pz+0.5,mode:'player'}
  var psy=challengeSurfaceY(level,px,pz)
  if(psy!=null&&challengeSafeColumn(level,px,psy,pz))return{x:px+0.5,y:psy,z:pz+0.5,mode:'player_surface'}

  // 绝不再因为“安全位置探测器”本身失效而取消整场事件。
  // 最终保底只依赖玩家当前位置：玩家既然能站在这里，这个坐标至少是一个真实加载位置。
  // 生成后各 Boss/事件实体仍由原有生命周期、传送/AI 逻辑接管。
  return{
    x:Math.floor(p.x)+0.5,
    y:Math.max(minY,Math.min(maxY,Math.floor(p.y))),
    z:Math.floor(p.z)+0.5,
    mode:'guaranteed_player_fallback'
  }
}

global.divineFindSafeSpawnNear=challengeSafeSpawnNear

function challengeWeightedRange(min,max,profile) {
  min=Math.floor(min);max=Math.floor(max)
  if(max<=min)return min
  var roll=Math.random(),low=min,high=max
  // 通用“越高越稀有”分段。profile=void 时按需求严格覆盖 20~100。
  if(profile=='void'){
    if(roll<0.52){low=20;high=30}
    else if(roll<0.80){low=31;high=50}
    else if(roll<0.94){low=51;high=70}
    else if(roll<0.99){low=71;high=90}
    else{low=91;high=100}
  }else{
    var span=max-min+1
    if(roll<0.58){low=min;high=min+Math.max(1,Math.floor(span*0.28))-1}
    else if(roll<0.86){low=min+Math.floor(span*0.28);high=min+Math.max(2,Math.floor(span*0.58))-1}
    else if(roll<0.97){low=min+Math.floor(span*0.58);high=min+Math.max(3,Math.floor(span*0.82))-1}
    else{low=min+Math.floor(span*0.82);high=max}
    low=Math.max(min,Math.min(max,low));high=Math.max(low,Math.min(max,high))
  }
  return low+Math.floor(Math.random()*(high-low+1))
}

function challengeBossbarRemember(server,id) {
  if(!server||!id)return
  var raw=''
  try{raw=String(server.persistentData.getString('divineChallengeBossbars')||'')}catch(ignored){}
  var list=raw?raw.split('|'):[]
  if(list.indexOf(id)<0)list.push(id)
  server.persistentData.putString('divineChallengeBossbars',list.join('|'))
}

function challengeBossbarForget(server,id) {
  if(!server||!id)return
  var raw=''
  try{raw=String(server.persistentData.getString('divineChallengeBossbars')||'')}catch(ignored){}
  if(!raw)return
  var source=raw.split('|'),out=[],i=0
  for(i=0;i<source.length;i++)if(source[i]&&source[i]!=id)out.push(source[i])
  server.persistentData.putString('divineChallengeBossbars',out.join('|'))
}

function challengeBossbarCreate(server,instance,boss) {
  if(!server||!instance||!boss)return false
  var bar=challengeBossbarFor(instance.id)
  instance.bossbar=bar
  try{server.runCommandSilent('bossbar remove '+bar)}catch(ignoredRemove){}
  var name=JSON.stringify({text:boss.name,color:'dark_purple',bold:true})
  if(server.runCommandSilent('bossbar add '+bar+' '+name)<=0)return false
  server.runCommandSilent('bossbar set '+bar+' max '+boss.maxHealth)
  server.runCommandSilent('bossbar set '+bar+' value '+boss.maxHealth)
  server.runCommandSilent('bossbar set '+bar+' color '+boss.bossbarColor)
  server.runCommandSilent('bossbar set '+bar+' style '+boss.bossbarStyle)
  server.runCommandSilent('bossbar set '+bar+' visible true')
  challengeBossbarRemember(server,bar)
  return true
}

function challengeBossbarUpdate(server,instance) {
  if(!server||!instance||!instance.bossbar||!instance.entityTag)return
  try{
    challengeRunIn(server,instance.dimension,'execute store result bossbar '+instance.bossbar+' value run data get entity @e[tag='+instance.entityTag+',limit=1] Health 1')
    challengeRunIn(server,instance.dimension,'execute at @e[tag='+instance.entityTag+',limit=1] run bossbar set '+instance.bossbar+' players @a[distance=..'+DIVINE_CHALLENGE_BOSSBAR_RANGE+',gamemode=!spectator]')
  }catch(ignored){}
}

function challengeBossbarRemove(server,instance) {
  if(!server||!instance||!instance.bossbar)return
  try{server.runCommandSilent('bossbar remove '+instance.bossbar)}catch(ignored){}
  challengeBossbarForget(server,instance.bossbar)
  instance.bossbar=''
}

function challengeEntityExists(server,tag,dimension) {
  if(!server||!tag)return false
  return challengeRunIn(server,dimension,'execute if entity @e[tag='+tag+',limit=1]')>0
}

function challengeSetAggro(server,instance,targetName) {
  if(!server||!instance||!instance.entityTag||!targetName)return
  // Iron Golem / Enderman 都使用 NeutralMob 的 AngerTime/AngryAt；不支持该 NBT 的实体会安静忽略。
  challengeRunIn(server,instance.dimension,'data merge entity @e[tag='+instance.entityTag+',limit=1] {AngerTime:2147483647}')
  challengeRunIn(server,instance.dimension,'data modify entity @e[tag='+instance.entityTag+',limit=1] AngryAt set from entity '+targetName+' UUID')
}

function challengeApplyBossSkin(server,instance,boss) {
  if(!server||!instance||!boss||!boss.skin)return
  challengeRunIn(server,instance.dimension,'luokixi_visual boss_skin @e[tag='+instance.entityTag+',limit=1] '+boss.skin)
}

function challengeSpawnBoss(server,instance,bossId) {
  var boss=DIVINE_CHALLENGE_BOSSES[bossId]
  var target=challengePlayer(server,instance.target)
  if(!boss||!target)return false
  var cfg=DIVINE_CHALLENGE_EVENTS[instance.eventId]
  var safe=challengeSafeSpawnNear(target,cfg.spawnRules.minRadius,cfg.spawnRules.maxRadius)
  if(!safe){
    challengeTell(target,{text:'附近没有找到足够安全的战斗位置，本次挑战取消。',color:'red'})
    return false
  }
  var tag=instance.entityTag
  var extra=''
  if(bossId=='void_child'){
    extra=',PlayerCreated:0b,Glowing:1b'
  }else if(bossId=='nightmare'){
    extra=',Glowing:1b'
  }
  var command='execute in '+instance.dimension+' run summon '+boss.entity+' '+safe.x+' '+safe.y+' '+safe.z+' {'+
    'Tags:["divine_event_entity","divine_challenge_entity","divine_challenge_boss","'+tag+'","divine_'+bossId+'"],'+
    'PersistenceRequired:1b,CanPickUpLoot:0b,CustomName:\''+JSON.stringify({text:boss.name,color:'dark_purple',bold:true})+'\',CustomNameVisible:1b,'+
    'Health:'+boss.maxHealth+'.0f,Attributes:['+
      '{Name:"minecraft:generic.max_health",Base:'+boss.maxHealth+'.0},'+
      '{Name:"minecraft:generic.movement_speed",Base:'+boss.baseSpeed+'},'+
      '{Name:"minecraft:generic.attack_damage",Base:'+boss.attack+'.0},'+
      '{Name:"minecraft:generic.armor",Base:'+boss.armor+'.0},'+
      '{Name:"minecraft:generic.knockback_resistance",Base:'+boss.knockback+'},'+
      '{Name:"minecraft:generic.follow_range",Base:56.0}'+
    ']'+extra+'}'
  var result=server.runCommandSilent(command)
  if(result<=0){
    console.log('[DivineChallenge] boss summon failed: boss='+bossId+', result='+result+', dim='+instance.dimension+', safeMode='+String(safe.mode||'unknown')+', pos='+safe.x+','+safe.y+','+safe.z)
    return false
  }
  instance.bossKind=bossId
  instance.spawn=safe
  instance.phase=1
  instance.nextSkillTick=DIVINE_CHALLENGE_NOW+boss.skillBase
  instance.skillIndex=0
  instance.missingTicks=0
  challengeBossbarCreate(server,instance,boss)
  challengeApplyBossSkin(server,instance,boss)
  challengeSetAggro(server,instance,instance.target)
  server.runCommandSilent('scoreboard objectives add divineBossHP dummy')
  if(bossId=='void_child'){
    challengePlayAtTag(server,tag,'minecraft:entity.warden.emerge',0.54,0.70,64,instance.dimension)
    challengePlayAtTag(server,tag,'minecraft:block.respawn_anchor.set_spawn',0.42,0.62,64,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run particle minecraft:reverse_portal ~ ~1.2 ~ 0.55 1.15 0.55 0.05 34 force')
  }else if(bossId=='nightmare'){
    challengePlayAtTag(server,tag,'minecraft:entity.enderman.stare',0.62,0.72,64,instance.dimension)
    challengePlayAtTag(server,tag,'minecraft:block.end_portal.spawn',0.22,1.34,64,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run particle minecraft:portal ~ ~1.3 ~ 0.65 1.20 0.65 0.08 42 force')
  }else if(bossId=='ancient_warden'){
    challengePlayAtTag(server,tag,'minecraft:block.bell.resonate',0.92,0.48,72,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run particle minecraft:sculk_soul ~ ~1.0 ~ 0.55 0.55 0.55 0.03 22 force')
  }
  challengeTell(target,[
    {text:'⚠ '+boss.name+'\n',color:'dark_purple',bold:true},
    {text:'战斗区域已经建立。离开过远、跨维度或下线都会使挑战失败。',color:'gray'}
  ])
  return true
}

function challengeSpawnAbyssMob(server,instance,kind,index) {
  var target=challengePlayer(server,instance.target)
  if(!target)return false
  var cfg=DIVINE_CHALLENGE_EVENTS[instance.eventId]
  var safe=challengeSafeSpawnNear(target,cfg.spawnRules.minRadius,cfg.spawnRules.maxRadius)
  if(!safe)return false
  var entity='minecraft:zombie',name='渊下行尸',health=92,speed=0.31,attack=9,armor=4,extra=''
  if(kind=='abyss_archer'){
    entity='minecraft:skeleton';name='无光射手';health=82;speed=0.30;attack=7;armor=3
    extra=',HandItems:[{id:"minecraft:bow",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:power",lvl:3s},{id:"minecraft:punch",lvl:1s}]}},{}],HandDropChances:[0.0f,0.0f]'
  }else if(kind=='abyss_shadow'){
    entity='minecraft:enderman';name='深渊侧影';health=110;speed=0.36;attack=12;armor=4;extra=',Glowing:1b'
  }else if(kind=='abyss_hound'){
    entity='minecraft:spider';name='岩下猎犬';health=76;speed=0.43;attack=10;armor=3
  }else if(kind=='abyss_elite'){
    entity='minecraft:wither_skeleton';name='渊神的凝视者';health=180;speed=0.32;attack=14;armor=8
    extra=',Glowing:1b,HandItems:[{id:"minecraft:iron_sword",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:4s}]}},{}],HandDropChances:[0.0f,0.0f]'
  }
  var tag=instance.entityTag
  var command='execute in '+instance.dimension+' run summon '+entity+' '+safe.x+' '+safe.y+' '+safe.z+' {'+
    'Tags:["divine_event_entity","divine_challenge_entity","divine_abyss_mob","'+tag+'","'+kind+'"],PersistenceRequired:1b,CanPickUpLoot:0b,Silent:1b,'+
    'CustomName:\''+JSON.stringify({text:name,color:kind=='abyss_elite'?'dark_aqua':'dark_gray',bold:kind=='abyss_elite'})+'\',CustomNameVisible:1b,'+
    'Health:'+health+'.0f,Attributes:['+
      '{Name:"minecraft:generic.max_health",Base:'+health+'.0},'+
      '{Name:"minecraft:generic.movement_speed",Base:'+speed+'},'+
      '{Name:"minecraft:generic.attack_damage",Base:'+attack+'.0},'+
      '{Name:"minecraft:generic.armor",Base:'+armor+'.0},'+
      '{Name:"minecraft:generic.follow_range",Base:44.0},'+
      '{Name:"minecraft:generic.knockback_resistance",Base:0.18}'+
    ']'+extra+'}'
  if(server.runCommandSilent(command)<=0)return false
  if(kind=='abyss_shadow'){
    try{challengeRunIn(server,instance.dimension,'data merge entity @e[tag='+tag+',tag='+kind+',sort=nearest,limit=1] {AngerTime:2147483647}')}catch(ignoredAnger){}
  }
  return true
}

function challengeSpawnAbyssGaze(server,instance) {
  var target=challengePlayer(server,instance.target)
  if(!target)return false
  var count=4+Math.floor(Math.random()*3),spawned=0,i=0
  // 必定一只精英；剩余由配置池随机。
  if(challengeSpawnAbyssMob(server,instance,'abyss_elite',0))spawned++
  var pool=DIVINE_CHALLENGE_EVENTS.abyss_gaze.monsterPool
  for(i=1;i<count;i++){
    var kind=pool[Math.floor(Math.random()*pool.length)]
    if(challengeSpawnAbyssMob(server,instance,kind,i))spawned++
  }
  if(spawned<=0)return false
  instance.remaining=spawned
  instance.status='active'
  challengePlayToPlayer(target,'minecraft:block.sculk_shrieker.shriek',0.34,0.82)
  challengeTell(target,[{text:'✦ 凝视落下。',color:'dark_aqua',bold:true},{text:' 清掉所有被它照见的东西。',color:'gray'}])
  return true
}

function challengeSpawnAbyssRitual(server,instance) {
  var target=challengePlayer(server,instance.target)
  if(!target)return false
  var cfg=DIVINE_CHALLENGE_EVENTS.abyss_ritual,safe=challengeSafeSpawnNear(target,cfg.spawnRules.minRadius,cfg.spawnRules.maxRadius)
  if(!safe)return false
  var tag=instance.entityTag
  var command='execute in '+instance.dimension+' run summon minecraft:wither_skeleton '+safe.x+' '+safe.y+' '+safe.z+' {'+
    'Tags:["divine_event_entity","divine_challenge_entity","divine_abyss_ritual","'+tag+'"],PersistenceRequired:1b,CanPickUpLoot:0b,Silent:1b,Glowing:1b,'+
    'CustomName:\''+JSON.stringify({text:'深渊祭礼者',color:'dark_aqua',bold:true})+'\',CustomNameVisible:1b,Health:260.0f,'+
    'HandItems:[{id:"minecraft:netherite_sword",Count:1b,tag:{Unbreakable:1b,Enchantments:[{id:"minecraft:sharpness",lvl:3s},{id:"minecraft:knockback",lvl:1s}]}},{}],HandDropChances:[0.0f,0.0f],'+
    'Attributes:[{Name:"minecraft:generic.max_health",Base:260.0},{Name:"minecraft:generic.movement_speed",Base:0.34},{Name:"minecraft:generic.attack_damage",Base:16.0},{Name:"minecraft:generic.armor",Base:10.0},{Name:"minecraft:generic.knockback_resistance",Base:0.45},{Name:"minecraft:generic.follow_range",Base:48.0}]}'
  if(server.runCommandSilent(command)<=0)return false
  instance.remaining=1
  instance.status='active'
  instance.nextRitualPulse=DIVINE_CHALLENGE_NOW+90
  challengePlayAtTag(server,tag,'minecraft:entity.warden.heartbeat',0.52,0.62,48,instance.dimension)
  challengeTell(target,[{text:'✦ 深渊祭礼开始。',color:'dark_aqua',bold:true},{text:' 祭礼者倒下，仪式才会结束。',color:'gray'}])
  return true
}

function challengeSpawnHuntWave(server,instance) {
  var target=challengePlayer(server,instance.target)
  if(!target)return false
  var count=2+Math.floor(Math.random()*3),pool=DIVINE_CHALLENGE_EVENTS.abyss_hunt.monsterPool,i=0,spawned=0
  for(i=0;i<count;i++){
    var kind=pool[Math.floor(Math.random()*pool.length)]
    if(challengeSpawnAbyssMob(server,instance,kind,i))spawned++
  }
  if(spawned>0){
    challengePlayToPlayer(target,'minecraft:entity.warden.heartbeat',0.26,0.72)
    challengeTell(target,{text:'岩层里的脚步又近了一轮。',color:'dark_aqua',italic:true})
  }
  return spawned>0
}

function challengeStartHunt(server,instance) {
  var target=challengePlayer(server,instance.target)
  if(!target)return false
  instance.status='active'
  instance.endsTick=DIVINE_CHALLENGE_NOW+20*90
  instance.nextWaveTick=DIVINE_CHALLENGE_NOW+30
  instance.wave=0
  challengeTell(target,[
    {text:'✦ 深渊狩猎 · 90 秒\n',color:'dark_aqua',bold:true},
    {text:'活着留在这个世界里。每一轮追猎都会在你附近出现。',color:'gray'}
  ])
  return true
}

function challengeStartInstance(server,instance) {
  if(!server||!instance)return false
  var target=challengePlayer(server,instance.target)
  if(!target){
    console.log('[DivineChallenge] start failed: target missing, event='+String(instance.eventId)+', target='+String(instance.target))
    return false
  }
  instance.dimension=challengeDimension(target)
  instance.origin=challengePos(target)
  instance.startedTick=DIVINE_CHALLENGE_NOW
  instance.invalidTicks=0
  var ok=false
  try{
    if(instance.eventId=='abyss_gaze')ok=challengeSpawnAbyssGaze(server,instance)
    else if(instance.eventId=='abyss_hunt')ok=challengeStartHunt(server,instance)
    else if(instance.eventId=='abyss_ritual')ok=challengeSpawnAbyssRitual(server,instance)
    else if(instance.eventId=='void_mother_challenge'){
      var pool=DIVINE_CHALLENGE_EVENTS.void_mother_challenge.bossPool
      var bossId=(instance.forcedBoss&&DIVINE_CHALLENGE_BOSSES[instance.forcedBoss])?instance.forcedBoss:pool[Math.floor(Math.random()*pool.length)]
      instance.status='active'
      ok=challengeSpawnBoss(server,instance,bossId)
    }
    else if(instance.eventId=='ancient_bell'){
      instance.status='active'
      ok=challengeSpawnBoss(server,instance,'ancient_warden')
    }
  }catch(error){
    console.log('[DivineChallenge] start exception: event='+String(instance.eventId)+', target='+String(instance.target)+', dim='+String(instance.dimension)+', error='+error)
    ok=false
  }
  if(!ok){
    console.log('[DivineChallenge] start returned false: event='+String(instance.eventId)+', target='+String(instance.target)+', dim='+String(instance.dimension)+', origin='+JSON.stringify(instance.origin||{}))
  }
  return ok
}

function challengeCreate(server,eventId,target,delayedOffer) {
  var cfg=DIVINE_CHALLENGE_EVENTS[eventId]
  if(!server||!cfg||!target)return null
  var name=challengePlayerName(target)
  if(!name)return null
  // 同一玩家同一时刻最多保留一个未结算挑战，避免重复世界事件/管理员测试叠加。
  challengeCancelForPlayer(server,name,'新的挑战覆盖了尚未开始的旧邀请。',true)
  var id=challengeNewId(eventId,name)
  var instance={
    id:id,eventId:eventId,target:name,status:'scheduled',entityTag:challengeTagFor(id),bossbar:'',bossKind:'',
    offerTick:DIVINE_CHALLENGE_NOW+(delayedOffer==null?140:delayedOffer),expiresTick:0,startTick:0,
    dimension:challengeDimension(target),origin:challengePos(target),settled:false,
    // 遗物持续/规则伤害可能没有 vanilla player killer（黑焰、凋零、/kill 处决、虚空放逐等）。
    // 这里只保存“确实由遗物命中过”的归属，绝不把普通环境死亡直接当通关。
    relicCreditPlayer:'',relicCreditRelic:'',relicCreditUntil:0
  }
  DIVINE_CHALLENGE_INSTANCES[id]=instance
  return instance
}

function challengeOfferNow(server,instance) {
  var cfg=DIVINE_CHALLENGE_EVENTS[instance.eventId],target=challengePlayer(server,instance.target)
  if(!cfg||!target)return false
  challengeSoundRecipe(target,cfg.sound)
  if(cfg.requiresResponse){
    instance.status='offered'
    instance.expiresTick=DIVINE_CHALLENGE_NOW+DIVINE_CHALLENGE_RESPONSE_TICKS
    challengeTell(target,[
      {text:'━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
      {text:cfg.eventName+'\n',color:cfg.eventType=='abyss'?'dark_aqua':'dark_purple',bold:true},
      {text:cfg.startMessage+'\n\n',color:'gray'},
      {text:'[ 回应 ]',color:'aqua',bold:true,clickEvent:{action:'run_command',value:'/respond'},hoverEvent:{action:'show_text',contents:{text:'接受这次挑战',color:'gray'}}},
      {text:'    '},
      {text:'[ 沉默 ]',color:'dark_gray',clickEvent:{action:'run_command',value:'/respond_decline'}},
      {text:'\n━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
    ])
  }else{
    instance.status='warning'
    instance.startTick=DIVINE_CHALLENGE_NOW+80
    challengeTell(target,[
      {text:'━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
      {text:cfg.eventName+'\n',color:'dark_purple',bold:true},
      {text:cfg.startMessage+'\n',color:'gray'},
      {text:'四秒以后，猎场会在你附近打开。',color:'light_purple',italic:true},
      {text:'\n━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
    ])
  }
  return true
}

function challengeScheduleWorldEvent(server,eventId) {
  var target=challengeChooseTarget(server)
  if(!target)return false
  return !!challengeCreate(server,eventId,target,140)
}

function challengeRespond(player) {
  if(!player||!player.server)return false
  var name=challengePlayerName(player),id='',selected=null
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    var x=DIVINE_CHALLENGE_INSTANCES[id]
    if(x&&x.target==name&&x.status=='offered'){selected=x;break}
  }
  if(!selected){
    challengeTell(player,{text:'现在没有等待你回应的挑战。',color:'gray'})
    return false
  }
  selected.status='starting'
  selected.startTick=DIVINE_CHALLENGE_NOW+30
  challengeTell(player,{text:'你回应了。',color:'dark_aqua',italic:true})
  challengePlayToPlayer(player,'minecraft:block.sculk_sensor.clicking_stop',0.42,0.72)
  return true
}

function challengeDecline(player) {
  if(!player||!player.server)return false
  var name=challengePlayerName(player),id='',selected=null
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    var x=DIVINE_CHALLENGE_INSTANCES[id]
    if(x&&x.target==name&&x.status=='offered'){selected=x;break}
  }
  if(!selected){challengeTell(player,{text:'没有需要沉默拒绝的挑战。',color:'gray'});return false}
  challengeTell(player,{text:'你没有回应。那道声音退回了它来的地方。',color:'dark_gray',italic:true})
  challengeRemoveInstance(player.server,selected,false,'')
  return true
}

function challengeEntityHasTag(entity,tag) {
  try{return entity&&entity.tags&&entity.tags.contains(tag)}catch(ignored){}
  return false
}

function challengeFindInstanceByEntity(entity) {
  var id=''
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    var x=DIVINE_CHALLENGE_INSTANCES[id]
    if(x&&x.entityTag&&challengeEntityHasTag(entity,x.entityTag))return x
  }
  return null
}

// ------------------------------------------------------------
// 遗物特殊击杀归因 V10.6.8
// ------------------------------------------------------------
// 部分遗物的最终死亡来源不是玩家本体：
// - 死神：最终 /kill
// - 土父：放逐后 out_of_world
// - 火神：黑焰持续 damage
// - 渊神：原版 Wither tick + 自定义持续伤害
// - 雷神：lightning_bolt
// - 日王/炉神：持续燃烧
//
// 因此不能只看 EntityDeathEvent 的 source.player；但也绝不能“Boss 只要死就发奖”。
// 这里仅在遗物真正作用到当前挑战实体时写入实例归属，死亡时才允许作为 fallback killer。
function challengeMarkRelicCredit(player,entity,relicId,durationMs) {
  if(!player||!entity||!player.server)return false
  var instance=challengeFindInstanceByEntity(entity)
  if(!instance||instance.settled)return false
  var name=challengePlayerName(player)
  if(!name||!challengeRealPlayer(player))return false
  var ms=Number(durationMs||0)
  var sameOwner=String(instance.relicCreditPlayer||'')==name
  var wasPermanent=sameOwner&&instance.relicCreditPlayer&&Number(instance.relicCreditUntil||0)==0
  instance.relicCreditPlayer=name
  instance.relicCreditRelic=String(relicId||'unknown_relic')
  // 同一玩家已经留下“直到死亡”的满命归属时，后续 3 秒 Wither 刷新不能把永久归属降级成短 TTL。
  instance.relicCreditUntil=wasPermanent?0:(ms>0?Date.now()+ms:0)
  return true
}

function challengeMarkRelicCreditArea(player,center,radius,relicId,durationMs) {
  if(!player||!center||!player.server)return 0
  var name=challengePlayerName(player)
  if(!name||!challengeRealPlayer(player))return 0
  var server=player.server,dim=challengeDimension(center),p=challengePos(center),r=Math.max(0.5,Number(radius||1))
  var marked=0,id=''
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    var instance=DIVINE_CHALLENGE_INSTANCES[id]
    if(!instance||instance.settled||!instance.entityTag||String(instance.dimension)!=String(dim))continue
    var hit=challengeRunIn(server,dim,'execute positioned '+p.x+' '+p.y+' '+p.z+' if entity @e[tag='+instance.entityTag+',distance=..'+r+',limit=1]')>0
    if(!hit)continue
    var ms=Number(durationMs||0)
    var sameOwner=String(instance.relicCreditPlayer||'')==name
    var wasPermanent=sameOwner&&instance.relicCreditPlayer&&Number(instance.relicCreditUntil||0)==0
    instance.relicCreditPlayer=name
    instance.relicCreditRelic=String(relicId||'unknown_relic')
    instance.relicCreditUntil=wasPermanent?0:(ms>0?Date.now()+ms:0)
    marked++
  }
  return marked
}

function challengeRelicCreditedKiller(server,instance) {
  if(!server||!instance||!instance.relicCreditPlayer)return null
  var until=Number(instance.relicCreditUntil||0)
  if(until>0&&Date.now()>until){
    instance.relicCreditPlayer=''
    instance.relicCreditRelic=''
    instance.relicCreditUntil=0
    return null
  }
  var player=challengePlayer(server,instance.relicCreditPlayer)
  if(!player||!challengeRealPlayer(player))return null
  return player
}

function challengeRewardOwner(server,instance,profile) {
  var cfg=DIVINE_CHALLENGE_EVENTS[instance.eventId]
  var player=challengePlayer(server,instance.target)
  if(!cfg||!player)return false
  var amount=challengeWeightedRange(cfg.rewardPool.minTokens,cfg.rewardPool.maxTokens,profile)
  if(global.giveDivineToken&&typeof global.giveDivineToken=='function'){
    try{global.giveDivineToken(player,amount)}catch(ignoredToken){}
  }
  if(cfg.rewardPool.guaranteedSpecial&&global.oracleSpecialGrant&&typeof global.oracleSpecialGrant=='function'){
    try{global.oracleSpecialGrant(player,cfg.rewardPool.guaranteedSpecial,1,'challenge_event')}catch(ignoredSpecial){}
  }
  challengeTell(player,[
    {text:'✦ '+cfg.eventName+' · 完成\n',color:instance.eventId=='void_mother_challenge'?'light_purple':'aqua',bold:true},
    {text:cfg.successMessage+'\n',color:'gray'},
    {text:'幻形碎片 ×'+amount,color:'light_purple',bold:true}
  ])
  try{
    if(global.oracleTitleRecordChallenge&&typeof global.oracleTitleRecordChallenge=='function')global.oracleTitleRecordChallenge(player,instance.eventId,instance.bossKind||'')
  }catch(ignoredTitle){}
  return true
}

function challengeBossDeathSound(entity,bossKind) {
  if(!entity||!entity.server)return
  var p=challengePos(entity),dim=challengeDimension(entity),prefix='execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' run playsound '
  try{
    if(bossKind=='void_child'){
      entity.server.runCommandSilent(prefix+'minecraft:entity.iron_golem.death hostile @a[distance=..64] ~ ~ ~ 0.86 0.66')
      entity.server.runCommandSilent(prefix+'minecraft:block.respawn_anchor.deplete hostile @a[distance=..64] ~ ~ ~ 0.44 0.58')
    }else if(bossKind=='nightmare'){
      entity.server.runCommandSilent(prefix+'minecraft:entity.enderman.death hostile @a[distance=..64] ~ ~ ~ 0.82 0.68')
      entity.server.runCommandSilent(prefix+'minecraft:block.end_portal.spawn hostile @a[distance=..64] ~ ~ ~ 0.20 1.42')
    }else if(bossKind=='ancient_warden'){
      entity.server.runCommandSilent(prefix+'minecraft:block.bell.resonate hostile @a[distance=..72] ~ ~ ~ 0.86 0.42')
    }
  }catch(ignored){}
}

// 由 event_rewards.js 的唯一死亡监听器调用。
// 返回 true 代表该实体属于挑战框架；奖励是否结算由本函数自己保证一次性。
function challengeHandleDeath(killer,entity) {
  var instance=challengeFindInstanceByEntity(entity)
  if(!instance)return false
  if(instance.settled)return true
  var server=entity.server
  if(!server)return true
  var isBoss=challengeEntityHasTag(entity,'divine_challenge_boss')
  var isRitual=challengeEntityHasTag(entity,'divine_abyss_ritual')
  var isGazeMob=challengeEntityHasTag(entity,'divine_abyss_mob')

  if(isBoss){
    // 正常玩家击杀优先；若最终死亡源是黑焰/凋零/处决/放逐等没有 source.player 的遗物效果，
    // 只有实例之前被明确写入过遗物归属时才允许补认。普通 /kill、后台清理仍然不会发奖。
    var creditedKiller=(killer&&challengeRealPlayer(killer))?killer:challengeRelicCreditedKiller(server,instance)
    if(!creditedKiller)return true
    if((!killer||!challengeRealPlayer(killer))&&instance.relicCreditPlayer){
      console.log('[DivineChallenge] relic-attributed boss death accepted: event='+instance.eventId+', boss='+String(instance.bossKind||'')+', relic='+String(instance.relicCreditRelic||'')+', player='+challengePlayerName(creditedKiller))
    }
    instance.settled=true
    challengeBossDeathSound(entity,instance.bossKind)
    challengeRewardOwner(server,instance,instance.eventId=='void_mother_challenge'?'void':'normal')
    challengeRemoveInstance(server,instance,false,'')
    return true
  }

  if(isRitual||isGazeMob){
    // 深渊狩猎按“活过 90 秒”结算，猎犬死亡绝不能把 remaining 误减到 0 提前发奖。
    if(instance.eventId=='abyss_hunt')return true
    // 凝视/祭礼要求由玩家实际完成。环境击杀、/kill、异常清除直接判失败，不给代币。
    var creditedMobKiller=(killer&&challengeRealPlayer(killer))?killer:challengeRelicCreditedKiller(server,instance)
    if(!creditedMobKiller){
      challengeFail(server,instance,'挑战生物异常死亡，本次没有结算奖励。')
      return true
    }
    instance.remaining=Math.max(0,Number(instance.remaining||1)-1)
    if(instance.remaining<=0){
      instance.settled=true
      challengeRewardOwner(server,instance,'normal')
      challengeRemoveInstance(server,instance,false,'')
    }
    return true
  }
  return true
}

function challengePlayerDeath(player) {
  if(!player||!player.server)return
  challengeCancelForPlayer(player.server,challengePlayerName(player),'你倒下了。这次挑战没有结算奖励。',false)
}

function challengeCancelForPlayer(server,name,reason,silent) {
  if(!server||!name)return false
  var ids=[],id='',i=0
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    if(DIVINE_CHALLENGE_INSTANCES[id]&&DIVINE_CHALLENGE_INSTANCES[id].target==name)ids.push(id)
  }
  for(i=0;i<ids.length;i++){
    var x=DIVINE_CHALLENGE_INSTANCES[ids[i]]
    if(!x)continue
    if(!silent){var p=challengePlayer(server,name);if(p)challengeTell(p,{text:reason||'挑战失败。',color:'red'})}
    // 无论是下线、死亡、跨事件覆盖还是管理员清理，都必须把该实例仍存活的实体一并清掉。
    // silent 只控制是否给玩家发消息，绝不能改变实体清理语义；否则下线会留下无主 Boss。
    challengeRemoveInstance(server,x,true,'')
  }
  return ids.length>0
}

function challengeRemoveInstance(server,instance,killEntities,reason) {
  if(!server||!instance)return
  var id=instance.id,tag=instance.entityTag
  challengeBossbarRemove(server,instance)
  delete DIVINE_CHALLENGE_INSTANCES[id]
  if(tag){
    // 残影属于事件生命周期，即使 Boss 本体已经自然死亡，也不能在结算后继续留下伤害。
    try{challengeRunIn(server,instance.dimension,'kill @e[tag='+tag+',tag=divine_nightmare_echo]')}catch(ignoredEchoKill){}
  }
  if(killEntities!==false&&tag){
    try{challengeRunIn(server,instance.dimension,'kill @e[tag='+tag+']')}catch(ignoredKill){}
  }
  if(reason){var p=challengePlayer(server,instance.target);if(p)challengeTell(p,{text:reason,color:'red'})}
}

function challengeFail(server,instance,reason) {
  if(!server||!instance)return
  instance.settled=true
  var cfg=DIVINE_CHALLENGE_EVENTS[instance.eventId]
  challengeRemoveInstance(server,instance,true,reason||(cfg?cfg.failMessage:'挑战失败。'))
}

function challengeTargetInvalid(server,instance) {
  var player=challengePlayer(server,instance.target)
  if(!player||!challengeRealPlayer(player))return true
  if(challengeDimension(player)!=instance.dimension)return true
  if(instance.origin){
    var p=challengePos(player),dx=p.x-instance.origin.x,dy=p.y-instance.origin.y,dz=p.z-instance.origin.z
    if(dx*dx+dy*dy+dz*dz>DIVINE_CHALLENGE_ESCAPE_RANGE_SQR)return true
  }
  return false
}

function challengePickCombatTarget(server,instance) {
  var owner=challengePlayer(server,instance.target)
  if(!owner)return instance.target
  var op=challengePos(owner),dim=challengeDimension(owner),players=challengeOnlinePlayers(server),near=[],i=0
  for(i=0;i<players.length;i++){
    var p=players[i]
    if(challengeDimension(p)!=dim)continue
    var pp=challengePos(p),dx=pp.x-op.x,dy=pp.y-op.y,dz=pp.z-op.z
    if(dx*dx+dy*dy+dz*dz<=48*48)near.push(challengePlayerName(p))
  }
  return near.length>0?near[Math.floor(Math.random()*near.length)]:instance.target
}

function challengeQueueCommand(server,delay,command) {
  if(global.divineQueueCommand&&typeof global.divineQueueCommand=='function')global.divineQueueCommand(server,delay,command)
  else try{server.scheduleInTicks(delay,function(){try{server.runCommandSilent(command)}catch(ignored){}})}catch(ignoredSchedule){}
}

function challengeQueueCommandIn(server,delay,dimension,command) {
  challengeQueueCommand(server,delay,'execute in '+String(dimension||'minecraft:overworld')+' run '+command)
}

function challengeVoidChildSkill(server,instance,boss) {
  var tag=instance.entityTag,target=challengePickCombatTarget(server,instance)
  instance.skillIndex=(Number(instance.skillIndex||0)+1)%3
  if(instance.skillIndex==1){
    // 虚空重击：明显前摇 -> 前方短区高伤害/减速/击退。
    challengePlayAtTag(server,tag,'minecraft:entity.iron_golem.repair',0.54,0.56,48,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s facing entity '+target+' eyes positioned ^ ^ ^2.7 run particle minecraft:dust 0.40 0.05 0.64 1.45 ~ ~0.2 ~ 1.8 0.12 1.8 0.02 26 force')
    challengeQueueCommandIn(server,16,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s facing entity '+target+' eyes positioned ^ ^ ^2.8 run damage @a[distance=..2.9,gamemode=!creative,gamemode=!spectator] '+(instance.phase>=2?20:16)+' minecraft:mob_attack by @s')
    challengeQueueCommandIn(server,16,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s facing entity '+target+' eyes positioned ^ ^ ^2.8 run effect give @a[distance=..3.2,gamemode=!creative,gamemode=!spectator] minecraft:slowness 3 2 true')
    challengeQueueCommandIn(server,16,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run playsound minecraft:entity.iron_golem.attack hostile @a[distance=..48] ~ ~ ~ 0.92 0.72')
  }else if(instance.skillIndex==2){
    // 虚空震荡：三档距离伤害；只移动玩家，不生成爆炸，不破坏方块。
    challengePlayAtTag(server,tag,'minecraft:entity.warden.sonic_charge',0.42,0.64,56,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run particle minecraft:reverse_portal ~ ~1 ~ 1.1 0.15 1.1 0.05 34 force')
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run damage @a[distance=..3,gamemode=!creative,gamemode=!spectator] 15 minecraft:magic')
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run damage @a[distance=3.01..6,gamemode=!creative,gamemode=!spectator] 10 minecraft:magic')
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run damage @a[distance=6.01..10,gamemode=!creative,gamemode=!spectator] 6 minecraft:magic')
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run effect give @a[distance=..10,gamemode=!creative,gamemode=!spectator] minecraft:slowness 2 1 true')
    // 以每个玩家朝向 Boss 的局部坐标向后推 1.45 格，形成真正可感知的向外击退；不爆炸、不改方块。
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s as @a[distance=0.2..10,gamemode=!creative,gamemode=!spectator] at @s facing entity @e[tag='+tag+',limit=1,sort=nearest] feet run tp @s ^ ^ ^-1.45')
    challengeQueueCommandIn(server,14,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run playsound minecraft:block.respawn_anchor.deplete hostile @a[distance=..56] ~ ~ ~ 0.62 0.72')
  }else{
    // 虚空锁链：锁定一个附近玩家，给清晰提示后减速；同时把中立生物仇恨交给该目标。
    instance.huntTarget=target
    var tp=challengePlayer(server,target)
    if(tp){
      challengeTell(tp,{text:'⛓ 虚空锁链锁定了你。',color:'dark_purple',bold:true})
      challengePlayToPlayer(tp,'minecraft:block.chain.place',0.76,0.56)
      challengePlayToPlayer(tp,'minecraft:block.respawn_anchor.deplete',0.24,1.18)
    }
    server.runCommandSilent('effect give '+target+' minecraft:slowness 5 '+(instance.phase>=2?2:1)+' true')
    server.runCommandSilent('effect give '+target+' minecraft:darkness 3 0 true')
    challengeSetAggro(server,instance,target)
  }
}

function challengeNightmareBlink(server,instance) {
  var tag=instance.entityTag,target=challengePlayer(server,instance.huntTarget||instance.target)
  if(!target)target=challengePlayer(server,instance.target)
  if(!target)return
  var residue='nightmare_echo_'+String(Date.now())+'_'+String(Math.floor(Math.random()*100000))
  // 先在旧位置留下一个无伤害标记；12 tick 后残影才爆发。
  challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run summon minecraft:area_effect_cloud ~ ~0.2 ~ {Tags:["divine_nightmare_echo","'+tag+'","'+residue+'"],Duration:18,Radius:0.1f,Particle:"reverse_portal"}')
  challengePlayAtTag(server,tag,'minecraft:entity.enderman.teleport',0.82,0.74,48,instance.dimension)
  challengeRunIn(server,instance.dimension,'execute as @e[tag='+tag+',limit=1] at @s run particle minecraft:reverse_portal ~ ~1.1 ~ 0.42 0.82 0.42 0.04 20 force')
  var safe=challengeSafeSpawnNear(target,5,10)
  if(safe)server.runCommandSilent('execute in '+instance.dimension+' run tp @e[tag='+tag+',limit=1] '+safe.x+' '+safe.y+' '+safe.z)
  challengeQueueCommandIn(server,12,instance.dimension,'execute as @e[tag='+residue+',limit=1] at @s run playsound minecraft:block.sculk_sensor.clicking_stop hostile @a[distance=..32] ~ ~ ~ 0.52 0.58')
  challengeQueueCommandIn(server,12,instance.dimension,'execute as @e[tag='+residue+',limit=1] at @s run particle minecraft:reverse_portal ~ ~0.8 ~ 0.8 0.55 0.8 0.08 34 force')
  challengeQueueCommandIn(server,12,instance.dimension,'execute as @e[tag='+residue+',limit=1] at @s run damage @a[distance=..3.2,gamemode=!creative,gamemode=!spectator] '+(instance.phase>=2?11:8)+' minecraft:magic')
  challengeQueueCommandIn(server,13,instance.dimension,'kill @e[tag='+residue+']')
  challengeSetAggro(server,instance,challengePlayerName(target))
}

function challengeNightmareSkill(server,instance,boss) {
  instance.skillIndex=(Number(instance.skillIndex||0)+1)%3
  if(instance.skillIndex==1){
    challengeNightmareBlink(server,instance)
  }else if(instance.skillIndex==2){
    var target=challengePickCombatTarget(server,instance)
    instance.huntTarget=target
    var p=challengePlayer(server,target)
    if(p){
      challengeTell(p,{text:'梦魇开始追猎你。',color:'dark_purple',italic:true})
      challengePlayToPlayer(p,'minecraft:entity.enderman.stare',0.42,0.74)
    }
    challengeSetAggro(server,instance,target)
  }else{
    // 一次短促连闪，不在玩家脸上生成；仍使用安全位置搜索。
    challengeNightmareBlink(server,instance)
    challengeQueueCommandIn(server,8,instance.dimension,'execute as @e[tag='+instance.entityTag+',limit=1] at @s run playsound minecraft:entity.player.attack.sweep hostile @a[distance=..36] ~ ~ ~ 0.54 0.64')
  }
}

function challengeBossPhase(server,instance,boss) {
  if(!boss||!boss.phaseHealth||instance.phase>=2)return
  challengeRunIn(server,instance.dimension,'execute as @e[tag='+instance.entityTag+',limit=1] store result score @s divineBossHP run data get entity @s Health 1')
  var reached=challengeRunIn(server,instance.dimension,'execute if entity @e[tag='+instance.entityTag+',scores={divineBossHP=..'+boss.phaseHealth+'},limit=1]')>0
  if(!reached)return
  instance.phase=2
  try{challengeRunIn(server,instance.dimension,'attribute @e[tag='+instance.entityTag+',limit=1] minecraft:generic.movement_speed base set '+boss.phaseSpeed)}catch(ignoredSpeed){}
  try{challengeRunIn(server,instance.dimension,'attribute @e[tag='+instance.entityTag+',limit=1] minecraft:generic.attack_damage base set '+boss.phaseAttack)}catch(ignoredAttack){}
  var target=challengePlayer(server,instance.target)
  if(boss.bossId=='void_child'){
    challengePlayAtTag(server,instance.entityTag,'minecraft:entity.warden.roar',0.54,0.72,64,instance.dimension)
    challengePlayAtTag(server,instance.entityTag,'minecraft:block.respawn_anchor.deplete',0.42,0.58,64,instance.dimension)
    if(target)challengeTell(target,{text:'虚空之子的裂纹全部亮了起来。',color:'dark_purple',bold:true})
  }else if(boss.bossId=='nightmare'){
    challengePlayAtTag(server,instance.entityTag,'minecraft:entity.enderman.scream',0.62,0.62,64,instance.dimension)
    challengePlayAtTag(server,instance.entityTag,'minecraft:entity.ender_dragon.growl',0.18,1.36,64,instance.dimension)
    if(target)challengeTell(target,{text:'梦魇不再隐藏自己的脚步。',color:'dark_purple',bold:true})
  }
}

function challengeBossTick(server,instance) {
  var boss=DIVINE_CHALLENGE_BOSSES[instance.bossKind]
  if(!boss)return
  if(!challengeEntityExists(server,instance.entityTag,instance.dimension)){
    instance.missingTicks=Number(instance.missingTicks||0)+5
    if(instance.missingTicks>=20)challengeFail(server,instance,'Boss 异常消失，事件已经安全清理；没有发放奖励。')
    return
  }
  instance.missingTicks=0
  challengeBossbarUpdate(server,instance)
  challengeBossPhase(server,instance,boss)
  if(DIVINE_CHALLENGE_NOW%20==0)challengeApplyBossSkin(server,instance,boss)
  if(boss.skillBase<=0)return
  if(DIVINE_CHALLENGE_NOW<Number(instance.nextSkillTick||0))return
  if(boss.bossId=='void_child')challengeVoidChildSkill(server,instance,boss)
  else if(boss.bossId=='nightmare')challengeNightmareSkill(server,instance,boss)
  instance.nextSkillTick=DIVINE_CHALLENGE_NOW+(instance.phase>=2?boss.skillPhase:boss.skillBase)
}

function challengeAbyssTick(server,instance) {
  if(instance.eventId=='abyss_hunt'){
    if(DIVINE_CHALLENGE_NOW>=Number(instance.endsTick||0)){
      instance.settled=true
      challengeRewardOwner(server,instance,'normal')
      challengeRemoveInstance(server,instance,true,'')
      return
    }
    if(DIVINE_CHALLENGE_NOW>=Number(instance.nextWaveTick||0)){
      instance.wave=Number(instance.wave||0)+1
      challengeSpawnHuntWave(server,instance)
      instance.nextWaveTick=DIVINE_CHALLENGE_NOW+300
    }
  }else if(instance.eventId=='abyss_ritual'&&DIVINE_CHALLENGE_NOW>=Number(instance.nextRitualPulse||0)){
    challengePlayAtTag(server,instance.entityTag,'minecraft:block.sculk_shrieker.shriek',0.22,0.82,40,instance.dimension)
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+instance.entityTag+',limit=1] at @s run effect give @a[distance=..8,gamemode=!creative,gamemode=!spectator] minecraft:darkness 3 0 true')
    challengeRunIn(server,instance.dimension,'execute as @e[tag='+instance.entityTag+',limit=1] at @s run particle minecraft:sculk_soul ~ ~1 ~ 0.75 0.65 0.75 0.03 18 force')
    instance.nextRitualPulse=DIVINE_CHALLENGE_NOW+100
  }
}

function challengeEnsureBootstrap(server) {
  if(DIVINE_CHALLENGE_BOOTSTRAPPED||!server)return
  DIVINE_CHALLENGE_BOOTSTRAPPED=true
  // /reload 或服务器重启后，JS 运行态已不存在。宁可清掉孤儿 Boss，也绝不保留可重复结算的半个事件。
  var raw=''
  try{raw=String(server.persistentData.getString('divineChallengeBossbars')||'')}catch(ignored){}
  if(raw){
    var bars=raw.split('|'),i=0
    for(i=0;i<bars.length;i++)if(bars[i])try{server.runCommandSilent('bossbar remove '+bars[i])}catch(ignoredBar){}
  }
  server.persistentData.putString('divineChallengeBossbars','')
  var cleanedDims={}
  function cleanDim(dim){
    dim=String(dim||'')
    if(!dim||cleanedDims[dim])return
    cleanedDims[dim]=true
    try{challengeRunIn(server,dim,'kill @e[tag=divine_challenge_entity]')}catch(ignoredKill){}
    try{challengeRunIn(server,dim,'kill @e[tag=divine_nightmare_echo]')}catch(ignoredEcho){}
  }
  cleanDim('minecraft:overworld');cleanDim('minecraft:the_nether');cleanDim('minecraft:the_end')
  try{
    var levels=server.getAllLevels().iterator()
    while(levels.hasNext()){
      var level=levels.next(),dim=''
      try{if(level.dimension&&level.dimension.location)dim=String(level.dimension.location())}catch(ignoredLocation){}
      if(!dim)try{dim=String(level.dimension)}catch(ignoredDim){}
      cleanDim(dim)
    }
  }catch(ignoredLevels){}
  try{server.runCommandSilent('scoreboard objectives add divineBossHP dummy')}catch(ignoredScore){}
  server.persistentData.putInt('divineChallengeFrameworkVersion',DIVINE_CHALLENGE_FRAMEWORK_VERSION)
  console.log('[DivineChallenge] V1.1 bootstrap: stale event entities/bossbars cleaned')
}

function divineChallengeTick(server,tick) {
  if(!server)return
  DIVINE_CHALLENGE_NOW=Number(tick||0)
  challengeEnsureBootstrap(server)
  if(DIVINE_CHALLENGE_NOW%5!=0)return
  var ids=[],id='',i=0
  for(id in DIVINE_CHALLENGE_INSTANCES)if(DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))ids.push(id)
  for(i=0;i<ids.length;i++){
    var instance=DIVINE_CHALLENGE_INSTANCES[ids[i]]
    if(!instance)continue
    if(instance.status=='scheduled'&&DIVINE_CHALLENGE_NOW>=instance.offerTick){
      if(!challengeOfferNow(server,instance))challengeFail(server,instance,'目标已经离开，事件取消。')
      continue
    }
    if(instance.status=='offered'){
      if(DIVINE_CHALLENGE_NOW>=instance.expiresTick){challengeFail(server,instance,'你没有回应。挑战已经离开。');continue}
      if(!challengePlayer(server,instance.target)){challengeFail(server,instance,'目标已经离线。');continue}
      continue
    }
    if((instance.status=='starting'||instance.status=='warning')&&DIVINE_CHALLENGE_NOW>=instance.startTick){
      if(!challengeStartInstance(server,instance))challengeFail(server,instance,'挑战实体未能建立，事件已经取消；服务端控制台已记录具体启动阶段。')
      continue
    }
    if(instance.status!='active')continue
    if(challengeTargetInvalid(server,instance)){
      instance.invalidTicks=Number(instance.invalidTicks||0)+5
      if(instance.invalidTicks>=100){challengeFail(server,instance,'你离开了挑战区域或跨越了维度，事件失败。');continue}
    }else instance.invalidTicks=0
    if(instance.bossKind)challengeBossTick(server,instance)
    else challengeAbyssTick(server,instance)
  }
}

function challengeCleanupEvent(server,eventId) {
  if(!server)return
  var ids=[],id='',i=0
  for(id in DIVINE_CHALLENGE_INSTANCES){
    if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
    if(DIVINE_CHALLENGE_INSTANCES[id]&&DIVINE_CHALLENGE_INSTANCES[id].eventId==eventId)ids.push(id)
  }
  for(i=0;i<ids.length;i++)if(DIVINE_CHALLENGE_INSTANCES[ids[i]])challengeRemoveInstance(server,DIVINE_CHALLENGE_INSTANCES[ids[i]],true,'')
}

function startAbyssGaze(server){return challengeScheduleWorldEvent(server,'abyss_gaze')}
function cleanupAbyssGaze(server){challengeCleanupEvent(server,'abyss_gaze')}
function startAbyssHunt(server){return challengeScheduleWorldEvent(server,'abyss_hunt')}
function cleanupAbyssHunt(server){challengeCleanupEvent(server,'abyss_hunt')}
function startAbyssRitual(server){return challengeScheduleWorldEvent(server,'abyss_ritual')}
function cleanupAbyssRitual(server){challengeCleanupEvent(server,'abyss_ritual')}
function startVoidMotherChallenge(server){return challengeScheduleWorldEvent(server,'void_mother_challenge')}
function cleanupVoidMotherChallenge(server){challengeCleanupEvent(server,'void_mother_challenge')}
function startAncientBell(server){return challengeScheduleWorldEvent(server,'ancient_bell')}
function cleanupAncientBell(server){challengeCleanupEvent(server,'ancient_bell')}

function challengeStartTest(player,eventId,bossId) {
  if(!player||!player.server)return false
  var instance=challengeCreate(player.server,eventId,player,0)
  if(!instance)return false
  instance.status='starting';instance.startTick=DIVINE_CHALLENGE_NOW+1
  if(bossId)instance.forcedBoss=bossId
  challengeTell(player,{text:'测试挑战已排入统一调度；测试体仍使用正式奖励规则，请在正式服测试前先备份。',color:'yellow'})
  return true
}

ServerEvents.commandRegistry(function(event){
  var Commands=event.commands
  event.register(Commands.literal('respond').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return challengeRespond(p)?1:0}))
  event.register(Commands.literal('respond_decline').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return challengeDecline(p)?1:0}))
  var root=Commands.literal('challenge').requires(function(source){return source.hasPermission(2)})
  var test=Commands.literal('test')
  ;['abyss_gaze','abyss_hunt','abyss_ritual','void_mother_challenge','ancient_bell'].forEach(function(id){
    test.then(Commands.literal(id).executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return challengeStartTest(p,id,'')?1:0}))
  })
  root.then(test)
  // 精确 Boss 测试只给管理员使用，避免反复等随机池；仍走正式安全出生、血条、技能和奖励路径。
  var bossTest=Commands.literal('boss')
  ;['void_child','nightmare'].forEach(function(bossId){
    bossTest.then(Commands.literal(bossId).executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return challengeStartTest(p,'void_mother_challenge',bossId)?1:0}))
  })
  root.then(bossTest)
  root.then(Commands.literal('safetest').executes(function(ctx){
    var p=ctx.source.player;if(!p)return 0
    var safe=challengeSafeSpawnNear(p,7,14)
    if(!safe){challengeTell(p,{text:'安全落点测试异常：没有返回坐标。',color:'red'});return 0}
    challengeTell(p,{text:'安全落点：'+safe.x+' '+safe.y+' '+safe.z+' · '+String(safe.mode||'unknown'),color:'green'})
    return 1
  }))
  root.then(Commands.literal('creditstatus').executes(function(ctx){
    var p=ctx.source.player;if(!p)return 0
    var name=challengePlayerName(p),found=null,id=''
    for(id in DIVINE_CHALLENGE_INSTANCES){
      if(!DIVINE_CHALLENGE_INSTANCES.hasOwnProperty(id))continue
      var x=DIVINE_CHALLENGE_INSTANCES[id]
      if(x&&x.target==name&&!x.settled){found=x;break}
    }
    if(!found){challengeTell(p,{text:'当前没有你的活动挑战。',color:'gray'});return 1}
    var left='未登记'
    if(found.relicCreditPlayer){
      var until=Number(found.relicCreditUntil||0)
      left=until<=0?'直到目标死亡':Math.max(0,Math.ceil((until-Date.now())/1000))+' 秒'
    }
    challengeTell(p,[
      {text:'遗物击杀归属 · ',color:'gold',bold:true},
      {text:found.relicCreditPlayer?String(found.relicCreditPlayer):'无',color:found.relicCreditPlayer?'green':'gray'},
      {text:' · '+String(found.relicCreditRelic||'')+' · '+left,color:'dark_gray'}
    ])
    return 1
  }))
  root.then(Commands.literal('clear').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;challengeCancelForPlayer(p.server,challengePlayerName(p),'管理员结束了你的测试挑战。',false);return 1}))
  event.register(root)
})

PlayerEvents.loggedOut(function(event){
  try{var p=event.player;if(p&&p.server)challengeCancelForPlayer(p.server,challengePlayerName(p),'',true)}catch(ignored){}
})

// 事件驱动的 Boss 普通战斗音；不增加 Tick，不扫描全服实体。
EntityEvents.hurt(function(event){
  try{
    var victim=event.entity,attacker=null
    try{attacker=event.source.actual}catch(ignoredActual){}
    if(!attacker)try{attacker=event.source.entity}catch(ignoredEntity){}
    function cue(entity,key,ms){
      if(!entity)return false
      var now=Date.now(),last=0
      try{last=Number(entity.persistentData.getLong(key))}catch(ignoredRead){}
      if(last>0&&now-last<ms)return false
      try{entity.persistentData.putLong(key,now)}catch(ignoredWrite){}
      return true
    }
    var attackerInstance=challengeFindInstanceByEntity(attacker)
    var victimInstance=challengeFindInstanceByEntity(victim)
    if(attacker&&attackerInstance&&challengeEntityHasTag(attacker,'divine_void_child')&&cue(attacker,'voidChildAttackCue',520)){
      challengePlayAtTag(attacker.server,attackerInstance.entityTag,'minecraft:entity.iron_golem.attack',0.68,0.68,40,attackerInstance.dimension)
      challengePlayAtTag(attacker.server,attackerInstance.entityTag,'minecraft:block.amethyst_cluster.break',0.20,0.58,40,attackerInstance.dimension)
    }else if(attacker&&attackerInstance&&challengeEntityHasTag(attacker,'divine_nightmare')&&cue(attacker,'nightmareAttackCue',460)){
      challengePlayAtTag(attacker.server,attackerInstance.entityTag,'minecraft:entity.player.attack.sweep',0.54,0.58,40,attackerInstance.dimension)
      challengePlayAtTag(attacker.server,attackerInstance.entityTag,'minecraft:entity.enderman.scream',0.18,0.82,40,attackerInstance.dimension)
    }
    if(victim&&victimInstance&&challengeEntityHasTag(victim,'divine_void_child')&&cue(victim,'voidChildHurtCue',780)){
      challengePlayAtTag(victim.server,victimInstance.entityTag,'minecraft:block.deepslate.break',0.38,0.56,40,victimInstance.dimension)
    }else if(victim&&victimInstance&&challengeEntityHasTag(victim,'divine_nightmare')&&cue(victim,'nightmareHurtCue',720)){
      challengePlayAtTag(victim.server,victimInstance.entityTag,'minecraft:entity.enderman.hurt',0.38,0.72,40,victimInstance.dimension)
    }
  }catch(error){console.log('[DivineChallenge] hurt cue failed: '+error)}
})

global.startAbyssGaze=startAbyssGaze
global.cleanupAbyssGaze=cleanupAbyssGaze
global.startAbyssHunt=startAbyssHunt
global.cleanupAbyssHunt=cleanupAbyssHunt
global.startAbyssRitual=startAbyssRitual
global.cleanupAbyssRitual=cleanupAbyssRitual
global.startVoidMotherChallenge=startVoidMotherChallenge
global.cleanupVoidMotherChallenge=cleanupVoidMotherChallenge
global.startAncientBell=startAncientBell
global.cleanupAncientBell=cleanupAncientBell
global.divineChallengeTick=divineChallengeTick
global.divineChallengeHandleDeath=challengeHandleDeath
global.divineChallengePlayerDeath=challengePlayerDeath
global.divineChallengeMarkRelicCredit=challengeMarkRelicCredit
global.divineChallengeMarkRelicCreditArea=challengeMarkRelicCreditArea
global.divineChallengeConfig=DIVINE_CHALLENGE_EVENTS
global.divineBossConfig=DIVINE_CHALLENGE_BOSSES
