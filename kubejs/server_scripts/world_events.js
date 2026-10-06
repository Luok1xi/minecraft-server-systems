// ============================================================
// 神谕事件核心 V3.4.3 · 诸神纪事 · DIRECT LOAD PROOF
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 低负载原则：
// - 整套事件系统只有本文件拥有 ServerEvents.tick
// - 每 10 秒检查一次日期与揭示时刻
// - 延迟演出使用最小堆；未到期时只查看堆顶
// - 没有结构搜索、结构定位命令、持续实体扫描或持续背包扫描
// - 连续两个 20 秒窗口明显超时后自动进入安全模式
// ============================================================

var DIVINE_SCHEMA_VERSION = 5
var DIVINE_CHECK_INTERVAL = 200
var DIVINE_GUARD_INTERVAL = 400
var DIVINE_SLOW_WINDOW_MS = 30000
var DIVINE_RECENT_SIZE = 3
var DIVINE_MAX_PEACEFUL_STREAK = 2

// 独立使用 Java 随机源，避免任何脚本环境/全局 Math.random 异常影响事件抽签。
var DivineThreadLocalRandom = Java.loadClass('java.util.concurrent.ThreadLocalRandom')
console.log('[DivineEvents] V3.4.3 DIRECT_FIX_LOADED - maxPeaceful=2, rng=ThreadLocalRandom, drawDiagnostics=on')

var divineRuntimeTick = 0
var divineCheckTick = 0
var divineGuardTick = 0
var divineLastGuardMs = Date.now()
var divineLastWindowMs = 0
var divineSlowWindows = 0

// 以执行时刻排序的最小堆。
var divineMessageHeap = []

// ============================================================
// 诸神纪事
//
// 文案借鉴经典世界事件的结构：
// - 先给一句能被记住的征兆
// - 再给一句神祇判词
// - 具体效果由事件脚本单独说明
// ============================================================

