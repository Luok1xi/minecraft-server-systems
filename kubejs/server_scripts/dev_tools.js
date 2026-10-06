// ============================================================
// 神谕管理员测试工具 V9.6 · 大奖演出 / 投影大厅安全版
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 设计目标：
// - 只负责管理员测试，不增加任何 Tick / 后台轮询
// - 命令像文件夹一样分组，避免根目录塞满命令
// - /dev event 只放事件相关测试
// - /dev entity 只放实体相关测试
// - /dev project 只放整个项目的启停 / 急停 / 自检
// - /dev safe 只放安全模式
// - 状态页直接读取核心 persistentData，能看见“为什么没触发”
// - 固定 literal 命令，避免 Rhino 动态命令树问题
// ============================================================

function devTell(source, text, color) {
  if (!source) return

  var player = source.player
  if (player) {
    source.server.runCommandSilent(
      'tellraw ' + player.username + ' ' + JSON.stringify({text:text,color:color || 'gray'})
    )
  } else {
    console.log('[DEV] ' + text)
  }
}

function devTellRich(source,components) {
  if (!source) return
  var player = source.player
  if (player) {
    source.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(components))
  } else {
    try { console.log('[DEV] ' + JSON.stringify(components)) } catch (ignored) {}
  }
}

function devActionButton(text,command,color,hover) {
  return {
    text:'[ ' + text + ' ]',
    color:color || 'aqua',
    bold:true,
    clickEvent:{action:'run_command',value:command},
    hoverEvent:{action:'show_text',contents:{text:hover || command,color:'gray'}}
  }
}

function devHas(name) {
  try {
    return global[name] && typeof global[name] == 'function'
  } catch (error) {
    return false
  }
}

function devPlayer(source) {
  return source ? source.player : null
}

function devBool(value) {
  return value ? '开启' : '关闭'
}

function devGetOverworld(server) {
  if (!server) return null
  try { return server.getLevel('minecraft:overworld') } catch (error) { return null }
}

function devGetDayTime(server) {
  var level = devGetOverworld(server)
  if (!level) return 0
  try { return Number(level.getLevelData().getDayTime()) } catch (error) { return 0 }
}

function devGetGameDay(server) {
  return Math.floor(devGetDayTime(server) / 24000)
}

function devGetGameClock(server) {
  var time = devGetDayTime(server) % 24000
  if (time < 0) time += 24000
  return Math.floor(time)
}

function devGetPhase(time) {
  if (time >= 200 && time < 11800) return '白昼揭示窗口'
  if (time >= 12500 && time < 23000) return '夜间揭示窗口'
  if (time >= 23000 || time < 200) return '黎明过渡'
  return '黄昏过渡'
}

function devEventDef(id) {
  if (!id) return null
  if (!devHas('divineFindEvent')) return null
  try { return global.divineFindEvent(id) } catch (error) { return null }
}

function devEventName(id) {
  if (!id) return '无'
  var definition = devEventDef(id)
  if (definition && definition.name) return definition.name
  return id
}

function devEventKind(id) {
  var definition = devEventDef(id)
  if (!definition) return '?'
  if (definition.id == 'peaceful') return '和平'
  if (definition.type == 'day') return definition.heavy ? '白昼 / 重型' : '白昼 / 轻型'
  if (definition.type == 'night') return definition.heavy ? '夜间 / 重型' : '夜间 / 轻型'
  return definition.type || '?'
}

function devStatusReason(server) {
  if (!server) return '服务器不可用'

  var data = server.persistentData
  var enabled = data.getBoolean('divineEventsEnabled')
  var storedDay = data.getInt('divineDay')
  var actualDay = devGetGameDay(server)
  var selectedId = data.getString('divineEventId')
  var activeId = data.getString('divineActiveEventId')
  var revealed = data.getBoolean('divineRevealed')
  var time = devGetGameClock(server)

  if (!enabled) return '自动神谕已关闭：自然事件不会触发。使用 /dev project on'
  if (storedDay != actualDay) return '核心尚未准备当前游戏日：下一次 10 秒检查会重新抽签。'
  if (!selectedId) return '当前日没有预定事件 ID：建议 /dev event reroll'
  if (selectedId == 'peaceful') return '今日抽中了无谕之日，所以不会出现神谕演出。'

  var definition = devEventDef(selectedId)
  if (!definition) return '预定事件无法解析：' + selectedId

  if (!revealed) {
    if (definition.type == 'day' && !(time >= 200 && time < 11800)) return '已抽到白昼事件，正在等待白昼揭示窗口。'
    if (definition.type == 'night' && !(time >= 12500 && time < 23000)) return '已抽到夜间事件，正在等待夜间揭示窗口。'
    return '已经进入正确时间窗口，最多等待下一次 10 秒核心检查揭示。'
  }

  if (activeId) return '神谕已经启动并处于活动状态。'
  return '事件已标记为揭示，但没有活动事件。若不是无谕之日，建议先 /dev project check。'
}

function devShowRoot(source) {
  devTell(source, '===== DEV · 选择一个文件夹 =====', 'gold')
  devTell(source, '/dev event     事件测试 / 当前神谕状态', 'aqua')
  devTell(source, '/dev entity    精英怪 / 迁徙实体测试', 'dark_red')
  devTell(source, '/dev project   项目启停 / 急停 / 自检', 'yellow')
  devTell(source, '/dev safe      安全模式', 'green')
  devTell(source, '/dev reward    抽奖 / YSM / 遗物 / 宠物测试', 'light_purple')
  devTell(source, '/dev history   历史系统 / 世界纪录测试', 'blue')
  devTell(source, '/dev station   旧匣展示台 / 历史图书馆', 'dark_aqua')
  devTell(source, '/dev guide     补发 Luokixi 手札', 'gray')
}

function devShowEventFolder(source) {
  devTell(source, '===== DEV / event · 事件测试 =====', 'aqua')
  devTell(source, '/dev event status      查看完整事件状态与未触发原因', 'yellow')
  devTell(source, '/dev event list        查看事件列表', 'gray')
  devTell(source, '/dev event reroll      当前日重新抽签（自然流程）', 'green')
  devTell(source, '/dev event reveal      立刻启动当前预定事件（测试）', 'green')
  devTell(source, '/dev event replay      重播当前事件开场', 'gray')
  devTell(source, '/dev event rain | wind | water | fire | earth | sun', 'gray')
  devTell(source, '/dev event war | moon | blood | cave | gaze | hunt | ritual | voidmother | bell | calm', 'gray')
  devTell(source, '/dev event day | night | nextday', 'dark_gray')
}

function devShowEntityFolder(source) {
  devTell(source, '===== DEV / entity · 实体测试 =====', 'dark_red')
  devTell(source, '/dev entity blood random | zombie | archer | spider | beast | shadow', 'red')
  devTell(source, '/dev entity cave elite', 'dark_aqua')
  devTell(source, '/dev entity earth random | toucan | kangaroo | roadrunner | raccoon', 'dark_green')
  devTell(source, '/dev entity clear      清理本系统测试实体', 'yellow')
}

