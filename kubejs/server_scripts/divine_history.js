// ============================================================
// Luokixi 世界纪事 V5.0
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 历史不只藏在 /history 里：
// - 同一道料理再次出现时，厨房会记得
// - 第一个击败末影龙、第一次完成某道回礼会进入公共纪事
// - 死亡、钻石记录、神谕见证、斗神胜利与 5★ 命线会更新图书馆榜单
// - 重要里程碑会在日常行为发生时自然出现，而不是要求玩家专门查菜单
//
// 性能：
// - 没有 Tick
// - 只在真实事件发生时更新
// - 公共榜单只保存当前纪录保持者，不遍历离线玩家
// ============================================================

var HISTORY_RECENT_LIMIT = 16
var HISTORY_ORACLE_RECENT_LIMIT = 24

var HISTORY_EVENT_LABELS = {
  rain_harvest:'雨母的赞许 · 丰收之日',
  wind_road:'风王的平等赞许 · 远行之日',
  sea_bounty:'潮王的回赠 · 深水之日',
  fire_hearth:'炉神的收容 · 不燃之日',
  earth_migration:'土父翻身 · 大迁徙',
  sun_labor:'日王的嘉奖 · 劳作之日',
  death_blood_moon:'死神的点名 · 血月',
  abyss_cave_night:'渊神的第二声 · 洞穴之夜',
  war_trial:'斗神的铁誓 · 战意之夜',
  moon_silver:'月后的垂怜 · 银辉之夜'
}

function historyTell(player,json) {
  if (!player || !player.server) return
  player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json))
}

function historyButton(text,command,color) {
  return {
    text:'[ ' + text + ' ]',
    color:color,
    bold:true,
    clickEvent:{action:'run_command',value:command},
    hoverEvent:{action:'show_text',contents:{text:text,color:'gray'}}
  }
}

function historyCurrentDay(server) {
  if (!server) return 0
  try {
    var level = server.getLevel('minecraft:overworld')
    if (!level) return 0
    var raw = Number(level.getLevelData().getDayTime())
    if (isNaN(raw)) return 0
    return Math.floor(raw / 24000)
  } catch (error) { return 0 }
}

function historySanitize(value) {
  var text = String(value == null ? '' : value)
  text = text.replace(/\|/g,'／').replace(/~/g,'·').replace(/[\r\n]+/g,' ')
  if (text.length > 140) text = text.substring(0,140)
  return text
}

function historySplit(raw) {
  if (!raw || raw.length <= 0) return []
  return raw.split('||')
}

function historyJoinLimited(entries,limit) {
  var result = []
  var i = 0
  for (i = 0; i < entries.length && result.length < limit; i++) if (entries[i]) result.push(entries[i])
  return result.join('||')
}

function historyInitPlayer(player) {
  if (!player || !player.server) return false
  if (player.persistentData.getBoolean('divineHistoryStarted')) return false

  var day = historyCurrentDay(player.server)
  player.persistentData.putBoolean('divineHistoryStarted',true)
  player.persistentData.putInt('divineHistoryFirstDay',day)
  player.persistentData.putString('divineHistoryRecent','')
  player.persistentData.putString('divineOracleRecent','')

  historyPushMoment(player,'起行','Luokixi 从第 ' + day + ' 天开始替这个世界记下你的名字。此前的道路，没有人替你数。')
  return true
}

function historyPushMoment(player,kind,text) {
  if (!player || !player.server) return
  if (!player.persistentData.getBoolean('divineHistoryStarted')) {
    player.persistentData.putBoolean('divineHistoryStarted',true)
    player.persistentData.putInt('divineHistoryFirstDay',historyCurrentDay(player.server))
  }

  var day = historyCurrentDay(player.server)
  var entry = day + '~' + historySanitize(kind) + '~' + historySanitize(text)
  var oldEntries = historySplit(player.persistentData.getString('divineHistoryRecent'))
  var next = [entry]
  var i = 0
  for (i = 0; i < oldEntries.length && next.length < HISTORY_RECENT_LIMIT; i++) if (oldEntries[i]) next.push(oldEntries[i])
  player.persistentData.putString('divineHistoryRecent',historyJoinLimited(next,HISTORY_RECENT_LIMIT))
}