var DIVINE_EVENTS = [
  {
    id:'peaceful',
    deity:'闭目的众神',
    name:'无谕之日',
    type:'peaceful',
    weight:26,
    cooldown:0,
    heavy:false,
    start:'',
    cleanup:'',
    omen:'诸神没有开口。钟楼照旧报时，炉火照旧索要木柴。',
    decree:'',
    ending:'',
    sound:'minecraft:block.amethyst_block.chime',
    titleColor:'gray'
  },
  {
    id:'rain_harvest',
    deity:'雨母 · 麦穗与长桌的女主人维尔娜',
    name:'雨母的赞许 · 丰收之日',
    type:'day',
    weight:12,
    cooldown:2,
    heavy:false,
    start:'startHarvestDay',
    cleanup:'cleanupHarvestDay',
    omen:'鸡鸣以前，屋檐落了三滴雨。院中的尘土却没有一点湿痕。',
    decree:'维尔娜把麦穗数了三遍，也替远行未归的人摆好了碗。海那边的弟弟奈瑞昂送来一点潮气，长桌今天不会缺水。',
    ending:'最后一滴雨从麦芒上滑落。长桌仍在，只是那把空椅已经不见了。',
    sound:'minecraft:weather.rain.above',
    titleColor:'aqua'
  },
  {
    id:'wind_road',
    deity:'风王 · 七路与无门之主埃奥伦',
    name:'风王的平等赞许 · 七路之日',
    type:'day',
    weight:10,
    cooldown:1,
    heavy:false,
    start:'startWindBlessing',
    cleanup:'cleanupWindBlessing',
    omen:'城门上的七面旧旗同时转向一条并不存在的路。',
    decree:'埃奥伦不问姓名，也不看靴子贵贱。今日，他把同一阵风送给每一个离门远去的人。',
    ending:'最后一面旗垂了下来。路又恢复了原来的长度。',
    sound:'minecraft:item.elytra.flying',
    titleColor:'white'
  },
  {
    id:'sea_bounty',
    deity:'潮王 · 沉船与深水之主奈瑞昂',
    name:'潮王的回赠 · 深水之日',
    type:'day',
    weight:10,
    cooldown:1,
    heavy:false,
    start:'startWaterBlessing',
    cleanup:'cleanupWaterBlessing',
    omen:'井绳无声自沉；岸边的空钩却从水里带回一枚发黑的旧铜币。',
    decree:'奈瑞昂从沉船的口袋里摸出几件遗失之物。雨母总说他把好东西藏得太深；今天，他难得愿意往岸上送一点。',
    ending:'井水退回旧刻度。深水重新闭口，像从未许诺过什么。',
    sound:'minecraft:block.conduit.activate',
    titleColor:'aqua'
  },
  {
    id:'fire_hearth',
    deity:'炉神 · 最后一炉的守望者赫斯塔尔',
    name:'炉神的收容 · 不燃之日',
    type:'day',
    weight:8,
    cooldown:2,
    heavy:false,
    start:'startFireBlessing',
    cleanup:'cleanupFireBlessing',
    omen:'冷灰里亮起一颗红点，像有人在炉膛深处睁开了眼。',
    decree:'赫斯塔尔认得烧伤，也认得守夜的人。她那个总想把火放出去的弟弟今天不在炉边，火焰会老实一些。',
    ending:'红点在灰里熄灭。火又变回了只认木柴的东西。',
    sound:'minecraft:block.respawn_anchor.charge',
    titleColor:'gold'
  },
  {
    id:'earth_migration',
    deity:'土父 · 背负山脉的沉睡者泰尔莫恩',
    name:'土父翻身 · 大迁徙',
    type:'day',
    weight:6,
    cooldown:3,
    heavy:true,
    start:'startMigration',
    cleanup:'cleanupMigration',
    omen:'杯中清水起了细纹，马厩里的兽却在同一刻抬起头。',
    decree:'泰尔莫恩在地底翻了个身，背上的群兽便改道而行。更深处，奈瑟也跟着醒了一瞬——父亲翻身时，最沉默的孩子总会先听见。',
    ending:'蹄声越过地平线。山脉重新睡熟，地上的路也不再颤动。',
    sound:'minecraft:entity.horse.gallop',
    titleColor:'dark_green'
  },
  {
    id:'sun_labor',
    deity:'日王 · 戴金冠者索拉恩',
    name:'日王的嘉奖 · 金辉之日',
    type:'day',
    weight:8,
    cooldown:1,
    heavy:false,
    start:'startSunBlessing',
    cleanup:'cleanupSunBlessing',
    omen:'第一束光落在铁器上，连未曾打磨的刃也亮了一下。',
    decree:'索拉恩从不替人举锤。他只让肯举锤的人少流一些汗。等太阳落下，他会把剩下的路交给露娜娅。',
    ending:'金冠沉到山后。工具重新有了重量，影子也回到脚边。',
    sound:'minecraft:block.beacon.activate',
    titleColor:'yellow'
  },
  {
    id:'death_blood_moon',
    deity:'死神 · 最后名字的保管者莫尔维恩',
    name:'死神的点名 · 血月',
    type:'night',
    weight:6,
    cooldown:4,
    heavy:true,
    start:'startBloodMoon',
    cleanup:'cleanupBloodMoon',
    omen:'钟楼里没有人，钟却响了一声。月亮从云后出来，红得像刚洗过的刀。',
    decree:'莫尔维恩翻开名册，蘸墨时没有抬头。红月升起以后，他会再数一遍活人。',
    ending:'红色从月面退去。莫尔维恩吹干墨迹，合上了名册。',
    sound:'minecraft:entity.elder_guardian.curse',
    titleColor:'dark_red'
  },
  {
    id:'abyss_cave_night',
    deity:'渊神 · 岩层之下的聆听者奈瑟',
    name:'渊神的第二声 · 洞穴之夜',
    type:'night',
    weight:6,
    cooldown:3,
    heavy:true,
    start:'startCaveNight',
    cleanup:'cleanupCaveNight',
    omen:'矿井里传来第二双靴子的声音。你停下，它仍向前走了三步。',
    decree:'奈瑟只问一次。他住在土父第一次裂开的最深处。若你在岩层之下听见自己的名字，回应与否，都算一种回答。',
    ending:'第二双靴子终于停下。岩层里只剩你自己的呼吸。',
    sound:'minecraft:block.sculk_shrieker.shriek',
    titleColor:'dark_aqua'
  },

  {
    id:'abyss_gaze',
    deity:'渊神 · 岩层之下的聆听者奈瑟',
    name:'渊神的凝视',
    type:'night',
    weight:4,
    cooldown:3,
    heavy:true,
    start:'startAbyssGaze',
    cleanup:'cleanupAbyssGaze',
    omen:'墙后没有脚步，只有某种注视沿着石缝慢慢移动。',
    decree:'奈瑟没有命令你回头。祂只留下一个可以回应的空位。',
    ending:'石缝里的目光退远，像从未真正睁开过。',
    sound:'minecraft:entity.warden.heartbeat',
    titleColor:'dark_aqua'
  },
  {
    id:'abyss_hunt',
    deity:'渊神 · 岩层之下的聆听者奈瑟',
    name:'深渊狩猎',
    type:'night',
    weight:4,
    cooldown:3,
    heavy:true,
    start:'startAbyssHunt',
    cleanup:'cleanupAbyssHunt',
    omen:'你停下脚步以后，远处仍有东西按你的步幅继续向前。',
    decree:'奈瑟把“猎物”写在一块没有正面的石片上。回应以后，九十秒都算祂的狩猎时间。',
    ending:'追猎的脚步慢慢沉回岩层。',
    sound:'minecraft:block.sculk_sensor.clicking_stop',
    titleColor:'dark_aqua'
  },
  {
    id:'abyss_ritual',
    deity:'渊神 · 岩层之下的聆听者奈瑟',
    name:'深渊祭礼',
    type:'night',
    weight:3,
    cooldown:4,
    heavy:true,
    start:'startAbyssRitual',
    cleanup:'cleanupAbyssRitual',
    omen:'地上多了一圈没有人画过的灰，正中央什么也没有。',
    decree:'祭礼不需要祭坛，只需要有人愿意回答最后一个问题。',
    ending:'灰圈被风吹散，最后一个位置重新空了出来。',
    sound:'minecraft:block.sculk_shrieker.shriek',
    titleColor:'dark_aqua'
  },
  {
    id:'void_mother_challenge',
    deity:'虚空之母 · 无名的外侧',
    name:'虚空之母',
    type:'night',
    weight:3,
    cooldown:5,
    heavy:true,
    start:'startVoidMotherChallenge',
    cleanup:'cleanupVoidMotherChallenge',
    omen:'天空缺了一小块。你眨眼以后，那块缺口已经换了位置。',
    decree:'她不会征求同意。今晚，在线者中会有一个名字被虚空直接挑出来。',
    ending:'缺口闭合，世界又假装自己从未少过一块。',
    sound:'minecraft:block.end_portal.spawn',
    titleColor:'dark_purple'
  },
  {
    id:'ancient_bell',
    deity:'古代的丧钟',
    name:'古代的丧钟',
    type:'night',
    weight:3,
    cooldown:5,
    heavy:true,
    start:'startAncientBell',
    cleanup:'cleanupAncientBell',
    omen:'一口不存在于地图上的钟响了两下，第三下迟迟没有落下。',
    decree:'第三下只为回应者而响。沉默不会召来任何东西。',
    ending:'钟舌停住，地下重新只剩普通的回声。',
    sound:'minecraft:block.bell.resonate',
    titleColor:'dark_blue'
  },
  {
    id:'war_trial',
    deity:'斗神 · 未败者与断剑之主瓦尔卡恩',
    name:'斗神的铁誓 · 战意之夜',
    type:'night',
    weight:9,
    cooldown:2,
    heavy:false,
    start:'startWarBlessing',
    cleanup:'cleanupWarBlessing',
    omen:'鞘里的旧剑轻轻一响，像在梦里碰见了从前的敌人。',
    decree:'瓦尔卡恩不记胜者，只记第二次举剑的人。远处若有雷声，那多半是他的弟弟又在替铁册盖章。',
    ending:'远处的战鼓停了。瓦尔卡恩把铁册收进披风，没有宣读任何名字。',
    sound:'minecraft:block.anvil.land',
    titleColor:'red'
  },
  {
    id:'moon_silver',
    deity:'月后 · 失重与旧梦的女主人露娜娅',
    name:'月后的银纱 · 无坠之夜',
    type:'night',
    weight:7,
    cooldown:1,
    heavy:false,
    start:'startMoonBlessing',
    cleanup:'cleanupMoonBlessing',
    omen:'月光落在井口，水中却没有月亮。崖边一颗碎石迟迟不肯坠下。',
    decree:'露娜娅接过索拉恩留下的天幕，把银纱分给夜行者。她记得白天没来得及说完的事；今夜，黑暗会退远，坠落也会迟疑。',
    ending:'银纱从屋脊上收走。影子重新变深，石头也记起了坠落。',
    sound:'minecraft:block.amethyst_block.chime',
    titleColor:'light_purple'
  }
]