function devShowProjectFolder(source) {
  devTell(source, '===== DEV / project · 项目控制 =====', 'yellow')
  devTell(source, '/dev project status    查看项目总状态', 'gold')
  devTell(source, '/dev project on        开启自动神谕并刷新当前日', 'green')
  devTell(source, '/dev project off       关闭自动神谕并停止当前事件', 'yellow')
  devTell(source, '/dev project stop      只停止当前活动事件', 'yellow')
  devTell(source, '/dev project check     检查核心与事件接口', 'aqua')
  devTell(source, '/dev project panic     紧急关闭 + 安全模式 + 清理实体', 'red')
}

function devShowSafeFolder(source) {
  devTell(source, '===== DEV / safe · 安全模式 =====', 'green')
  devTell(source, '/dev safe status', 'gray')
  devTell(source, '/dev safe on      禁止所有重型事件进入自然抽取', 'yellow')
  devTell(source, '/dev safe off     恢复重型事件进入自然池', 'green')
}

function devShowRewardFolder(source) {
  devTell(source, '===== DEV / reward · 奖励测试 =====', 'light_purple')
  devTell(source, '/dev reward token 1 | 5 | 20', 'gray')
  devTell(source, '/dev reward oracle once | ten | 2star | 3star | 4star | 5star | 6star | anim2 | anim3 | anim4 | anim5 | anim6 | cache | status | preview', 'gray')
  devTell(source, '/dev reward relic 5star | rain | wind | tide | hearth | fire | earth | sun | moon | death | abyss | war | thunder | luokixi | list', 'aqua')
  devTell(source, '/dev reward item godslayer | fruit | void | blood | oil | seal | list', 'light_purple')
  devTell(source, '/dev reward ysm status | import | reload | random | wearlast', 'gold')
  devTell(source, '/dev reward pet horse | wolf | donkey | doll', 'gray')
}

function devShowHistoryFolder(source) {
  devTell(source, '===== DEV / history · 历史测试 =====', 'blue')
  devTell(source, '/dev history show       查看个人纪事', 'gray')
  devTell(source, '/dev history server     查看全服世界纪录', 'light_purple')
  devTell(source, '/dev history refresh    强制刷新悬浮历史表', 'aqua')
  devTell(source, '/dev history reset      清除自己的纪事测试数据', 'yellow')
}

function devShowStationFolder(source) {
  devTell(source, '===== DEV / station · 投影系统控制台 =====', 'dark_aqua')
  devTellRich(source,[
    devActionButton('总状态','/dev station status','gray','查看旧匣与历史馆状态'),{text:'  '},
    devActionButton('10秒自检','/dev station test','green','测试 Elite 标题、text_display 与右键热区'),{text:'  '},
    devActionButton('强制清残留','/dev station purge','red','清除旧 V6/V7/V8 残留并关闭两个大厅')
  ])
  devTellRich(source,[
    {text:'\n旧匣大厅  ',color:'light_purple',bold:true},
    devActionButton('管理','/dev station oracle','light_purple'),{text:'  '},
    devActionButton('面前建立','/dev station oracle set','green'),{text:'  '},
    devActionButton('修复','/dev station oracle repair','aqua'),{text:'  '},
    devActionButton('移除','/dev station oracle remove','yellow')
  ])
  devTellRich(source,[
    {text:'\n历史图书馆  ',color:'gold',bold:true},
    devActionButton('管理','/dev station history','gold'),{text:'  '},
    devActionButton('面前建立','/dev station history set','green'),{text:'  '},
    devActionButton('修复','/dev station history repair','aqua'),{text:'  '},
    devActionButton('移除','/dev station history remove','yellow')
  ])
  devTell(source, '“面前建立”会把 UI 放到你准星方向约 4 格处；sethere 才是脚下中心建立。', 'dark_gray')
}

function devShowOracleStationFolder(source) {
  devTell(source, '===== 旧匣抽奖大厅 =====', 'light_purple')
  devTellRich(source,[
    devActionButton('面前建立 / 重建','/dev station oracle set','green'),{text:'  '},
    devActionButton('脚下中心建立','/dev station oracle sethere','aqua'),{text:'  '},
    devActionButton('修复 / 重绘 UI','/dev station oracle repair','blue')
  ])
  devTellRich(source,[
    devActionButton('下一轮展品','/dev station oracle next','gold'),{text:'  '},
    devActionButton('4★投影测试','/dev station oracle project4','light_purple'),{text:'  '},
    devActionButton('5★投影测试','/dev station oracle project5','gold'),{text:'  '},
    devActionButton('传送到大厅','/dev station oracle tp','light_purple'),{text:'  '},
    devActionButton('移除','/dev station oracle remove','yellow')
  ])
  devTellRich(source,[
    devActionButton('10秒自检','/dev station oracle test','green'),{text:'  '},
    devActionButton('强制清旧残留','/dev station oracle purge','red')
  ])
  devTell(source, '正式 UI：左侧禁忌道具 · 中间诸神遗物 · 右侧随行者；传奇着装只作为“神秘惊喜”，永不参加大厅展示。', 'gray')
}

function devShowHistoryStationFolder(source) {
  devTell(source, '===== 世界纪事馆 =====', 'gold')
  devTellRich(source,[
    devActionButton('面前建立 / 重建','/dev station history set','green'),{text:'  '},
    devActionButton('脚下中心建立','/dev station history sethere','aqua'),{text:'  '},
    devActionButton('修复 / 重绘榜单','/dev station history repair','blue')
  ])
  devTellRich(source,[
    devActionButton('下一页','/dev station history next','gold'),{text:'  '},
    devActionButton('传送到馆','/dev station history tp','light_purple'),{text:'  '},
    devActionButton('移除','/dev station history remove','yellow')
  ])
  devTellRich(source,[
    devActionButton('10秒自检','/dev station history test','green'),{text:'  '},
    devActionButton('强制清旧残留','/dev station history purge','red')
  ])
  devTell(source, '排行榜读取现有世界纪事记录；记录变化时立即标记刷新，没有后台玩家扫描。', 'dark_gray')
}

