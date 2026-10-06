// ============================================================
// 《Luokixi 的旅人手札》V15 · KubeJS V10.8.2
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.x
//
// V10.8.1：
// - 仍然使用原版 written_book，不依赖 Patchouli 客户端资源。
// - 第二页改为可点击目录，重要章节都能直接跳转。
// - 删除会直接触发/切换事件的手札按钮：今日料理、回应地底、管理员事件按钮等。
// - 删除 YSM 技术/管理页；传奇衣柜只保留玩家真正需要知道的内容。
// - 新增血月、渊神挑战、虚空之母、古代丧钟、称号、领地安全区等近期内容。
// - /titles 从手札直接进入称号册，称号册内可直接点击“佩戴”。
// - 手札可以选择不再自动补发；启用自动补发时每次重生都会询问，不依赖本次是否重新发书；/guide 随时恢复。
// - 没有 Tick、没有持续背包扫描。
// ============================================================

var RACHEL_GUIDE_EDITION = 15
var RACHEL_GUIDE_ITEM = 'minecraft:written_book'
var RACHEL_GUIDE_TITLE = '《Luokixi 的旅人手札》'
var RACHEL_GUIDE_AUTHOR = 'Luokixi'
var RACHEL_OLD_TITLE = '《Luokixi的旅人手札》'
var RACHEL_OLD_AUTHOR = 'Luokixi'

// 0/缺失 = 兼容旧玩家，视为开启；1 = 开启；2 = 玩家明确关闭。
var RACHEL_GUIDE_AUTO_KEY = 'rachelGuideAutoMode'

function rachelBackPart() {
  return {
    text:'\n\n[ ↩ 回到目录 ]',
    color:'dark_aqua',
    bold:true,
    clickEvent:{action:'change_page',value:'2'},
    hoverEvent:{action:'show_text',contents:{text:'回到手札目录',color:'gray'}}
  }
}

function rachelTextPage(title, body) {
  return JSON.stringify([
    {text:title + '\n\n',color:'gold',bold:true},
    {text:body,color:'dark_gray'},
    rachelBackPart()
  ])
}

function rachelCommandPage(title, intro, commands) {
  // V15 FIX: 兼容只传 (title, commands) 的写法，避免手札整本生成失败。
  if (commands == null && Array.isArray(intro)) {
    commands = intro
    intro = ''
  }
  if (!Array.isArray(commands)) commands = []
  if (intro == null) intro = ''

  var parts = [
    {text:title + '\n\n',color:'gold',bold:true}
  ]
  if (String(intro).length > 0) {
    parts.push({text:String(intro) + '\n\n',color:'dark_gray'})
  }

  var i = 0
  for (i = 0; i < commands.length; i++) {
    parts.push({
      text:commands[i][0] + '\n',
      color:commands[i][2] || 'dark_aqua',
      bold:true,
      clickEvent:{action:'run_command',value:commands[i][1]},
      hoverEvent:{
        action:'show_text',
        contents:{text:commands[i][3] || ('点击执行 ' + commands[i][1]),color:'gray'}
      }
    })
  }
  parts.push(rachelBackPart())
  return JSON.stringify(parts)
}

function rachelDirectoryPage(targets) {
  var parts = [
    {text:'目录 · 想看什么就去哪里\n\n',color:'gold',bold:true},
    {text:'这本手札不要求从头读到尾。挑你现在最在意的那一页。\n\n',color:'dark_gray'}
  ]
  var entries = [
    ['归乡与手札','home','green'],
    ['神谕与血月','omens','gold'],
    ['回应与挑战','challenges','dark_purple'],
    ['旧匣与传奇衣柜','oracle','light_purple'],
    ['遗物与共鸣','relics','aqua'],
    ['我的称号与纪事','titles','yellow'],
    ['领地与远行','building','dark_green']
  ]
  var i = 0
  for (i = 0; i < entries.length; i++) {
    var page = targets[entries[i][1]] || 1
    parts.push({
      text:'◆ ' + entries[i][0] + '\n',
      color:entries[i][2],
      bold:true,
      clickEvent:{action:'change_page',value:String(page)},
      hoverEvent:{action:'show_text',contents:{text:'跳到第 ' + page + ' 页',color:'gray'}}
    })
  }
  return JSON.stringify(parts)
}