// 对外只使用一套简短名称；内部 ID 仍保持稳定。
var DIVINE_EVENT_ALIASES = {
  rain:'rain_harvest',
  wind:'wind_road',
  water:'sea_bounty',
  fire:'fire_hearth',
  earth:'earth_migration',
  sun:'sun_labor',
  blood:'death_blood_moon',
  cave:'abyss_cave_night',
  gaze:'abyss_gaze',
  hunt:'abyss_hunt',
  ritual:'abyss_ritual',
  voidmother:'void_mother_challenge',
  bell:'ancient_bell',
  war:'war_trial',
  moon:'moon_silver',
  calm:'peaceful'
}

function divineDataHas(data, key) {
  try { return data.contains(key) } catch (error) { return false }
}

function divineEnsureState(server) {
  if (!server) return

  var data = server.persistentData
  var schema = data.getInt('divineSchemaVersion')

  if (schema >= DIVINE_SCHEMA_VERSION) return

  data.putInt('divineSchemaVersion', DIVINE_SCHEMA_VERSION)
  data.putBoolean('divineEventsEnabled', false)
  data.putBoolean('divineSafeMode', true)
  data.putInt('divineDay', -1)
  data.putString('divineEventId', 'peaceful')
  data.putString('divineActiveEventId', '')
  data.putBoolean('divineRevealed', true)
  data.putInt('divineRunId', data.getInt('divineRunId') + 1)
  data.putString('divineRecentEvents', '')
  data.putInt('divinePeacefulStreak', 0)

  data.putBoolean('harvestDayActive', false)
  data.putBoolean('windBlessingActive', false)
  data.putBoolean('waterBlessingActive', false)
  data.putBoolean('fireBlessingActive', false)
  data.putBoolean('migrationActive', false)
  data.putBoolean('sunBlessingActive', false)
  data.putBoolean('bloodMoonActive', false)
  data.putBoolean('caveNightActive', false)
  data.putBoolean('warBlessingActive', false)
  data.putBoolean('moonBlessingActive', false)

  console.log('[DivineEvents] Schema V5 installed; automatic events OFF / safe mode ON')
}