function devEventStatus(source) {
  if (!source || !source.server) return 0

  var server = source.server
  var data = server.persistentData
  var perf = null
  if (devHas('divineGetPerfData')) {
    try { perf = global.divineGetPerfData(server) } catch (ignored) {}
  }

  var enabled = data.getBoolean('divineEventsEnabled')
  var safe = data.getBoolean('divineSafeMode')
  var selectedId = data.getString('divineEventId')
  var activeId = data.getString('divineActiveEventId')
  var revealed = data.getBoolean('divineRevealed')
  var storedDay = data.getInt('divineDay')
  var actualDay = devGetGameDay(server)
  var time = devGetGameClock(server)

  devTell(source, '===== 神谕事件状态 =====', 'gold')
  devTell(source, '自动系统：' + devBool(enabled) + '    安全模式：' + devBool(safe), enabled ? 'green' : 'yellow')
  devTell(source, '实际游戏日：' + actualDay + '    核心记录日：' + storedDay, actualDay == storedDay ? 'gray' : 'yellow')
  devTell(source, '世界时间：' + time + '    ' + devGetPhase(time), 'gray')
  devTell(source, '预定：' + devEventName(selectedId), 'aqua')
  devTell(source, '      ' + selectedId + '    [' + devEventKind(selectedId) + ']', 'dark_gray')
  devTell(source, '活动：' + devEventName(activeId), activeId ? 'green' : 'gray')
  devTell(source, '      ' + (activeId || '无') + '    已揭示：' + revealed, 'dark_gray')
  devTell(source, '最近事件：' + (data.getString('divineRecentEvents') || '无'), 'dark_gray')
  devTell(source, '连续和平：' + data.getInt('divinePeacefulStreak') + ' 天', 'dark_gray')

  devTell(source, '--- 活动标记 ---', 'dark_gray')
  devTell(source,
    '雨母:' + data.getBoolean('harvestDayActive') +
    ' 风:' + data.getBoolean('windBlessingActive') +
    ' 水:' + data.getBoolean('waterBlessingActive') +
    ' 火:' + data.getBoolean('fireBlessingActive'),
    'gray'
  )
  devTell(source,
    '迁徙:' + data.getBoolean('migrationActive') +
    ' 日:' + data.getBoolean('sunBlessingActive') +
    ' 斗神:' + data.getBoolean('warBlessingActive') +
    ' 月:' + data.getBoolean('moonBlessingActive'),
    'gray'
  )
  devTell(source,
    '血月:' + data.getBoolean('bloodMoonActive') +
    ' 洞穴:' + data.getBoolean('caveNightActive'),
    'gray'
  )

  if (perf) {
    devTell(source, '延迟任务：' + perf.queue + '    20秒窗口：' + perf.lastWindowMs + 'ms    慢窗口：' + perf.slowWindows, 'dark_gray')
  }

  devTell(source, '判断：' + devStatusReason(server), enabled ? 'yellow' : 'red')
  return 1
}

function devProjectStatus(source) {
  if (!source || !source.server) return 0
  var server = source.server
  var data = server.persistentData

  devTell(source, '===== 神谕项目状态 =====', 'gold')
  devTell(source, '自动神谕：' + devBool(data.getBoolean('divineEventsEnabled')), data.getBoolean('divineEventsEnabled') ? 'green' : 'yellow')
  devTell(source, '安全模式：' + devBool(data.getBoolean('divineSafeMode')), data.getBoolean('divineSafeMode') ? 'yellow' : 'green')
  devTell(source, '当前活动：' + devEventName(data.getString('divineActiveEventId')), 'gray')
  devTell(source, '事件原因诊断：' + devStatusReason(server), 'gray')
  return 1
}

function devProjectCheck(source) {
  if (!source || !source.server) return 0

  var required = [
    'divineForceStartEvent',
    'divineStopCurrentEvent',
    'divineSetSystemEnabled',
    'divineSetSafeMode',
    'divineGetPerfData',
    'divineSelfTest',
    'divineFindEvent',
    'startHarvestDay',
    'startWindBlessing',
    'startWaterBlessing',
    'startFireBlessing',
    'startMigration',
    'startSunBlessing',
    'startWarBlessing',
    'startMoonBlessing',
    'startBloodMoon',
    'startCaveNight',
    'startAbyssGaze',
    'startAbyssHunt',
    'startAbyssRitual',
    'startVoidMotherChallenge',
    'startAncientBell',
    'divineChallengeTick',
    'divineChallengeHandleDeath',
    'spawnBloodEliteForPlayer',
    'spawnCaveEliteForPlayer',
    'spawnMigrationMobForPlayer',
    'oracleRelicGrantRandom',
    'oracleRelicShow',
    'oraclePreview',
    'oracleCacheShow',
    'oracleCacheClaim',
    'divineSkinReloadPool',
    'divineSkinFindByIndex',
    'divineSkinWeightedPick',
    'historyShowServerRecords',
    'divineStationSet',
    'divineStationRemove',
    'divineStationRefreshHistory',
    'divineStationSpawnOracle',
    'divineStationData',
    'divineStationNext',
    'divineStationDependencies',
    'divineStationPlayRarityFx',
    'divineStationProjectReward',
    'historyShowWorldRecent'
  ]

  var missing = []
  var i = 0
  for (i = 0; i < required.length; i++) {
    if (!devHas(required[i])) missing.push(required[i])
  }

  var self = null
  if (devHas('divineSelfTest')) {
    try { self = global.divineSelfTest(source.server) } catch (error) { self = null }
  }

  if (self && self.missing) {
    for (i = 0; i < self.missing.length; i++) {
      if (missing.indexOf(self.missing[i]) < 0) missing.push(self.missing[i])
    }
  }

  devTell(source, '===== 神谕项目自检 =====', 'gold')
  devTell(source, '事件定义：' + (self ? self.eventCount : '?') + '    消息队列：' + (self ? self.queue : '?'), 'gray')
  devTell(source, '结构搜索：0    调试后台轮询：0', 'green')

  if (missing.length <= 0) {
    devTell(source, '核心接口、事件脚本和实体测试接口全部存在。', 'green')
    return 1
  }

  devTell(source, '缺失接口：' + missing.join(', '), 'red')
  return 0
}

function devProjectOn(source) {
  if (!source || !source.server) return 0
  var server = source.server

  if (!devHas('divineSetSystemEnabled')) {
    devTell(source, '缺少 divineSetSystemEnabled，无法开启。', 'red')
    return 0
  }

  global.divineSetSystemEnabled(server, true)

  // 关键：如果今天之前在“关闭状态”下已被准备成和平日，
  // 单纯打开开关不会在同一天重新抽签。
  // 将核心记录日设为 -1，让下一次 10 秒检查重新准备当前日。
  server.persistentData.putInt('divineDay', -1)
  server.persistentData.putString('divineEventId', 'peaceful')
  server.persistentData.putString('divineActiveEventId', '')
  server.persistentData.putBoolean('divineRevealed', true)

  devTell(source, '自动神谕已开启。', 'green')
  devTell(source, '当前游戏日已请求重新准备；最多等待约 10 秒即可重新抽签。', 'aqua')
  return 1
}

function devProjectOff(source) {
  if (!source || !source.server) return 0
  if (!devHas('divineSetSystemEnabled')) {
    devTell(source, '缺少 divineSetSystemEnabled，无法关闭。', 'red')
    return 0
  }

  global.divineSetSystemEnabled(source.server, false)
  devTell(source, '自动神谕已关闭，当前神谕也已停止。', 'yellow')
  return 1
}

function devProjectStop(source) {
  if (!source || !source.server) return 0
  if (!devHas('divineStopCurrentEvent')) {
    devTell(source, '缺少 divineStopCurrentEvent。', 'red')
    return 0
  }

  global.divineStopCurrentEvent(source.server)
  devTell(source, '当前活动神谕已停止；自动系统开关保持不变。', 'yellow')
  return 1
}

function devProjectPanic(source) {
  if (!source || !source.server) return 0
  var server = source.server

  if (devHas('divinePanic')) global.divinePanic(server)
  else {
    if (devHas('divineSetSystemEnabled')) global.divineSetSystemEnabled(server, false)
    if (devHas('divineSetSafeMode')) global.divineSetSafeMode(server, true)
    if (devHas('divineStopCurrentEvent')) global.divineStopCurrentEvent(server)
  }

  server.runCommandSilent('kill @e[tag=divine_test_entity]')
  server.runCommandSilent('kill @e[tag=divine_blood_elite]')
  server.runCommandSilent('kill @e[tag=divine_cave_elite]')
  server.runCommandSilent('kill @e[tag=divine_migration]')

  devTell(source, 'PANIC：自动系统关闭，安全模式开启，当前事件和测试实体已清理。', 'red')
  return 1
}