function historyPushOracleResult(player,rarity,name,kind) {
  if (!player) return
  var entry = historySanitize(rarity) + '~' + historySanitize(name) + '~' + historySanitize(kind)
  var oldEntries = historySplit(player.persistentData.getString('divineOracleRecent'))
  var next = [entry]
  var i = 0
  for (i = 0; i < oldEntries.length && next.length < HISTORY_ORACLE_RECENT_LIMIT; i++) if (oldEntries[i]) next.push(oldEntries[i])
  player.persistentData.putString('divineOracleRecent',historyJoinLimited(next,HISTORY_ORACLE_RECENT_LIMIT))
}

function historyPlayerName(player) {
  try { return String(player.username) } catch (ignored) { return '未知旅人' }
}

function historyRecordKey(key) { return 'historyRecord_' + key }

function historyUpdateLeader(server,key,player,value) {
  if (!server || !player) return false
  var data = server.persistentData
  var nameKey = historyRecordKey(key) + '_name'
  var valueKey = historyRecordKey(key) + '_value'
  var currentName = data.getString(nameKey)
  var currentValue = data.getInt(valueKey)
  var name = historyPlayerName(player)

  if (currentName == name || value > currentValue || !currentName) {
    data.putString(nameKey,name)
    data.putInt(valueKey,value)
    historyRefreshPublicBoard(server)
    return value > currentValue || !currentName
  }
  return false
}

function historyRefreshPublicBoard(server) {
  if (!server) return
  server.persistentData.putBoolean('divineHistoryBoardDirty',true)
  try {
    if (global.divineStationRefreshHistory && typeof global.divineStationRefreshHistory == 'function') {
      global.divineStationRefreshHistory(server,false)
    }
  } catch (error) {
    console.log('[DivineHistory] Board refresh failed: ' + error)
  }
}

function historyBroadcast(server,components) {
  if (!server) return
  server.runCommandSilent('tellraw @a ' + JSON.stringify(components))
}

function historyRefreshTitles(player) {
  try { if (global.oracleTitleRefresh && typeof global.oracleTitleRefresh == 'function') global.oracleTitleRefresh(player,true) } catch (ignored) {}
}

function historyRecordEvent(player,id,deity,name) {
  if (!player || !player.server || !id) return
  historyInitPlayer(player)

  var countKey = 'historyEventCount_' + id
  var firstKey = 'historyEventFirst_' + id
  var lastKey = 'historyEventLast_' + id
  var day = historyCurrentDay(player.server)
  var count = player.persistentData.getInt(countKey) + 1
  var total = player.persistentData.getInt('historyTotalEvents') + 1

  player.persistentData.putInt(countKey,count)
  player.persistentData.putInt('historyTotalEvents',total)
  if (player.persistentData.getInt(firstKey) <= 0) player.persistentData.putInt(firstKey,day)
  player.persistentData.putInt(lastKey,day)

  historyPushMoment(player,'神谕',(deity ? deity + '留下' : '诸神留下') + '「' + (name || HISTORY_EVENT_LABELS[id] || id) + '」。')
  historyUpdateLeader(player.server,'events',player,total)
  historyRefreshTitles(player)
}

function historyRecordEventAll(server,id,deity,name) {
  if (!server || !id) return
  var i = 0
  for (i = 0; i < server.players.size(); i++) historyRecordEvent(server.players.get(i),id,deity,name)
}

function historyMilestone(count) {
  return count == 1 || count == 5 || count == 10 || count == 25 || count == 50 || count == 100 || count == 250
}

function historyRecordEliteKill(player,id,name) {
  if (!player || !id) return
  historyInitPlayer(player)
  var key = 'historyElite_' + id
  var count = player.persistentData.getInt(key) + 1
  player.persistentData.putInt(key,count)
  player.persistentData.putInt('historyEliteTotal',player.persistentData.getInt('historyEliteTotal') + 1)

  if (id.indexOf('blood_') == 0) player.persistentData.putInt('historyBloodEliteKills',player.persistentData.getInt('historyBloodEliteKills') + 1)
  if (id.indexOf('cave_') == 0) player.persistentData.putInt('historyCaveEliteKills',player.persistentData.getInt('historyCaveEliteKills') + 1)

  if (historyMilestone(count)) historyPushMoment(player,'猎杀','第 ' + count + ' 次击败「' + (name || id) + '」。它的名字被划进了纪事边页。')
  historyRefreshTitles(player)
}