function divineGetOverworld(server) {
  return server.getLevel('minecraft:overworld')
}

function divineGetDayTime(server) {
  var level = divineGetOverworld(server)
  if (!level) return 0
  try { return Number(level.getLevelData().getDayTime()) } catch (error) { return 0 }
}

function divineGetDay(server) {
  return Math.floor(divineGetDayTime(server) / 24000)
}

function divineGetTime(server) {
  var value = divineGetDayTime(server) % 24000
  if (value < 0) value += 24000
  return value
}

function divineCanonicalEventId(id) {
  if (!id) return ''
  if (DIVINE_EVENT_ALIASES[id]) return DIVINE_EVENT_ALIASES[id]
  return id
}

function divineFindEvent(id) {
  var canonical = divineCanonicalEventId(id)
  var i = 0

  for (i = 0; i < DIVINE_EVENTS.length; i++) {
    if (DIVINE_EVENTS[i].id == canonical) return DIVINE_EVENTS[i]
  }

  return null
}

// ============================================================
// 最小堆消息队列
// ============================================================

function divineHeapSwap(a, b) {
  var temporary = divineMessageHeap[a]
  divineMessageHeap[a] = divineMessageHeap[b]
  divineMessageHeap[b] = temporary
}

function divineHeapPush(entry) {
  divineMessageHeap.push(entry)
  var index = divineMessageHeap.length - 1

  while (index > 0) {
    var parent = Math.floor((index - 1) / 2)
    if (divineMessageHeap[parent].at <= divineMessageHeap[index].at) break
    divineHeapSwap(parent, index)
    index = parent
  }
}

function divineHeapPop() {
  if (divineMessageHeap.length <= 0) return null

  var root = divineMessageHeap[0]
  var last = divineMessageHeap.pop()

  if (divineMessageHeap.length > 0) {
    divineMessageHeap[0] = last
    var index = 0

    while (true) {
      var left = index * 2 + 1
      var right = left + 1
      var smallest = index

      if (left < divineMessageHeap.length && divineMessageHeap[left].at < divineMessageHeap[smallest].at) smallest = left
      if (right < divineMessageHeap.length && divineMessageHeap[right].at < divineMessageHeap[smallest].at) smallest = right
      if (smallest == index) break

      divineHeapSwap(index, smallest)
      index = smallest
    }
  }

  return root
}

function divineQueueTell(server, target, delay, json) {
  if (!server) return

  var runId = server.persistentData.getInt('divineRunId')
  if (delay < 1) delay = 1

  divineHeapPush({
    at:divineRuntimeTick + delay,
    runId:runId,
    target:target,
    json:JSON.stringify(json),
    command:''
  })
}

function divineQueueCommand(server, delay, command) {
  if (!server) return

  var runId = server.persistentData.getInt('divineRunId')
  if (delay < 1) delay = 1

  divineHeapPush({
    at:divineRuntimeTick + delay,
    runId:runId,
    target:'',
    json:'',
    command:command
  })
}

function divineClearQueue() {
  divineMessageHeap = []
}

function divineProcessQueue(server) {
  if (!server || divineMessageHeap.length <= 0) return

  var runId = server.persistentData.getInt('divineRunId')

  while (divineMessageHeap.length > 0 && divineMessageHeap[0].at <= divineRuntimeTick) {
    var entry = divineHeapPop()
    if (!entry || entry.runId != runId) continue

    try {
      if (entry.command && entry.command.length > 0) server.runCommandSilent(entry.command)
      else server.runCommandSilent('tellraw ' + entry.target + ' ' + entry.json)
    } catch (error) {
      console.log('[DivineEvents] Queue error: ' + error)
    }
  }
}

// ============================================================
// 随机、冷却与历史
// ============================================================

function divineGetRecent(server) {
  var raw = server.persistentData.getString('divineRecentEvents')
  if (!raw) return []

  // SELF-HEAL: 旧版本/异常存档可能留下超长 recent 列表。
  // recent 的设计目的只是防止最近 3 个非和平事件立刻重复，绝不能永久封死事件池。
  var parts = raw.split(',')
  var normalized = []
  var i = 0

  for (i = 0; i < parts.length; i++) {
    var id = divineCanonicalEventId(String(parts[i] || '').trim())
    if (!id || id == 'peaceful' || !divineFindEvent(id)) continue
    if (divineRecentContains(normalized, id)) continue
    normalized.push(id)
    if (normalized.length >= DIVINE_RECENT_SIZE) break
  }

  var clean = normalized.join(',')
  if (clean != raw) {
    server.persistentData.putString('divineRecentEvents', clean)
    console.log('[DivineEvents] Repaired recent-event history: old=' + raw + ' new=' + (clean || '<empty>'))
  }

  return normalized
}

