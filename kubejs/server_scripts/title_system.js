// ============================================================
// Luokixi 称号系统 V1.0 / KubeJS V10.6.1
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 设计原则：
// - 称号来自真实经历，不靠在线时长硬磨。
// - 不改玩家名、不占 scoreboard team，不和现有昵称/YSM/权限插件抢显示层。
// - 聊天只装饰“消息正文”，可以由玩家自行关闭。
// - HUD 是可选的轻量 Painter 标签；没有后台 tick。
// - 解锁条件读取现有 persistentData / 世界纪事 / 挑战记录；旧存档可自动补领。
// ============================================================

var ORACLE_TITLE_VERSION = 1
var ORACLE_TITLE_PAGE_SIZE = 6

var ORACLE_TITLE_RELIC_IDS = [
  'rain_mother_gift','wind_king_release','tide_king_command','hearth_guard',
  'fire_god_ember','earth_father_order','sun_king_favor','moon_queen_gaze',
  'death_god_register','abyss_god_echo','war_god_oath','thunder_god_verdict'
]

var ORACLE_TITLES = [
  {
    id:'traveler',name:'远行者',rarity:'普通',color:'gray',accent:'#9AA0A8',icon:'◇',secret:false,
    flavor:'世界还没有替你下定义。',desc:'默认称号。任何踏进 Luokixi 的旅人都可以使用。',
    condition:function(player){return true},progress:function(player){return {now:1,max:1,text:'已经抵达'}}
  },
  {
    id:'oracle_witness',name:'神谕见证者',rarity:'稀有',color:'aqua',accent:'#55DDE0',icon:'✦',secret:false,
    flavor:'你已经学会分辨天色改变以前的那一瞬。',desc:'累计见证 10 次神谕事件。',
    condition:function(player){return titleInt(player,'historyTotalEvents')>=10},progress:function(player){return titleProgress(titleInt(player,'historyTotalEvents'),10,'神谕')}
  },
  {
    id:'blood_marked',name:'血月刻名者',rarity:'稀有',color:'dark_red',accent:'#B33A4A',icon:'✶',secret:false,
    flavor:'那轮月亮认得你。',desc:'击败 10 只血月特殊个体。',
    condition:function(player){return titleInt(player,'historyBloodEliteKills')>=10},progress:function(player){return titleProgress(titleInt(player,'historyBloodEliteKills'),10,'血月精英')}
  },
  {
    id:'blood_reaper',name:'赤月猎首',rarity:'史诗',color:'red',accent:'#E05260',icon:'✹',secret:false,
    flavor:'血月不再是围猎你的夜晚。',desc:'击败 50 只血月特殊个体。',
    condition:function(player){return titleInt(player,'historyBloodEliteKills')>=50},progress:function(player){return titleProgress(titleInt(player,'historyBloodEliteKills'),50,'血月精英')}
  },
  {
    id:'iron_oath',name:'铁誓百胜',rarity:'史诗',color:'red',accent:'#D97A5B',icon:'⚔',secret:false,
    flavor:'铁册翻到你的名字时，已经不需要再数第一百次。',desc:'斗神战斗记录达到 100 次有效胜利。',
    condition:function(player){return titleInt(player,'historyWarKills')>=100},progress:function(player){return titleProgress(titleInt(player,'historyWarKills'),100,'铁誓胜利')}
  },
  {
    id:'gold_thread',name:'金色命线',rarity:'稀有',color:'gold',accent:'#E9C46A',icon:'✧',secret:false,
    flavor:'旧匣曾经为你亮过一次金色。',desc:'获得至少 1 次五星结果。',
    condition:function(player){return titleInt(player,'historyOracle_5★')>=1},progress:function(player){return titleProgress(titleInt(player,'historyOracle_5★'),1,'五星命线')}
  },
  {
    id:'fates_chosen',name:'三纺女所选',rarity:'传说',color:'gold',accent:'#FFD166',icon:'✦',secret:false,
    flavor:'命线不是偶然连续十次落在同一个人手里。',desc:'累计获得 10 次五星结果。',
    condition:function(player){return titleInt(player,'historyOracle_5★')>=10},progress:function(player){return titleProgress(titleInt(player,'historyOracle_5★'),10,'五星命线')}
  },
  {
    id:'relic_keeper',name:'遗物守藏人',rarity:'史诗',color:'light_purple',accent:'#B58CFF',icon:'◆',secret:false,
    flavor:'你已经不是偶然捡到神明遗物的人。',desc:'拥有至少 6 件不同的十二神遗物。',
    condition:function(player){return titleRelicCount(player)>=6},progress:function(player){return titleProgress(titleRelicCount(player),6,'不同神遗物')}
  },
  {
    id:'pantheon_archive',name:'十二神遗藏',rarity:'神话',color:'light_purple',accent:'#E6B8FF',icon:'✺',secret:false,
    flavor:'十二种气息在同一份收藏里彼此认出了对方。',desc:'集齐全部 12 件神系遗物。',
    condition:function(player){return titleRelicCount(player)>=12},progress:function(player){return titleProgress(titleRelicCount(player),12,'十二神遗物')}
  },
  {
    id:'abyss_answerer',name:'渊之回应者',rarity:'史诗',color:'dark_aqua',accent:'#4CC9B0',icon:'◈',secret:false,
    flavor:'深渊问过三次，你三次都没有装作没听见。',desc:'完成 3 次渊神回应类挑战。',
    condition:function(player){return titleInt(player,'oracleTitleChallengeAbyss')>=3},progress:function(player){return titleProgress(titleInt(player,'oracleTitleChallengeAbyss'),3,'渊神挑战')}
  },
  {
    id:'void_breaker',name:'碎曜者',rarity:'传说',color:'dark_purple',accent:'#9D4EDD',icon:'✦',secret:true,
    flavor:'黑曜石一样的躯壳，也会留下裂口。',desc:'亲手完成一次虚空之子挑战。',
    condition:function(player){return titleInt(player,'oracleTitleBossVoidChild')>=1},progress:function(player){return titleProgress(titleInt(player,'oracleTitleBossVoidChild'),1,'虚空之子')}
  },
  {
    id:'nightmare_waker',name:'梦醒之人',rarity:'传说',color:'dark_purple',accent:'#7B2CBF',icon:'☾',secret:true,
    flavor:'追猎结束的时候，先醒来的不是梦魇。',desc:'亲手完成一次梦魇挑战。',
    condition:function(player){return titleInt(player,'oracleTitleBossNightmare')>=1},progress:function(player){return titleProgress(titleInt(player,'oracleTitleBossNightmare'),1,'梦魇')}
  },
  {
    id:'bell_returner',name:'丧钟归还者',rarity:'传说',color:'dark_gray',accent:'#8892A6',icon:'◉',secret:true,
    flavor:'那口古钟响过以后，你把回声带了回来。',desc:'完成一次「古代的丧钟」。',
    condition:function(player){return titleInt(player,'oracleTitleAncientBellWins')>=1},progress:function(player){return titleProgress(titleInt(player,'oracleTitleAncientBellWins'),1,'古代丧钟')}
  },
  {
    id:'end_returner',name:'终末归来者',rarity:'史诗',color:'light_purple',accent:'#C77DFF',icon:'◒',secret:false,
    flavor:'末地的天空碎过一次，而你回来了。',desc:'亲手击败过末影龙。',
    condition:function(player){return titleInt(player,'historyBoss_minecraft:ender_dragon')>=1},progress:function(player){return titleProgress(titleInt(player,'historyBoss_minecraft:ender_dragon'),1,'末影龙')}
  },
  {
    id:'first_end',name:'终末第一人',rarity:'神话',color:'gold',accent:'#F4D35E',icon:'✹',secret:true,
    flavor:'公共纪事里，这一页永远只写一个名字。',desc:'成为本世界第一位被纪事记录的末影龙击杀者。',
    condition:function(player){return !!(player&&player.server&&player.server.persistentData.getString('historyFirstDragonName')==titleName(player))},
    progress:function(player){return {now:this.condition(player)?1:0,max:1,text:this.condition(player)?'名字已经写入公共纪事':'只有第一位'}}
  },
  {
    id:'returned_many',name:'多次归来',rarity:'稀有',color:'gray',accent:'#A8ADB7',icon:'↺',secret:false,
    flavor:'死亡已经不是一件值得向你解释的事。',desc:'世界纪事记录 25 次死亡与归来。',
    condition:function(player){return titleInt(player,'historyDeaths')>=25},progress:function(player){return titleProgress(titleInt(player,'historyDeaths'),25,'归来')}
  },
  {
    id:'wardrobe_curator',name:'幻形收藏家',rarity:'稀有',color:'light_purple',accent:'#D6A4FF',icon:'❖',secret:false,
    flavor:'衣柜已经开始像一座小型展馆。',desc:'解锁 10 套传奇幻形。',
    condition:function(player){return titleInt(player,'historySkinUnlocks')>=10},progress:function(player){return titleProgress(titleInt(player,'historySkinUnlocks'),10,'传奇幻形')}
  }
]