function historyRecordWarKill(player,entityId,undead) {
  if (!player) return
  historyInitPlayer(player)
  var total = player.persistentData.getInt('historyWarKills') + 1
  player.persistentData.putInt('historyWarKills',total)
  if (undead) player.persistentData.putInt('historyWarUndeadKills',player.persistentData.getInt('historyWarUndeadKills') + 1)
  if (total == 5 || total == 15 || total == 30 || total == 50 || total == 100 || total == 250) historyPushMoment(player,'铁誓','瓦尔卡恩在铁册上记下了你的第 ' + total + ' 次胜利。')
  historyUpdateLeader(player.server,'war',player,total)
  historyRefreshTitles(player)
}

function historyRecordHarvestGift(player,dishId,dishName) {
  if (!player) return 0
  historyInitPlayer(player)
  var count = player.persistentData.getInt('historyHarvestGift_' + dishId) + 1
  player.persistentData.putInt('historyHarvestGifts',player.persistentData.getInt('historyHarvestGifts') + 1)
  player.persistentData.putInt('historyHarvestGift_' + dishId,count)
  historyPushMoment(player,'长桌','雨母的长桌为你留下一份「' + dishName + '」。这是第 ' + count + ' 次。')
  return count
}

function historyRecordHarvestCooked(player,dishId,dishName) {
  if (!player || !player.server) return
  historyInitPlayer(player)
  var count = player.persistentData.getInt('historyHarvestCooked') + 1
  var dishCount = player.persistentData.getInt('historyHarvestCooked_' + dishId) + 1
  player.persistentData.putInt('historyHarvestCooked',count)
  player.persistentData.putInt('historyHarvestCooked_' + dishId,dishCount)
  historyPushMoment(player,'炉火','你亲手完成了「' + dishName + '」。这是炉火记住的第 ' + count + ' 次回礼。')

  var server = player.server
  var firstKey = 'historyFirstDish_' + dishId
  if (!server.persistentData.getString(firstKey)) {
    server.persistentData.putString(firstKey,historyPlayerName(player))
    server.persistentData.putInt(firstKey + '_day',historyCurrentDay(server))
    historyBroadcast(server,[
      {text:'✦ 世界纪事 · ',color:'gold',bold:true},
      {text:historyPlayerName(player),color:'green'},
      {text:' 是第一个把「' + dishName + '」作为回礼送回雨母长桌的人。',color:'gray'}
    ])
    historyRefreshPublicBoard(server)
  }
}

function historyRecordOracleDraw(player,rarity,name,kind) {
  if (!player || !player.server) return
  historyInitPlayer(player)
  player.persistentData.putInt('historyOracleDraws',player.persistentData.getInt('historyOracleDraws') + 1)
  player.persistentData.putInt('historyOracle_' + rarity,player.persistentData.getInt('historyOracle_' + rarity) + 1)
  historyPushOracleResult(player,rarity,name,kind)

  if (rarity == '6★') {
    var six = player.persistentData.getInt('historyOracle_6★')
    historyPushMoment(player,'红线','第 ' + six + ' 次，旧匣里出现了本来不该写进目录的红色命线：' + name + '。')
  } else if (rarity == '5★') {
    var five = player.persistentData.getInt('historyOracle_5★')
    historyPushMoment(player,'旧匣','三纺女把第 ' + five + ' 缕金色命线交给你：' + name + '。')
    historyUpdateLeader(player.server,'five',player,five)
  }
  historyRefreshTitles(player)
}

function historyRecordSkinUnlock(player,id,name) {
  if (!player) return
  historyInitPlayer(player)
  player.persistentData.putInt('historySkinUnlocks',player.persistentData.getInt('historySkinUnlocks') + 1)
  historyPushMoment(player,'幻形','衣柜第一次记住了「' + name + '」的样子。')
  historyRefreshTitles(player)
}