function devSafeStatus(source) {
  if (!source || !source.server) return 0
  var enabled = source.server.persistentData.getBoolean('divineSafeMode')
  devTell(source, '安全模式：' + devBool(enabled), enabled ? 'yellow' : 'green')
  devTell(source, enabled ? '重型事件（血月、洞穴、渊神挑战、虚空之母、古代丧钟、大迁徙）不会进入自然抽取池。' : '所有事件都可以进入自然抽取池。', 'gray')
  return 1
}

function devSafeSet(source, enabled) {
  if (!source || !source.server || !devHas('divineSetSafeMode')) return 0
  global.divineSetSafeMode(source.server, enabled)
  devTell(source, enabled ? '安全模式已开启。' : '安全模式已关闭。', enabled ? 'yellow' : 'green')
  return 1
}

function devForceEvent(source, id) {
  if (!source || !source.server || !devHas('divineForceStartEvent')) {
    devTell(source, '神谕核心不可用。', 'red')
    return 0
  }

  var definition = devEventDef(id)
  var label = definition ? definition.name : id
  var ok = false

  try { ok = global.divineForceStartEvent(source.server, id) } catch (error) {
    console.log('[DEV] Force event failed: ' + error)
    ok = false
  }

  devTell(source, ok ? '测试事件已启动：' + label : '测试事件启动失败：' + label, ok ? 'green' : 'red')
  return ok ? 1 : 0
}

function devEventReroll(source) {
  if (!source || !source.server) return 0
  var server = source.server
  var data = server.persistentData

  if (!data.getBoolean('divineEventsEnabled')) {
    devTell(source, '自动神谕当前是关闭的。先执行 /dev project on。', 'red')
    return 0
  }

  if (devHas('divineStopCurrentEvent')) global.divineStopCurrentEvent(server)

  data.putInt('divineDay', -1)
  data.putString('divineEventId', 'peaceful')
  data.putString('divineActiveEventId', '')
  data.putBoolean('divineRevealed', true)

  devTell(source, '已要求当前游戏日重新抽签。最多等待约 10 秒。', 'green')
  return 1
}

function devEventReveal(source) {
  if (!source || !source.server) return 0
  var id = source.server.persistentData.getString('divineEventId')

  if (!id || id == 'peaceful') {
    devTell(source, '当前没有可强制揭示的预定事件。可以先 /dev event reroll。', 'yellow')
    return 0
  }

  return devForceEvent(source, id)
}

function devSetTimeOfDayForward(server, targetTime) {
  if (!server) return false

  try {
    var level = server.getLevel('minecraft:overworld')
    if (!level) return false

    var dayTime = Number(level.getLevelData().getDayTime())
    var current = dayTime % 24000
    if (current < 0) current += 24000

    var delta = (targetTime - current + 24000) % 24000
    if (delta > 0) server.runCommandSilent('time add ' + Math.floor(delta))
    return true
  } catch (error) {
    console.log('[DEV] Forward time set failed: ' + error)
    return false
  }
}

function devEventReplay(source) {
  if (!source || !source.server || !devHas('divineReplayCurrentEvent')) return 0
  var ok = global.divineReplayCurrentEvent(source.server)
  devTell(source, ok ? '已重播当前神谕开场。' : '当前没有活动神谕。', ok ? 'green' : 'yellow')
  return ok ? 1 : 0
}

function devEventList(source) {
  devTell(source, '===== 神谕事件列表 =====', 'gold')
  devTell(source, '白昼：rain / wind / water / fire / earth / sun', 'aqua')
  devTell(source, '夜间：war / moon / blood / cave / gaze / hunt / ritual / voidmother / bell', 'light_purple')
  devTell(source, '和平：calm', 'gray')
  devTell(source, '重型：earth / blood / cave / gaze / hunt / ritual / voidmother / bell（安全模式下不会自然抽取）', 'yellow')
  return 1
}

function devEntityBlood(source, key) {
  var player = devPlayer(source)
  if (!player || !devHas('spawnBloodEliteForPlayer')) return 0
  return global.spawnBloodEliteForPlayer(player, key) ? 1 : 0
}

function devEntityCave(source) {
  var player = devPlayer(source)
  if (!player || !devHas('spawnCaveEliteForPlayer')) return 0
  return global.spawnCaveEliteForPlayer(player, true) ? 1 : 0
}

function devEntityEarth(source, key) {
  var player = devPlayer(source)
  if (!player || !devHas('spawnMigrationMobForPlayer')) return 0
  return global.spawnMigrationMobForPlayer(player, key) ? 1 : 0
}

function devEntityClear(source) {
  if (!source || !source.server) return 0
  var server = source.server
  server.runCommandSilent('kill @e[tag=divine_test_entity]')
  devTell(source, '测试实体已清理。正式自然事件实体不会被这个命令误删。', 'green')
  return 1
}

function devRewardOracleStatus(source) {
  var player = devPlayer(source)
  if (!player) return 0

  devTell(source, '6★ 彩蛋：0.001% · 无保底 · 不重置其他保底', 'red')
  devTell(source, '5★ 保底：' + player.persistentData.getInt('oracleFivePity') + '/80', 'gold')
  devTell(source, '4★ 保底：' + player.persistentData.getInt('oracleFourPity') + '/30', 'light_purple')
  devTell(source, '3★ 保底：' + player.persistentData.getInt('oracleThreePity') + '/10', 'blue')
  devTell(source, 'YSM 规则：混合五星池（不分限定/常驻）', 'gray')
  devTell(source, '幻形余烬：' + player.persistentData.getInt('oracleEmbers') + '    织痕：' + player.persistentData.getInt('oracleStitches') + '/120', 'red')
  try { var cacheRaw=String(player.persistentData.getString('oracleRewardCacheV95')||''); var cacheCount=cacheRaw?JSON.parse(cacheRaw).length:0; devTell(source,'奖励缓存条目：'+cacheCount+'/72','aqua') } catch (ignoredCache) {}
  return 1
}

function devRewardRelic(source,tier) {
  var player = devPlayer(source)
  if (!player || !devHas('oracleRelicGrantRandom')) return 0
  var result = global.oracleRelicGrantRandom(player,tier,'dev')
  if (!result || !result.ok) {
    devTell(source, '遗物测试发放失败。', 'red')
    return 0
  }
  devTell(source, '已发放 ' + tier + '★ 遗物：' + result.name, tier == 6 ? 'red' : (tier == 5 ? 'gold' : 'light_purple'))
  return 1
}