function rachelIsAdmin(player) {
  if (!player) return false
  try { return player.hasPermissions(2) } catch (ignored) {}
  try { return player.hasPermission(2) } catch (ignored2) {}
  return false
}

function rachelGuidePages(isAdmin) {
  // isAdmin 仍保留在 NBT 中兼容旧版，但 V10.8.1 不再往玩家手札塞服务器管理按钮。
  var intro = JSON.stringify([
    {text:'Luokixi 的旅人手札\n',color:'gold',bold:true},
    {text:'写给来到这里的你\n\n',color:'dark_gray',italic:true},
    {text:'嗨，我是 Luokixi。\n\n',color:'dark_green',bold:true},
    {text:'很高兴你愿意把时间放进这个世界。这里可以有远征、战斗和稀有收藏，也应该有屋檐下的灯、没有目的的散步，以及后来被很多人走熟的一条路。不管你是高中生，大学生，还是已经工作，闲暇之余，我很开心你们可以回来看看这个世界',color:'dark_gray'}
  ])

  var sections = {
    home:[
      rachelTextPage(
        '这里没有终点',
        '我没有给服务器安排唯一的正确路线。有人钻洞穴，有人种田做饭，有人为了一个屋顶改三遍颜色。装备与进度当然重要，但只要你真的在这里留下过一点东西，那段时间就没有白费。我们永不会删档，你留下的东西，都会成为这个服务器最珍贵的一部分。'
      ),
      rachelTextPage(
        '归乡罗盘',
        '罗盘记着主世界的家。离主城很远时，右键会开始一段很短的归乡仪式；已经在附近，它只会提醒你“已经到家”。死亡把它带走以后，系统会重新补一枚——回家从来不算认输。'
      ),
      rachelTextPage(
        '不想一直占背包？',
        '重生后，罗盘与这本手札都会问你还需不需要。选“不要再发给我了！”会把它收走，以后不再自动补发。哪天突然想要，输入 /gohome 或 /guide，它们会回来，以后的重生补发也会重新开启。'
      ),
      rachelCommandPage(
        '两条回来的路',
        '不必为了省一个背包格子和它们永别。命令一直留着。',
        [
          ['[拿回归乡罗盘]','/gohome','gold','重新获得罗盘并恢复自动补发'],
          ['[拿回旅人手札]','/guide','dark_green','重新获得手札并恢复自动补发']
        ]
      )
    ],

    omens:[
      rachelTextPage(
        '神谕不是每日清单',
        '有时某位神祇会轻轻碰一下这个世界，我把那一天叫作神谕。它们不会每天出现，也不会逼所有人同时做一件事。平静日本来就应该很多：只有安静足够长，异象才会真正有分量。'
      ),
      rachelTextPage(
        '白昼也会有异象',
        '雨母会把长桌摆好；风王让远行轻快一些；潮王从深水送回礼物；炉神守住火与归处；土父翻身时群兽迁徙；日王把金辉留给肯干活的人。它们更像天气与传闻，而不是任务栏。'
      ),
      rachelTextPage(
        '血月 · 死神的点名',
        '月亮变红以后，莫尔维恩会从在线者里挑一个名字。那一轮会按权重出现 1～10 个特殊个体：被点名者、无坟弓手、红线织者、血月巨兽与血月幽影。数量越多越少见，也越不适合一个人硬扛。'
      ),
      rachelTextPage(
        '夜里还有别的名字',
        '斗神会把战意写进铁里，月后让夜行者轻一点；渊神则更喜欢从岩层背面敲门。真正危险的夜晚不会只靠加伤害吓人——声音、追猎、Boss 与选择本身都会成为事件的一部分。'
      ),
      rachelCommandPage(
        '你可以在手札上找到关于这个服务器的一切东西',
        '想知道今天有没有神谕，可以直接从这里查看。',
        [
          ['[今天神明大人为我们带来了什么？]','/omen','gold','查看今日神谕']
        ]
      )
    ],

    challenges:[
      rachelTextPage(
        '先回应，再让它发生',
        '渊神的凝视、深渊狩猎、深渊祭礼与古代丧钟都会先给你一次选择。愿意就点聊天里的“回应”，不愿意就沉默或拒绝；没有回应，怪物不会凭空砸到你脸上。'
      ),
      rachelTextPage(
        '渊神的三道试探',
        '“凝视”会让几种深渊生物围近；你需要在“狩猎”中活过几轮；“祭礼”则会出现一名祭礼者，只有它倒下，仪式才算真的断掉。'
      ),
      rachelTextPage(
        '虚空之母',
        '她不征求同意，而是从在线者里直接挑一个名字。虚空之子，梦魇，两者都会亮起血条，也不会靠拆地形取胜。击败后必有虚空之母赠与你们勇气的证明。'
      ),
      rachelTextPage(
        '古代的丧钟',
        '不存在于地图上的钟先响两下，第三下只留给回应者。你答应以后，循声守卫才会出现；拒绝或超时，它就重新沉回地下。击败它会留下它身上的结晶物。'
      ),
      rachelTextPage(
        '挑战也有边界',
        '挑战会记住它真正选中的人。离战场太远、跨维度、下线或事件异常结束时，Boss 与血条会一起被清理；同一个事件实例也只能结算一次。这样危险可以认真，奖励却不能被残留实体反复领取。'
      )
    ],

    oracle:[
      rachelTextPage(
        '三纺女的旧匣',
        '灰线多是日用品，蓝线认真一些，紫线已经值得停手看一眼，金线最少见。五星会出现诸神遗物或“神秘惊喜”；神秘惊喜在真正解锁以前不会公开里面是谁。十道线一起落下时，旧匣会把最亮的那一道先翻给你看。'
      ),
      rachelTextPage(
        '概率与保底',
        '基础概率仍是 2★ 76%、3★ 20%、4★ 3.4%、5★ 0.6%。每 10 抽至少有 3★，每 30 抽至少有 4★；五星从第 65 抽开始明显变容易，第 80 抽一定出现。'
      ),
      rachelTextPage(
        '传奇衣柜',
        '神秘惊喜真正落进你的收藏以后，传奇衣柜才会写出它的名字与详情。'
      ),
      rachelCommandPage(
        '旧匣与收藏',
        '有了这本guidebook,可以让你随时随地取出你所获得的一切物品。',
        [
          ['[打开三纺女的旧匣]','/oracle','light_purple'],
          ['[打开传奇衣柜]','/wardrobe','light_purple'],
          ['[查看遗物柜]','/relics','aqua'],
          ['[查看随行者]','/companions','yellow'],
          ['[奖励缓存箱]','/oracle cache','green']
        ]
      )
    ],

    relics:[
      rachelTextPage(
        '神明留下的东西',
        '火神留下水也压不掉的黑焰，土父能把目标送进世界下面，风王会给予你风的自由，斗神会短暂替持有者挡住一切。遗物在经过三次旧匝的洗礼后会更加接近神明们原本使用时的状态。'
      ),
      rachelTextPage(
        '共鸣与重复',
        '遗物第一次出现只是本体；之后三次重复会走到共鸣 I、II、III，第三层就是满命。已经满命后再抽到同一件，才会化成余烬与碎片。神秘惊喜里已经拥有的着装再次出现时，也会留下对应补偿。'
      )
    ],

    titles:[
      rachelTextPage(
        '名字也是一种纪事',
        '称号不提供攻击力，也不靠每日签到。它只记录真正发生过的事：远行、血月、神谕、遗物、深渊挑战、虚空之母、古代丧钟，以及那些以后你自己都会记得的第一次。'
      ),
      rachelCommandPage(
        '我的称号',
        '点“查看我的称号”会打开称号册；每个已经解锁的称号旁都会出现“佩戴”，直接点击就能装备。',
        [
          ['[查看我的称号]','/titles','gold','打开称号册并选择要佩戴的称号'],
          ['[恢复默认称号]','/titles clear','gray'],
          ['[切换称号 HUD]','/titles hud','aqua'],
          ['[切换聊天称号]','/titles chat','green']
        ]
      ),
      rachelTextPage(
        '历史藏在日常里',
        '我不想把历史做成另一张需要刷满的成就表。死亡、钻石、神谕、挑战、金色命线与首位击败末影龙的人，会在真正发生时自然写进纪事。记录应该从生活里长出来。'
      ),
      rachelCommandPage(
        '纪事与世界记录',
        '个人纪事像旧相册；世界记录则是大家共同写下的一页。',
        [
          ['[打开个人纪事]','/history','gold'],
          ['[查看最近发生的事]','/history recent','dark_aqua'],
          ['[查看世界记录]','/history server','light_purple']
        ]
      )
    ],

    building:[
      rachelTextPage(
        '认领以后，先让家安静',
        'FTB Chunks 已认领区块会阻止自然刷新、巡逻队与增援产生的敌对怪。刷怪笼、生成蛋、命令召唤，以及 LSI 自己的血月和挑战事件不会被这层保护误伤。门、箱子和机器则继续按队伍交互权限决定。'
      ),
      rachelTextPage(
        '去新地方时',
        '很多新地形、洞穴、遗迹和作物只会出现在还没被探索过的土地。几个人一起远征时，最好大致朝同一个方向走。不是为了限制探索，只是十个人同时向十个方向高速开新区，任何服务器都会喘不过气。'
      ),
      rachelTextPage(
        '主城不是完成品',
        '现在的主城只是我们已经写下的第一段，不是需要供起来的展览馆。你可以补街道、做公共建筑、开店、种树、整理景观，也可以去远方建自己的聚落。只要彼此尊重，我希望世界最后看得出自很多人的手。'
      ),
      rachelCommandPage(
        '几个安全入口',
        '需要确认状态时，可以从这里开始。',
        [
          ['[检查当前领地保护]','/claimsafe','green'],
          ['[查看当前神谕]','/omen','gold'],
          ['[打开个人纪事]','/history','dark_aqua']
        ]
      )
    ]
  }

  var order = ['home','omens','challenges','oracle','relics','titles','building']
  var targets = {}
  var pageCursor = 3 // 1=寄语，2=目录，第一节从第3页开始
  var i = 0
  for (i = 0; i < order.length; i++) {
    targets[order[i]] = pageCursor
    pageCursor += sections[order[i]].length
  }

  var pages = [intro, rachelDirectoryPage(targets)]
  for (i = 0; i < order.length; i++) pages = pages.concat(sections[order[i]])

  pages.push(JSON.stringify([
    {text:'写在最后\n\n',color:'gold',bold:true},
    {text:'谢谢你愿意把时间放在这里。\n\n',color:'dark_green'},
    {text:'真正让人想回来的，通常不是活动表，而是一座熟悉的房子、一条别人修过的路、某次一起出门后留下的笑话，还有“下次上线再把这个做完”的念头。\n\n',color:'dark_gray'},
    {text:'希望你可以在这个服务器玩得开心！！\n\n',color:'dark_gray'},
    {text:'—— Luokixi',color:'gray',italic:true},
    rachelBackPart()
  ]))

  return pages
}