function divineRecentContains(recent, id) {
  var i = 0
  for (i = 0; i < recent.length; i++) if (recent[i] == id) return true
  return false
}

function divineAddRecent(server, id) {
  if (id == 'peaceful') return

  var old = divineGetRecent(server)
  var next = [id]
  var i = 0

  for (i = 0; i < old.length; i++) {
    if (old[i] == id) continue
    next.push(old[i])
    if (next.length >= DIVINE_RECENT_SIZE) break
  }

  server.persistentData.putString('divineRecentEvents', next.join(','))
}

function divineOnCooldown(server, eventDef, today) {
  if (!eventDef.cooldown || eventDef.cooldown <= 0) return false

  var data = server.persistentData
  var key = 'divineLast_' + eventDef.id
  if (!divineDataHas(data, key)) return false

  var lastDay = data.getInt(key)
  var elapsed = today - lastDay

  // TIME-REWIND FIX:
  // /time set (and old /dev event day/night) can move the calendar back to Day 0.
  // A negative elapsed value must never count as an active cooldown, otherwise
  // previously seen events can remain filtered forever and only peaceful survives.
  if (elapsed < 0) {
    data.putInt(key, today - eventDef.cooldown - 1)
    console.log('[DivineEvents] Rebased stale cooldown after time rewind: ' + eventDef.id + ' last=' + lastDay + ' today=' + today)
    return false
  }

  return elapsed <= eventDef.cooldown
}

function divineGetPeacefulStreak(server) {
  var streak = server.persistentData.getInt('divinePeacefulStreak')

  // 不允许损坏/旧存档中的异常值改变抽签概率。
  if (streak < 0 || streak > 64) {
    console.log('[DivineEvents] Repaired invalid peaceful streak: ' + streak + ' -> 0')
    server.persistentData.putInt('divinePeacefulStreak', 0)
    return 0
  }

  return streak
}

function divineEventWeight(server, eventDef) {
  if (eventDef.id != 'peaceful') return eventDef.weight

  var streak = divineGetPeacefulStreak(server)
  var value = eventDef.weight - streak * 6
  if (value < 8) value = 8
  return value
}

function divineRandomUnit() {
  try {
    var value = Number(DivineThreadLocalRandom.current().nextDouble())
    if (value >= 0 && value < 1) return value
  } catch (error) {
    console.log('[DivineEvents] Java RNG failed, fallback to Math.random: ' + error)
  }

  var fallback = Number(Math.random())
  if (fallback >= 0 && fallback < 1) return fallback

  // 极端兜底：即使 JS 随机源也异常，也不要固定回落到候选池第一项。
  return (Date.now() % 1000003) / 1000003
}

function divineCandidateSummary(candidates) {
  var parts = []
  var i = 0
  for (i = 0; i < candidates.length; i++) {
    parts.push(candidates[i].definition.id + ':' + candidates[i].weight)
  }
  return parts.join('|')
}

function divineChooseEvent(server, today) {
  var safe = server.persistentData.getBoolean('divineSafeMode')
  var recent = divineGetRecent(server)
  var peacefulStreak = divineGetPeacefulStreak(server)
  var candidates = []
  var total = 0
  var i = 0

  for (i = 0; i < DIVINE_EVENTS.length; i++) {
    var definition = DIVINE_EVENTS[i]

    if (safe && definition.heavy) continue

    // PITY: 最多连续 2 个和平日。第三天起和平直接退出候选池。
    // 这既改善体验，也让任何旧状态/随机异常都不可能造成无限 peaceful。
    if (definition.id == 'peaceful' && peacefulStreak >= DIVINE_MAX_PEACEFUL_STREAK) continue

    if (definition.id != 'peaceful' && divineOnCooldown(server, definition, today)) continue
    if (definition.id != 'peaceful' && divineRecentContains(recent, definition.id)) continue

    var weight = divineEventWeight(server, definition)
    if (!(weight > 0)) continue
    candidates.push({definition:definition, weight:weight})
    total += weight
  }

  // 正常情况下永远不会触发。若旧世界状态真的把所有候选都封死，
  // 先忽略 recent（仍保留安全模式与冷却）进行一次自救。
  if (candidates.length <= 0 || !(total > 0)) {
    console.log('[DivineEvents] Candidate pool empty; retrying without recent-event filter')
    candidates = []
    total = 0

    for (i = 0; i < DIVINE_EVENTS.length; i++) {
      var rescue = DIVINE_EVENTS[i]
      if (safe && rescue.heavy) continue
      if (rescue.id == 'peaceful' && peacefulStreak >= DIVINE_MAX_PEACEFUL_STREAK) continue
      if (rescue.id != 'peaceful' && divineOnCooldown(server, rescue, today)) continue

      var rescueWeight = divineEventWeight(server, rescue)
      if (!(rescueWeight > 0)) continue
      candidates.push({definition:rescue, weight:rescueWeight})
      total += rescueWeight
    }
  }

  // 最后的保险：宁可随机一个允许的非和平事件，也不把损坏状态永久伪装成和平。
  if (candidates.length <= 0 || !(total > 0)) {
    var emergency = []
    for (i = 0; i < DIVINE_EVENTS.length; i++) {
      var e = DIVINE_EVENTS[i]
      if (e.id == 'peaceful') continue
      if (safe && e.heavy) continue
      emergency.push(e)
    }

    if (emergency.length > 0) {
      var emergencyIndex = Math.floor(divineRandomUnit() * emergency.length)
      if (emergencyIndex < 0 || emergencyIndex >= emergency.length) emergencyIndex = 0
      console.log('[DivineEvents] Emergency pool recovery selected: ' + emergency[emergencyIndex].id)
      return emergency[emergencyIndex]
    }

    return DIVINE_EVENTS[0]
  }

  var unit = divineRandomUnit()
  var initialRoll = unit * total
  var roll = initialRoll
  var selected = candidates[candidates.length - 1].definition

  for (i = 0; i < candidates.length; i++) {
    roll -= candidates[i].weight
    if (roll <= 0) {
      selected = candidates[i].definition
      break
    }
  }

  console.log(
    '[DivineEvents] Draw day=' + today +
    ' safe=' + safe +
    ' streak=' + peacefulStreak +
    ' recent=' + (recent.join(',') || '<none>') +
    ' total=' + total +
    ' rng=' + unit.toFixed(6) +
    ' roll=' + initialRoll.toFixed(3) +
    ' pool=' + divineCandidateSummary(candidates) +
    ' => ' + selected.id
  )

  return selected
}