function titleName(player){try{return String(player.username)}catch(ignored){return ''}}
function titleInt(player,key){try{return Number(player.persistentData.getInt(key))||0}catch(ignored){return 0}}
function titleProgress(now,max,label){return {now:Math.min(now,max),max:max,text:label+' '+now+' / '+max}}
function titleUnlockKey(id){return 'oracleTitleUnlock_'+id}

function titleFind(id){
  var i=0
  for(i=0;i<ORACLE_TITLES.length;i++)if(ORACLE_TITLES[i].id==id)return ORACLE_TITLES[i]
  return null
}

function titleRelicCount(player){
  if(!player)return 0
  var count=0,i=0
  for(i=0;i<ORACLE_TITLE_RELIC_IDS.length;i++){
    try{if(player.persistentData.getBoolean('oracleRelic_'+ORACLE_TITLE_RELIC_IDS[i]))count++}catch(ignored){}
  }
  return count
}

function titleIsUnlocked(player,title){
  if(!player||!title)return false
  if(player.persistentData.getBoolean(titleUnlockKey(title.id)))return true
  try{return !!title.condition(player)}catch(ignored){return false}
}

function titleTell(player,json){
  if(!player||!player.server)return
  player.server.runCommandSilent('tellraw '+titleName(player)+' '+JSON.stringify(json))
}