function rachelCreateGuide(player) {
  var admin = rachelIsAdmin(player)
  return Item.of(RACHEL_GUIDE_ITEM, {
    title:RACHEL_GUIDE_TITLE,
    author:RACHEL_GUIDE_AUTHOR,
    generation:0,
    resolved:1,
    RachelGuide:1,
    RachelGuideEdition:RACHEL_GUIDE_EDITION,
    RachelGuideAdmin:admin ? 1 : 0,
    Enchantments:[{id:'minecraft:vanishing_curse',lvl:1}],
    HideFlags:1,
    display:{
      Lore:[
        '{"text":"封皮边角已经磨白，夹页里还沾着几粒不知从哪条路带回来的细沙。","color":"gray","italic":false}',
        '{"text":"打开它，路就会重新有名字。","color":"dark_green","italic":false}'
      ]
    },
    pages:rachelGuidePages(admin)
  })
}

function rachelCountByCommand(player, extraNbt) {
  if (!player || !player.server) return 0
  var nbt = '{title:' + JSON.stringify(RACHEL_GUIDE_TITLE) + ',author:' + JSON.stringify(RACHEL_GUIDE_AUTHOR)
  if (extraNbt) nbt += ',' + extraNbt
  nbt += '}'
  try {
    return player.server.runCommandSilent('clear ' + player.username + ' minecraft:written_book' + nbt + ' 0')
  } catch (error) {
    return 0
  }
}

