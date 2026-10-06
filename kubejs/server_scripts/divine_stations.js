// ============================================================
// LSI 投影大厅 V10.8.14 · 模型展柜彻底移除 / 图片接口解耦
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.x
//
// 分工：
// - Elite Holograms：大厅标题 / 副标题（失败时退回原版 text_display）
// - 原版 text_display / item_display / interaction：抽奖与历史馆 UI
// - 传奇衣柜：只负责玩家自己的 YSM 收藏、授权与换装
// - 大厅动态图片：由独立 lobby_dynamic_image.js 管理，不依赖 AFP / YSM / LuokixiVisuals
//
// V10.8.14 已删除：大厅假人生成 / YSM 展柜套模 /
// 追视转向 / 旧模型展柜管理命令 / 展柜登录同步与伤害保护。
// 只保留一次性迁移清理，用来删除旧世界里已经生成过的假人与旧展柜实体。
// ============================================================

var DIVINE_STATION_ROTATE_TICKS = 240
var DIVINE_STATION_CLICK_COOLDOWN_MS = 500
var DIVINE_STATION_DRAW_COOLDOWN_MS = 2200
var DIVINE_STATION_VIEW_RANGE = 1.55
var DIVINE_STATION_FRONT_DISTANCE = 4.0
var DIVINE_STATION_LAYOUT_VERSION = 22

var STATION_ELITE_IDS = {
  oracleTitle:'lx94_oracle_title',
  oracleHint:'lx94_oracle_hint',
  historyTitle:'lx94_history_title',
  historyHint:'lx94_history_hint',
  test:'lx94_station_test'
}

// V6/V7/V8 可能留下的 ID。V9 建立/移除时全部主动删除。
var STATION_LEGACY_ELITE_IDS = {
  oracle:[
    'lx_oracle_title','lx_oracle_hint','lx_oracle_single','lx_oracle_ten',
    'lx_oracle_preview','lx_oracle_collection','lx9_oracle_title','lx9_oracle_hint','lx94_oracle_title','lx94_oracle_hint'
  ],
  history:[
    'lx_history_title','lx_history_server','lx_history_personal','lx_history_recent',
    'lx9_history_title','lx9_history_hint','lx94_history_title','lx94_history_hint'
  ]
}

// V5 到 V9 所有曾经使用过的原版展示标签。
// 旧 V5 只带 divine_station_display + 专用标签，并没有 divine_oracle_station，
// 这就是旧大厅一直删不掉的根因之一。
var STATION_LEGACY_ENTITY_TAGS = {
  oracle:[
    'divine_oracle_station','divine_oracle_interaction','divine_oracle_dynamic','divine_oracle_static',
    'divine_oracle_station_title','divine_oracle_station_head','divine_oracle_station_wings','divine_oracle_station_shard',
    'divine_oracle_station_static','divine_oracle_station_preview',
    'divine_oracle_prize_item','divine_oracle_prize_text',
    'divine_oracle_relic_item','divine_oracle_relic_text','divine_oracle_ysm_text',
    'divine_oracle_special_item','divine_oracle_special_text',
    'divine_oracle_companion_item','divine_oracle_companion_text',
    'divine_oracle_button_single','divine_oracle_button_ten','divine_oracle_button_preview','divine_oracle_button_collection',
    'divine_oracle_action_single','divine_oracle_action_ten','divine_oracle_action_preview','divine_oracle_action_collection',
    'divine_oracle_header_fallback','divine_oracle_live_reward'
  ],
  history:[
    'divine_history_station','divine_history_interaction','divine_history_dynamic','divine_history_static',
    'divine_history_station_text','divine_history_station_book','divine_history_station_page','divine_history_station_static',
    'divine_history_page',
    'divine_history_button_server','divine_history_button_personal','divine_history_button_recent',
    'divine_history_action_server','divine_history_action_personal','divine_history_action_recent',
    'divine_history_header_fallback'
  ]
}

var STATION_BUTTON_TEXT = {
  oracleSingle:{normal:[{text:'◇ 单抽 · 1 枚',color:'aqua',bold:true}],pressed:[{text:'◇ 命线已离匣…',color:'white',bold:true}]},
  oracleTen:{normal:[{text:'✦ 十连 · 10 枚',color:'gold',bold:true}],pressed:[{text:'✦ 十道命线正在展开…',color:'yellow',bold:true}]},
  oraclePreview:{normal:[{text:'◈ 大奖 · 概率 · 保底',color:'light_purple',bold:true}],pressed:[{text:'◈ 大奖页已展开',color:'white',bold:true}]},
  oracleCollection:{normal:[{text:'✦ 传奇衣柜 · 收藏',color:'light_purple',bold:true}],pressed:[{text:'✦ 收藏档案已展开',color:'white',bold:true}]},
  historyServer:{normal:[{text:'  ✦  世界纪录  ',color:'gold',bold:true}],pressed:[{text:'  ✦  世界纪录已展开  ',color:'yellow',bold:true}]},
  historyPersonal:{normal:[{text:'  📖  我的纪事  ',color:'aqua',bold:true}],pressed:[{text:'  📖  翻开你的页码  ',color:'white',bold:true}]},
  historyRecent:{normal:[{text:'  ◇  最近发生的事  ',color:'green',bold:true}],pressed:[{text:'  ◇  最近的页角  ',color:'white',bold:true}]}
}

var STATION_BUTTON_TAGS = {
  oracleSingle:'divine_oracle_button_single',
  oracleTen:'divine_oracle_button_ten',
  oraclePreview:'divine_oracle_button_preview',
  oracleCollection:'divine_oracle_button_collection',
  historyServer:'divine_history_button_server',
  historyPersonal:'divine_history_button_personal',
  historyRecent:'divine_history_button_recent'
}

var stationPulseRunning = false
var stationPulseToken = ''
var stationBootstrapped = false
var stationClickCooldown = {}
var stationClickOrder = []


function stationTell(player,json) {
  if (!player || !player.server) return
  player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json))
}

function stationDimension(player) {
  if (!player) return 'minecraft:overworld'
  try {
    var value = String(player.level.dimension)
    var match = value.match(/[a-z0-9_.-]+:[a-z0-9_./-]+/g)
    if (match && match.length > 0) return match[match.length - 1]
  } catch (ignored) {}
  return 'minecraft:overworld'
}

function stationToDouble(value,fallback) {
  if (fallback == null) fallback = 0
  try {
    if (typeof value == 'number') return isNaN(value) ? fallback : value
  } catch (ignoredType) {}
  try {
    if (value != null && typeof value.doubleValue == 'function') {
      var javaNumber = value.doubleValue()
      return isNaN(javaNumber) ? fallback : javaNumber
    }
  } catch (ignoredJavaNumber) {}
  try {
    var parsed = parseFloat(String(value))
    return isNaN(parsed) ? fallback : parsed
  } catch (ignoredParse) {
    return fallback
  }
}

function stationFormatNumber(value) {
  var number = stationToDouble(value,0)
  return String(Math.round(number * 1000) / 1000)
}

function stationPlayerPosition(player) {
  if (!player) return {x:0,y:64,z:0}
  try {
    return {
      x:stationToDouble(player.getX(),0),
      y:stationToDouble(player.getY(),64),
      z:stationToDouble(player.getZ(),0)
    }
  } catch (ignoredDirect) {}
  try {
    var pos = player.blockPosition()
    return {
      x:stationToDouble(pos.getX(),0) + 0.5,
      y:stationToDouble(pos.getY(),64),
      z:stationToDouble(pos.getZ(),0) + 0.5
    }
  } catch (ignoredBlockPos) {}
  return {x:0,y:64,z:0}
}

function stationActorName(actor) {
  if (!actor) return ''
  var name = ''
  try {
    if (typeof actor == 'string') name = actor
    else if (actor.username != null) name = String(actor.username)
    else if (actor.getGameProfile) name = String(actor.getGameProfile().getName())
  } catch (ignored) {}
  return /^[A-Za-z0-9_]{1,16}$/.test(name) ? name : ''
}

function stationRunAsActor(server,actor,command) {
  if (!server || !command) return 0
  var name = stationActorName(actor)
  try {
    if (name) {
      return server.runCommandSilent('execute as ' + name + ' at ' + name + ' run ' + command)
    }
    return server.runCommandSilent(command)
  } catch (error) {
    console.log('[DivineStations] Command failed: ' + command + ' / ' + error)
    return 0
  }
}

function stationKey(type,suffix) {
  return 'divineStation_' + type + '_' + suffix
}

function stationEnabled(server,type) {
  return server && server.persistentData.getBoolean(stationKey(type,'enabled'))
}

function stationData(server,type) {
  if (!server) return null
  var rightX = server.persistentData.getDouble(stationKey(type,'rightX'))
  var rightZ = server.persistentData.getDouble(stationKey(type,'rightZ'))
  if (Math.abs(rightX) + Math.abs(rightZ) < 0.01) {
    rightX = 1
    rightZ = 0
  }
  return {
    enabled:stationEnabled(server,type),
    dimension:server.persistentData.getString(stationKey(type,'dimension')),
    x:server.persistentData.getDouble(stationKey(type,'x')),
    y:server.persistentData.getDouble(stationKey(type,'y')),
    z:server.persistentData.getDouble(stationKey(type,'z')),
    rightX:rightX,
    rightZ:rightZ,
    index:server.persistentData.getInt(stationKey(type,'index')),
    backend:server.persistentData.getString(stationKey(type,'backend')),
    layout:server.persistentData.getInt(stationKey(type,'layout'))
  }
}

function stationSave(server,type,dimension,x,y,z,rightX,rightZ) {
  if (!server) return
  var data = server.persistentData
  data.putBoolean(stationKey(type,'enabled'),true)
  data.putString(stationKey(type,'dimension'),dimension)
  data.putDouble(stationKey(type,'x'),x)
  data.putDouble(stationKey(type,'y'),y)
  data.putDouble(stationKey(type,'z'),z)
  data.putDouble(stationKey(type,'rightX'),rightX == null ? 1 : rightX)
  data.putDouble(stationKey(type,'rightZ'),rightZ == null ? 0 : rightZ)
  data.putInt(stationKey(type,'index'),-1)
  data.putInt(stationKey(type,'layout'),DIVINE_STATION_LAYOUT_VERSION)
  data.putString(stationKey(type,'backend'),'')
}

function stationHorizontalLook(player) {
  var fx = 0
  var fz = 1
  try {
    var look = player.getLookAngle()
    fx = stationToDouble(look.x(),0)
    fz = stationToDouble(look.z(),1)
  } catch (ignoredLookMethods) {
    try {
      var yaw = stationToDouble(player.getYRot(),0) * Math.PI / 180
      fx = -Math.sin(yaw)
      fz = Math.cos(yaw)
    } catch (ignoredYaw) {
      fx = 0
      fz = 1
    }
  }
  if (isNaN(fx) || isNaN(fz)) { fx = 0; fz = 1 }
  var length = Math.sqrt(fx * fx + fz * fz)
  if (length < 0.05) { fx = 0; fz = 1; length = 1 }
  return {x:fx / length,z:fz / length}
}