function titleButton(text,command,color,hover){
  return {text:'[ '+text+' ]',color:color||'gray',bold:true,clickEvent:{action:'run_command',value:command},hoverEvent:{action:'show_text',contents:{text:hover||text,color:'gray'}}}
}

function titleRarityMark(title){return {text:title.icon+' '+title.rarity,color:title.color,bold:true}}

function titleHudEnabled(player){
  if(!player)return false
  if(!player.persistentData.getBoolean('oracleTitlePrefsInit'))return true
  return player.persistentData.getBoolean('oracleTitleHud')
}
function titleChatEnabled(player){
  if(!player)return false
  if(!player.persistentData.getBoolean('oracleTitlePrefsInit'))return true
  return player.persistentData.getBoolean('oracleTitleChat')
}

function titleInitPrefs(player){
  if(!player)return
  if(player.persistentData.getBoolean('oracleTitlePrefsInit'))return
  player.persistentData.putBoolean('oracleTitlePrefsInit',true)
  player.persistentData.putBoolean('oracleTitleHud',true)
  player.persistentData.putBoolean('oracleTitleChat',true)
  if(!player.persistentData.getString('oracleTitleSelected'))player.persistentData.putString('oracleTitleSelected','traveler')
}

function titleUpdateHud(player){
  if(!player)return
  titleInitPrefs(player)
  try{
    if(!titleHudEnabled(player)){
      player.paint({oracle_title_text:{remove:true},oracle_title_line:{remove:true}})
      return
    }
    var id=player.persistentData.getString('oracleTitleSelected')||'traveler'
    var title=titleFind(id)
    if(!title||!titleIsUnlocked(player,title)){title=titleFind('traveler');player.persistentData.putString('oracleTitleSelected','traveler')}
    player.paint({
      oracle_title_line:{type:'rectangle',x:10,y:10,w:3,h:12,color:title.accent,draw:'always'},
      oracle_title_text:{type:'text',text:title.icon+' '+title.name,x:18,y:12,scale:0.82,color:title.accent,shadow:true,draw:'always'}
    })
  }catch(error){console.log('[TitleSystem] HUD update failed: '+error)}
}