function rachelCurrentGuideCount(player) {
  var admin = rachelIsAdmin(player) ? 1 : 0
  return rachelCountByCommand(player, 'RachelGuideEdition:' + RACHEL_GUIDE_EDITION + ',RachelGuideAdmin:' + admin)
}

function rachelAnyCurrentTitleCount(player) {
  return rachelCountByCommand(player, '')
}

function hasRachelGuide(player) {
  return rachelCurrentGuideCount(player) > 0
}

function rachelRemoveLegacyGuides(player) {
  if (!player || !player.server) return
  try { player.server.runCommandSilent('clear ' + player.username + ' patchouli:guide_book{"patchouli:book":"myteam:rachels_field_guide"}') } catch (ignored) {}
  try { player.server.runCommandSilent('clear ' + player.username + ' patchouli:guide_book{"patchouli:book":"myteam:rachels_field"}') } catch (ignored2) {}
  try {
    player.server.runCommandSilent('clear ' + player.username + ' minecraft:written_book{title:' + JSON.stringify(RACHEL_OLD_TITLE) + ',author:' + JSON.stringify(RACHEL_OLD_AUTHOR) + '}')
  } catch (ignored3) {}
}

function rachelClearCurrentTitle(player) {
  if (!player || !player.server) return
  try {
    player.server.runCommandSilent('clear ' + player.username + ' minecraft:written_book{title:' + JSON.stringify(RACHEL_GUIDE_TITLE) + ',author:' + JSON.stringify(RACHEL_GUIDE_AUTHOR) + '}')
  } catch (ignored) {}
}