function historyRecordPetUnlock(player,id,name) {
  if (!player) return
  historyInitPlayer(player)
  player.persistentData.putInt('historyPetUnlocks',player.persistentData.getInt('historyPetUnlocks') + 1)
  historyPushMoment(player,'同行者','「' + name + '」认出了你的口哨。')
}

function historyRecordRelicUnlock(player,id,name,tier) {
  if (!player) return
  historyInitPlayer(player)
  player.persistentData.putInt('historyRelicUnlocks',player.persistentData.getInt('historyRelicUnlocks') + 1)
  historyPushMoment(player,'遗物',(tier == 6 ? '红色彩蛋遗物' : (tier == 5 ? '金色遗物' : '紫色遗物')) + '「' + name + '」落进了你的手里。')
  historyRefreshTitles(player)
}

function historyRecordDeath(player) {
  if (!player || !player.server) return
  historyInitPlayer(player)
  var count = player.persistentData.getInt('historyDeaths') + 1
  player.persistentData.putInt('historyDeaths',count)
  historyUpdateLeader(player.server,'deaths',player,count)

  if (count == 1) {
    historyPushMoment(player,'归来','你第一次从死亡以后重新睁开眼。罗盘和手札都记得回来的路。')
  } else if (count == 10 || count == 25 || count == 50 || count == 100) {
    player.tell(Text.gray('图书馆在你的名字旁添了一道很轻的墨痕：这是第 ' + count + ' 次归来。'))
    historyPushMoment(player,'归来','第 ' + count + ' 次从死亡以后回来。')
  }
  historyRefreshTitles(player)
}

function historyRecordDiamonds(player,amount,source) {
  if (!player || !player.server || !amount || amount <= 0) return
  historyInitPlayer(player)
  var total = player.persistentData.getInt('historyDiamonds') + amount
  player.persistentData.putInt('historyDiamonds',total)
  historyUpdateLeader(player.server,'diamonds',player,total)

  if (total == 10 || total == 25 || total == 50 || total == 100 || total == 250 || total == 500) {
    player.tell(Text.aqua('图书馆记下了你的第 ' + total + ' 枚钻石。' + (source ? '这一笔来自' + source + '。' : '')))
    historyPushMoment(player,'矿光','钻石记录抵达 ' + total + '。')
  }
}

function historyRecordBossKill(player,entityId,bossName) {
  if (!player || !player.server) return
  historyInitPlayer(player)
  var key = 'historyBoss_' + entityId
  var count = player.persistentData.getInt(key) + 1
  player.persistentData.putInt(key,count)
  player.persistentData.putInt('historyBossKills',player.persistentData.getInt('historyBossKills') + 1)
  historyPushMoment(player,'远征','你击败了「' + bossName + '」。这是第 ' + count + ' 次。')

  if (entityId == 'minecraft:ender_dragon') {
    var server = player.server
    if (!server.persistentData.getString('historyFirstDragonName')) {
      server.persistentData.putString('historyFirstDragonName',historyPlayerName(player))
      server.persistentData.putInt('historyFirstDragonDay',historyCurrentDay(server))
      historyBroadcast(server,[
        {text:'✦ 世界纪事 · 第一位通关者\n',color:'gold',bold:true},
        {text:historyPlayerName(player),color:'light_purple',bold:true},
        {text:' 在第 ' + historyCurrentDay(server) + ' 天击败了末影龙。此后，每一本公共纪事都会留下这一页。',color:'gray'}
      ])
      historyRefreshPublicBoard(server)
    }
  }
  historyRefreshTitles(player)
}

function historyParseMoment(entry) {
  var parts = String(entry || '').split('~')
  return {day:parts.length > 0 ? parts[0] : '?',kind:parts.length > 1 ? parts[1] : '记事',text:parts.length > 2 ? parts.slice(2).join('~') : ''}
}

function historyNav(player) {
  historyTell(player,[
    historyButton('近来','/history recent','gold'),{text:'  '},
    historyButton('诸神','/history events','aqua'),{text:'  '},
    historyButton('战斗','/history combat','red'),{text:'\n'},
    historyButton('炉火','/history kitchen','green'),{text:'  '},
    historyButton('旧匣','/history oracle','light_purple'),{text:'  '},
    historyButton('公共纪事','/history server','blue'),{text:'  '},
    historyButton('称号','/titles','gold')
  ])
}