function titleUnlockAnnouncement(player,title){
  if(!player||!title)return
  titleTell(player,[
    {text:'\n━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
    {text:'✦ 新称号解锁\n',color:'gold',bold:true},
    {text:title.icon+' '+title.name+'\n',color:title.color,bold:true},
    {text:title.flavor+'\n\n',color:'gray',italic:true},
    titleButton('立即佩戴','/titles equip '+title.id,title.color,'佩戴「'+title.name+'」'),
    {text:'  '},titleButton('查看称号册','/titles','aqua','打开全部称号'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
  ])
  try{
    player.server.runCommandSilent('execute at '+titleName(player)+' run playsound minecraft:ui.toast.challenge_complete player '+titleName(player)+' ~ ~ ~ 0.58 1.10')
    player.server.runCommandSilent('execute at '+titleName(player)+' run playsound minecraft:block.amethyst_block.resonate player '+titleName(player)+' ~ ~ ~ 0.42 1.38')
  }catch(ignored){}
  try{if(global.historyPushMoment)global.historyPushMoment(player,'称号','解锁「'+title.name+'」：'+title.flavor)}catch(ignoredHistory){}
}

function titleRefresh(player,notify){
  if(!player)return 0
  titleInitPrefs(player)
  var unlocked=0,i=0
  for(i=0;i<ORACLE_TITLES.length;i++){
    var title=ORACLE_TITLES[i],key=titleUnlockKey(title.id)
    if(player.persistentData.getBoolean(key)){unlocked++;continue}
    var ok=false
    try{ok=!!title.condition(player)}catch(ignored){}
    if(ok){
      player.persistentData.putBoolean(key,true)
      unlocked++
      if(notify)titleUnlockAnnouncement(player,title)
    }
  }
  var selected=player.persistentData.getString('oracleTitleSelected')
  if(!selected||!titleIsUnlocked(player,titleFind(selected)))player.persistentData.putString('oracleTitleSelected','traveler')
  titleUpdateHud(player)
  return unlocked
}


function titleMigrate(player){
  if(!player)return
  titleInitPrefs(player)
  var version=titleInt(player,'oracleTitleMigrationVersion')
  if(version>=ORACLE_TITLE_VERSION){titleRefresh(player,false);return}
  var unlocked=titleRefresh(player,false)
  player.persistentData.putInt('oracleTitleMigrationVersion',ORACLE_TITLE_VERSION)
  titleTell(player,[
    {text:'✦ 称号册已经接入世界纪事。 ',color:'gold',bold:true},
    {text:'旧记录已补录 '+unlocked+' 个称号。 ',color:'gray'},
    titleButton('打开称号册','/titles','aqua','查看已经属于你的名字')
  ])
}

function titleSelected(player){
  if(!player)return null
  titleInitPrefs(player)
  var title=titleFind(player.persistentData.getString('oracleTitleSelected')||'traveler')
  if(!title||!titleIsUnlocked(player,title))title=titleFind('traveler')
  return title
}

function titleEquip(player,id){
  var title=titleFind(id)
  if(!player||!title)return false
  titleRefresh(player,false)
  if(!titleIsUnlocked(player,title)){
    titleTell(player,{text:'这个称号还没有属于你。',color:'gray'})
    return false
  }
  player.persistentData.putString('oracleTitleSelected',id)
  titleUpdateHud(player)
  titleTell(player,[{text:'✦ 已佩戴 ',color:'gray'},{text:title.icon+' '+title.name,color:title.color,bold:true},{text:'。',color:'gray'}])
  try{player.server.runCommandSilent('execute at '+titleName(player)+' run playsound minecraft:item.armor.equip_leather player '+titleName(player)+' ~ ~ ~ 0.42 1.28')}catch(ignored){}
  return true
}

function titleClear(player){
  if(!player)return false
  player.persistentData.putString('oracleTitleSelected','traveler')
  titleUpdateHud(player)
  titleTell(player,{text:'已经换回「远行者」。',color:'gray'})
  return true
}

function titleCard(player,title){
  var unlocked=titleIsUnlocked(player,title)
  var selected=player.persistentData.getString('oracleTitleSelected')==title.id
  var progress=title.progress?title.progress(player):{now:0,max:1,text:''}
  if(!unlocked&&title.secret){
    return [
      {text:'？ 未知称号\n',color:'dark_gray',bold:true},
      {text:'      有些名字只有完成那件事以后才会出现。\n',color:'dark_gray',italic:true}
    ]
  }
  var components=[
    {text:title.icon+' '+title.name,color:unlocked?title.color:'dark_gray',bold:true},
    {text:'  ['+title.rarity+']',color:unlocked?title.color:'dark_gray'},
    selected?{text:'  ◆ 佩戴中',color:'green',bold:true}:{text:'',color:'gray'},
    {text:'\n      '+title.flavor+'\n',color:unlocked?'gray':'dark_gray',italic:true},
    {text:'      '+title.desc+'\n',color:'dark_gray'},
    {text:'      '+progress.text+'  ',color:unlocked?'aqua':'gray'}
  ]
  if(unlocked&&!selected)components.push(titleButton('佩戴','/titles equip '+title.id,title.color,'把这个称号放到聊天与 HUD 上'))
  else if(selected)components.push({text:'[ 已佩戴 ]',color:'green',bold:true})
  else components.push({text:'[ 未解锁 ]',color:'dark_gray'})
  components.push({text:'\n'})
  return components
}

function titleShow(player,page){
  if(!player)return
  titleRefresh(player,false)
  var pages=Math.max(1,Math.ceil(ORACLE_TITLES.length/ORACLE_TITLE_PAGE_SIZE))
  page=Math.max(1,Math.min(Number(page)||1,pages))
  var selected=titleSelected(player),unlocked=0,i=0
  for(i=0;i<ORACLE_TITLES.length;i++)if(titleIsUnlocked(player,ORACLE_TITLES[i]))unlocked++

  var top=[
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
    {text:'✦ Luokixi 称号册\n',color:'gold',bold:true},
    {text:'当前 · ',color:'gray'},{text:selected.icon+' '+selected.name,color:selected.color,bold:true},
    {text:'    已解锁 '+unlocked+' / '+ORACLE_TITLES.length+'\n',color:'dark_gray'},
    {text:'称号只记录真正发生过的事情。没有每日签到，也没有在线时长等级。\n\n',color:'gray',italic:true}
  ]
  titleTell(player,top)

  var start=(page-1)*ORACLE_TITLE_PAGE_SIZE,end=Math.min(start+ORACLE_TITLE_PAGE_SIZE,ORACLE_TITLES.length)
  for(i=start;i<end;i++)titleTell(player,titleCard(player,ORACLE_TITLES[i]))

  var nav=[{text:'\n'}]
  if(page>1)nav.push(titleButton('上一页','/titles page '+(page-1),'aqua','第 '+(page-1)+' 页'),{text:'  '})
  nav.push({text:'第 '+page+' / '+pages+' 页',color:'gray'})
  if(page<pages)nav.push({text:'  '},titleButton('下一页','/titles page '+(page+1),'aqua','第 '+(page+1)+' 页'))
  nav.push({text:'\n'})
  nav.push(titleButton(titleHudEnabled(player)?'HUD：开':'HUD：关','/titles hud',titleHudEnabled(player)?'green':'gray','切换左上角称号显示'),{text:'  '})
  nav.push(titleButton(titleChatEnabled(player)?'聊天：开':'聊天：关','/titles chat',titleChatEnabled(player)?'green':'gray','切换聊天正文前的称号'),{text:'  '})
  nav.push(titleButton('恢复默认','/titles clear','dark_gray','换回「远行者」'))
  nav.push({text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'})
  titleTell(player,nav)
}

function titleToggleHud(player){
  titleInitPrefs(player)
  player.persistentData.putBoolean('oracleTitleHud',!titleHudEnabled(player))
  titleUpdateHud(player)
  titleTell(player,{text:'称号 HUD：'+(titleHudEnabled(player)?'开启':'关闭'),color:titleHudEnabled(player)?'green':'gray'})
  return true
}
function titleToggleChat(player){
  titleInitPrefs(player)
  player.persistentData.putBoolean('oracleTitleChat',!titleChatEnabled(player))
  titleTell(player,{text:'聊天称号：'+(titleChatEnabled(player)?'开启':'关闭'),color:titleChatEnabled(player)?'green':'gray'})
  return true
}

function titleRecordChallenge(player,eventId,bossKind){
  if(!player||!eventId)return
  player.persistentData.putInt('oracleTitleChallengeTotal',titleInt(player,'oracleTitleChallengeTotal')+1)
  if(String(eventId).indexOf('abyss_')==0)player.persistentData.putInt('oracleTitleChallengeAbyss',titleInt(player,'oracleTitleChallengeAbyss')+1)
  if(eventId=='void_mother_challenge'){
    player.persistentData.putInt('oracleTitleVoidMotherWins',titleInt(player,'oracleTitleVoidMotherWins')+1)
    if(bossKind=='void_child')player.persistentData.putInt('oracleTitleBossVoidChild',titleInt(player,'oracleTitleBossVoidChild')+1)
    if(bossKind=='nightmare')player.persistentData.putInt('oracleTitleBossNightmare',titleInt(player,'oracleTitleBossNightmare')+1)
  }
  if(eventId=='ancient_bell')player.persistentData.putInt('oracleTitleAncientBellWins',titleInt(player,'oracleTitleAncientBellWins')+1)
  titleRefresh(player,true)
}

PlayerEvents.loggedIn(function(event){
  try{
    var player=event.player
    if(!player)return
    try{if(String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return}catch(ignoredFake){}
    titleInitPrefs(player)
    if(player&&player.server)player.server.scheduleInTicks(30,function(){try{titleMigrate(player)}catch(ignored){}})
  }catch(error){console.log('[TitleSystem] Login failed: '+error)}
})

// 只装饰消息正文，不取消原聊天事件，因此不接管昵称、签名聊天或其他聊天插件。
PlayerEvents.decorateChat(function(event){
  try{
    var player=event.player
    if(!player||!titleChatEnabled(player))return
    var title=titleSelected(player)
    if(!title||title.id=='traveler')return
    var prefix=Text.of({text:'〔'+title.name+'〕 ',color:title.color})
    event.setMessage(prefix.append(Text.of(String(event.message))))
  }catch(error){console.log('[TitleSystem] Chat decorate failed: '+error)}
})

ServerEvents.commandRegistry(function(event){
  var Commands=event.commands
  var root=Commands.literal('titles').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;titleShow(p,1);return 1})
  root.then(Commands.literal('hud').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return titleToggleHud(p)?1:0}))
  root.then(Commands.literal('chat').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return titleToggleChat(p)?1:0}))
  root.then(Commands.literal('clear').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return titleClear(p)?1:0}))
  root.then(Commands.literal('refresh').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;titleRefresh(p,true);titleShow(p,1);return 1}))

  var page=Commands.literal('page')
  var p=1,total=Math.max(1,Math.ceil(ORACLE_TITLES.length/ORACLE_TITLE_PAGE_SIZE))
  for(p=1;p<=total;p++)(function(pageNo){page.then(Commands.literal(String(pageNo)).executes(function(ctx){var pl=ctx.source.player;if(!pl)return 0;titleShow(pl,pageNo);return 1}))})(p)
  root.then(page)

  var equip=Commands.literal('equip')
  var i=0
  for(i=0;i<ORACLE_TITLES.length;i++)(function(id){equip.then(Commands.literal(id).executes(function(ctx){var pl=ctx.source.player;if(!pl)return 0;return titleEquip(pl,id)?1:0}))})(ORACLE_TITLES[i].id)
  root.then(equip)
  event.register(root)
})

global.oracleTitleCatalog=ORACLE_TITLES
global.oracleTitleRefresh=titleRefresh
global.oracleTitleRecordChallenge=titleRecordChallenge
global.oracleTitleSelected=titleSelected
global.oracleTitleShow=titleShow