function devStationStatus(source) {
  if (!source || !source.server || !devHas('divineStationData')) return 0
  var server = source.server
  var oracle = global.divineStationData(server,'oracle')
  var history = global.divineStationData(server,'history')
  var dependencies = null
  var oracleHealth = null
  var historyHealth = null

  try { if (devHas('divineStationDependencies')) dependencies = global.divineStationDependencies() } catch (ignored) {}
  try { if (devHas('divineStationHealth')) oracleHealth = global.divineStationHealth(server,'oracle') } catch (ignored2) {}
  try { if (devHas('divineStationHealth')) historyHealth = global.divineStationHealth(server,'history') } catch (ignored3) {}

  devTell(source, '===== 投影系统状态 V10.8.0 =====', 'gold')
  if (dependencies) {
    devTell(source, 'Elite Holograms：' + (dependencies.elite ? '已检测' : '未识别 / 将使用 display 回退'), dependencies.elite ? 'green' : 'yellow')
  }

  function line(name,data,health,color) {
    var enabled = data && data.enabled
    var ui = health && health.ui
    var interaction = health && health.interaction
    devTell(source,name + '：' + (enabled ? '已建立' : '未建立') +
      (enabled ? ' · UI ' + (ui ? '✓' : '×') + ' · 热区 ' + (interaction ? '✓' : '×') + ' · 完整 ' + (health && health.complete ? '✓' : '×') + ' · ' + (health.backend || '未知后端') : ''),
      enabled && ui && interaction && health && health.complete ? color : (enabled ? 'yellow' : 'gray'))
    if (enabled) devTell(source,(data.dimension || '?') + '  ' + data.x + ' ' + data.y + ' ' + data.z + '  layout=' + (data.layout || 0),'dark_gray')
  }

  line('旧匣大厅',oracle,oracleHealth,'light_purple')
  line('历史图书馆',history,historyHealth,'gold')


  devTellRich(source,[
    devActionButton('旧匣管理','/dev station oracle','light_purple'),{text:'  '},
    devActionButton('历史馆管理','/dev station history','gold'),{text:'  '},
    devActionButton('自检','/dev station test','green')
  ])
  return 1
}

function devStationSet(source,type,mode) {
  var player = devPlayer(source)
  if (!player || !devHas('divineStationSet')) {
    devTell(source,'投影脚本接口不存在。先执行 /dev project check。','red')
    return 0
  }
  try {
    var ok = global.divineStationSet(player,type,mode == 'here' ? 'here' : 'front')
    if (ok) {
      devTell(source,'建立完成。建议马上执行 /dev station status 检查 UI 与热区。','green')
      if (type == 'oracle') devShowOracleStationFolder(source)
      else devShowHistoryStationFolder(source)
    } else {
      devTell(source,'建立失败，但脚本已经拦住了异常。请查看聊天中的失败阶段，或 latest.log 里的 [DivineStations]。','red')
    }
    return ok ? 1 : 0
  } catch (error) {
    console.log('[DEV] station set failed: ' + error)
    devTell(source,'建立命令被异常拦截：' + error,'red')
    return 0
  }
}

function devStationRefresh(source,type) {
  if (!source || !source.server) return 0
  var ok = false
  var player = devPlayer(source)
  if (type == 'oracle' && devHas('divineStationSpawnOracle')) ok = global.divineStationSpawnOracle(source.server,player)
  if (type == 'history' && devHas('divineStationSpawnHistory')) ok = global.divineStationSpawnHistory(source.server,player)
  devTell(source,ok ? '整套投影 UI 已重新绘制。' : '没有已保存的大厅坐标；请先建立。',ok ? 'green' : 'yellow')
  return ok ? 1 : 0
}

function devStationRepair(source,type) {
  if (!source || !source.server) return 0
  try {
    var ok = false
    var player = devPlayer(source)
    if (type == 'oracle' && devHas('divineStationSpawnOracle')) ok = global.divineStationSpawnOracle(source.server,player)
    if (type == 'history' && devHas('divineStationSpawnHistory')) ok = global.divineStationSpawnHistory(source.server,player)
    devTell(source,ok ? '旧残留已清理，并按已保存坐标重新绘制完整 UI。' : '没有有效的已保存坐标；请使用 set 或 sethere。',ok ? 'green' : 'yellow')
    return ok ? 1 : 0
  } catch (error) {
    console.log('[DEV] station repair failed: ' + error)
    devTell(source,'修复重绘异常：' + error,'red')
    return 0
  }
}

function devStationNext(source,type) {
  if (!source || !source.server || !devHas('divineStationNext')) return 0
  var ok = global.divineStationNext(source.server,type)
  devTell(source,ok ? (type == 'oracle' ? '已切换下一件大奖。' : '已翻到下一页世界纪录。') : '没有找到已建立的大厅。',ok ? 'green' : 'yellow')
  return ok ? 1 : 0
}

function devStationRemove(source,type) {
  if (!source || !source.server || !devHas('divineStationRemove')) return 0
  try {
    var ok = global.divineStationRemove(source.server,type,true,devPlayer(source))
    devTell(source,ok ? ((type == 'oracle' ? '旧匣大厅' : '历史图书馆') + '已移除；V5-V9 已知残留标签也已清理。') : '移除没有完整执行，请查看日志。',ok ? 'yellow' : 'red')
    return ok ? 1 : 0
  } catch (error) {
    console.log('[DEV] station remove failed: ' + error)
    devTell(source,'移除异常：' + error,'red')
    return 0
  }
}

function devStationPurge(source,type) {
  if (!source || !source.server) return 0
  if (type == 'all') {
    if (!devHas('divineStationPurgeAll')) return 0
    try {
      var ok = global.divineStationPurgeAll(source.server,devPlayer(source))
      devTell(source,ok ? '旧匣、历史馆、测试热区，以及 Elite 独立存档中的 V5-V9 旧大厅 ID 已请求清理。' : '强制清理没有完整执行，请查看日志。',ok ? 'green' : 'yellow')
      return ok ? 1 : 0
    } catch (error) {
      console.log('[DEV] station purge failed: ' + error)
      devTell(source,'强制清理异常：' + error,'red')
      return 0
    }
  }
  return devStationRemove(source,type)
}

function devStationSelfTest(source) {
  var player = devPlayer(source)
  if (!player || !devHas('divineStationSelfTest')) return 0
  return global.divineStationSelfTest(player) ? 1 : 0
}

function devStationTeleport(source,type) {
  var player = devPlayer(source)
  if (!player || !devHas('divineStationTeleportAdmin')) return 0
  var ok = global.divineStationTeleportAdmin(player,type)
  devTell(source,ok ? '已传送到投影中心附近。' : '传送未执行；如果大厅已经建立，请看上一条 CPU 安全提示。',ok ? 'green' : 'yellow')
  return ok ? 1 : 0
}

function devYsmStatus(source) {
  var player = devPlayer(source)
  if (!player || !devHas('divineSkinPoolStatus')) return 0
  global.divineSkinPoolStatus(player)
  return 1
}

function devYsmReload(source) {
  if (!source || !source.server || !devHas('divineSkinReloadPool')) return 0
  var count = global.divineSkinReloadPool(source.server,true)
  devTell(source,'YSM 五星奖池已重载：' + count + ' 个模型。',count > 0 ? 'green' : 'yellow')
  return 1
}

function devYsmGrant(source,mode) {
  var player = devPlayer(source)
  if (!player || !devHas('divineSkinWeightedPick') || !devHas('divineSkinGrant')) return 0
  var model = global.divineSkinWeightedPick(player,null,true)
  if (!model) {
    devTell(source,'当前 YSM 奖池没有符合条件的模型。','yellow')
    return 0
  }
  var result = global.divineSkinGrant(player,model.id,'dev')
  if (!result || !result.ok) {
    devTell(source,'YSM 五星模型解锁失败：' + model.name,'red')
    return 0
  }
  devTell(source,'已测试解锁：' + model.name + '。使用 /wardrobe 立即穿上。','gold')
  return 1
}