function historyShowOverview(player) {
  if (!player || !player.server) return
  historyInitPlayer(player)
  var firstDay = player.persistentData.getInt('divineHistoryFirstDay')
  var currentDay = historyCurrentDay(player.server)
  historyTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
    {text:'📜 你的世界纪事\n',color:'gold',bold:true},
    {text:'从第 ' + firstDay + ' 天起，这个世界开始记得你的路。如今是第 ' + currentDay + ' 天。\n\n',color:'gray',italic:true},
    {text:'见证神谕 · ' + player.persistentData.getInt('historyTotalEvents') + '\n',color:'aqua'},
    {text:'斗神胜利 · ' + player.persistentData.getInt('historyWarKills') + '\n',color:'red'},
    {text:'死亡与归来 · ' + player.persistentData.getInt('historyDeaths') + '\n',color:'gray'},
    {text:'钻石记录 · ' + player.persistentData.getInt('historyDiamonds') + '\n',color:'blue'},
    {text:'丰收回礼 · ' + player.persistentData.getInt('historyHarvestCooked') + '\n',color:'green'},
    {text:'旧匣抽取 · ' + player.persistentData.getInt('historyOracleDraws') + '\n',color:'light_purple'},
    {text:'幻形 / 同行者 / 遗物 · ' + player.persistentData.getInt('historySkinUnlocks') + ' / ' + player.persistentData.getInt('historyPetUnlocks') + ' / ' + player.persistentData.getInt('historyRelicUnlocks') + '\n',color:'yellow'},
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
  ])
  historyNav(player)
}

function historyShowRecent(player) {
  if (!player) return
  historyInitPlayer(player)
  historyTell(player,{text:'📖 近来的页角',color:'gold',bold:true})
  var entries = historySplit(player.persistentData.getString('divineHistoryRecent'))
  var i = 0
  if (entries.length <= 0) {
    historyTell(player,{text:'这几页还没有留下字。',color:'gray'})
    historyNav(player)
    return
  }
  for (i = 0; i < entries.length; i++) {
    var moment = historyParseMoment(entries[i])
    historyTell(player,[{text:'第 ' + moment.day + ' 天 · ' + moment.kind + '\n',color:'dark_aqua',bold:true},{text:moment.text,color:'gray'}])
  }
  historyNav(player)
}

function historyShowEvents(player) {
  if (!player) return
  historyTell(player,{text:'☀ 诸神留下的次数',color:'aqua',bold:true})
  var ids = ['rain_harvest','wind_road','sea_bounty','fire_hearth','earth_migration','sun_labor','war_trial','moon_silver','death_blood_moon','abyss_cave_night']
  var i = 0
  var shown = 0
  for (i = 0; i < ids.length; i++) {
    var count = player.persistentData.getInt('historyEventCount_' + ids[i])
    if (count <= 0) continue
    shown++
    historyTell(player,[{text:'✦ ' + HISTORY_EVENT_LABELS[ids[i]],color:'gold'},{text:' ×' + count,color:'gray'},{text:'  首次第 ' + player.persistentData.getInt('historyEventFirst_' + ids[i]) + ' 天',color:'dark_gray'}])
  }
  if (shown <= 0) historyTell(player,{text:'诸神还没有在这本纪事里留下姓名。',color:'gray'})
  historyNav(player)
}

function historyShowCombat(player) {
  if (!player) return
  historyTell(player,[
    {text:'⚔ 铁册与名册\n',color:'red',bold:true},
    {text:'斗神胜利 · ' + player.persistentData.getInt('historyWarKills') + '\n',color:'gray'},
    {text:'其中亡灵 · ' + player.persistentData.getInt('historyWarUndeadKills') + '\n',color:'dark_gray'},
    {text:'血月精英 · ' + player.persistentData.getInt('historyBloodEliteKills') + '\n',color:'dark_red'},
    {text:'洞穴未归者 · ' + player.persistentData.getInt('historyCaveEliteKills') + '\n',color:'dark_aqua'},
    {text:'末影龙 · ' + player.persistentData.getInt('historyBoss_minecraft:ender_dragon'),color:'light_purple'}
  ])
  historyNav(player)
}