function stationPlacement(player,mode) {
  var look = stationHorizontalLook(player)
  var pos = stationPlayerPosition(player)
  var px = pos.x
  var py = Math.floor(pos.y) + 1.35
  var pz = pos.z
  var front = mode == 'here' ? 0 : DIVINE_STATION_FRONT_DISTANCE
  var x = mode == 'here' ? Math.floor(px) + 0.5 : px + look.x * front
  var z = mode == 'here' ? Math.floor(pz) + 0.5 : pz + look.z * front
  return {
    dimension:stationDimension(player),
    x:x,y:py,z:z,
    rightX:-look.z,
    rightZ:look.x
  }
}

function stationPoint(data,side,yOffset) {
  return {
    x:data.x + data.rightX * (side || 0),
    y:data.y + (yOffset || 0),
    z:data.z + data.rightZ * (side || 0)
  }
}

function stationModLoaded(id) {
  try {
    return Platform.isLoaded(id)
  } catch (ignored) {
    return false
  }
}

function stationDependencyState() {
  return {
    elite:
      stationModLoaded('eliteholograms') ||
      stationModLoaded('elite_holograms')
  }
}

function stationEliteCommand(server,command,actor) {
  if (!server || !command) return 0
  return stationRunAsActor(server,actor,command)
}

function stationEliteDelete(server,id,actor) {
  if (!server || !id) return false
  // EliteHolograms 1.20.1-1.1.1 的 delete 实际要求命令源是玩家。
  // 没有玩家上下文时宁可跳过，避免控制台刷 “A player is required”。
  if (!stationActorName(actor)) return false
  return stationEliteCommand(server,'eh delete ' + id,actor) > 0
}

function stationEliteSetLine(server,id,text,actor) {
  if (!server || !id || !text || !stationActorName(actor)) return false
  return stationEliteCommand(server,'eh setline ' + id + ' 1 ' + text,actor) > 0
}

function stationEliteCreateText(server,dimension,x,y,z,id,text,actor) {
  if (!server || !dimension || !id || !text || !stationActorName(actor)) return false
  stationEliteDelete(server,id,actor)

  // 关键修复：createat 先使用绝对安全的占位文本，再用 setline 写正式内容。
  // 这样无论 Elite 的 createat 对 MiniMessage/特殊字符如何解析，都不会生成默认的
  // “Edit this hologram with /eh addline ...” 教学文字。
  var placeholder = '&7.'
  var createAt =
    'execute in ' + dimension + ' run eh createat ' + id + ' ' +
    stationFormatNumber(x) + ' ' + stationFormatNumber(y) + ' ' + stationFormatNumber(z) + ' ' + placeholder

  var result = stationEliteCommand(server,createAt,actor)
  if (result <= 0) {
    var fallback =
      'execute in ' + dimension +
      ' positioned ' + stationFormatNumber(x) + ' ' + stationFormatNumber(y) + ' ' + stationFormatNumber(z) +
      ' run eh create ' + id + ' ' + placeholder
    result = stationEliteCommand(server,fallback,actor)
  }
  if (result <= 0) return false

  if (!stationEliteSetLine(server,id,text,actor)) {
    stationEliteDelete(server,id,actor)
    return false
  }
  return true
}

function stationDeleteEliteGroup(server,type,actor) {
  if (!server || !stationActorName(actor)) return false
  var ids = type == 'oracle' ? STATION_LEGACY_ELITE_IDS.oracle : STATION_LEGACY_ELITE_IDS.history
  var i = 0
  var attempted = false
  for (i = 0; i < ids.length; i++) {
    stationEliteDelete(server,ids[i],actor)
    attempted = true
  }
  return attempted
}

function stationEscapeSnbt(value) {
  return String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'")
}

function stationCleanText(value,maxLength) {
  var text = String(value == null ? '' : value)
  text = text.replace(/[\r\n|]+/g,' ').replace(/</g,'‹').replace(/>/g,'›')
  if (maxLength && text.length > maxLength) text = text.substring(0,maxLength)
  return text
}

function stationKillTag(server,dimension,tag) {
  if (!server || !dimension || !tag) return
  try { server.runCommandSilent('execute in ' + dimension + ' run kill @e[tag=' + tag + ']') } catch (ignored) {}
}

function stationLevelDimension(level) {
  if (!level) return ''
  try {
    var value = String(level.dimension)
    var match = value.match(/[a-z0-9_.-]+:[a-z0-9_./-]+/g)
    if (match && match.length > 0) return match[match.length - 1]
  } catch (ignored) {}
  return ''
}

function stationLoadedDimensions(server) {
  var result = []
  var seen = {}
  function add(id) {
    id = String(id || '')
    if (!id || seen[id]) return
    seen[id] = true
    result.push(id)
  }
  add('minecraft:overworld')
  try {
    var oracle = stationData(server,'oracle')
    var history = stationData(server,'history')
    if (oracle) add(oracle.dimension)
    if (history) add(history.dimension)
  } catch (ignoredSaved) {}
  try {
    var levels = server.getAllLevels()
    var iterator = levels.iterator()
    while (iterator.hasNext()) add(stationLevelDimension(iterator.next()))
  } catch (ignoredLevels) {}
  return result
}

function stationCleanupLegacyEntities(server,dimension,type) {
  if (!server || !dimension) return
  var tags = type == 'oracle' ? STATION_LEGACY_ENTITY_TAGS.oracle : STATION_LEGACY_ENTITY_TAGS.history
  var i = 0
  for (i = 0; i < tags.length; i++) stationKillTag(server,dimension,tags[i])
}

function stationPurgeVisuals(server,type,extraDimension,actor) {
  if (!server) return
  stationDeleteEliteGroup(server,type,actor)
  var dims = stationLoadedDimensions(server)
  if (extraDimension && dims.indexOf(extraDimension) < 0) dims.push(extraDimension)
  var i = 0
  for (i = 0; i < dims.length; i++) stationCleanupLegacyEntities(server,dims[i],type)
}

function stationScaleMatrix(scale) {
  var s = stationToDouble(scale,1.0)
  return '[' + s + 'f,0f,0f,0f,0f,' + s + 'f,0f,0f,0f,0f,' + s + 'f,0f,0f,0f,0f,1f]'
}

function stationSpawnTextDisplay(server,dimension,x,y,z,tags,component,scale,lineWidth,background) {
  if (!server || !dimension || !tags || tags.length <= 0) return false
  try {
    var tagParts = []
    var i = 0
    for (i = 0; i < tags.length; i++) tagParts.push('"' + tags[i] + '"')
    var json = stationEscapeSnbt(JSON.stringify(component))
    var command =
      'execute in ' + dimension + ' run summon minecraft:text_display ' +
      stationFormatNumber(x) + ' ' + stationFormatNumber(y) + ' ' + stationFormatNumber(z) + ' {' +
      'Tags:[' + tagParts.join(',') + '],' +
      'billboard:"center",text:\'' + json + '\',' +
      'alignment:"center",line_width:' + (lineWidth || 360) + ',' +
      'background:' + (background == null ? 0 : background) + ',' +
      'default_background:0b,shadow:1b,see_through:0b,brightness:{block:15,sky:15},view_range:' + DIVINE_STATION_VIEW_RANGE + 'f,' +
      'interpolation_duration:8,' +
      'transformation:' + stationScaleMatrix(scale || 1.0) +
      '}'
    var result = server.runCommandSilent(command)
    if (result <= 0) console.log('[DivineStations] text_display summon returned 0; tags=' + tags.join(','))
    return result > 0
  } catch (error) {
    console.log('[DivineStations] text_display summon failed; tags=' + tags.join(',') + ' / ' + error)
    return false
  }
}

function stationSpawnItemDisplay(server,dimension,x,y,z,tags,itemId,scale) {
  if (!server || !dimension || !tags || tags.length <= 0) return false
  try {
    var tagParts = []
    var i = 0
    for (i = 0; i < tags.length; i++) tagParts.push('"' + tags[i] + '"')
    var command =
      'execute in ' + dimension + ' run summon minecraft:item_display ' +
      stationFormatNumber(x) + ' ' + stationFormatNumber(y) + ' ' + stationFormatNumber(z) + ' {' +
      'Tags:[' + tagParts.join(',') + '],' +
      'billboard:"center",item:{id:"' + itemId + '",Count:1b},item_display:"fixed",' +
      'brightness:{block:15,sky:15},view_range:' + DIVINE_STATION_VIEW_RANGE + 'f,' +
      'interpolation_duration:8,' +
      'transformation:' + stationScaleMatrix(scale || 1.0) +
      '}'
    var result = server.runCommandSilent(command)
    if (result <= 0) console.log('[DivineStations] item_display summon returned 0; tags=' + tags.join(',') + ' item=' + itemId)
    return result > 0
  } catch (error) {
    console.log('[DivineStations] item_display summon failed; tags=' + tags.join(',') + ' / ' + error)
    return false
  }
}

function stationSpawnInteraction(server,dimension,x,y,z,typeTag,actionTag,width,height) {
  if (!server || !dimension || !typeTag || !actionTag) return false
  try {
    var command =
      'execute in ' + dimension + ' run summon minecraft:interaction ' +
      stationFormatNumber(x) + ' ' + stationFormatNumber(y) + ' ' + stationFormatNumber(z) + ' {' +
      'Tags:["divine_station_interaction","' + typeTag + '","' + actionTag + '"],' +
      'width:' + (width || 2.2) + 'f,height:' + (height || 0.48) + 'f,response:1b' +
      '}'
    var result = server.runCommandSilent(command)
    if (result <= 0) console.log('[DivineStations] interaction summon returned 0; action=' + actionTag)
    return result > 0
  } catch (error) {
    console.log('[DivineStations] interaction summon failed; action=' + actionTag + ' / ' + error)
    return false
  }
}

function stationSpawnButton(server,data,type,key,side,yOffset,actionTag,width,height) {
  var p = stationPoint(data,side,yOffset)
  var tag = STATION_BUTTON_TAGS[key]
  var stationTag = type == 'oracle' ? 'divine_oracle_station' : 'divine_history_station'
  var staticTag = type == 'oracle' ? 'divine_oracle_static' : 'divine_history_static'
  var interactionTag = type == 'oracle' ? 'divine_oracle_interaction' : 'divine_history_interaction'
  var visual = stationSpawnTextDisplay(server,data.dimension,p.x,p.y,p.z,[stationTag,staticTag,tag],STATION_BUTTON_TEXT[key].normal,1.05,260,0)
  var hitbox = stationSpawnInteraction(server,data.dimension,p.x,p.y,p.z,interactionTag,actionTag,width || 2.25,height || 0.34)
  return visual && hitbox
}