// ============================================================
// 生命周期
// ============================================================

function divineInvoke(name, server) {
  if (!name) return true

  try {
    if (global[name] && typeof global[name] == 'function') {
      global[name](server)
      return true
    }
  } catch (error) {
    console.log('[DivineEvents] ' + name + ' failed: ' + error)
  }

  return false
}

function divineAnnounceEnding(server, definition) {
  if (!server || !definition || !definition.ending) return

  server.runCommandSilent(
    'tellraw @a ' +
    JSON.stringify([
      {text:'✦ ',color:definition.titleColor || 'gray'},
      {text:definition.ending,color:'gray',italic:true}
    ])
  )
}

function divineCleanupCurrent(server, announceEnding) {
  if (!server) return

  var data = server.persistentData
  var activeId = data.getString('divineActiveEventId')
  if (!activeId) return

  var definition = divineFindEvent(activeId)
  if (definition) {
    divineInvoke(definition.cleanup, server)
    if (announceEnding) divineAnnounceEnding(server, definition)
  }

  data.putString('divineActiveEventId', '')
}

function divineAnnounce(server, definition) {
  if (!server || !definition || definition.id == 'peaceful') return

  var color = definition.titleColor || (definition.heavy ? 'red' : 'gold')

  // 第一幕：神名与神谕名。
  divineQueueTell(server, '@a', 1, [
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
    {text:definition.name + '\n',color:color,bold:true},
    {text:definition.deity,color:'dark_gray',italic:true}
  ])

  // 第二幕：异常征兆。
  divineQueueTell(server, '@a', 52, [
    {text:'“' + definition.omen + '”',color:'gray',italic:true}
  ])

  // 第三幕：神祇判词。
  divineQueueTell(server, '@a', 112, [
    {text:definition.decree + '\n',color:color},
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
  ])

  divineQueueCommand(
    server,
    2,
    'execute as @a at @s run playsound ' + definition.sound + ' player @s ~ ~ ~ 0.70 1'
  )
}

function divineStartDefinition(server, definition, force) {
  if (!server || !definition) return false

  var data = server.persistentData

  if (definition.id == 'peaceful') {
    data.putString('divineActiveEventId', '')
    return true
  }

  if (definition.heavy && data.getBoolean('divineSafeMode') && !force) {
    console.log('[DivineEvents] Heavy event skipped in safe mode: ' + definition.id)
    return false
  }

  data.putString('divineActiveEventId', definition.id)
  divineAnnounce(server, definition)

  var started = divineInvoke(definition.start, server)
  if (!started) data.putString('divineActiveEventId', '')
  return started
}

function divinePrepareDay(server) {
  divineEnsureState(server)

  var data = server.persistentData
  var today = divineGetDay(server)

  if (data.getInt('divineDay') == today) return

  divineCleanupCurrent(server, true)
  divineClearQueue()
  data.putInt('divineRunId', data.getInt('divineRunId') + 1)
  data.putInt('divineDay', today)

  if (!data.getBoolean('divineEventsEnabled')) {
    data.putString('divineEventId', 'peaceful')
    data.putBoolean('divineRevealed', true)
    return
  }

  var selected = divineChooseEvent(server, today)
  data.putString('divineEventId', selected.id)
  data.putBoolean('divineRevealed', false)

  if (selected.id == 'peaceful') {
    data.putInt('divinePeacefulStreak', data.getInt('divinePeacefulStreak') + 1)
  } else {
    data.putInt('divinePeacefulStreak', 0)
    data.putInt('divineLast_' + selected.id, today)
    divineAddRecent(server, selected.id)
  }

  console.log('[DivineEvents] Day ' + today + ' prepared: ' + selected.id)
}