function rachelGuideAutoMode(player) {
  if (!player) return 0
  var mode = 0
  try { mode = player.persistentData.getInt(RACHEL_GUIDE_AUTO_KEY) } catch (ignored) {}
  if (mode != 1 && mode != 2) mode = 0
  return mode
}

function rachelGuideAutoEnabled(player) {
  return rachelGuideAutoMode(player) != 2
}

function rachelSetGuideAuto(player, enabled) {
  if (!player) return
  try { player.persistentData.putInt(RACHEL_GUIDE_AUTO_KEY, enabled ? 1 : 2) } catch (ignored) {}
}

function rachelEnsureSingleGuide(player) {
  if (!player || !player.server) return {ok:false,given:false,replaced:false,deduped:false}
  rachelRemoveLegacyGuides(player)

  var total = rachelAnyCurrentTitleCount(player)
  var current = rachelCurrentGuideCount(player)
  var editionKnown = player.persistentData.getInt('rachelGuideEdition')
  var adminKnown = player.persistentData.getBoolean('rachelGuideAdmin')
  var adminNow = rachelIsAdmin(player)
  var needsReplace = total != 1 || current != 1 || editionKnown < RACHEL_GUIDE_EDITION || adminKnown != adminNow

  if (needsReplace) {
    rachelClearCurrentTitle(player)
    player.give(rachelCreateGuide(player))
    player.persistentData.putInt('rachelGuideEdition', RACHEL_GUIDE_EDITION)
    player.persistentData.putBoolean('rachelGuideAdmin', adminNow)
    return {ok:true,given:total <= 0,replaced:total > 0,deduped:total > 1}
  }

  player.persistentData.putInt('rachelGuideEdition', RACHEL_GUIDE_EDITION)
  player.persistentData.putBoolean('rachelGuideAdmin', adminNow)
  return {ok:true,given:false,replaced:false,deduped:false}
}

function rachelGuideArrivalMessage(player) {
  if (!player || !player.server) return
  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' + JSON.stringify([
      {text:'一本风尘仆仆的旧手札落进了你的背包。\n',color:'gray'},
      {text:'封皮边角已经磨白，夹页里还沾着几粒不知从哪条路带回来的细沙。\n',color:'dark_gray',italic:true},
      {text:RACHEL_GUIDE_TITLE + '\n',color:'gold',bold:true},
      {text:'“路走远了，总该有些东西替你记得回去，也记得你来过。”',color:'dark_green',italic:true}
    ])
  )
  player.server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:item.book.page_turn player ' + player.username + ' ~ ~ ~ 0.70 1.02')
  player.server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:entity.player.levelup player ' + player.username + ' ~ ~ ~ 0.38 1.34')
}

function rachelGiveGuideDetailed(player, announce) {
  if (!player || !player.server) return {ok:false,given:false,replaced:false,deduped:false}
  try {
    var result = rachelEnsureSingleGuide(player)
    if (!result.ok) return result
    if (announce && (result.given || result.replaced || result.deduped)) rachelGuideArrivalMessage(player)
    return result
  } catch (error) {
    console.log('[LuokixiGuide] Give/repair failed for ' + player.username + ': ' + error)
    player.tell(Text.red('Luokixi 的旅人手札暂时无法发放，请把 latest.log 中的相关报错发给管理员。'))
    return {ok:false,given:false,replaced:false,deduped:false}
  }
}