function stationSpawnDynamicOracleEntities(server,data) {
  stationKillTag(server,data.dimension,'divine_oracle_dynamic')
  stationKillTag(server,data.dimension,'divine_oracle_ysm_text')

  // V10.8.16 固定三轨：左禁忌 / 中遗物 / 右随行者。
  var leftItem=stationPoint(data,-2.72,1.72)
  var leftText=stationPoint(data,-2.72,0.58)
  var centerItem=stationPoint(data,0,1.78)
  var centerText=stationPoint(data,0,0.58)
  var rightItem=stationPoint(data,2.72,1.72)
  var rightText=stationPoint(data,2.72,0.58)

  var specialItemOk=stationSpawnItemDisplay(server,data.dimension,leftItem.x,leftItem.y,leftItem.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_special_item'],'minecraft:amethyst_shard',1.42)
  var specialTextOk=stationSpawnTextDisplay(server,data.dimension,leftText.x,leftText.y,leftText.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_special_text'],
    [{text:'禁忌道具\n',color:'light_purple',bold:true},{text:'紫色命线正在展开',color:'gray'}],0.42,280,0)

  var relicItemOk=stationSpawnItemDisplay(server,data.dimension,centerItem.x,centerItem.y,centerItem.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_relic_item'],'minecraft:nether_star',1.50)
  var relicTextOk=stationSpawnTextDisplay(server,data.dimension,centerText.x,centerText.y,centerText.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_relic_text'],
    [{text:'诸神遗物\n',color:'gold',bold:true},{text:'金色命线正在苏醒',color:'gray'}],0.44,300,0)

  var companionItemOk=stationSpawnItemDisplay(server,data.dimension,rightItem.x,rightItem.y,rightItem.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_companion_item'],'minecraft:name_tag',1.42)
  var companionTextOk=stationSpawnTextDisplay(server,data.dimension,rightText.x,rightText.y,rightText.z,
    ['divine_oracle_station','divine_oracle_dynamic','divine_oracle_companion_text'],
    [{text:'随行者\n',color:'yellow',bold:true},{text:'仍有生命的契约正在回应',color:'gray'}],0.42,280,0)

  return specialItemOk && specialTextOk && relicItemOk && relicTextOk && companionItemOk && companionTextOk
}

function stationSpawnDynamicHistoryEntity(server,data) {
  stationKillTag(server,data.dimension,'divine_history_dynamic')
  var page = stationPoint(data,0,1.25)
  return stationSpawnTextDisplay(
    server,data.dimension,page.x,page.y,page.z,
    ['divine_history_station','divine_history_dynamic','divine_history_page'],
    [{text:'旧页正在展开。',color:'gold',italic:true}],0.90,430,1476395008
  )
}

function stationSpawnOracleInteractions(server,data) {
  stationKillTag(server,data.dimension,'divine_oracle_interaction')
  // 实际按钮由 stationSpawnOracleButtons 一并创建热区。
}

function stationSpawnHistoryInteractions(server,data) {
  stationKillTag(server,data.dimension,'divine_history_interaction')
  // 实际按钮由 stationSpawnHistoryButtons 一并创建热区。
}

function stationSpawnOracleButtons(server,data) {
  // V10.1：热区不再追求“巨大好点”，而是刻意留出水平/垂直死区。
  // 旧版 2.30~2.55 宽、0.48 高的 interaction 在斜视角下容易让准星先撞到上层抽奖热区。
  var a = stationSpawnButton(server,data,'oracle','oracleSingle',-1.58,0.10,'divine_oracle_action_single',1.82,0.30)
  var b = stationSpawnButton(server,data,'oracle','oracleTen',1.58,0.10,'divine_oracle_action_ten',1.82,0.30)
  var c = stationSpawnButton(server,data,'oracle','oraclePreview',-1.58,-0.88,'divine_oracle_action_preview',1.90,0.30)
  var d = stationSpawnButton(server,data,'oracle','oracleCollection',1.58,-0.88,'divine_oracle_action_collection',1.90,0.30)
  return a && b && c && d
}

function stationSpawnHistoryButtons(server,data) {
  var a = stationSpawnButton(server,data,'history','historyServer',-1.72,-0.52,'divine_history_action_server',1.55)
  var b = stationSpawnButton(server,data,'history','historyPersonal',0,-0.52,'divine_history_action_personal',1.55)
  var c = stationSpawnButton(server,data,'history','historyRecent',1.72,-0.52,'divine_history_action_recent',1.60)
  return a && b && c
}

function stationSpawnHeaderFallback(server,data,type,title,hint) {
  var titlePos = stationPoint(data,0,3.34)
  var hintPos = stationPoint(data,0,2.88)
  var stationTag = type == 'oracle' ? 'divine_oracle_station' : 'divine_history_station'
  var staticTag = type == 'oracle' ? 'divine_oracle_static' : 'divine_history_static'
  var fallbackTag = type == 'oracle' ? 'divine_oracle_header_fallback' : 'divine_history_header_fallback'
  var a = stationSpawnTextDisplay(server,data.dimension,titlePos.x,titlePos.y,titlePos.z,[stationTag,staticTag,fallbackTag],title,1.18,430,0)
  var b = stationSpawnTextDisplay(server,data.dimension,hintPos.x,hintPos.y,hintPos.z,[stationTag,staticTag,fallbackTag],hint,0.78,430,0)
  return a && b
}

function stationSpawnOracleElite(server,data,actor) {
  var deps = stationDependencyState()
  if (!deps.elite) return false
  stationDeleteEliteGroup(server,'oracle',actor)
  var title = stationPoint(data,0,3.38)
  var hint = stationPoint(data,0,2.92)
  var titleOk = stationEliteCreateText(server,data.dimension,title.x,title.y,title.z,STATION_ELITE_IDS.oracleTitle,'<gradient:#EBC8FF:#FFD66B><bold>✦ 三纺女的旧匣</bold></gradient>',actor)
  var hintOk = stationEliteCreateText(server,data.dimension,hint.x,hint.y,hint.z,STATION_ELITE_IDS.oracleHint,'<gray>旧匣从不急着把最后一根线剪断。</gray>',actor)
  if (!titleOk || !hintOk) {
    stationDeleteEliteGroup(server,'oracle',actor)
    return false
  }
  stationKillTag(server,data.dimension,'divine_oracle_header_fallback')
  return true
}

function stationSpawnHistoryElite(server,data,actor) {
  var deps = stationDependencyState()
  if (!deps.elite) return false
  stationDeleteEliteGroup(server,'history',actor)
  var title = stationPoint(data,0,3.38)
  var hint = stationPoint(data,0,2.92)
  var titleOk = stationEliteCreateText(server,data.dimension,title.x,title.y,title.z,STATION_ELITE_IDS.historyTitle,'<gold><bold>✦ Luokixi 世界纪事馆</bold></gold>',actor)
  var hintOk = stationEliteCreateText(server,data.dimension,hint.x,hint.y,hint.z,STATION_ELITE_IDS.historyHint,'<gray>纪录在日常互动发生时改写</gray>',actor)
  if (!titleOk || !hintOk) {
    stationDeleteEliteGroup(server,'history',actor)
    return false
  }
  stationKillTag(server,data.dimension,'divine_history_header_fallback')
  return true
}

function stationCompanionEgg(type) {
  if (type == 'minecraft:horse') return 'minecraft:horse_spawn_egg'
  if (type == 'minecraft:wolf') return 'minecraft:wolf_spawn_egg'
  if (type == 'minecraft:donkey') return 'minecraft:donkey_spawn_egg'
  if (type == 'minecraft:iron_golem') return 'minecraft:carved_pumpkin'
  return 'minecraft:name_tag'
}

function stationOraclePrizePool() {
  // V10.8.17：大厅静态大奖目录只展示常规 5★ 遗物；6★ 彩蛋只在真正中奖后短暂显形。YSM 神秘惊喜仍不展示。
  var result = []
  var i = 0
  try {
    var relics = global.oracleRelicCatalog || []
    for (i = 0; i < relics.length; i++) {
      var relic = relics[i]
      if (relic.tier != 5) continue
      result.push({
        id:relic.id,modelId:'',kind:'relic',rarity:'★★★★★',
        name:relic.name,
        kindLabel:'神权遗物',
        detail:(relic.deity || '未知神祇') + (relic.domain ? (' · '+relic.domain) : ''),
        flavor:relic.effect || relic.lore || '诸神留下的五星遗物。',
        fullFlavor:relic.stages && relic.stages.length > 3 ? relic.stages[3] : '',
        color:'gold',item:relic.item || 'minecraft:nether_star',scale:1.56
      })
    }
  } catch (ignoredRelics) {}
  if (result.length <= 0) {
    result.push({id:'relic_wait',modelId:'',kind:'empty',rarity:'★★★★★',name:'遗物尚未装填',kindLabel:'诸神遗物',detail:'等待遗物目录加载',flavor:'',color:'gray',item:'minecraft:nether_star',scale:1.24})
  }
  return result
}

function stationRelicLanePool() {
  var source=stationOraclePrizePool(),result=[],i=0
  for(i=0;i<source.length;i++)if(source[i]&&source[i].kind=='relic')result.push(source[i])
  if(result.length<=0)result.push({id:'relic_wait',kind:'empty',rarity:'★★★★★',name:'遗物尚未装填',kindLabel:'诸神遗物',detail:'等待神物目录加载',flavor:'',color:'gray',item:'minecraft:nether_star',scale:1.24})
  return result
}


function stationSpecialLanePool() {
  var result=[],specials={}
  try{specials=global.oracleSpecialCatalog||{}}catch(ignored){}
  var id=''
  for(id in specials){
    if(!specials.hasOwnProperty(id))continue
    var sp=specials[id]
    if(!sp||id=='black_flame_visual')continue
    result.push({
      id:sp.id||id,kind:'special',rarity:'★★★★',name:sp.name||id,
      kindLabel:'禁忌道具',detail:'紫色命线 · 一次性权柄',flavor:sp.lore||'',fullFlavor:'',
      color:'light_purple',item:sp.display||sp.item||'minecraft:amethyst_shard',scale:1.42
    })
  }
  if(result.length<=0)result.push({id:'special_wait',kind:'empty',rarity:'★★★★',name:'禁忌道具尚未装填',kindLabel:'禁忌道具',detail:'等待禁忌目录加载',flavor:'',color:'gray',item:'minecraft:amethyst_shard',scale:1.20})
  return result
}

function stationCompanionLanePool() {
  var result=[],pets=[]
  try{pets=global.oracleCompanionCatalog||[]}catch(ignored){}
  var i=0
  for(i=0;i<pets.length;i++){
    var pet=pets[i]
    if(!pet||!pet.id)continue
    result.push({
      id:pet.id,kind:'pet',rarity:'★★★★',name:pet.shortName||pet.name||pet.id,
      kindLabel:'随行者',detail:pet.note||'',flavor:pet.flavor||'',fullFlavor:'',
      color:'yellow',item:stationCompanionEgg(pet.type),scale:1.44
    })
  }
  if(result.length<=0)result.push({id:'companion_wait',kind:'empty',rarity:'★★★★',name:'随行者尚未回应',kindLabel:'随行者',detail:'等待契约目录加载',flavor:'',color:'gray',item:'minecraft:name_tag',scale:1.20})
  return result
}

function stationLaneInfoComponent(title,prize,actorName) {
  var out=[]
  var titleColor='light_purple'
  if(prize&&prize.kind=='relic')titleColor=String(prize.rarity||'').indexOf('6★')>=0?'red':'gold'
  else if(prize&&prize.kind=='pet')titleColor='yellow'
  out.push({text:title+'\n',color:titleColor,bold:true})
  out.push({text:stationCleanText(prize&&prize.name?prize.name:'等待装填',58)+'\n',color:prize&&prize.color?prize.color:'white',bold:true})
  if(prize&&prize.detail)out.push({text:stationCleanText(prize.detail,64),color:'gray'})
  if(actorName)out.push({text:'\n✦ '+stationCleanText(actorName,24)+' 抽中',color:'white',italic:true})
  return out
}

function stationPrizeInfoComponent(prize,modelActive,actorName) {
  var out=[]
  var color=prize&&prize.color?prize.color:'gold'
  out.push({text:(prize&&prize.rarity?prize.rarity:'★★★★★')+'  ',color:color,bold:true})
  out.push({text:stationCleanText(prize&&prize.name?prize.name:'未知大奖',86)+'\n',color:color,bold:true})
  if(prize&&prize.kindLabel)out.push({text:'◇ '+stationCleanText(prize.kindLabel,42)+(prize.detail?' · '+stationCleanText(prize.detail,82):'')+'\n',color:'light_purple'})
  if(prize&&prize.flavor)out.push({text:stationCleanText(prize.flavor,118),color:'gray',italic:true})
  if(prize&&prize.kind=='relic'&&prize.fullFlavor)out.push({text:'\n✦ 满命 · '+stationCleanText(prize.fullFlavor,105),color:'gold'})
  if(actorName)out.push({text:'\n由 '+stationCleanText(actorName,32)+' 抽中',color:'white',italic:true})
  return out
}

function stationPrizeByResult(result) {
  if(!result)return null
  var pool=stationOraclePrizePool(),i=0
  for(i=0;i<pool.length;i++)if(pool[i].id==result.id)return pool[i]
  if(result.kind=='special'){
    try{
      var specials=global.oracleSpecialCatalog||{},sp=specials[result.id]
      if(sp)return{id:sp.id,kind:'special',rarity:result.rarity||'4★',name:sp.name,kindLabel:'禁忌道具',detail:'紫色命线 · 一次性权柄',flavor:sp.lore||'',fullFlavor:'',color:'light_purple',item:sp.display||sp.item||'minecraft:amethyst_shard',scale:1.55}
    }catch(ignoredSpecial){}
  }
  if(result.kind=='pet'){
    try{
      var pet=global.oracleCompanionFind&&global.oracleCompanionFind(result.id)
      if(pet)return{id:pet.id,kind:'pet',rarity:result.rarity||'4★',name:pet.name,kindLabel:'随行者',detail:pet.note||'',flavor:pet.flavor||'',fullFlavor:'',color:'yellow',item:stationCompanionEgg(pet.type),scale:1.48}
    }catch(ignoredPetPrize){}
  }
  if(result.kind=='relic'){
    try{
      var relic=global.oracleRelicFind&&global.oracleRelicFind(result.id)
      if(relic){
        var six=Number(relic.tier)==6||result.rarity=='6★'
        return{id:relic.id,kind:'relic',rarity:result.rarity||(six?'6★':'5★'),name:relic.name,kindLabel:six?'彩蛋遗物':'神权遗物',detail:(relic.deity||'')+(relic.domain?(' · '+relic.domain):''),flavor:relic.lore||relic.effect||'',fullFlavor:six?'':(relic.stages&&relic.stages.length>3?relic.stages[3]:''),color:six?'red':(relic.color||'gold'),item:relic.item||'minecraft:nether_star',scale:six?2.02:1.82}
      }
    }catch(ignoredRelicPrize){}
  }
  return {
    id:result.id||'',kind:result.kind||'reward',rarity:result.rarity||'★★★★★',
    name:result.name||'未知奖励',kindLabel:result.kind=='relic'?'神权遗物':(result.kind=='ysm'?'神秘惊喜':(result.kind=='mod_item'?'异界遗珍':'抽奖奖励')),
    detail:'',flavor:result.description||result.flavor||'',fullFlavor:'',color:result.rarity=='6★'?'red':(result.rarity=='5★'?'gold':'light_purple'),
    item:stationRewardDisplayItem(result),scale:result.rarity=='6★'?2.02:(result.rarity=='5★'?1.82:1.50)
  }
}

function stationRewardDisplayItem(result) {
  if (!result) return 'minecraft:nether_star'
  try { if (result.displayItem) return String(result.displayItem) } catch (ignoredDisplay) {}
  try {
    if (result.kind == 'relic' && global.oracleRelicFind && result.id) {
      var relic = global.oracleRelicFind(result.id)
      if (relic && relic.item) return String(relic.item)
    }
  } catch (ignoredRelic) {}
  try {
    if (result.kind == 'pet' && global.oracleCompanionFind && result.id) {
      var pet = global.oracleCompanionFind(result.id)
      if (pet && pet.type) return stationCompanionEgg(String(pet.type))
    }
  } catch (ignoredPet) {}

  if (result.id == 'godslayer_totem') return 'minecraft:totem_of_undying'
  if (result.id == 'forbidden_fruit') return 'minecraft:apple'
  if (result.id == 'void_mother_pearl') return 'minecraft:ender_pearl'
  if (result.id == 'dragon_blood') return 'minecraft:potion'
  if (result.id == 'hunter_oil') return 'minecraft:honey_bottle'
  if (result.id == 'worldwalker_seal') return 'minecraft:heart_of_the_sea'
  var name = String(result.name || '')
  if (name.indexOf('钻石') >= 0) return 'minecraft:diamond'
  if (name.indexOf('下界合金') >= 0) return 'minecraft:netherite_scrap'
  if (name.indexOf('远古残骸') >= 0) return 'minecraft:ancient_debris'
  if (name.indexOf('回响') >= 0) return 'minecraft:echo_shard'
  if (name.indexOf('附魔书') >= 0) return 'minecraft:enchanted_book'
  if (name.indexOf('弓') >= 0) return 'minecraft:bow'
  if (name.indexOf('矿镐') >= 0) return 'minecraft:diamond_pickaxe'
  if (name.indexOf('战斧') >= 0) return 'minecraft:diamond_axe'
  if (name.indexOf('剑') >= 0) return 'minecraft:diamond_sword'
  if (result.kind == 'currency') return 'minecraft:amethyst_shard'
  return result.rarity == '6★' ? 'minecraft:allium' : (result.rarity == '5★' ? 'minecraft:nether_star' : 'minecraft:amethyst_shard')
}

function stationProjectReward(player,result) {
  if (!player || !player.server || !result) return false
  if (result.rarity != '4★' && result.rarity != '5★' && result.rarity != '6★') return false
  // “神秘惊喜”只写入玩家收藏，不允许生成任何大厅/近身展示实体。
  if (result.kind == 'ysm') return false

  var server = player.server
  var pos = stationPlayerPosition(player)
  var dimension = stationDimension(player)
  var data = stationData(server,'oracle')
  var itemId = stationRewardDisplayItem(result)
  var rarityColor = result.rarity == '6★' ? 'red' : (result.rarity == '5★' ? 'gold' : 'light_purple')
  var scale = result.rarity == '6★' ? 2.02 : (result.rarity == '5★' ? 1.82 : 1.50)
  var useHall = false
  if (data && data.enabled && data.dimension == dimension) {
    var dx = pos.x - data.x
    var dy = pos.y - data.y
    var dz = pos.z - data.z
    useHall = dx * dx + dy * dy + dz * dz <= 900
  }

  if (useHall) {
    var rewardPrize=stationPrizeByResult(result)
    if(rewardPrize){rewardPrize.color=rarityColor;rewardPrize.rarity=result.rarity||rewardPrize.rarity;rewardPrize.name=result.name||rewardPrize.name}
    var actor=stationActorName(player)
    var handled=false
    if(result.kind=='special'){
      stationDynamicItemCommand(server,data.dimension,'divine_oracle_special_item',itemId,scale)
      stationDynamicTextCommand(server,data.dimension,'divine_oracle_special_text',stationLaneInfoComponent('◇ 禁忌道具',rewardPrize||{name:result.name,color:rarityColor,kind:'special'},actor))
      handled=true
    }else if(result.kind=='relic'){
      stationDynamicItemCommand(server,data.dimension,'divine_oracle_relic_item',itemId,scale)
      stationDynamicTextCommand(server,data.dimension,'divine_oracle_relic_text',stationLaneInfoComponent('✦ 诸神遗物',rewardPrize||{name:result.name,color:rarityColor,kind:'relic'},actor))
      handled=true
    }else if(result.kind=='pet'){
      stationDynamicItemCommand(server,data.dimension,'divine_oracle_companion_item',itemId,scale)
      stationDynamicTextCommand(server,data.dimension,'divine_oracle_companion_text',stationLaneInfoComponent('🐾 随行者',rewardPrize||{name:result.name,color:'yellow',kind:'pet'},actor))
      handled=true
    }
    if(handled){
      server.scheduleInTicks(150,function () {
        try { if (stationEnabled(server,'oracle')) stationRenderOracleLanes(server,false,true) } catch (ignoredRestore) {}
      })
      return true
    }
  }

  // 其他 4★（模组遗珍/资源）只在中奖者面前短暂显示，不占用三类大厅展位。
  var look = stationHorizontalLook(player)
  var x = pos.x + look.x * 2.55
  var y = pos.y + 1.62
  var z = pos.z + look.z * 2.55
  var safeName = stationActorName(player).replace(/[^A-Za-z0-9_]/g,'_')
  var unique = 'divine_oracle_live_' + safeName
  stationKillTag(server,dimension,unique)
  stationSpawnItemDisplay(server,dimension,x,y,z,['divine_oracle_live_reward',unique],itemId,scale)
  var livePrize=stationPrizeByResult(result)
  if(livePrize){livePrize.color=rarityColor;livePrize.rarity=result.rarity||livePrize.rarity;livePrize.name=result.name||livePrize.name}
  stationSpawnTextDisplay(server,dimension,x,y - 0.90,z,['divine_oracle_live_reward',unique],stationPrizeInfoComponent(livePrize||{rarity:result.rarity,name:result.name,color:rarityColor},false,''),0.54,360,0)
  server.scheduleInTicks(150,function () { try { stationKillTag(server,dimension,unique) } catch (ignoredKill) {} })
  return true
}

function stationRarityPoint(player) {
  if (!player || !player.server) return null
  var server = player.server
  var pos = stationPlayerPosition(player)
  var dimension = stationDimension(player)
  var data = stationData(server,'oracle')
  if (data && data.enabled && data.dimension == dimension) {
    var dx = pos.x - data.x
    var dy = pos.y - data.y
    var dz = pos.z - data.z
    if (dx * dx + dy * dy + dz * dz <= 900) {
      var p = stationPoint(data,0,1.72)
      return {server:server,dimension:dimension,x:p.x,y:p.y,z:p.z,target:stationActorName(player)}
    }
  }
  var look = stationHorizontalLook(player)
  return {server:server,dimension:dimension,x:pos.x + look.x * 2.45,y:pos.y + 1.45,z:pos.z + look.z * 2.45,target:stationActorName(player)}
}

function stationParticle(point,id,dx,dy,dz,speed,count) {
  if (!point || !point.server) return
  var command='execute in ' + point.dimension + ' positioned ' + stationFormatNumber(point.x) + ' ' + stationFormatNumber(point.y) + ' ' + stationFormatNumber(point.z) + ' run particle ' + id + ' ~ ~ ~ ' + dx + ' ' + dy + ' ' + dz + ' ' + speed + ' ' + count + ' force'
  if (point.target) command += ' ' + point.target
  try { point.server.runCommandSilent(command) } catch (ignored) {}
}

function stationFirework(point,colors,fade,type) {
  if (!point || !point.server) return
  var c=colors.join(',')
  var f=fade.join(',')
  var nbt='{LifeTime:8,FireworksItem:{id:"minecraft:firework_rocket",Count:1b,tag:{Fireworks:{Flight:0b,Explosions:[{Type:' + (type || 1) + 'b,Colors:[I;' + c + '],FadeColors:[I;' + f + '],Trail:1b,Flicker:1b}]}}}}'
  try { point.server.runCommandSilent('execute in ' + point.dimension + ' positioned ' + stationFormatNumber(point.x) + ' ' + stationFormatNumber(point.y - 0.25) + ' ' + stationFormatNumber(point.z) + ' run summon minecraft:firework_rocket ~ ~ ~ ' + nbt) } catch (ignored) {}
}

function stationPlayRarityFx(player,rarity,phase) {
  var p=stationRarityPoint(player)
  if (!p) return false
  phase=phase || 0

  // 2★ / 3★ / 4★ 不再放烟花。颜色靠 dust + 对应粒子辨识，层级靠数量和种类递增。
  if (phase == 0) {
    if (rarity == '6★') {
      stationParticle(p,'minecraft:dust 1.0 0.02 0.04 1.65',0.46,0.58,0.46,0.055,48)
      stationParticle(p,'minecraft:crimson_spore',0.40,0.52,0.40,0.035,34)
      stationParticle(p,'minecraft:heart',0.26,0.36,0.26,0.018,10)
      stationParticle(p,'minecraft:reverse_portal',0.34,0.44,0.34,0.045,26)
    } else if (rarity == '5★') {
      stationParticle(p,'minecraft:dust 1.0 0.72 0.10 1.45',0.40,0.54,0.40,0.045,38)
      stationParticle(p,'minecraft:end_rod',0.34,0.50,0.34,0.035,28)
      stationParticle(p,'minecraft:electric_spark',0.36,0.42,0.36,0.06,24)
      stationParticle(p,'minecraft:wax_on',0.28,0.36,0.28,0.05,18)
    } else if (rarity == '4★') {
      stationParticle(p,'minecraft:dust 0.68 0.16 0.96 1.35',0.40,0.50,0.40,0.04,34)
      stationParticle(p,'minecraft:reverse_portal',0.34,0.46,0.34,0.035,26)
      stationParticle(p,'minecraft:enchant',0.30,0.38,0.30,0.045,20)
    } else if (rarity == '3★') {
      stationParticle(p,'minecraft:dust 0.12 0.34 1.0 1.20',0.34,0.44,0.34,0.035,26)
      stationParticle(p,'minecraft:soul_fire_flame',0.28,0.38,0.28,0.025,18)
      stationParticle(p,'minecraft:electric_spark',0.24,0.30,0.24,0.035,12)
    } else {
      stationParticle(p,'minecraft:dust 0.58 0.64 0.72 0.95',0.28,0.34,0.28,0.02,18)
      stationParticle(p,'minecraft:smoke',0.24,0.30,0.24,0.015,12)
      stationParticle(p,'minecraft:cloud',0.20,0.25,0.20,0.012,8)
    }
    return true
  }

  if (phase == 1) {
    if (rarity == '6★') {
      stationParticle(p,'minecraft:dust 1.0 0.0 0.03 1.85',0.46,0.58,0.46,0.075,62)
      stationParticle(p,'minecraft:crimson_spore',0.42,0.54,0.42,0.045,44)
      stationParticle(p,'minecraft:enchanted_hit',0.34,0.44,0.34,0.075,34)
      stationParticle(p,'minecraft:heart',0.28,0.36,0.28,0.022,14)
      stationParticle(p,'minecraft:end_rod',0.24,0.34,0.24,0.028,24)
    } else if (rarity == '5★') {
      stationParticle(p,'minecraft:dust 1.0 0.80 0.18 1.55',0.34,0.46,0.34,0.055,46)
      stationParticle(p,'minecraft:reverse_portal',0.30,0.40,0.30,0.032,38)
      stationParticle(p,'minecraft:enchant',0.32,0.42,0.32,0.055,30)
      stationParticle(p,'minecraft:end_rod',0.22,0.34,0.22,0.025,22)
      stationParticle(p,'minecraft:electric_spark',0.30,0.38,0.30,0.065,28)
    } else if (rarity == '4★') {
      stationParticle(p,'minecraft:dust 0.76 0.18 1.0 1.45',0.38,0.50,0.38,0.05,42)
      stationParticle(p,'minecraft:reverse_portal',0.34,0.46,0.34,0.04,34)
      stationParticle(p,'minecraft:enchant',0.30,0.42,0.30,0.06,26)
      stationParticle(p,'minecraft:end_rod',0.20,0.30,0.20,0.025,14)
    } else if (rarity == '3★') {
      stationParticle(p,'minecraft:dust 0.16 0.42 1.0 1.28',0.34,0.44,0.34,0.045,32)
      stationParticle(p,'minecraft:soul_fire_flame',0.30,0.40,0.30,0.035,24)
      stationParticle(p,'minecraft:end_rod',0.18,0.28,0.18,0.02,10)
    } else {
      stationParticle(p,'minecraft:dust 0.66 0.70 0.78 1.05',0.30,0.38,0.30,0.025,24)
      stationParticle(p,'minecraft:cloud',0.24,0.30,0.24,0.018,14)
    }
    return true
  }

  if (rarity == '6★') {
    // 红色彩蛋揭晓：比金色更少见，红线、绯红孢子与心形粒子叠在一起，最后只放一轮红色烟花。
    stationParticle(p,'minecraft:dust 1.0 0.0 0.02 2.0',0.82,0.96,0.82,0.15,118)
    stationParticle(p,'minecraft:crimson_spore',0.72,0.86,0.72,0.08,86)
    stationParticle(p,'minecraft:firework',0.68,0.82,0.68,0.10,68)
    stationParticle(p,'minecraft:enchanted_hit',0.58,0.68,0.58,0.14,54)
    stationParticle(p,'minecraft:reverse_portal',0.62,0.78,0.62,0.09,62)
    stationParticle(p,'minecraft:heart',0.46,0.58,0.46,0.035,24)
    stationParticle(p,'minecraft:end_rod',0.46,0.58,0.46,0.05,42)
    stationFirework(p,[16711680,11141120,16724787],[16777215,16733525],1)
    stationFirework({server:p.server,dimension:p.dimension,x:p.x+0.62,y:p.y+0.04,z:p.z,target:p.target},[16711680,16724787],[16777215],4)
    stationFirework({server:p.server,dimension:p.dimension,x:p.x-0.62,y:p.y+0.04,z:p.z,target:p.target},[11141120,16711680],[16733525],4)
  } else if (rarity == '5★') {
    // 金色揭晓：金色烟花只属于 5★。粒子分层明显，但都集中在抽奖台前，不遮玩家中心视野。
    stationParticle(p,'minecraft:dust 1.0 0.72 0.05 1.75',0.72,0.88,0.72,0.13,90)
    stationParticle(p,'minecraft:firework',0.72,0.90,0.72,0.12,78)
    stationParticle(p,'minecraft:end_rod',0.58,0.76,0.58,0.07,58)
    stationParticle(p,'minecraft:electric_spark',0.64,0.66,0.64,0.11,52)
    stationParticle(p,'minecraft:wax_on',0.52,0.64,0.52,0.085,46)
    stationParticle(p,'minecraft:totem_of_undying',0.48,0.64,0.48,0.13,48)
    stationParticle(p,'minecraft:enchanted_hit',0.50,0.58,0.50,0.13,42)
    stationParticle(p,'minecraft:reverse_portal',0.62,0.74,0.62,0.075,64)
    stationParticle(p,'minecraft:happy_villager',0.42,0.56,0.42,0.07,28)
    stationFirework(p,[16766720,16753920,16776960],[16777215,16766720,16744192],1)
    stationFirework({server:p.server,dimension:p.dimension,x:p.x+0.58,y:p.y+0.05,z:p.z,target:p.target},[16766720,16776960],[16777215],4)
    stationFirework({server:p.server,dimension:p.dimension,x:p.x-0.58,y:p.y+0.05,z:p.z,target:p.target},[16753920,16766720],[16777215],4)
  } else if (rarity == '4★') {
    stationParticle(p,'minecraft:dust 0.82 0.18 1.0 1.55',0.58,0.70,0.58,0.075,58)
    stationParticle(p,'minecraft:reverse_portal',0.56,0.70,0.56,0.075,52)
    stationParticle(p,'minecraft:enchant',0.48,0.60,0.48,0.085,42)
    stationParticle(p,'minecraft:end_rod',0.34,0.48,0.34,0.04,28)
    stationParticle(p,'minecraft:dragon_breath',0.34,0.46,0.34,0.03,24)
  } else if (rarity == '3★') {
    stationParticle(p,'minecraft:dust 0.14 0.40 1.0 1.40',0.48,0.60,0.48,0.06,46)
    stationParticle(p,'minecraft:soul_fire_flame',0.44,0.58,0.44,0.05,36)
    stationParticle(p,'minecraft:electric_spark',0.36,0.48,0.36,0.06,26)
    stationParticle(p,'minecraft:end_rod',0.24,0.36,0.24,0.03,16)
  } else {
    stationParticle(p,'minecraft:dust 0.62 0.68 0.78 1.12',0.38,0.48,0.38,0.035,30)
    stationParticle(p,'minecraft:smoke',0.34,0.44,0.34,0.025,22)
    stationParticle(p,'minecraft:cloud',0.28,0.38,0.28,0.02,16)
  }
  return true
}

function stationProjectDemo(player,rarity) {
  if (!player) return false
  return stationProjectReward(player,{
    rarity:rarity == '6★' ? '6★' : (rarity == '5★' ? '5★' : '4★'),
    name:rarity == '6★' ? '薇 · 演出测试' : (rarity == '5★' ? '雷神的审判 · 演出测试' : '战马契约 · 演出测试'),
    kind:(rarity == '6★' || rarity == '5★') ? 'relic' : 'pet',
    id:rarity == '6★' ? 'luokixi_relic_wei' : (rarity == '5★' ? 'thunder_god_verdict' : 'horse'),
    displayItem:rarity == '6★' ? 'minecraft:allium' : (rarity == '5★' ? 'minecraft:stick' : 'minecraft:horse_spawn_egg')
  })
}

function stationHistoryRecord(server,key,label,color) {
  var name = server.persistentData.getString('historyRecord_' + key + '_name') || '尚无人留下记录'
  var value = server.persistentData.getInt('historyRecord_' + key + '_value')
  return {text:label + ' · ' + name + (value > 0 ? '  ' + value : '') + '\n',color:color}
}

function stationHistoryPages(server) {
  if (!server) return [[{text:'公共纪事暂时无法读取。',color:'red'}]]
  var firstDragon = server.persistentData.getString('historyFirstDragonName') || '尚无人抵达终末之地的最后一页'
  var firstDay = server.persistentData.getInt('historyFirstDragonDay')
  return [
    [
      {text:'✦ 世界首记\n',color:'gold',bold:true},
      {text:'首位击败末影龙\n',color:'light_purple'},
      {text:firstDragon + (firstDay > 0 ? ' · 第 ' + firstDay + ' 天' : '') + '\n',color:'white',bold:true},
      {text:'这条记录一旦写下，不会被后来者覆盖。',color:'dark_gray',italic:true}
    ],
    [
      {text:'✦ 财富与归来\n',color:'aqua',bold:true},
      stationHistoryRecord(server,'diamonds','钻石纪录','aqua'),
      stationHistoryRecord(server,'deaths','死亡与归来','gray'),
      stationHistoryRecord(server,'events','见证神谕','blue')
    ],
    [
      {text:'✦ 铁册与金线\n',color:'red',bold:true},
      stationHistoryRecord(server,'war','斗神胜利','red'),
      stationHistoryRecord(server,'five','五星命线','gold'),
      {text:'纪录变化时会立即标记刷新；投影只做低频显示。',color:'dark_gray',italic:true}
    ]
  ]
}

function stationDynamicTextCommand(server,dimension,tag,component) {
  if (!server || !dimension || !tag) return false
  try {
    var json = stationEscapeSnbt(JSON.stringify(component))
    var result = server.runCommandSilent(
      'execute in ' + dimension + ' as @e[tag=' + tag + ',limit=1] run data merge entity @s {text:\'' + json + '\',start_interpolation:0,interpolation_duration:10}'
    )
    return result > 0
  } catch (error) {
    console.log('[DivineStations] dynamic text update failed; tag=' + tag + ' / ' + error)
    return false
  }
}

function stationDynamicItemCommand(server,dimension,tag,itemId,scale) {
  if (!server || !dimension || !tag || !itemId) return false
  try {
    var result = server.runCommandSilent(
      'execute in ' + dimension + ' as @e[tag=' + tag + ',limit=1] run data merge entity @s {' +
      'item:{id:"' + itemId + '",Count:1b},start_interpolation:0,interpolation_duration:10,' +
      'transformation:' + stationScaleMatrix(scale) + '}'
    )
    return result > 0
  } catch (error) {
    console.log('[DivineStations] dynamic item update failed; tag=' + tag + ' / ' + error)
    return false
  }
}

function stationQuoteCommandArg(value) {
  var text=String(value==null?'':value)
  if(/^[0-9A-Za-z_.+\-]+$/.test(text))return text
  return '"'+text.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'
}

function stationPlayerCount(server) {
  if (!server) return 0
  function isReal(player){
    if(!player)return false
    try{if(String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return false}catch(ignoredClass){}
    return true
  }
  try{
    var list=server.getPlayerList().getPlayers(),count=0,i=0,size=list.size()
    for(i=0;i<size;i++)if(isReal(list.get(i)))count++
    return count
  }catch(ignored){}
  try{
    var players=server.players,count2=0,j=0
    if(players&&typeof players.length=='number'){
      for(j=0;j<players.length;j++)if(isReal(players[j]))count2++
      return count2
    }
  }catch(ignored2){}
  return 0
}

function stationRenderOracleLanes(server,advance,manual) {
  var data=stationData(server,'oracle')
  if(!data||!data.enabled||!data.dimension)return false
  var relicPool=stationRelicLanePool(),specialPool=stationSpecialLanePool(),companionPool=stationCompanionLanePool(),store=server.persistentData
  var relicIndex=store.getInt(stationKey('oracle','relic_index'))
  var specialIndex=store.getInt(stationKey('oracle','special_index'))
  var companionIndex=store.getInt(stationKey('oracle','companion_index'))
  if(advance){relicIndex++;specialIndex++;companionIndex++}
  relicIndex=Math.floor(Math.abs(relicIndex))%relicPool.length
  specialIndex=Math.floor(Math.abs(specialIndex))%specialPool.length
  companionIndex=Math.floor(Math.abs(companionIndex))%companionPool.length
  store.putInt(stationKey('oracle','relic_index'),relicIndex)
  store.putInt(stationKey('oracle','special_index'),specialIndex)
  store.putInt(stationKey('oracle','companion_index'),companionIndex)

  var relic=relicPool[relicIndex],special=specialPool[specialIndex],companion=companionPool[companionIndex]
  var a=stationDynamicItemCommand(server,data.dimension,'divine_oracle_special_item',special.item,special.scale||1.42)
  var b=stationDynamicTextCommand(server,data.dimension,'divine_oracle_special_text',stationLaneInfoComponent('◇ 禁忌道具',special,''))
  var c=stationDynamicItemCommand(server,data.dimension,'divine_oracle_relic_item',relic.item,relic.scale||1.50)
  var d=stationDynamicTextCommand(server,data.dimension,'divine_oracle_relic_text',stationLaneInfoComponent('✦ 诸神遗物',relic,''))
  var e=stationDynamicItemCommand(server,data.dimension,'divine_oracle_companion_item',companion.item,companion.scale||1.42)
  var f=stationDynamicTextCommand(server,data.dimension,'divine_oracle_companion_text',stationLaneInfoComponent('🐾 随行者',companion,''))
  if(manual||stationPlayerCount(server)>0){
    var p=stationPoint(data,0,1.78)
    try{server.runCommandSilent('execute in '+data.dimension+' positioned '+stationFormatNumber(p.x)+' '+stationFormatNumber(p.y)+' '+stationFormatNumber(p.z)+' run particle minecraft:reverse_portal ~ ~ ~ 0.24 0.34 0.24 0.018 7 force')}catch(ignored){}
  }
  return a&&b&&c&&d&&e&&f
}

function stationRenderOracleIndex(server,index,manual) {
  if(!server)return false
  var data=stationData(server,'oracle')
  if(!data||!data.enabled||!data.dimension)return false
  var store=server.persistentData,safe=Math.max(0,Number(index)||0)
  var relicPool=stationRelicLanePool(),specialPool=stationSpecialLanePool(),companionPool=stationCompanionLanePool()
  var relicIndex=Math.floor(safe)%relicPool.length
  var specialIndex=Math.floor(safe)%specialPool.length
  var companionIndex=Math.floor(safe)%companionPool.length
  store.putInt(stationKey('oracle','relic_index'),relicIndex)
  store.putInt(stationKey('oracle','special_index'),specialIndex)
  store.putInt(stationKey('oracle','companion_index'),companionIndex)
  var relic=relicPool[relicIndex],special=specialPool[specialIndex],companion=companionPool[companionIndex]
  var a=stationDynamicItemCommand(server,data.dimension,'divine_oracle_special_item',special.item,special.scale||1.42)
  var b=stationDynamicTextCommand(server,data.dimension,'divine_oracle_special_text',stationLaneInfoComponent('◇ 禁忌道具',special,''))
  var c=stationDynamicItemCommand(server,data.dimension,'divine_oracle_relic_item',relic.item,relic.scale||1.50)
  var d=stationDynamicTextCommand(server,data.dimension,'divine_oracle_relic_text',stationLaneInfoComponent('✦ 诸神遗物',relic,''))
  var e=stationDynamicItemCommand(server,data.dimension,'divine_oracle_companion_item',companion.item,companion.scale||1.42)
  var f=stationDynamicTextCommand(server,data.dimension,'divine_oracle_companion_text',stationLaneInfoComponent('🐾 随行者',companion,''))
  return a&&b&&c&&d&&e&&f
}

function stationRotateOracle(server,manual) {
  return stationRenderOracleLanes(server,true,manual)
}


// V10.8.16：12 秒大厅脉冲轮换左/中/右三类实体展品。
function stationRotateOracleSideLanes(server,manual) {
  // 保留旧函数名供 pulse 调用；V10.8.16 实际轮换左/中/右三类实体展品。
  return stationRenderOracleLanes(server,true,manual)
}

function stationRenderHistoryIndex(server,index,manual) {
  var data = stationData(server,'history')
  if (!data || !data.enabled || !data.dimension) return false
  var pages = stationHistoryPages(server)
  if (pages.length <= 0) return false
  if (index < 0 || index >= pages.length) index = 0
  server.persistentData.putInt(stationKey('history','index'),index)
  var textOk = stationDynamicTextCommand(server,data.dimension,'divine_history_page',pages[index])
  if (manual || stationPlayerCount(server) > 0) {
    var p = stationPoint(data,0,1.25)
    try {
      server.runCommandSilent(
        'execute in ' + data.dimension + ' positioned ' + stationFormatNumber(p.x) + ' ' + stationFormatNumber(p.y) + ' ' + stationFormatNumber(p.z) +
        ' run particle minecraft:enchant ~ ~ ~ 0.24 0.28 0.24 0.018 8 force'
      )
    } catch (ignored) {}
  }
  server.persistentData.putBoolean('divineHistoryBoardDirty',false)
  return textOk
}

function stationRotateHistory(server,manual) {
  var data = stationData(server,'history')
  if (!data || !data.enabled) return false
  var pages = stationHistoryPages(server)
  if (pages.length <= 0) return false
  var next = data.index + 1
  if (next < 0 || next >= pages.length) next = 0
  return stationRenderHistoryIndex(server,next,manual)
}

function stationSpawnOracle(server,actor) {
  var data = stationData(server,'oracle')
  if (!data || !data.enabled || !data.dimension) return false
  try {
    stationPurgeVisuals(server,'oracle',data.dimension,actor)

    // 先画原版核心 UI；大厅展示只使用原版 display 实体，不依赖 YSM/AFP。
    var headerOk = stationSpawnHeaderFallback(server,data,'oracle',
      [{text:'✦ 三纺女的旧匣',color:'light_purple',bold:true}],
      [{text:'别急着伸手。最亮的那根线，总会晚半拍落下来。',color:'gray'}]
    )
    var dynamicOk = stationSpawnDynamicOracleEntities(server,data)
    stationSpawnOracleInteractions(server,data)
    var buttonsOk = stationSpawnOracleButtons(server,data)
    var renderOk = dynamicOk ? stationRenderOracleIndex(server,data.index >= 0 ? data.index : 0,true) : false

    var coreOk = headerOk && dynamicOk && buttonsOk && renderOk
    var eliteOk = false
    if (coreOk) {
      try { eliteOk = stationSpawnOracleElite(server,data,actor) } catch (eliteError) {
        console.log('[DivineStations] optional Elite header failed: ' + eliteError)
        eliteOk = false
      }
    }
    server.persistentData.putString(stationKey('oracle','backend'),eliteOk ? 'elite+vanilla-ui' : 'vanilla-ui')
    server.persistentData.putInt(stationKey('oracle','layout'),DIVINE_STATION_LAYOUT_VERSION)
    if (coreOk) stationStartPulse(server)
    return coreOk
  } catch (error) {
    console.log('[DivineStations] stationSpawnOracle failed: ' + error)
    return false
  }
}

function stationSpawnHistory(server,actor) {
  var data = stationData(server,'history')
  if (!data || !data.enabled || !data.dimension) return false
  try {
    stationPurgeVisuals(server,'history',data.dimension,actor)

    var headerOk = stationSpawnHeaderFallback(server,data,'history',
      [{text:'✦ Luokixi 世界纪事馆',color:'gold',bold:true}],
      [{text:'纪录在日常互动发生时改写 · 对准下方文字右键',color:'gray'}]
    )
    var dynamicOk = stationSpawnDynamicHistoryEntity(server,data)
    stationSpawnHistoryInteractions(server,data)
    var buttonsOk = stationSpawnHistoryButtons(server,data)
    var renderOk = dynamicOk ? stationRenderHistoryIndex(server,data.index >= 0 ? data.index : 0,true) : false

    var coreOk = headerOk && dynamicOk && buttonsOk && renderOk
    var eliteOk = false
    if (coreOk) {
      try { eliteOk = stationSpawnHistoryElite(server,data,actor) } catch (eliteError) {
        console.log('[DivineStations] optional Elite history header failed: ' + eliteError)
        eliteOk = false
      }
    }
    server.persistentData.putString(stationKey('history','backend'),eliteOk ? 'elite+vanilla-ui' : 'vanilla-ui')
    server.persistentData.putInt(stationKey('history','layout'),DIVINE_STATION_LAYOUT_VERSION)
    if (coreOk) stationStartPulse(server)
    return coreOk
  } catch (error) {
    console.log('[DivineStations] stationSpawnHistory failed: ' + error)
    return false
  }
}

function stationRefreshHistory(server,force) {
  if (!server) return false
  if (!force && !server.persistentData.getBoolean('divineHistoryBoardDirty')) return false
  var data = stationData(server,'history')
  if (!data || !data.enabled) return false
  var index = data.index >= 0 ? data.index : 0
  return stationRenderHistoryIndex(server,index,false)
}

function stationSet(player,type,mode) {
  if (!player || !player.server) return false
  var server = player.server
  var stage = '读取玩家位置'
  try {
    var placement = stationPlacement(player,mode == 'here' ? 'here' : 'front')

    stage = '清理旧大厅'
    stationPurgeVisuals(server,type,placement.dimension,player)
    server.persistentData.putBoolean(stationKey(type,'enabled'),false)

    stage = '保存新坐标'
    stationSave(server,type,placement.dimension,placement.x,placement.y,placement.z,placement.rightX,placement.rightZ)

    stage = '绘制核心 UI'
    var ok = type == 'oracle' ? stationSpawnOracle(server,player) : stationSpawnHistory(server,player)
    if (!ok) {
      server.persistentData.putBoolean(stationKey(type,'enabled'),false)
      stationPurgeVisuals(server,type,placement.dimension,player)
    }

    stationTell(player,[
      {text:'✦ ' + (type == 'oracle' ? '旧匣抽奖 UI' : '世界纪事馆') + (ok ? ' 已建立。\n' : ' 建立失败。\n'),color:type == 'oracle' ? 'light_purple' : 'gold',bold:true},
      {text:placement.dimension + '  ' + stationFormatNumber(placement.x) + ' ' + stationFormatNumber(placement.y) + ' ' + stationFormatNumber(placement.z) + '\n',color:'gray'},
      {text:ok ? ((mode == 'here' ? '中心建立模式' : '已放在你面前约 4 格') + ' · UI 与隐形热区均已验证。') : ('失败阶段：' + stage + '。请查看 logs/kubejs/server.log 中的 [DivineStations]。'),color:ok ? 'aqua' : 'red'}
    ])
    return ok
  } catch (error) {
    try {
      server.persistentData.putBoolean(stationKey(type,'enabled'),false)
      stationPurgeVisuals(server,type,'',player)
    } catch (ignored) {}
    console.log('[DivineStations] stationSet failed at [' + stage + ']: ' + error)
    try {
      stationTell(player,[
        {text:'✦ 投影大厅建立失败\n',color:'red',bold:true},
        {text:'失败阶段：' + stage + '\n',color:'yellow'},
        {text:String(error),color:'gray'}
      ])
    } catch (ignoredTell) {}
    return false
  }
}

function stationRemove(server,type,announce,actor) {
  if (!server) return false
  try {
    var data = stationData(server,type)
    stationPurgeVisuals(server,type,data ? data.dimension : '',actor)
    server.persistentData.putBoolean(stationKey(type,'enabled'),false)
    server.persistentData.putString(stationKey(type,'backend'),'')
    server.persistentData.putString(stationKey(type,'dimension'),'')
    server.persistentData.putInt(stationKey(type,'index'),-1)
    server.persistentData.putInt(stationKey(type,'layout'),0)
    return true
  } catch (error) {
    console.log('[DivineStations] stationRemove failed: type=' + type + ' / ' + error)
    return false
  }
}

function stationPurgeAll(server,actor) {
  if (!server) return false
  try {
    stationRemove(server,'oracle',false,actor)
    stationRemove(server,'history',false,actor)
    stationEliteDelete(server,STATION_ELITE_IDS.test,actor)
    var dims = stationLoadedDimensions(server)
    var i = 0
    for (i = 0; i < dims.length; i++) {
      // 全局强制清理仅用于管理员 purge：V5 的通用标签也在这里删除。
      stationKillTag(server,dims[i],'divine_station_test')
      stationKillTag(server,dims[i],'divine_station_interaction')
      stationKillTag(server,dims[i],'divine_station_display')
      stationCleanupLegacyEntities(server,dims[i],'oracle')
      stationCleanupLegacyEntities(server,dims[i],'history')
    }
    return true
  } catch (error) {
    console.log('[DivineStations] stationPurgeAll failed: ' + error)
    return false
  }
}

function stationHasTag(server,dimension,tag) {
  if (!server || !dimension || !tag) return false
  try { return server.runCommandSilent('execute in ' + dimension + ' if entity @e[tag=' + tag + ',limit=1]') > 0 } catch (ignored) { return false }
}

function stationHealth(server,type) {
  var data = stationData(server,type)
  var dimension = data ? data.dimension : ''
  var stationTag = type == 'oracle' ? 'divine_oracle_station' : 'divine_history_station'
  var interactionTag = type == 'oracle' ? 'divine_oracle_interaction' : 'divine_history_interaction'
  var visual = data && dimension ? stationHasTag(server,dimension,stationTag) : false
  var interaction = data && dimension ? stationHasTag(server,dimension,interactionTag) : false
  var complete = false
  if (data && dimension && type == 'oracle') {
    complete =
      stationHasTag(server,dimension,'divine_oracle_relic_item') &&
      stationHasTag(server,dimension,'divine_oracle_relic_text') &&
      stationHasTag(server,dimension,'divine_oracle_special_item') &&
      stationHasTag(server,dimension,'divine_oracle_special_text') &&
      stationHasTag(server,dimension,'divine_oracle_companion_item') &&
      stationHasTag(server,dimension,'divine_oracle_companion_text') &&
      stationHasTag(server,dimension,'divine_oracle_button_single') &&
      stationHasTag(server,dimension,'divine_oracle_button_ten') &&
      stationHasTag(server,dimension,'divine_oracle_button_preview') &&
      stationHasTag(server,dimension,'divine_oracle_button_collection') &&
      stationHasTag(server,dimension,'divine_oracle_action_single') &&
      stationHasTag(server,dimension,'divine_oracle_action_ten') &&
      stationHasTag(server,dimension,'divine_oracle_action_preview') &&
      stationHasTag(server,dimension,'divine_oracle_action_collection')
  } else if (data && dimension) {
    complete =
      stationHasTag(server,dimension,'divine_history_page') &&
      stationHasTag(server,dimension,'divine_history_button_server') &&
      stationHasTag(server,dimension,'divine_history_button_personal') &&
      stationHasTag(server,dimension,'divine_history_button_recent') &&
      stationHasTag(server,dimension,'divine_history_action_server')
  }
  return {
    enabled:data ? data.enabled : false,
    dimension:dimension,
    backend:data ? data.backend : '',
    layout:data ? data.layout : 0,
    ui:visual,
    interaction:interaction,
    complete:complete
  }
}

function stationTeleportAdmin(player,type) {
  if (!player || !player.server) return false
  var data = stationData(player.server,type)
  if (!data || !data.enabled || !data.dimension) return false

  // V9.5 CPU 安全：管理员快捷传送不再跨维度、也不允许瞬间跳到很远的未加载区域。
  // 这条命令只是便利功能，不值得为了它强制同步加载新区块。
  var currentDimension = stationDimension(player)
  if (currentDimension != data.dimension) {
    stationTell(player,{text:'为了避免同步加载远端区块，V9.5 已禁止投影大厅的跨维度快捷传送。',color:'yellow'})
    return false
  }
  var pos = stationPlayerPosition(player)
  var dx = pos.x - data.x
  var dz = pos.z - data.z
  if (dx * dx + dz * dz > 65536) {
    stationTell(player,{text:'大厅距离超过 256 格。V9.5 为了 CPU 安全拒绝这次快捷传送，请正常移动或使用你确认安全的传送方式。',color:'yellow'})
    return false
  }

  player.server.runCommandSilent(
    'tp ' + player.username + ' ' + stationFormatNumber(data.x) + ' ' + stationFormatNumber(data.y - 1.2) + ' ' + stationFormatNumber(data.z)
  )
  return true
}

function stationSelfTest(player) {
  if (!player || !player.server) return false
  var server = player.server
  var placement = stationPlacement(player,'front')
  stationEliteDelete(server,STATION_ELITE_IDS.test,player)
  stationKillTag(server,placement.dimension,'divine_station_test')

  var eliteOk = stationEliteCreateText(
    server,placement.dimension,placement.x,placement.y + 1.45,placement.z,
    STATION_ELITE_IDS.test,'&a&l✓ Elite Holograms 标题测试成功',player
  )

  stationSpawnTextDisplay(server,placement.dimension,placement.x,placement.y + 0.45,placement.z,
    ['divine_station_test','divine_station_test_button'],
    [{text:'  ◆  右键这里测试虚拟按钮  ',color:'aqua',bold:true}],1.06,300,0)
  stationSpawnInteraction(server,placement.dimension,placement.x,placement.y + 0.45,placement.z,
    'divine_station_test','divine_station_action_test',2.8,0.50)

  stationTell(player,[
    {text:'✦ 投影自检\n',color:'gold',bold:true},
    {text:'Elite 标题：' + (eliteOk ? '通过' : '失败，正式大厅会自动使用 text_display 标题') + '\n',color:eliteOk ? 'green' : 'yellow'},
    {text:'面前已生成 10 秒测试按钮；右键后若收到成功提示，交互层正常。',color:'aqua'}
  ])

  server.scheduleInTicks(200,function () {
    stationEliteDelete(server,STATION_ELITE_IDS.test,player)
    stationKillTag(server,placement.dimension,'divine_station_test')
  })
  return true
}

function stationTargetHasTag(target,tag) {
  if (!target || !tag) return false
  try { if (target.tags && target.tags.contains && target.tags.contains(tag)) return true } catch (ignored) {}
  try { if (target.getTags && target.getTags().contains(tag)) return true } catch (ignored2) {}
  try { return String(target.nbt).indexOf(tag) >= 0 } catch (ignored3) { return false }
}

function stationInteractionAction(target) {
  if (!target) return ''
  var targetType = ''
  try { targetType = String(target.type) } catch (ignored) {}
  if (targetType.indexOf('interaction') < 0) return ''
  var tags = [
    'divine_oracle_action_single','divine_oracle_action_ten','divine_oracle_action_preview','divine_oracle_action_collection',
    'divine_history_action_server','divine_history_action_personal','divine_history_action_recent',
    'divine_station_action_test'
  ]
  var i = 0
  for (i = 0; i < tags.length; i++) if (stationTargetHasTag(target,tags[i])) return tags[i]
  return ''
}

function stationPruneCooldowns() {
  while (stationClickOrder.length > 160) {
    var oldest = stationClickOrder.shift()
    delete stationClickCooldown[oldest]
  }
}

function stationCanClick(player,action) {
  if (!player) return false
  var key = String(player.username) + ':' + action
  var now = Date.now()
  var last = stationClickCooldown[key] || 0
  var cooldown = action == 'divine_oracle_action_single' || action == 'divine_oracle_action_ten' ? DIVINE_STATION_DRAW_COOLDOWN_MS : DIVINE_STATION_CLICK_COOLDOWN_MS
  if (now - last < cooldown) return false
  stationClickCooldown[key] = now
  stationClickOrder.push(key)
  stationPruneCooldowns()
  return true
}

function stationDisplayPress(server,type,key) {
  if (!server || !type || !key || !STATION_BUTTON_TAGS[key] || !STATION_BUTTON_TEXT[key]) return
  var data = stationData(server,type)
  if (!data || !data.enabled || !data.dimension) return
  stationDynamicTextCommand(server,data.dimension,STATION_BUTTON_TAGS[key],STATION_BUTTON_TEXT[key].pressed)
  server.scheduleInTicks(8,function () {
    var latest = stationData(server,type)
    if (!latest || !latest.enabled || !latest.dimension) return
    stationDynamicTextCommand(server,latest.dimension,STATION_BUTTON_TAGS[key],STATION_BUTTON_TEXT[key].normal)
  })
}

function stationClickSound(player,pitch) {
  if (!player || !player.server) return
  player.server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:ui.button.click player ' + player.username + ' ~ ~ ~ 0.72 ' + (pitch || 1.0))
}

function stationPlayerDrawEffect(player,ten) {
  if (!player || !player.server) return
  var name = String(player.username)
  player.server.runCommandSilent('title ' + name + ' actionbar {"text":"' + (ten ? '十道命线正在离开匣底……' : '一根命线正在收束……') + '","color":"' + (ten ? 'gold' : 'aqua') + '","italic":true}')
  player.server.runCommandSilent('execute at ' + name + ' run playsound minecraft:block.enchantment_table.use player ' + name + ' ~ ~ ~ 0.72 ' + (ten ? '0.74' : '0.92'))
  player.server.runCommandSilent('execute at ' + name + ' run particle minecraft:enchant ~ ~1 ~ 0.38 0.55 0.38 0.04 ' + (ten ? '30' : '14') + ' force ' + name)
}

function stationRunPlayerCommand(player,command) {
  if (!player || !player.server) return
  player.server.runCommandSilent('execute as ' + player.username + ' run ' + command)
}

ItemEvents.entityInteracted(function (event) {
  try {
    var player = event.player
    var target = event.target
    if (!player || !target) return
    var hand = String(event.hand || '').toLowerCase()
    if (hand.indexOf('off') >= 0) return
    var action = stationInteractionAction(target)
    if (!action || !stationCanClick(player,action)) return
    try { event.cancel() } catch (ignored) {}

    if (action == 'divine_station_action_test') {
      stationClickSound(player,1.35)
      player.tell(Text.green('✓ 投影按钮热区正常：右键事件已被服务器收到。'))
      return
    }
    if (action == 'divine_oracle_action_single') {
      stationClickSound(player,1.25)
      stationDisplayPress(player.server,'oracle','oracleSingle')
      stationPlayerDrawEffect(player,false)
      if (global.oracleSingleRoll && typeof global.oracleSingleRoll == 'function') global.oracleSingleRoll(player,false)
      else player.tell(Text.red('旧匣脚本尚未加载。'))
      return
    }
    if (action == 'divine_oracle_action_ten') {
      stationClickSound(player,0.92)
      stationDisplayPress(player.server,'oracle','oracleTen')
      stationPlayerDrawEffect(player,true)
      if (global.oracleDrawTen && typeof global.oracleDrawTen == 'function') global.oracleDrawTen(player)
      else player.tell(Text.red('旧匣脚本尚未加载。'))
      return
    }
    if (action == 'divine_oracle_action_preview') {
      stationClickSound(player,1.08)
      stationDisplayPress(player.server,'oracle','oraclePreview')
      if (global.oraclePreview && typeof global.oraclePreview == 'function') global.oraclePreview(player)
      else stationRunPlayerCommand(player,'oracle preview')
      return
    }
    if (action == 'divine_oracle_action_collection') {
      stationClickSound(player,1.16)
      stationDisplayPress(player.server,'oracle','oracleCollection')
      if (global.oracleCollection && typeof global.oracleCollection == 'function') global.oracleCollection(player)
      else stationRunPlayerCommand(player,'oracle collection')
      return
    }
    if (action == 'divine_history_action_server') {
      stationClickSound(player,1.05)
      stationDisplayPress(player.server,'history','historyServer')
      if (global.historyShowServerRecords && typeof global.historyShowServerRecords == 'function') global.historyShowServerRecords(player)
      else stationRunPlayerCommand(player,'history server')
      return
    }
    if (action == 'divine_history_action_personal') {
      stationClickSound(player,1.18)
      stationDisplayPress(player.server,'history','historyPersonal')
      if (global.historyShowOverview && typeof global.historyShowOverview == 'function') global.historyShowOverview(player)
      else stationRunPlayerCommand(player,'history')
      return
    }
    if (action == 'divine_history_action_recent') {
      stationClickSound(player,1.32)
      stationDisplayPress(player.server,'history','historyRecent')
      if (global.historyShowWorldRecent && typeof global.historyShowWorldRecent == 'function') global.historyShowWorldRecent(player)
      else stationRunPlayerCommand(player,'history recent')
    }
  } catch (error) {
    console.log('[DivineStations] Interaction failed: ' + error)
  }
})

function stationPulse(server,token) {
  if (!server) return
  if (server.persistentData.getString('divineStationPulseToken') != token) {
    stationPulseRunning = false
    return
  }
  var anyEnabled = stationEnabled(server,'oracle') || stationEnabled(server,'history')
  if (!anyEnabled) {
    stationPulseRunning = false
    return
  }
  if (stationPlayerCount(server) > 0) {
    if (stationEnabled(server,'oracle')) stationRotateOracleSideLanes(server,false)
    if (stationEnabled(server,'history')) stationRotateHistory(server,false)
  }
  server.scheduleInTicks(DIVINE_STATION_ROTATE_TICKS,function () { stationPulse(server,token) })
}

function stationStartPulse(server) {
  if (!server || stationPulseRunning) return
  stationPulseRunning = true
  stationPulseToken = String(Date.now()) + '_' + Math.floor(Math.random() * 1000000)
  server.persistentData.putString('divineStationPulseToken',stationPulseToken)
  server.scheduleInTicks(DIVINE_STATION_ROTATE_TICKS,function () { stationPulse(server,stationPulseToken) })
}

function stationCleanupRemovedModelShowcase(server) {
  if (!server) return false
  var key='divineStation_model_showcase_removed_cleanup'
  try { if (server.persistentData.getInt(key) >= 10814) return true } catch (ignoredDone) {}

  // V10.8.14 只保留这一段迁移清理：删除旧世界已经生成的假人/展柜残留。
  // 之后不会再生成、同步、保护或控制任何模型展示实体。
  try { server.runCommandSilent('fakeplayer remove OracleShowcase') } catch (ignoredOracle) {}
  var i=1
  for(i=1;i<=99;i++){
    var suffix=(i<10?'0':'')+i
    try { server.runCommandSilent('fakeplayer remove OracleYSM'+suffix) } catch (ignoredYsm) {}
  }
  try { server.runCommandSilent('lwd_showcase clear') } catch (ignoredLegacyMod) {}
  try { server.runCommandSilent('team remove divine_showcase') } catch (ignoredTeam) {}

  var dims=stationLoadedDimensions(server),d=0
  for(d=0;d<dims.length;d++){
    try { stationKillTag(server,dims[d],'divine_showcase_bot') } catch (ignoredBotTag) {}
    try { stationKillTag(server,dims[d],'divine_oracle_ysm_text') } catch (ignoredYsmText) {}
  }
  try { server.persistentData.putInt(key,10814) } catch (ignoredWrite) {}
  console.log('[DivineStations] V10.8.14 removed-model-showcase cleanup completed. No showcase runtime remains.')
  return true
}


function stationCleanupRetiredLobbyImage(server) {
  if(!server)return false
  var key='divineStation_dynamic_image_retired_cleanup'
  try{if(server.persistentData.getInt(key)>=10816)return true}catch(ignoredDone){}
  try{server.persistentData.putBoolean('luokixiLobbyImage_enabled',false)}catch(ignoredDisable){}
  var dims=stationLoadedDimensions(server),i=0
  for(i=0;i<dims.length;i++){
    try{stationKillTag(server,dims[i],'luokixi_lobby_dynamic_image')}catch(ignoredKill){}
  }
  try{server.persistentData.putInt(key,10816)}catch(ignoredWrite){}
  console.log('[DivineStations] V10.8.16 retired lobby-image cleanup completed.')
  return true
}

function stationBootstrap(server) {
  if (!server || stationBootstrapped) return
  stationBootstrapped = true
  try {
    stationCleanupRemovedModelShowcase(server)
    stationCleanupRetiredLobbyImage(server)
    if (stationEnabled(server,'oracle')) stationSpawnOracle(server)
    if (stationEnabled(server,'history')) stationSpawnHistory(server)
    stationStartPulse(server)
  } catch (error) {
    console.log('[DivineStations] Bootstrap failed: ' + error)
  }
}

console.log('[DivineStations] V10.8.16 mystery-gallery loaded: outfits hidden from display; lanes=forbidden/relic/companion; image interface retired.')

ServerEvents.loaded(function (event) {
  if (!event.server) return
  event.server.scheduleInTicks(80,function () { stationBootstrap(event.server) })
})

global.divineStationSet = stationSet
global.divineStationRemove = stationRemove
global.divineStationPurgeAll = stationPurgeAll
global.divineStationSpawnOracle = function (server,actor) { return stationSpawnOracle(server,actor) }
global.divineStationSpawnHistory = function (server,actor) { return stationSpawnHistory(server,actor) }
global.divineStationRefreshHistory = stationRefreshHistory
global.divineStationData = stationData
global.divineStationHealth = stationHealth
global.divineStationDependencies = stationDependencyState
global.divineStationSelfTest = stationSelfTest
global.divineStationTeleportAdmin = stationTeleportAdmin
global.divineStationProjectReward = stationProjectReward
global.divineStationPlayRarityFx = stationPlayRarityFx
global.divineStationProjectDemo = stationProjectDemo
global.divineStationRewardDisplayItem = stationRewardDisplayItem
global.divineStationNext = function (server,type) {
  if (type == 'oracle') return stationRotateOracle(server,true)
  if (type == 'history') return stationRotateHistory(server,true)
  return false
}