function historyShowKitchen(player) {
  if (!player) return
  historyTell(player,[
    {text:'🌧 雨母长桌与炉火\n',color:'green',bold:true},
    {text:'收到料理 · ' + player.persistentData.getInt('historyHarvestGifts') + '\n',color:'gray'},
    {text:'亲手回礼 · ' + player.persistentData.getInt('historyHarvestCooked') + '\n',color:'gold'},
    {text:'厨房记得的不是速度，而是同一道菜再次出现时，你还记得上一次说过什么。',color:'dark_gray',italic:true}
  ])
  historyNav(player)
}

function historyShowOracle(player) {
  if (!player) return
  historyTell(player,[
    {text:'✦ 三纺女的抽取记录\n',color:'light_purple',bold:true},
    {text:'全部抽取 · ' + player.persistentData.getInt('historyOracleDraws') + '\n',color:'gray'},
    {text:'2★ · ' + player.persistentData.getInt('historyOracle_2★') + '    3★ · ' + player.persistentData.getInt('historyOracle_3★') + '\n',color:'gray'},
    {text:'4★ · ' + player.persistentData.getInt('historyOracle_4★') + '    5★ · ' + player.persistentData.getInt('historyOracle_5★') + '\n',color:'light_purple'},
    {text:'6★ 彩蛋 · ' + player.persistentData.getInt('historyOracle_6★'),color:'red',bold:true}
  ])
  historyNav(player)
}

function historyShowCompanions(player) {
  if (!player) return
  historyTell(player,[
    {text:'🐾 衣柜、同行者与遗物\n',color:'yellow',bold:true},
    {text:'已解锁幻形 · ' + player.persistentData.getInt('historySkinUnlocks') + '\n',color:'light_purple'},
    {text:'已解锁同行者 · ' + player.persistentData.getInt('historyPetUnlocks') + '\n',color:'gold'},
    {text:'已辨认遗物 · ' + player.persistentData.getInt('historyRelicUnlocks') + '\n',color:'aqua'},
    historyButton('打开衣柜','/wardrobe','light_purple'),{text:'  '},
    historyButton('同行者','/companions','yellow'),{text:'  '},
    historyButton('遗物柜','/relics','aqua')
  ])
  historyNav(player)
}

function historyRecordLine(server,key,label,color) {
  var name = server.persistentData.getString(historyRecordKey(key) + '_name') || '尚无人留下记录'
  var value = server.persistentData.getInt(historyRecordKey(key) + '_value')
  return {text:label + ' · ' + name + (value > 0 ? '  ' + value : '') + '\n',color:color}
}

function historyServerComponents(server) {
  if (!server) return [{text:'公共纪事暂时无法读取。',color:'red'}]
  var firstDragon = server.persistentData.getString('historyFirstDragonName') || '尚无人抵达终末之地的最后一页'
  var firstDay = server.persistentData.getInt('historyFirstDragonDay')
  return [
    {text:'✦ Luokixi 世界纪事馆\n',color:'gold',bold:true},
    {text:'首位击败末影龙 · ' + firstDragon + (firstDay > 0 ? '  第 ' + firstDay + ' 天' : '') + '\n',color:'light_purple'},
    historyRecordLine(server,'diamonds','钻石记录最多','aqua'),
    historyRecordLine(server,'deaths','死亡与归来最多','gray'),
    historyRecordLine(server,'events','见证神谕最多','blue'),
    historyRecordLine(server,'war','斗神胜利最多','red'),
    historyRecordLine(server,'five','金色命线最多','gold'),
    {text:'\n记录只统计本系统安装后发生的事情。',color:'dark_gray',italic:true}
  ]
}

function historyShowServerRecords(player) {
  if (!player || !player.server) return
  historyTell(player,[{text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'}].concat(historyServerComponents(player.server)).concat([
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
    historyButton('查看个人纪事','/history','aqua')
  ]))
}