function devYsmWearLast(source) {
  var player = devPlayer(source)
  if (!player || !devHas('divineSkinApply')) return 0
  var id = player.persistentData.getString('oracleLastYsm')
  if (!id) {
    devTell(source,'你还没有最近获得的 YSM 模型。','yellow')
    return 0
  }
  return global.divineSkinApply(player,id) ? 1 : 0
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('dev').requires(function (source) { return source.hasPermission(2) })

  root.executes(function (ctx) {
    devShowRoot(ctx.source)
    return 1
  })

  root.then(Commands.literal('help').executes(function (ctx) {
    devShowRoot(ctx.source)
    return 1
  }))

  // ========================================================
  // EVENT 文件夹
  // ========================================================

  var eventFolder = Commands.literal('event').executes(function (ctx) {
    devShowEventFolder(ctx.source)
    return 1
  })

  eventFolder.then(Commands.literal('status').executes(function (ctx) { return devEventStatus(ctx.source) }))
  eventFolder.then(Commands.literal('list').executes(function (ctx) { return devEventList(ctx.source) }))
  eventFolder.then(Commands.literal('reroll').executes(function (ctx) { return devEventReroll(ctx.source) }))
  eventFolder.then(Commands.literal('reveal').executes(function (ctx) { return devEventReveal(ctx.source) }))
  eventFolder.then(Commands.literal('replay').executes(function (ctx) { return devEventReplay(ctx.source) }))

  eventFolder.then(Commands.literal('rain').executes(function (ctx) { return devForceEvent(ctx.source, 'rain_harvest') }))
  eventFolder.then(Commands.literal('wind').executes(function (ctx) { return devForceEvent(ctx.source, 'wind_road') }))
  eventFolder.then(Commands.literal('water').executes(function (ctx) { return devForceEvent(ctx.source, 'sea_bounty') }))
  eventFolder.then(Commands.literal('fire').executes(function (ctx) { return devForceEvent(ctx.source, 'fire_hearth') }))
  eventFolder.then(Commands.literal('earth').executes(function (ctx) { return devForceEvent(ctx.source, 'earth_migration') }))
  eventFolder.then(Commands.literal('sun').executes(function (ctx) { return devForceEvent(ctx.source, 'sun_labor') }))
  eventFolder.then(Commands.literal('war').executes(function (ctx) { return devForceEvent(ctx.source, 'war_trial') }))
  eventFolder.then(Commands.literal('moon').executes(function (ctx) { return devForceEvent(ctx.source, 'moon_silver') }))
  eventFolder.then(Commands.literal('blood').executes(function (ctx) { return devForceEvent(ctx.source, 'death_blood_moon') }))
  eventFolder.then(Commands.literal('cave').executes(function (ctx) { return devForceEvent(ctx.source, 'abyss_cave_night') }))
  eventFolder.then(Commands.literal('gaze').executes(function (ctx) { return devForceEvent(ctx.source, 'abyss_gaze') }))
  eventFolder.then(Commands.literal('hunt').executes(function (ctx) { return devForceEvent(ctx.source, 'abyss_hunt') }))
  eventFolder.then(Commands.literal('ritual').executes(function (ctx) { return devForceEvent(ctx.source, 'abyss_ritual') }))
  eventFolder.then(Commands.literal('voidmother').executes(function (ctx) { return devForceEvent(ctx.source, 'void_mother_challenge') }))
  eventFolder.then(Commands.literal('bell').executes(function (ctx) { return devForceEvent(ctx.source, 'ancient_bell') }))
  eventFolder.then(Commands.literal('calm').executes(function (ctx) { return devForceEvent(ctx.source, 'peaceful') }))

  eventFolder.then(Commands.literal('day').executes(function (ctx) {
    devSetTimeOfDayForward(ctx.source.server, 1000)
    devTell(ctx.source, '时间已向前推进到白昼；不会再把世界日期重置到 Day 0。', 'yellow')
    return 1
  }))

  eventFolder.then(Commands.literal('night').executes(function (ctx) {
    devSetTimeOfDayForward(ctx.source.server, 13000)
    devTell(ctx.source, '时间已向前推进到夜间；不会再把世界日期重置到 Day 0。', 'light_purple')
    return 1
  }))

  eventFolder.then(Commands.literal('nextday').executes(function (ctx) {
    ctx.source.server.runCommandSilent('time add 24000')
    devTell(ctx.source, '已推进一个 Minecraft 日；最多等待约 10 秒让核心准备新日。', 'green')
    return 1
  }))

  root.then(eventFolder)

  // ========================================================
  // ENTITY 文件夹
  // ========================================================

  var entityFolder = Commands.literal('entity').executes(function (ctx) {
    devShowEntityFolder(ctx.source)
    return 1
  })

  var entityBlood = Commands.literal('blood').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev entity blood random|zombie|archer|spider|beast|shadow', 'gray')
    return 1
  })

  entityBlood.then(Commands.literal('random').executes(function (ctx) { return devEntityBlood(ctx.source, 'random') }))
  entityBlood.then(Commands.literal('zombie').executes(function (ctx) { return devEntityBlood(ctx.source, 'zombie') }))
  entityBlood.then(Commands.literal('archer').executes(function (ctx) { return devEntityBlood(ctx.source, 'archer') }))
  entityBlood.then(Commands.literal('spider').executes(function (ctx) { return devEntityBlood(ctx.source, 'spider') }))
  entityBlood.then(Commands.literal('beast').executes(function (ctx) { return devEntityBlood(ctx.source, 'beast') }))
  entityBlood.then(Commands.literal('shadow').executes(function (ctx) { return devEntityBlood(ctx.source, 'shadow') }))
  entityFolder.then(entityBlood)

  var entityCave = Commands.literal('cave').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev entity cave elite', 'gray')
    return 1
  })
  entityCave.then(Commands.literal('elite').executes(function (ctx) { return devEntityCave(ctx.source) }))
  entityFolder.then(entityCave)

  var entityEarth = Commands.literal('earth').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev entity earth random|toucan|kangaroo|roadrunner|raccoon', 'gray')
    return 1
  })
  entityEarth.then(Commands.literal('random').executes(function (ctx) { return devEntityEarth(ctx.source, 'random') }))
  entityEarth.then(Commands.literal('toucan').executes(function (ctx) { return devEntityEarth(ctx.source, 'toucan') }))
  entityEarth.then(Commands.literal('kangaroo').executes(function (ctx) { return devEntityEarth(ctx.source, 'kangaroo') }))
  entityEarth.then(Commands.literal('roadrunner').executes(function (ctx) { return devEntityEarth(ctx.source, 'roadrunner') }))
  entityEarth.then(Commands.literal('raccoon').executes(function (ctx) { return devEntityEarth(ctx.source, 'raccoon') }))
  entityFolder.then(entityEarth)

  entityFolder.then(Commands.literal('clear').executes(function (ctx) { return devEntityClear(ctx.source) }))
  root.then(entityFolder)

  // ========================================================
  // PROJECT 文件夹
  // ========================================================

  var projectFolder = Commands.literal('project').executes(function (ctx) {
    devShowProjectFolder(ctx.source)
    return 1
  })

  projectFolder.then(Commands.literal('status').executes(function (ctx) { return devProjectStatus(ctx.source) }))
  projectFolder.then(Commands.literal('on').executes(function (ctx) { return devProjectOn(ctx.source) }))
  projectFolder.then(Commands.literal('off').executes(function (ctx) { return devProjectOff(ctx.source) }))
  projectFolder.then(Commands.literal('stop').executes(function (ctx) { return devProjectStop(ctx.source) }))
  projectFolder.then(Commands.literal('check').executes(function (ctx) { return devProjectCheck(ctx.source) }))
  projectFolder.then(Commands.literal('panic').executes(function (ctx) { return devProjectPanic(ctx.source) }))
  root.then(projectFolder)

  // ========================================================
  // SAFE 文件夹
  // ========================================================

  var safeFolder = Commands.literal('safe').executes(function (ctx) { return devSafeStatus(ctx.source) })
  safeFolder.then(Commands.literal('status').executes(function (ctx) { return devSafeStatus(ctx.source) }))
  safeFolder.then(Commands.literal('on').executes(function (ctx) { return devSafeSet(ctx.source, true) }))
  safeFolder.then(Commands.literal('off').executes(function (ctx) { return devSafeSet(ctx.source, false) }))
  root.then(safeFolder)

  // ========================================================
  // REWARD 文件夹
  // ========================================================

  var rewardFolder = Commands.literal('reward').executes(function (ctx) {
    devShowRewardFolder(ctx.source)
    return 1
  })

  var tokenFolder = Commands.literal('token').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev reward token 1|5|20', 'gray')
    return 1
  })
  tokenFolder.then(Commands.literal('1').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('giveDivineToken')) return 0
    global.giveDivineToken(player, 1)
    return 1
  }))
  tokenFolder.then(Commands.literal('5').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('giveDivineToken')) return 0
    global.giveDivineToken(player, 5)
    return 1
  }))
  tokenFolder.then(Commands.literal('20').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('giveDivineToken')) return 0
    global.giveDivineToken(player, 20)
    return 1
  }))
  rewardFolder.then(tokenFolder)

  var oracleFolder = Commands.literal('oracle').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev reward oracle once|ten|2star|3star|4star|5star|6star|anim2|anim3|anim4|anim5|anim6|cache|status|preview', 'gray')
    return 1
  })
  oracleFolder.then(Commands.literal('once').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleSingleRoll')) return 0
    return global.oracleSingleRoll(player, false) ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('ten').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDrawTen')) return 0
    return global.oracleDrawTen(player) ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('2star').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDevForce')) return 0
    return global.oracleDevForce(player, '2★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('3star').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDevForce')) return 0
    return global.oracleDevForce(player, '3★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('4star').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDevForce')) return 0
    return global.oracleDevForce(player, '4★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('5star').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDevForce')) return 0
    return global.oracleDevForce(player, '5★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('6star').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleDevForce')) return 0
    return global.oracleDevForce(player, '6★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('anim2').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleAnimationTest')) return 0
    return global.oracleAnimationTest(player, '2★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('anim3').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleAnimationTest')) return 0
    return global.oracleAnimationTest(player, '3★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('cache').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleCacheShow')) return 0
    global.oracleCacheShow(player)
    return 1
  }))
  oracleFolder.then(Commands.literal('anim4').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleAnimationTest')) return 0
    return global.oracleAnimationTest(player, '4★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('anim5').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleAnimationTest')) return 0
    return global.oracleAnimationTest(player, '5★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('anim6').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleAnimationTest')) return 0
    return global.oracleAnimationTest(player, '6★') ? 1 : 0
  }))
  oracleFolder.then(Commands.literal('status').executes(function (ctx) { return devRewardOracleStatus(ctx.source) }))
  oracleFolder.then(Commands.literal('preview').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oraclePreview')) return 0
    global.oraclePreview(player)
    return 1
  }))
  rewardFolder.then(oracleFolder)

  var relicFolder = Commands.literal('relic').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev reward relic 5star|rain|wind|tide|hearth|fire|earth|sun|moon|death|abyss|war|thunder|luokixi|list', 'gray')
    return 1
  })
  relicFolder.then(Commands.literal('5star').executes(function (ctx) { return devRewardRelic(ctx.source,5) }))
  var relicTests = [
    ['rain','rain_mother_gift'],['wind','wind_king_release'],['tide','tide_king_command'],['hearth','hearth_guard'],
    ['fire','fire_god_ember'],['earth','earth_father_order'],['sun','sun_king_favor'],['moon','moon_queen_gaze'],
    ['death','death_god_register'],['abyss','abyss_god_echo'],['war','war_god_oath'],['thunder','thunder_god_verdict'],['luokixi','luokixi_relic_wei']
  ]
  var relicTestIndex = 0
  for (relicTestIndex = 0; relicTestIndex < relicTests.length; relicTestIndex++) {
    (function (commandName,relicId) {
      relicFolder.then(Commands.literal(commandName).executes(function (ctx) {
        var player = devPlayer(ctx.source); if (!player || !devHas('oracleRelicGrant')) return 0
        var result = global.oracleRelicGrant(player,relicId,'dev')
        return result && result.ok ? 1 : 0
      }))
    })(relicTests[relicTestIndex][0],relicTests[relicTestIndex][1])
  }
  relicFolder.then(Commands.literal('rainbow').executes(function (ctx) {
    var player = devPlayer(ctx.source); if (!player || !devHas('oracleSpecialGrant')) return 0
    return global.oracleSpecialGrant(player,'forbidden_fruit',1,'dev').ok ? 1 : 0
  }))
  relicFolder.then(Commands.literal('godslayer').executes(function (ctx) {
    var player = devPlayer(ctx.source); if (!player || !devHas('oracleSpecialGrant')) return 0
    return global.oracleSpecialGrant(player,'godslayer_totem',1,'dev').ok ? 1 : 0
  }))
  relicFolder.then(Commands.literal('list').executes(function (ctx) {
    var player = devPlayer(ctx.source); if (!player || !devHas('oracleRelicShow')) return 0
    global.oracleRelicShow(player); return 1
  }))
  rewardFolder.then(relicFolder)

  var itemFolder = Commands.literal('item').executes(function (ctx) {
    devTell(ctx.source,'用法：/dev reward item godslayer|fruit|void|blood|oil|seal|list','gray')
    return 1
  })
  var specialTests = [
    ['godslayer','godslayer_totem'],['fruit','forbidden_fruit'],['void','void_mother_pearl'],
    ['blood','dragon_blood'],['oil','hunter_oil'],['seal','worldwalker_seal']
  ]
  var specialIndex=0
  for(specialIndex=0;specialIndex<specialTests.length;specialIndex++)(function(commandName,specialId){
    itemFolder.then(Commands.literal(commandName).executes(function(ctx){
      var player=devPlayer(ctx.source);if(!player||!devHas('oracleSpecialGrant'))return 0
      var r=global.oracleSpecialGrant(player,specialId,1,'dev');return r&&r.ok?1:0
    }))
  })(specialTests[specialIndex][0],specialTests[specialIndex][1])
  itemFolder.then(Commands.literal('list').executes(function(ctx){
    var catalog=global.oracleSpecialCatalog||{},id=''
    devTell(ctx.source,'===== 紫色命线 · 禁忌道具 =====','light_purple')
    for(id in catalog)if(catalog.hasOwnProperty(id))devTell(ctx.source,id+' · '+catalog[id].name,'gray')
    return 1
  }))
  rewardFolder.then(itemFolder)

  var ysmFolder = Commands.literal('ysm').executes(function (ctx) {
    devTell(ctx.source,'用法：/dev reward ysm status|import|reload|random|wearlast','gray')
    return 1
  })
  ysmFolder.then(Commands.literal('status').executes(function (ctx) { return devYsmStatus(ctx.source) }))
  ysmFolder.then(Commands.literal('import').executes(function (ctx) {
    var player=devPlayer(ctx.source); if(!player||!devHas('divineSkinImportHelp'))return 0
    global.divineSkinImportHelp(player); return 1
  }))
  ysmFolder.then(Commands.literal('reload').executes(function (ctx) { return devYsmReload(ctx.source) }))
  ysmFolder.then(Commands.literal('random').executes(function (ctx) { return devYsmGrant(ctx.source,'random') }))
  ysmFolder.then(Commands.literal('wearlast').executes(function (ctx) { return devYsmWearLast(ctx.source) }))
  rewardFolder.then(ysmFolder)

  var petFolder = Commands.literal('pet').executes(function (ctx) {
    devTell(ctx.source, '用法：/dev reward pet horse|wolf|donkey|doll', 'gray')
    return 1
  })
  petFolder.then(Commands.literal('horse').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleCompanionGrant')) return 0
    return global.oracleCompanionGrant(player, 'horse', 'dev').ok ? 1 : 0
  }))
  petFolder.then(Commands.literal('wolf').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleCompanionGrant')) return 0
    return global.oracleCompanionGrant(player, 'wolf', 'dev').ok ? 1 : 0
  }))
  petFolder.then(Commands.literal('donkey').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleCompanionGrant')) return 0
    return global.oracleCompanionGrant(player, 'donkey', 'dev').ok ? 1 : 0
  }))
  petFolder.then(Commands.literal('doll').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('oracleCompanionGrant')) return 0
    return global.oracleCompanionGrant(player, 'maiden_doll', 'dev').ok ? 1 : 0
  }))
  rewardFolder.then(petFolder)
  root.then(rewardFolder)

  // ========================================================
  // HISTORY 文件夹
  // ========================================================

  var historyFolder = Commands.literal('history').executes(function (ctx) {
    devShowHistoryFolder(ctx.source)
    return 1
  })
  historyFolder.then(Commands.literal('show').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('historyShowOverview')) return 0
    global.historyShowOverview(player)
    return 1
  }))
  historyFolder.then(Commands.literal('server').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('historyShowServerRecords')) return 0
    global.historyShowServerRecords(player)
    return 1
  }))
  historyFolder.then(Commands.literal('refresh').executes(function (ctx) {
    if (!devHas('divineStationRefreshHistory')) return 0
    var ok = global.divineStationRefreshHistory(ctx.source.server,true)
    devTell(ctx.source, ok ? '悬浮历史表已刷新。' : '尚未建立历史图书馆。', ok ? 'green' : 'yellow')
    return ok ? 1 : 0
  }))
  historyFolder.then(Commands.literal('reset').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('historyResetPlayer')) return 0
    global.historyResetPlayer(player)
    devTell(ctx.source, '你的诸神纪事测试数据已重置。', 'yellow')
    return 1
  }))
  root.then(historyFolder)

  // ========================================================
  // STATION 文件夹
  // ========================================================

  var stationFolder = Commands.literal('station').executes(function (ctx) {
    devShowStationFolder(ctx.source)
    return 1
  })
  stationFolder.then(Commands.literal('status').executes(function (ctx) { return devStationStatus(ctx.source) }))
  stationFolder.then(Commands.literal('test').executes(function (ctx) { return devStationSelfTest(ctx.source) }))
  stationFolder.then(Commands.literal('purge').executes(function (ctx) { return devStationPurge(ctx.source,'all') }))

  var oracleStation = Commands.literal('oracle').executes(function (ctx) {
    devShowOracleStationFolder(ctx.source)
    return 1
  })
  oracleStation.then(Commands.literal('set').executes(function (ctx) { return devStationSet(ctx.source,'oracle','front') }))
  oracleStation.then(Commands.literal('sethere').executes(function (ctx) { return devStationSet(ctx.source,'oracle','here') }))
  oracleStation.then(Commands.literal('refresh').executes(function (ctx) { return devStationRefresh(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('repair').executes(function (ctx) { return devStationRepair(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('rebuild').executes(function (ctx) { return devStationRefresh(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('next').executes(function (ctx) { return devStationNext(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('project4').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('divineStationProjectDemo')) return 0
    return global.divineStationProjectDemo(player,'4★') ? 1 : 0
  }))
  oracleStation.then(Commands.literal('project5').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('divineStationProjectDemo')) return 0
    return global.divineStationProjectDemo(player,'5★') ? 1 : 0
  }))
  oracleStation.then(Commands.literal('tp').executes(function (ctx) { return devStationTeleport(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('remove').executes(function (ctx) { return devStationRemove(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('purge').executes(function (ctx) { return devStationPurge(ctx.source,'oracle') }))
  oracleStation.then(Commands.literal('test').executes(function (ctx) { return devStationSelfTest(ctx.source) }))

  stationFolder.then(oracleStation)

  var historyStation = Commands.literal('history').executes(function (ctx) {
    devShowHistoryStationFolder(ctx.source)
    return 1
  })
  historyStation.then(Commands.literal('set').executes(function (ctx) { return devStationSet(ctx.source,'history','front') }))
  historyStation.then(Commands.literal('sethere').executes(function (ctx) { return devStationSet(ctx.source,'history','here') }))
  historyStation.then(Commands.literal('refresh').executes(function (ctx) { return devStationRefresh(ctx.source,'history') }))
  historyStation.then(Commands.literal('repair').executes(function (ctx) { return devStationRepair(ctx.source,'history') }))
  historyStation.then(Commands.literal('rebuild').executes(function (ctx) { return devStationRefresh(ctx.source,'history') }))
  historyStation.then(Commands.literal('next').executes(function (ctx) { return devStationNext(ctx.source,'history') }))
  historyStation.then(Commands.literal('tp').executes(function (ctx) { return devStationTeleport(ctx.source,'history') }))
  historyStation.then(Commands.literal('remove').executes(function (ctx) { return devStationRemove(ctx.source,'history') }))
  historyStation.then(Commands.literal('purge').executes(function (ctx) { return devStationPurge(ctx.source,'history') }))
  historyStation.then(Commands.literal('test').executes(function (ctx) { return devStationSelfTest(ctx.source) }))
  stationFolder.then(historyStation)
  root.then(stationFolder)

  // ========================================================
  // GUIDE
  // ========================================================

  root.then(Commands.literal('guide').executes(function (ctx) {
    var player = devPlayer(ctx.source)
    if (!player || !devHas('giveRachelGuide')) return 0
    return global.giveRachelGuide(player, true) ? 1 : 0
  }))

  event.register(root)
})