function giveRachelGuide(player, announce) {
  return rachelGiveGuideDetailed(player, announce).ok
}

function rachelAskGuidePreference(player) {
  if (!player || !player.server) return
  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' + JSON.stringify([
      {text:'\n需要这本旅人手札吗？\n',color:'gold',bold:true},
      {text:'它会在死亡后重新回到背包；如果你更想省下这一格，也可以让它暂时离开。\n',color:'gray'},
      {text:'[ 不要再发给我了！ ]',color:'red',bold:true,clickEvent:{action:'run_command',value:'/guide stop'},hoverEvent:{action:'show_text',contents:{text:'收走手札，并停止以后自动补发',color:'gray'}}},
      {text:'   '},
      {text:'[ 我很需要这个 ]',color:'green',bold:true,clickEvent:{action:'run_command',value:'/guide keep'},hoverEvent:{action:'show_text',contents:{text:'保留手札，并继续在重生后补发',color:'gray'}}}
    ])
  )
}

function rachelStopGuide(player) {
  if (!player || !player.server) return false
  rachelSetGuideAuto(player,false)
  rachelRemoveLegacyGuides(player)
  rachelClearCurrentTitle(player)
  player.server.runCommandSilent(
    'tellraw ' + player.username + ' ' + JSON.stringify([
      {text:'✦ 手札被重新收进了旧行囊。\n',color:'gray'},
      {text:'以后重生时不会再占你的背包格子。哪天想翻一翻，输入 ',color:'dark_gray'},
      {text:'/guide',color:'gold',bold:true,clickEvent:{action:'suggest_command',value:'/guide'}},
      {text:'，它就会回来。',color:'dark_gray'}
    ])
  )
  return true
}

function rachelKeepGuide(player) {
  if (!player || !player.server) return false
  rachelSetGuideAuto(player,true)
  var result = rachelGiveGuideDetailed(player,false)
  if (!result.ok) return false
  player.tell(Text.green('✦ 好。以后重生时，这本手札还会回来。'))
  return true
}

PlayerEvents.loggedIn(function (event) {
  var player = event.player
  if (!player || !player.server) return
  try { if (String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer') >= 0) return } catch (ignoredFake) {}
  player.server.scheduleInTicks(40, function () {
    if (!rachelGuideAutoEnabled(player)) return
    rachelGiveGuideDetailed(player,true)
  })
})

PlayerEvents.respawned(function (event) {
  var player = event.player
  if (!player || !player.server) return
  // 罗盘会先询问；手札稍晚一点，避免两组按钮挤在同一条聊天记录里。
  player.server.scheduleInTicks(50, function () {
    if (!rachelGuideAutoEnabled(player)) return
    var result = rachelGiveGuideDetailed(player,true)
    // V10.8.2：和罗盘一样，询问不再要求本次必须重新发出手札。
    // 只要自动补发没有被关闭，每次重生都会给玩家这次选择。
    if (result.ok) rachelAskGuidePreference(player)
  })
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('guide').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    rachelSetGuideAuto(player,true)
    var before = rachelAnyCurrentTitleCount(player)
    var currentBefore = rachelCurrentGuideCount(player)
    if (before == 1 && currentBefore == 1) {
      player.tell(Text.gray(RACHEL_GUIDE_TITLE + '已经在你的背包里了。以后重生补发也已重新开启。'))
      return 1
    }
    return giveRachelGuide(player,true) ? 1 : 0
  })

  root.then(Commands.literal('stop').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    return rachelStopGuide(player) ? 1 : 0
  }))

  root.then(Commands.literal('keep').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    return rachelKeepGuide(player) ? 1 : 0
  }))

  event.register(root)
})

global.giveRachelGuide = giveRachelGuide
global.hasRachelGuide = hasRachelGuide
global.rachelEnsureSingleGuide = rachelEnsureSingleGuide
global.rachelGuideAutoEnabled = rachelGuideAutoEnabled
global.rachelGuideAutoMode = rachelGuideAutoMode

console.log('[LuokixiGuide] V10.8.2 / Guide V15 FIXED loaded: guide page arguments repaired and edition bumped to 15.')