function historyResetPlayer(player) {
  if (!player) return false
  var keys = [
    'divineHistoryStarted','divineHistoryFirstDay','divineHistoryRecent','divineOracleRecent',
    'historyTotalEvents','historyEliteTotal','historyBloodEliteKills','historyCaveEliteKills',
    'historyWarKills','historyWarUndeadKills','historyHarvestGifts','historyHarvestCooked',
    'historyOracleDraws','historyOracle_2★','historyOracle_3★','historyOracle_4★','historyOracle_5★','historyOracle_6★',
    'historySkinUnlocks','historyPetUnlocks','historyRelicUnlocks','historyDeaths','historyDiamonds','historyBossKills'
  ]
  var eventIds = ['rain_harvest','wind_road','sea_bounty','fire_hearth','earth_migration','sun_labor','war_trial','moon_silver','death_blood_moon','abyss_cave_night']
  var eliteIds = ['blood_zombie','blood_archer','blood_spider','cave_prospector']
  var i = 0
  for (i = 0; i < eventIds.length; i++) {
    keys.push('historyEventCount_' + eventIds[i])
    keys.push('historyEventFirst_' + eventIds[i])
    keys.push('historyEventLast_' + eventIds[i])
  }
  for (i = 0; i < eliteIds.length; i++) keys.push('historyElite_' + eliteIds[i])
  for (i = 0; i < keys.length; i++) try { player.persistentData.remove(keys[i]) } catch (ignored) {}
  historyInitPlayer(player)
  return true
}

function historyHasSilkTouch(player) {
  if (!player) return false
  try {
    var item = player.mainHandItem
    if (!item) return false
    if (item.enchantments && item.enchantments.getLevel) {
      if (item.enchantments.getLevel('minecraft:silk_touch') > 0) return true
    }
    if (item.nbt && String(item.nbt).indexOf('minecraft:silk_touch') >= 0) return true
  } catch (ignored) {}
  return false
}

function historyDiamondOreBroken(event) {
  try {
    var player = event.player
    if (!player) return

    // 丝触矿石可以被重复放置。为了不让公共纪录被同一块矿反复刷高，
    // 丝触采集本身不计入钻石纪录；普通或时运开采按矿石方块记 1。
    if (historyHasSilkTouch(player)) return
    historyRecordDiamonds(player,1,'矿脉')
  } catch (error) {
    console.log('[DivineHistory] Diamond ore record failed: ' + error)
  }
}

BlockEvents.broken('minecraft:diamond_ore',historyDiamondOreBroken)
BlockEvents.broken('minecraft:deepslate_diamond_ore',historyDiamondOreBroken)

PlayerEvents.loggedIn(function (event) {
  try {
    var player = event.player
    if (!player) return
    try { if (String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer') >= 0) return } catch (ignoredFake) {}
    historyInitPlayer(player)
  } catch (error) { console.log('[DivineHistory] Login init failed: ' + error) }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('history')
  root.executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowOverview(p); return 1 })
  root.then(Commands.literal('recent').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowRecent(p); return 1 }))
  root.then(Commands.literal('events').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowEvents(p); return 1 }))
  root.then(Commands.literal('combat').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowCombat(p); return 1 }))
  root.then(Commands.literal('kitchen').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowKitchen(p); return 1 }))
  root.then(Commands.literal('oracle').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowOracle(p); return 1 }))
  root.then(Commands.literal('companions').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowCompanions(p); return 1 }))
  root.then(Commands.literal('server').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; historyShowServerRecords(p); return 1 }))
  event.register(root)
})

global.historyInitPlayer = historyInitPlayer
global.historyPushMoment = historyPushMoment
global.historyRecordEventAll = historyRecordEventAll
global.historyRecordEvent = historyRecordEvent
global.historyRecordEliteKill = historyRecordEliteKill
global.historyRecordWarKill = historyRecordWarKill
global.historyRecordHarvestGift = historyRecordHarvestGift
global.historyRecordHarvestCooked = historyRecordHarvestCooked
global.historyRecordOracleDraw = historyRecordOracleDraw
global.historyRecordSkinUnlock = historyRecordSkinUnlock
global.historyRecordPetUnlock = historyRecordPetUnlock
global.historyRecordRelicUnlock = historyRecordRelicUnlock
global.historyRecordDeath = historyRecordDeath
global.historyRecordDiamonds = historyRecordDiamonds
global.historyRecordBossKill = historyRecordBossKill
global.historyShowOverview = historyShowOverview
global.historyShowServerRecords = historyShowServerRecords
global.historyServerComponents = historyServerComponents
global.historyResetPlayer = historyResetPlayer