function divineRevealIfNeeded(server) {
  var data = server.persistentData
  if (data.getBoolean('divineRevealed')) return

  var definition = divineFindEvent(data.getString('divineEventId'))
  if (!definition || definition.id == 'peaceful') {
    data.putBoolean('divineRevealed', true)
    return
  }

  var time = divineGetTime(server)
  var ready = false

  if (definition.type == 'day' && time >= 200 && time < 11800) ready = true
  if (definition.type == 'night' && time >= 12500 && time < 23000) ready = true
  if (!ready) return

  data.putBoolean('divineRevealed', true)
  divineStartDefinition(server, definition, false)
}

function divineForceStartEvent(server, id) {
  if (!server) return false

  divineEnsureState(server)

  var definition = divineFindEvent(id)
  if (!definition) return false

  var data = server.persistentData
  divineCleanupCurrent(server, false)
  divineClearQueue()
  data.putInt('divineRunId', data.getInt('divineRunId') + 1)
  data.putString('divineEventId', definition.id)
  data.putBoolean('divineRevealed', true)

  return divineStartDefinition(server, definition, true)
}

function divineReplayCurrentEvent(server) {
  if (!server) return false

  var id = server.persistentData.getString('divineActiveEventId')
  var definition = divineFindEvent(id)
  if (!definition) return false

  divineAnnounce(server, definition)
  return true
}

function divineStopCurrentEvent(server) {
  if (!server) return

  divineCleanupCurrent(server, false)
  divineClearQueue()
  server.persistentData.putInt('divineRunId', server.persistentData.getInt('divineRunId') + 1)
  server.persistentData.putString('divineEventId', 'peaceful')
  server.persistentData.putBoolean('divineRevealed', true)
}

function divineSetSystemEnabled(server, enabled) {
  divineEnsureState(server)
  server.persistentData.putBoolean('divineEventsEnabled', enabled)
  if (!enabled) divineStopCurrentEvent(server)
}

function divineSetSafeMode(server, enabled) {
  divineEnsureState(server)
  server.persistentData.putBoolean('divineSafeMode', enabled)

  if (enabled) {
    var active = divineFindEvent(server.persistentData.getString('divineActiveEventId'))
    if (active && active.heavy) divineStopCurrentEvent(server)
  }
}

function divinePanic(server) {
  if (!server) return

  divineSetSystemEnabled(server, false)
  divineSetSafeMode(server, true)
  divineStopCurrentEvent(server)

  // 仅管理员主动执行时进行一次标签实体清理。
  server.runCommandSilent('kill @e[tag=divine_event_entity]')
  console.log('[DivineEvents] PANIC mode enabled')
}

// ============================================================
// 性能保护与诊断
// ============================================================

function divineGuard(server) {
  var now = Date.now()
  divineLastWindowMs = now - divineLastGuardMs
  divineLastGuardMs = now

  if (divineLastWindowMs > DIVINE_SLOW_WINDOW_MS) divineSlowWindows++
  else if (divineSlowWindows > 0) divineSlowWindows--

  if (divineSlowWindows >= 2 && !server.persistentData.getBoolean('divineSafeMode')) {
    server.persistentData.putBoolean('divineSafeMode', true)

    var active = divineFindEvent(server.persistentData.getString('divineActiveEventId'))
    if (active && active.heavy) divineStopCurrentEvent(server)

    console.log('[DivineEvents] Circuit breaker enabled safe mode; window=' + divineLastWindowMs + 'ms')
  }
}

function divineGetPerfData(server) {
  divineEnsureState(server)

  return {
    schema:server.persistentData.getInt('divineSchemaVersion'),
    enabled:server.persistentData.getBoolean('divineEventsEnabled'),
    safe:server.persistentData.getBoolean('divineSafeMode'),
    selected:server.persistentData.getString('divineEventId'),
    active:server.persistentData.getString('divineActiveEventId'),
    day:server.persistentData.getInt('divineDay'),
    queue:divineMessageHeap.length,
    lastWindowMs:divineLastWindowMs,
    slowWindows:divineSlowWindows,
    players:server.players.size()
  }
}

function divineSelfTest(server) {
  divineEnsureState(server)

  var missing = []
  var i = 0

  for (i = 0; i < DIVINE_EVENTS.length; i++) {
    var definition = DIVINE_EVENTS[i]

    if (definition.start && (!global[definition.start] || typeof global[definition.start] != 'function')) {
      missing.push(definition.start)
    }

    if (definition.cleanup && (!global[definition.cleanup] || typeof global[definition.cleanup] != 'function')) {
      missing.push(definition.cleanup)
    }
  }

  return {
    ok:missing.length == 0,
    missing:missing,
    eventCount:DIVINE_EVENTS.length,
    queue:divineMessageHeap.length,
    oneTickOwner:true,
    structureSearch:false
  }
}

// ============================================================
// 玩家主动查看当前神谕
//
// 没有后台成本；只有玩家输入 /omen 时读取一次状态。
// ============================================================

function divineShowCurrentOmen(player) {
  if (!player || !player.server) return false

  var server = player.server
  divineEnsureState(server)

  var data = server.persistentData

  if (!data.getBoolean('divineEventsEnabled')) {
    player.server.runCommandSilent(
      'tellraw ' + player.username + ' ' +
      JSON.stringify({
        text:'诸神的钟暂时停摆。今日不会有新的神谕。',
        color:'gray'
      })
    )
    return true
  }

  if (!data.getBoolean('divineRevealed')) {
    player.server.runCommandSilent(
      'tellraw ' + player.username + ' ' +
      JSON.stringify([
        {text:'钟面尚未走到判词的时刻。\n',color:'dark_gray'},
        {text:'今日的征兆仍藏在云层、炉灰与旧梦之中。',color:'gray',italic:true}
      ])
    )
    return true
  }

  var id = data.getString('divineActiveEventId')
  if (!id) id = data.getString('divineEventId')

  var definition = divineFindEvent(id)

  if (!definition || definition.id == 'peaceful') {
    player.server.runCommandSilent(
      'tellraw ' + player.username + ' ' +
      JSON.stringify({
        text:'诸神今日闭目。凡人的时辰照旧流过。',
        color:'gray',
        italic:true
      })
    )
    return true
  }

  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' +
    JSON.stringify([
      {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
      {text:definition.name + '\n',color:definition.titleColor || 'gold',bold:true},
      {text:definition.deity + '\n\n',color:'dark_gray',italic:true},
      {text:definition.decree + '\n',color:'gray'},
      {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
    ])
  )

  return true
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands

  event.register(
    Commands.literal('omen')
      .executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return divineShowCurrentOmen(player) ? 1 : 0
      })
  )
})

// ============================================================
// 唯一 Tick 入口
// ============================================================

ServerEvents.tick(function (event) {
  try {
    divineRuntimeTick++

    var server = event.server
    if (!server) return

    divineProcessQueue(server)

    // V10.6：挑战事件与血月技能都复用本文件唯一的 Tick 入口。
    // challenge_events.js / blood_moon.js 自己不注册 ServerEvents.tick。
    try {
      if (global.divineChallengeTick && typeof global.divineChallengeTick == 'function') global.divineChallengeTick(server, divineRuntimeTick)
      if (divineRuntimeTick % 10 == 0 && global.bloodMoonPulse && typeof global.bloodMoonPulse == 'function') global.bloodMoonPulse(server, divineRuntimeTick)
    } catch (challengeTickError) {
      console.log('[DivineEvents] challenge scheduler failed: ' + challengeTickError)
    }

    divineCheckTick++
    if (divineCheckTick >= DIVINE_CHECK_INTERVAL) {
      divineCheckTick = 0
      divinePrepareDay(server)
      if (server.persistentData.getBoolean('divineEventsEnabled')) divineRevealIfNeeded(server)
    }

    divineGuardTick++
    if (divineGuardTick >= DIVINE_GUARD_INTERVAL) {
      divineGuardTick = 0
      divineGuard(server)
    }
  } catch (error) {
    console.log('[DivineEvents] Guarded tick error: ' + error)
  }
})

// ============================================================
// 中途登录：只补当前效果，不重播全服神谕
// ============================================================

PlayerEvents.loggedIn(function (event) {
  var player = event.player
  if (!player || !player.server) return
  try { if (String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer') >= 0) return } catch (ignoredFake) {}

  var server = player.server
  divineEnsureState(server)

  if (!server.persistentData.getBoolean('divineEventsEnabled')) return
  if (!server.persistentData.getBoolean('divineRevealed')) return

  var id = server.persistentData.getString('divineActiveEventId')

  try {
    if (global.applyDivineEventToPlayer && typeof global.applyDivineEventToPlayer == 'function') {
      global.applyDivineEventToPlayer(player, id)
    }
  } catch (error) {
    console.log('[DivineEvents] Login apply failed for ' + player.username + ': ' + error)
  }
})

// ============================================================
// Global API
// ============================================================

global.divineQueueTell = divineQueueTell
global.divineQueueCommand = divineQueueCommand
global.divineForceStartEvent = divineForceStartEvent
global.divineReplayCurrentEvent = divineReplayCurrentEvent
global.divineStopCurrentEvent = divineStopCurrentEvent
global.divineSetSystemEnabled = divineSetSystemEnabled
global.divineSetSafeMode = divineSetSafeMode
global.divinePanic = divinePanic
global.divineGetPerfData = divineGetPerfData
global.divineSelfTest = divineSelfTest
global.divineShowCurrentOmen = divineShowCurrentOmen
global.divineFindEvent = divineFindEvent
global.divineEnsureState = divineEnsureState
