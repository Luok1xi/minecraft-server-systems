// ============================================================
// 三纺女的旧匣 V10.8.17B · 6★ 红色彩蛋 / 命线揭幕 / 神器共鸣
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.x
//
// 设计原则：
// - 抽取时只先结算品质与奖励“计划”，不立刻发物品。
// - 抽奖先给玩家“看见异常”，奖励在揭晓之后才真正交付。
// - 十连按 6★ > 5★ > 4★ > 3★ > 2★ 稳定排序，一张一张揭晓并发奖。
// - 所有 YSM 着装以“神秘惊喜”身份进入 5★ 池；抽中前不公开具体角色。
// - 常规神系遗物为 5★；Luokixi「薇」独立进入 6★ 红色彩蛋池；4★ 保持同行者/豪华资源/兵装。
// - 背包塞不下的物品进入虚拟缓存箱，不落地。
// - 无 Tick、无结构搜索、无常驻背包扫描。
// ============================================================

var ORACLE_BASE_SIX_RATE = 0.00001
var ORACLE_BASE_FIVE_RATE = 0.006
var ORACLE_BASE_FOUR_RATE = 0.034
var ORACLE_BASE_THREE_RATE = 0.20
var ORACLE_SOFT_PITY_START = 65
var ORACLE_HARD_PITY = 80
var ORACLE_FOUR_HARD_PITY = 30
var ORACLE_THREE_HARD_PITY = 10
var ORACLE_STITCH_RELIC_COST = 120
var ORACLE_DEV_FORCE_ACTIVE = false
var ORACLE_CACHE_KEY = 'oracleRewardCacheV95'
var ORACLE_CACHE_MAX_ENTRIES = 72

var DIVINE_SEALS = [
  {id:'rain', name:'雨母的青穗', item:'minecraft:wheat', color:'aqua', lore:'谷粒之间停着一滴从不蒸发的雨。'},
  {id:'wind', name:'风王的白羽', item:'minecraft:feather', color:'white', lore:'它从一片没有鸟经过的天空落下。'},
  {id:'water', name:'潮王之泪', item:'minecraft:prismarine_crystals', color:'aqua', lore:'它总是微微潮湿，却从不会干。'},
  {id:'fire', name:'炉神余烬', item:'minecraft:blaze_powder', color:'gold', lore:'离开最后一炉以后，仍然保留着温度。'},
  {id:'earth', name:'土父旧种', item:'minecraft:wheat_seeds', color:'dark_green', lore:'没有人知道它会长成树、花，还是一座山。'},
  {id:'war', name:'斗神铁屑', item:'minecraft:iron_nugget', color:'red', lore:'像是从一把从未投降的断剑上落下。'},
  {id:'death', name:'死神黑印', item:'minecraft:coal', color:'dark_red', lore:'握住它时，附近的声音会短暂变远。'},
  {id:'abyss', name:'渊神回声', item:'minecraft:echo_shard', color:'dark_aqua', lore:'它偶尔会重复一句你从未说过的话。'},
  {id:'moon', name:'月后银片', item:'minecraft:amethyst_shard', color:'light_purple', lore:'只有月光下才能看见上面的旧梦。'},
  {id:'sun', name:'日王金箔', item:'minecraft:gold_nugget', color:'yellow', lore:'即使放在阴影里，也会反射一线晨光。'}
]

function oracleTell(player,json) {
  if (!player || !player.server) return
  player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json))
}

function oracleButton(text,command,color) {
  return {text:'[ ' + text + ' ]',color:color,bold:true,clickEvent:{action:'run_command',value:command},hoverEvent:{action:'show_text',contents:{text:text,color:'gray'}}}
}

function oracleRandomInt(min,max) { return min + Math.floor(Math.random() * (max - min + 1)) }
function oraclePick(list) { return (!list || list.length <= 0) ? null : list[Math.floor(Math.random() * list.length)] }
function oracleWeightedPick(list) {
  if (!list || list.length <= 0) return null
  var total = 0
  var i = 0
  for (i = 0; i < list.length; i++) total += list[i].weight || 1
  var roll = Math.random() * total
  for (i = 0; i < list.length; i++) {
    roll -= list[i].weight || 1
    if (roll <= 0) return list[i]
  }
  return list[list.length - 1]
}
function oracleModLoaded(id) { try { return Platform && Platform.isLoaded && Platform.isLoaded(id) } catch (ignored) {} return false }

// ------------------------------------------------------------
// 奖励缓存箱
// ------------------------------------------------------------

function oracleCacheRead(player) {
  if (!player) return []
  var raw = ''
  try { raw = String(player.persistentData.getString(ORACLE_CACHE_KEY) || '') } catch (ignored) {}
  if (!raw) return []
  try {
    var parsed = JSON.parse(raw)
    return parsed && parsed.length != null ? parsed : []
  } catch (error) {
    console.log('[DivineOracle] cache parse failed for ' + player.username + ': ' + error)
    return []
  }
}

function oracleCacheWrite(player,list) {
  if (!player) return
  try { player.persistentData.putString(ORACLE_CACHE_KEY,JSON.stringify(list || [])) } catch (error) { console.log('[DivineOracle] cache write failed: ' + error) }
}

function oracleStackNbtString(stack) {
  try {
    if (!stack || !stack.nbt) return ''
    return String(stack.nbt)
  } catch (ignored) {}
  return ''
}

function oracleStackId(stack) {
  try { if (stack && stack.id) return String(stack.id) } catch (ignored) {}
  return ''
}

function oracleRawStack(stack) {
  if (!stack) return null
  try { if (stack.itemStack) return stack.itemStack } catch (ignored) {}
  return stack
}

function oracleRawCount(stack) {
  if (!stack) return 0
  try { if (typeof stack.getCount == 'function') return Number(stack.getCount()) } catch (ignored) {}
  try { return Number(stack.count) } catch (ignored2) {}
  return 0
}

function oracleRawEmpty(stack) {
  if (!stack) return true
  try { if (typeof stack.isEmpty == 'function') return stack.isEmpty() } catch (ignored) {}
  return oracleRawCount(stack) <= 0
}

function oracleCachePush(player,id,count,nbt,name) {
  if (!player || !id || count <= 0) return false
  var list = oracleCacheRead(player)
  var remaining = Math.floor(count)
  var i = 0

  // 先尽量合并相同条目，避免缓存碎片化。
  for (i = 0; i < list.length && remaining > 0; i++) {
    var entry = list[i]
    if (entry.id == id && String(entry.nbt || '') == String(nbt || '') && Number(entry.count) < 2147480000) {
      entry.count = Number(entry.count) + remaining
      remaining = 0
    }
  }

  if (remaining > 0) {
    if (list.length >= ORACLE_CACHE_MAX_ENTRIES) {
      // 缓存极端塞满时宁愿给回等价碎片，也不在地上生成实体。
      if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,1)
      player.tell(Text.red('奖励缓存箱已经塞满。这个溢出奖励被折成了 1 枚幻形碎片，请尽快领取缓存。'))
      return false
    }
    list.push({id:id,count:remaining,nbt:String(nbt || ''),name:String(name || id)})
  }

  oracleCacheWrite(player,list)
  return true
}

function oracleTryInventoryInsert(player,stack) {
  if (!player || !stack) return {ok:false,left:oracleRawCount(oracleRawStack(stack))}
  var raw = oracleRawStack(stack)
  var before = oracleRawCount(raw)
  if (before <= 0) return {ok:true,left:0}
  try {
    var inv = player.getInventory()
    inv.add(raw)
    var left = oracleRawCount(raw)
    try { player.inventoryMenu.broadcastChanges() } catch (ignoredSync) {}
    return {ok:left <= 0,left:left}
  } catch (error) {
    console.log('[DivineOracle] inventory insert fallback for ' + player.username + ': ' + error)
    return {ok:false,left:before}
  }
}

function oracleGiveRewardStack(player,stack,name) {
  if (!player || !stack) return false
  var raw = oracleRawStack(stack)
  var originalCount = oracleRawCount(raw)
  var id = oracleStackId(stack)
  if (!id) {
    try { id = String(raw.id || '') } catch (ignored) {}
  }
  var nbt = oracleStackNbtString(stack)

  // copy 一份给背包，保留原对象用于缓存描述。
  var work = null
  try { work = raw.copy() } catch (ignoredCopy) { work = raw }
  var inserted = oracleTryInventoryInsert(player,work)
  var left = inserted.left
  if (left > 0) {
    oracleCachePush(player,id,left,nbt,name || id)
    player.tell(Text.yellow('✦ 背包空间不足，' + (name || id) + ' 的剩余部分已进入 /oracle cache。'))
  }
  return left < originalCount || left == 0
}

global.oracleGiveRewardStack = oracleGiveRewardStack

function oracleGiveItem(player,id,amount,nbt,name) {
  if (!player || !id || !amount || amount <= 0) return false
  var stack = null
  try { stack = nbt ? Item.of(id,amount,nbt) : Item.of(id,amount) } catch (error) {
    console.log('[DivineOracle] Item.of failed: ' + id + ' / ' + error)
    return false
  }
  var ok = oracleGiveRewardStack(player,stack,name || id)
  if (id == 'minecraft:diamond' && global.historyRecordDiamonds) {
    try { global.historyRecordDiamonds(player,amount,'旧匣') } catch (ignored) {}
  }
  return ok
}

function oracleCacheShow(player) {
  var list = oracleCacheRead(player)
  oracleTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_aqua'},
    {text:'▣ 旧匣奖励缓存箱\n',color:'aqua',bold:true},
    {text:'背包装不下的抽奖物品会留在这里，不会落地消失。\n',color:'gray'},
    {text:'当前条目 · ' + list.length + '/' + ORACLE_CACHE_MAX_ENTRIES + '\n',color:'white'},
    oracleButton('尝试全部领取','/oracle cache claim','green'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_aqua'}
  ])
  if (list.length <= 0) {
    player.tell(Text.gray('缓存箱现在是空的。'))
    return
  }
  var i = 0
  for (i = 0; i < list.length; i++) {
    oracleTell(player,{text:(i + 1) + '. ' + (list[i].name || list[i].id) + ' ×' + list[i].count,color:'gray'})
  }
}

function oracleCacheClaim(player) {
  if (!player) return false
  var list = oracleCacheRead(player)
  if (list.length <= 0) {
    player.tell(Text.gray('缓存箱是空的。'))
    return true
  }
  var remain = []
  var claimed = 0
  var i = 0
  for (i = 0; i < list.length; i++) {
    var entry = list[i]
    var pending = Math.max(0,Math.floor(Number(entry.count) || 0))
    if (pending <= 0) continue
    while (pending > 0) {
      var chunk = Math.min(64,pending)
      var stack = null
      try { stack = entry.nbt ? Item.of(entry.id,chunk,String(entry.nbt)) : Item.of(entry.id,chunk) } catch (error) {
        remain.push({id:entry.id,count:pending,nbt:entry.nbt || '',name:entry.name || entry.id})
        pending = 0
        break
      }
      var raw = oracleRawStack(stack)
      var work = null
      try { work = raw.copy() } catch (ignoredCopy) { work = raw }
      var before = oracleRawCount(work)
      var result = oracleTryInventoryInsert(player,work)
      var left = result.left
      claimed += Math.max(0,before - left)
      pending -= Math.max(0,before - left)
      if (left > 0 || before <= 0) {
        // 当前这一叠已经塞不进去，剩下整条留在缓存，不继续重复撞背包。
        remain.push({id:entry.id,count:pending,nbt:entry.nbt || '',name:entry.name || entry.id})
        pending = 0
        break
      }
    }
  }
  oracleCacheWrite(player,remain)
  if (claimed > 0) player.tell(Text.green('✦ 从奖励缓存箱领取了 ' + claimed + ' 件物品。'))
  if (remain.length > 0) player.tell(Text.yellow('还有 ' + remain.length + ' 个条目放不进背包，仍然留在缓存箱里。'))
  return true
}

// ------------------------------------------------------------
// 抽奖计划：只“决定”奖励，不发奖
// ------------------------------------------------------------

function oraclePlanStack(name,id,count,nbt,kind) {
  return {
    name:name,
    kind:kind || 'item',
    displayItem:id,
    deliver:function (player) { return oracleGiveItem(player,id,count,nbt,name) }
  }
}

function oraclePlanXP(name,amount) {
  return {name:name,kind:'xp',displayItem:'minecraft:experience_bottle',deliver:function (player) { player.addXP(amount); return true }}
}

function oraclePlanToken(name,amount) {
  return {name:name,kind:'currency',displayItem:'minecraft:amethyst_shard',deliver:function (player) {
    if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,amount)
    else if (global.giveDivineToken) global.giveDivineToken(player,amount)
    return true
  }}
}

function oraclePlanMeal() {
  var meals = [
    ['farmersdelight:hamburger','汉堡包'],['farmersdelight:fried_rice','炒饭'],['farmersdelight:beef_stew','牛肉炖'],
    ['farmersdelight:chicken_soup','鸡肉汤'],['farmersdelight:pasta_with_meatballs','肉丸意面'],['farmersdelight:vegetable_noodles','蔬菜面'],
    ['farmersdelight:apple_pie','苹果派'],['farmersdelight:hot_cocoa','热可可']
  ]
  var meal = oraclePick(meals)
  if (!oracleModLoaded('farmersdelight')) return oraclePlanStack('远行熟食包','minecraft:cooked_beef',8,'','food')
  return oraclePlanStack('雨母旅食 · ' + meal[1],meal[0],1,'','food')
}

function oraclePlanBlueTool() {
  var tools = [
    {name:'旅人铁镐',id:'minecraft:iron_pickaxe',nbt:'{Enchantments:[{id:"minecraft:efficiency",lvl:2s},{id:"minecraft:unbreaking",lvl:2s}]}'},
    {name:'旅人铁斧',id:'minecraft:iron_axe',nbt:'{Enchantments:[{id:"minecraft:efficiency",lvl:2s},{id:"minecraft:unbreaking",lvl:2s}]}'},
    {name:'旅人铁剑',id:'minecraft:iron_sword',nbt:'{Enchantments:[{id:"minecraft:sharpness",lvl:2s},{id:"minecraft:unbreaking",lvl:2s}]}'},
    {name:'旅人鱼竿',id:'minecraft:fishing_rod',nbt:'{Enchantments:[{id:"minecraft:lure",lvl:2s},{id:"minecraft:unbreaking",lvl:2s}]}' }
  ]
  var t = oraclePick(tools)
  return oraclePlanStack('蓝色命线 · ' + t.name,t.id,1,t.nbt,'item')
}

function oracleTwoStarReward() {
  var reward = oracleWeightedPick([
    {id:'xp',weight:18},{id:'torch',weight:14},{id:'coal',weight:12},{id:'iron_nugget',weight:10},{id:'copper',weight:10},
    {id:'bread',weight:10},{id:'arrows',weight:8},{id:'redstone',weight:8},{id:'rockets',weight:6},{id:'building',weight:4}
  ])
  if (reward.id == 'xp') { var xp=oracleRandomInt(16,30); return oraclePlanXP('零散经验 ×' + xp,xp) }
  if (reward.id == 'torch') { var n1=oracleRandomInt(16,32); return oraclePlanStack('火把 ×'+n1,'minecraft:torch',n1) }
  if (reward.id == 'coal') { var n2=oracleRandomInt(8,16); return oraclePlanStack('煤炭 ×'+n2,'minecraft:coal',n2) }
  if (reward.id == 'iron_nugget') { var n3=oracleRandomInt(16,32); return oraclePlanStack('铁粒 ×'+n3,'minecraft:iron_nugget',n3) }
  if (reward.id == 'copper') { var n4=oracleRandomInt(6,12); return oraclePlanStack('铜锭 ×'+n4,'minecraft:copper_ingot',n4) }
  if (reward.id == 'bread') { var n5=oracleRandomInt(4,8); return oraclePlanStack('面包 ×'+n5,'minecraft:bread',n5) }
  if (reward.id == 'arrows') { var n6=oracleRandomInt(16,32); return oraclePlanStack('箭 ×'+n6,'minecraft:arrow',n6) }
  if (reward.id == 'redstone') { var n7=oracleRandomInt(8,16); return oraclePlanStack('红石粉 ×'+n7,'minecraft:redstone',n7) }
  if (reward.id == 'rockets') { var n8=oracleRandomInt(8,16); return oraclePlanStack('烟花火箭 ×'+n8,'minecraft:firework_rocket',n8) }
  return oraclePlanStack('石砖建材包 ×32','minecraft:stone_bricks',32)
}

function oracleThreeStarReward() {
  var reward = oracleWeightedPick([
    {id:'emerald',weight:14},{id:'iron',weight:14},{id:'gold',weight:10},{id:'lapis',weight:10},{id:'carrot',weight:8},{id:'bottles',weight:8},
    {id:'pearl',weight:7},{id:'name_tag',weight:5},{id:'meal',weight:8},{id:'explore',weight:6},{id:'tool',weight:5},{id:'token',weight:5}
  ])
  if (reward.id == 'emerald') { var n1=oracleRandomInt(2,5); return oraclePlanStack('绿宝石 ×'+n1,'minecraft:emerald',n1) }
  if (reward.id == 'iron') { var n2=oracleRandomInt(8,16); return oraclePlanStack('铁锭 ×'+n2,'minecraft:iron_ingot',n2) }
  if (reward.id == 'gold') { var n3=oracleRandomInt(4,8); return oraclePlanStack('金锭 ×'+n3,'minecraft:gold_ingot',n3) }
  if (reward.id == 'lapis') { var n4=oracleRandomInt(16,32); return oraclePlanStack('青金石 ×'+n4,'minecraft:lapis_lazuli',n4) }
  if (reward.id == 'carrot') { var n5=oracleRandomInt(6,12); return oraclePlanStack('金胡萝卜 ×'+n5,'minecraft:golden_carrot',n5) }
  if (reward.id == 'bottles') { var n6=oracleRandomInt(6,12); return oraclePlanStack('附魔之瓶 ×'+n6,'minecraft:experience_bottle',n6) }
  if (reward.id == 'pearl') { var n7=oracleRandomInt(2,4); return oraclePlanStack('末影珍珠 ×'+n7,'minecraft:ender_pearl',n7) }
  if (reward.id == 'name_tag') { var n8=oracleRandomInt(1,2); return oraclePlanStack('命名牌 ×'+n8,'minecraft:name_tag',n8) }
  if (reward.id == 'meal') return oraclePlanMeal()
  if (reward.id == 'explore') return {name:'蓝色远行补给',kind:'item',displayItem:'minecraft:bundle',deliver:function (player) {
    oracleGiveItem(player,'minecraft:torch',24,'','火把'); oracleGiveItem(player,'minecraft:firework_rocket',12,'','烟花火箭'); oracleGiveItem(player,'minecraft:cooked_beef',8,'','熟食'); return true
  }}
  if (reward.id == 'tool') return oraclePlanBlueTool()
  return oraclePlanToken('幻形碎片返还 ×1',1)
}

function oraclePlanPet(player) {
  var pets = global.oracleCompanionCatalog || []
  if (!pets || pets.length <= 0) return oraclePlanStack('断线的命名牌 ×3','minecraft:name_tag',3)
  var fresh = [],i = 0
  for (i = 0; i < pets.length; i++) {
    var owned = false
    try { owned = global.oracleCompanionOwned && global.oracleCompanionOwned(player,pets[i].id) } catch (ignored) {}
    if (!owned) fresh.push(pets[i])
  }
  var pet = oraclePick(fresh.length > 0 ? fresh : pets)
  var duplicate = false
  try { duplicate = global.oracleCompanionOwned && global.oracleCompanionOwned(player,pet.id) } catch (ignoredDup) {}
  var egg = pet.type == 'minecraft:wolf' ? 'minecraft:wolf_spawn_egg' :
    (pet.type == 'minecraft:donkey' ? 'minecraft:donkey_spawn_egg' :
    (pet.type == 'minecraft:iron_golem' ? 'minecraft:carved_pumpkin' : 'minecraft:horse_spawn_egg'))
  return {
    name:pet.name,kind:'pet',id:pet.id,duplicate:duplicate == true,displayItem:egg,
    description:pet.flavor || '',
    deliver:function (p) { if (global.oracleCompanionGrant) return global.oracleCompanionGrant(p,pet.id,'oracle_4star'); return false }
  }
}

function oraclePlanFourStarWeapon() {
  var reward = oracleWeightedPick([{id:'sword',weight:28},{id:'pickaxe',weight:28},{id:'bow',weight:22},{id:'axe',weight:22}])
  if (reward.id == 'sword') return oraclePlanStack('四星兵装 · 紫雷短剑','minecraft:diamond_sword',1,'{Enchantments:[{id:"minecraft:sharpness",lvl:5s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:mending",lvl:1s}],HideFlags:1,display:{Name:\'{"text":"四星兵装·紫雷短剑","color":"light_purple","italic":false}\'}}')
  if (reward.id == 'pickaxe') return oraclePlanStack('四星兵装 · 星火矿镐','minecraft:diamond_pickaxe',1,'{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:fortune",lvl:3s},{id:"minecraft:unbreaking",lvl:3s}],HideFlags:1,display:{Name:\'{"text":"四星兵装·星火矿镐","color":"light_purple","italic":false}\'}}')
  if (reward.id == 'bow') return oraclePlanStack('四星兵装 · 暮光长弓','minecraft:bow',1,'{Enchantments:[{id:"minecraft:power",lvl:5s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:infinity",lvl:1s}],HideFlags:1,display:{Name:\'{"text":"四星兵装·暮光长弓","color":"light_purple","italic":false}\'}}')
  return oraclePlanStack('四星兵装 · 风压战斧','minecraft:diamond_axe',1,'{Enchantments:[{id:"minecraft:efficiency",lvl:5s},{id:"minecraft:sharpness",lvl:4s},{id:"minecraft:unbreaking",lvl:3s}],HideFlags:1,display:{Name:\'{"text":"四星兵装·风压战斧","color":"light_purple","italic":false}\'}}')
}

function oraclePlanEnchantedBook() {
  var books = [
    {name:'经验修补',id:'minecraft:mending',lv:1},{name:'耐久 III',id:'minecraft:unbreaking',lv:3},{name:'效率 V',id:'minecraft:efficiency',lv:5},
    {name:'锋利 V',id:'minecraft:sharpness',lv:5},{name:'保护 IV',id:'minecraft:protection',lv:4},{name:'时运 III',id:'minecraft:fortune',lv:3},
    {name:'抢夺 III',id:'minecraft:looting',lv:3},{name:'力量 V',id:'minecraft:power',lv:5},{name:'迅捷潜行 III',id:'minecraft:swift_sneak',lv:3}
  ]
  var b = oraclePick(books)
  return oraclePlanStack('高阶附魔书 · '+b.name,'minecraft:enchanted_book',1,'{StoredEnchantments:[{id:"'+b.id+'",lvl:'+b.lv+'s}]}')
}

function oracleItemExists(id) {
  if (!id) return false
  if (!global.__oracleItemExistCache) global.__oracleItemExistCache = {}
  if (global.__oracleItemExistCache[id] != null) return global.__oracleItemExistCache[id] == true
  var ok = false
  try {
    var stack = Item.of(id,1)
    ok = stack != null && String(stack.id) == String(id)
    try { if (stack.isEmpty && stack.isEmpty()) ok = false } catch (ignoredEmpty) {}
  } catch (ignored) { ok = false }
  global.__oracleItemExistCache[id] = ok
  return ok
}

function oraclePlanFourSpecial() {
  var defs = [
    {id:'godslayer_totem',weight:12},{id:'forbidden_fruit',weight:18},{id:'void_mother_pearl',weight:18},
    {id:'dragon_blood',weight:14},{id:'hunter_oil',weight:20},{id:'worldwalker_seal',weight:18}
  ]
  var picked = oracleWeightedPick(defs)
  var catalog = global.oracleSpecialCatalog || {}
  var data = catalog[picked.id]
  if (!data) return oraclePlanStack('附魔金苹果','minecraft:enchanted_golden_apple',1,'','special')
  return {
    name:data.name,kind:'special',id:data.id,displayItem:data.display || data.item || 'minecraft:amethyst_shard',description:data.lore || '',
    deliver:function (p) { if (global.oracleSpecialGrant) return global.oracleSpecialGrant(p,data.id,1,'oracle_4star'); return false }
  }
}

function oraclePlanModTreasure() {
  var pool = [],i = 0
  function add(mod,id,name,count) {
    if (mod && !oracleModLoaded(mod)) return
    if (!oracleItemExists(id)) return
    pool.push({id:id,name:name,count:count || 1})
  }

  add('twilightforest','twilightforest:charm_of_life_2','暮色遗珍 · 生命护符 II',1)
  add('twilightforest','twilightforest:charm_of_keeping_3','暮色遗珍 · 守藏护符 III',1)
  add('twilightforest','twilightforest:lamp_of_cinders','暮色遗珍 · 烬火神灯',1)
  add('twilightforest','twilightforest:magic_beans','暮色遗珍 · 魔法豆',2)
  add('twilightforest','twilightforest:ore_magnet','暮色遗珍 · 矿石磁石',1)

  add('aether','aether:life_shard','天境遗珍 · 生命碎片',1)
  add('aether','aether:invisibility_cloak','天境遗珍 · 隐身斗篷',1)
  add('aether','aether:golden_parachute','天境遗珍 · 黄金降落伞',1)
  add('aether','aether:healing_stone','天境遗珍 · 治愈石',2)

  add('alexscaves','alexscaves:totem_of_possession','洞穴遗珍 · 占有图腾',1)
  add('alexscaves','alexscaves:tectonic_shard','洞穴遗珍 · 构造碎片',3)
  add('mowziesmobs','mowziesmobs:ice_crystal','异兽遗珍 · 冰晶',1)
  add('mowziesmobs','mowziesmobs:earth_talisman','异兽遗珍 · 大地护符',1)
  add('sophisticatedbackpacks','sophisticatedbackpacks:diamond_backpack','远征遗珍 · 钻石背包',1)
  add('waystones','waystones:warp_stone','远征遗珍 · 传送石',1)

  if (pool.length <= 0) return null
  var picked = oraclePick(pool)
  return oraclePlanStack(picked.name,picked.id,picked.count,'','mod_item')
}

function oracleFourStarReward(player) {
  // 紫色命线只保留“值得拿出来用”的东西：禁忌消耗品、会死亡的同行契约、模组遗珍。
  var reward = oracleWeightedPick([
    {id:'special',weight:48},{id:'pet',weight:25},{id:'mod',weight:22},{id:'supply',weight:5}
  ])
  if (reward.id == 'special') return oraclePlanFourSpecial()
  if (reward.id == 'pet') return oraclePlanPet(player)
  if (reward.id == 'mod') {
    var mod = oraclePlanModTreasure()
    if (mod) return mod
    return oraclePlanFourSpecial()
  }
  var fallback = oracleWeightedPick([{id:'totem',weight:30},{id:'apple',weight:30},{id:'bottle',weight:20},{id:'rocket',weight:20}])
  if (fallback.id == 'totem') return oraclePlanStack('不死图腾 ×2','minecraft:totem_of_undying',2,'','consumable')
  if (fallback.id == 'apple') return oraclePlanStack('附魔金苹果','minecraft:enchanted_golden_apple',1,'','consumable')
  if (fallback.id == 'bottle') return oraclePlanStack('附魔之瓶 ×48','minecraft:experience_bottle',48,'','consumable')
  return oraclePlanStack('远征烟花 ×64','minecraft:firework_rocket',64,'','consumable')
}

function oracleYsmCatalog() {
  try { return global.divineSkinCatalog || [] } catch (ignored) {}
  return []
}

function oraclePlanYsm(player) {
  var catalog = oracleYsmCatalog()
  if (!catalog || catalog.length <= 0) return null
  var fresh = []
  var i = 0
  for (i = 0; i < catalog.length; i++) {
    var owned = false
    try { owned = global.divineSkinOwned && global.divineSkinOwned(player,catalog[i].id) } catch (ignored) {}
    if (!owned) fresh.push(catalog[i])
  }
  var pool = fresh.length > 0 ? fresh : catalog
  var total = 0
  for (i = 0; i < pool.length; i++) total += pool[i].weight || 1
  var roll = Math.random() * total
  var skin = pool[pool.length - 1]
  for (i = 0; i < pool.length; i++) { roll -= pool[i].weight || 1; if (roll <= 0) { skin = pool[i]; break } }
  var duplicate = false
  try { duplicate = global.divineSkinOwned && global.divineSkinOwned(player,skin.id) } catch (ignored2) {}
  var idx = 0
  try { idx = global.divineSkinIndexOf ? global.divineSkinIndexOf(skin.id) : 0 } catch (ignored3) {}
  return {
    name:'神秘惊喜',kind:'ysm',id:skin.id,index:idx,modelId:skin.modelId || '',duplicate:duplicate == true,
    displayItem:skin.iconItem || 'minecraft:nether_star',
    deliver:function (p) { if (global.divineSkinGrant) return global.divineSkinGrant(p,skin.id,'oracle_5star'); return false }
  }
}

function oraclePlanRelic(player) {
  var relics = global.oracleRelicCatalog || []
  var weighted = []
  var i = 0
  var totalWeight = 0
  for (i = 0; i < relics.length; i++) {
    if (relics[i].tier != 5) continue
    var owned = false
    var res = 0
    try { owned = global.oracleRelicOwned && global.oracleRelicOwned(player,relics[i].id) } catch (ignoredOwned) {}
    try { res = global.oracleRelicResonance ? global.oracleRelicResonance(player,relics[i].id) : 0 } catch (ignoredRes) {}
    // 没拿过的优先；未满命的重复仍然有足够概率；满命继续重复但显著降权。
    var weight = !owned ? 4.0 : (res < 3 ? 2.0 : 0.45)
    weighted.push({relic:relics[i],weight:weight,owned:owned,res:res})
    totalWeight += weight
  }
  if (weighted.length <= 0) return null
  var roll = Math.random() * totalWeight
  var chosen = weighted[weighted.length - 1]
  for (i = 0; i < weighted.length; i++) {
    roll -= weighted[i].weight
    if (roll <= 0) { chosen = weighted[i]; break }
  }
  var relic = chosen.relic
  return {
    name:relic.name + (chosen.owned ? (chosen.res >= 3 ? ' · 满命重复' : ' · 共鸣 +' + (chosen.res + 1)) : ''),kind:'relic',id:relic.id,duplicate:chosen.owned == true,
    displayItem:relic.item || 'minecraft:nether_star',
    deliver:function (p) { if (global.oracleRelicGrant) return global.oracleRelicGrant(p,relic.id,'oracle_5star'); return false }
  }
}

function oraclePlanFiveSpecial() {
  // 兼容旧调试入口：特别道具已经迁入 4★，这里不再进入正式 5★ 抽取。
  return oraclePlanFourSpecial()
}

function oracleFiveStarReward(player) {
  var hasOutfit = oracleYsmCatalog().length > 0
  // 金色命线只保留真正会改变长期收藏的两类：神秘惊喜与诸神遗物。
  var pick = hasOutfit ? oracleWeightedPick([{id:'ysm',weight:50},{id:'relic',weight:50}]) : {id:'relic'}
  if (pick.id == 'ysm') { var y = oraclePlanYsm(player); if (y) return y }
  var r = oraclePlanRelic(player); if (r) return r
  // 理论上只有遗物脚本未加载才会到这里；避免空奖励。
  var fallback = oraclePlanYsm(player); if (fallback) return fallback
  return oraclePlanStack('金色命线 · 下界之星','minecraft:nether_star',1,'','fallback')
}

function oraclePlanSixRelic(player) {
  var relics = global.oracleRelicCatalog || []
  var pool = []
  var i = 0
  for (i = 0; i < relics.length; i++) if (Number(relics[i].tier) == 6) pool.push(relics[i])
  if (pool.length <= 0) return null
  var relic = pool[Math.floor(Math.random() * pool.length)]
  var duplicate = false
  try { duplicate = global.oracleRelicOwned && global.oracleRelicOwned(player,relic.id) } catch (ignoredOwned) {}
  return {
    name:relic.name,kind:'relic',id:relic.id,duplicate:duplicate==true,
    displayItem:relic.item || 'minecraft:allium',
    description:relic.lore || '',
    deliver:function (p) { if (global.oracleRelicGrant) return global.oracleRelicGrant(p,relic.id,'oracle_6star'); return false }
  }
}

function oracleSixStarReward(player) {
  var r = oraclePlanSixRelic(player)
  if (r) return r
  // 6★ 目录异常时不凭空伪造彩蛋，退回金色长期收藏，避免空奖。
  return oracleFiveStarReward(player)
}

// ------------------------------------------------------------
// 品质、保底与结算
// ------------------------------------------------------------

function oracleFiveChance(pity) {
  if (pity >= ORACLE_HARD_PITY) return 1
  if (pity < ORACLE_SOFT_PITY_START) return ORACLE_BASE_FIVE_RATE
  var steps = pity - ORACLE_SOFT_PITY_START + 1
  var chance = ORACLE_BASE_FIVE_RATE + steps * 0.06
  return chance > 1 ? 1 : chance
}

function oracleAddStitches(player,rarity) {
  var add = rarity == '6★' ? 30 : (rarity == '5★' ? 15 : (rarity == '4★' ? 6 : (rarity == '3★' ? 2 : 1)))
  var next = player.persistentData.getInt('oracleStitches') + add
  player.persistentData.putInt('oracleStitches',next)
  return next
}

function oracleResolveRoll(player,forcedRarity) {
  if (!player) return null
  var fivePity = player.persistentData.getInt('oracleFivePity') + 1
  var fourPity = player.persistentData.getInt('oracleFourPity') + 1
  var threePity = player.persistentData.getInt('oracleThreePity') + 1
  var rarity = '2★'
  var roll = Math.random()
  var fiveChance = oracleFiveChance(fivePity)

  if (forcedRarity == '6★' || forcedRarity == '5★' || forcedRarity == '4★' || forcedRarity == '3★' || forcedRarity == '2★') rarity = forcedRarity
  else if (roll < ORACLE_BASE_SIX_RATE) rarity = '6★'
  else if (roll < ORACLE_BASE_SIX_RATE + fiveChance) rarity = '5★'
  else if (fourPity >= ORACLE_FOUR_HARD_PITY || roll < ORACLE_BASE_SIX_RATE + fiveChance + ORACLE_BASE_FOUR_RATE) rarity = '4★'
  else if (threePity >= ORACLE_THREE_HARD_PITY || roll < ORACLE_BASE_SIX_RATE + fiveChance + ORACLE_BASE_FOUR_RATE + ORACLE_BASE_THREE_RATE) rarity = '3★'

  var reward = null
  // 6★ 是独立彩蛋：不吃任何保底，也不重置 5★/4★/3★ 计数。
  if (rarity == '6★') reward = oracleSixStarReward(player)
  else if (rarity == '5★') { reward = oracleFiveStarReward(player); fivePity=0; fourPity=0; threePity=0 }
  else if (rarity == '4★') { reward = oracleFourStarReward(player); fourPity=0; threePity=0 }
  else if (rarity == '3★') { reward = oracleThreeStarReward(player); threePity=0 }
  else reward = oracleTwoStarReward(player)
  if (!reward) return null

  player.persistentData.putInt('oracleFivePity',fivePity)
  player.persistentData.putInt('oracleFourPity',fourPity)
  player.persistentData.putInt('oracleThreePity',threePity)
  player.persistentData.putInt('divineOracleTotal',player.persistentData.getInt('divineOracleTotal') + 1)
  var stitches = oracleAddStitches(player,rarity)

  if (!ORACLE_DEV_FORCE_ACTIVE && global.historyRecordOracleDraw) {
    try { global.historyRecordOracleDraw(player,rarity,reward.name,reward.kind) } catch (ignored) {}
  }

  return {
    rarity:rarity,name:reward.name,kind:reward.kind,id:reward.id || '',index:reward.index || 0,modelId:reward.modelId || '',
    displayItem:reward.displayItem || '',duplicate:reward.duplicate == true,
    deliver:reward.deliver || null,delivered:false,stitches:stitches,fivePity:fivePity,fourPity:fourPity,threePity:threePity
  }
}

function oracleRarityRank(rarity) { return rarity == '6★' ? 6 : (rarity == '5★' ? 5 : (rarity == '4★' ? 4 : (rarity == '3★' ? 3 : 2))) }
function oracleRarityColor(rarity) { return rarity == '6★' ? 'red' : (rarity == '5★' ? 'gold' : (rarity == '4★' ? 'light_purple' : (rarity == '3★' ? 'blue' : 'gray'))) }
function oracleRarityName(rarity) { return rarity == '6★' ? '红色 · 彩蛋' : (rarity == '5★' ? '金色' : (rarity == '4★' ? '紫色' : (rarity == '3★' ? '蓝色' : '灰色'))) }

function oracleTeaser(rarity) {
  if (rarity == '6★') return '一根红线没有从匣子里出来。它像是从世界背面绕了一圈，最后轻轻缠到了你的手指上。'
  if (rarity == '5★') return '金光停在匣口，没有立刻落下来。里面像有人把最后一根线又绕了一圈。'
  if (rarity == '4★') return '紫光停了一瞬。匣盖没开，里面先传来一声清脆的碰响。'
  if (rarity == '3★') return '一缕蓝光沿着匣边绕过去，随后安静下来。'
  return '灰线落稳，旧匣轻轻弹了一下。'
}

function oracleRunRarityFx(player,rarity,phase,delay) {
  if (!player || !player.server) return
  player.server.scheduleInTicks(Math.max(0,delay || 0),function () {
    try {
      if (global.divineStationPlayRarityFx) global.divineStationPlayRarityFx(player,rarity,phase)
    } catch (error) { console.log('[DivineOracle] station rarity fx failed: ' + error) }
  })
}

function oraclePlayChargeSounds(player,rarity,baseDelay) {
  if (!player || !player.server) return
  var u = String(player.username)
  var server = player.server
  var d = baseDelay || 0
  // 同一套“匣内有东西正在靠近”的听觉节奏，不在 UI 里解释它。
  server.scheduleInTicks(d + 2,function () { try { server.runCommandSilent('execute at ' + u + ' run playsound minecraft:block.respawn_anchor.charge player ' + u + ' ~ ~ ~ 0.38 ' + (rarity == '6★' ? '0.52' : (rarity == '5★' ? '0.68' : (rarity == '4★' ? '0.88' : '1.12')))) } catch (ignored) {} })
  server.scheduleInTicks(d + 11,function () { try { server.runCommandSilent('execute at ' + u + ' run playsound minecraft:block.amethyst_block.resonate player ' + u + ' ~ ~ ~ 0.48 ' + (rarity == '6★' ? '0.46' : (rarity == '5★' ? '0.62' : (rarity == '4★' ? '0.94' : '1.30')))) } catch (ignored) {} })
  if (rarity == '4★' || rarity == '5★' || rarity == '6★') server.scheduleInTicks(d + 20,function () { try { server.runCommandSilent('execute at ' + u + ' run playsound minecraft:block.beacon.power_select player ' + u + ' ~ ~ ~ 0.36 ' + (rarity == '6★' ? '0.60' : (rarity == '5★' ? '0.78' : '1.04'))) } catch (ignored) {} })
  if (rarity == '5★' || rarity == '6★') server.scheduleInTicks(d + 31,function () { try { server.runCommandSilent('execute at ' + u + ' run playsound minecraft:ui.toast.challenge_complete player ' + u + ' ~ ~ ~ 0.72 ' + (rarity=='6★'?'0.72':'0.92')) } catch (ignored) {} })
}

function oracleResultLine(result,index,total) {
  var color = oracleRarityColor(result.rarity)
  var prefix = total > 1 ? ('[' + index + '/' + total + '] ') : ''
  var line = [{text:prefix + result.rarity + '  ',color:color,bold:true},{text:result.name,color:color,bold:result.rarity != '2★'}]
  if (result.duplicate) line.push({text:'  · 命线重合',color:'red',italic:true})
  if (result.kind == 'ysm') { line.push({text:'  '}); line.push(oracleButton('查看衣柜','/wardrobe','light_purple')) }
  if (result.kind == 'pet') { line.push({text:'  '}); line.push(oracleButton('同行者','/companions','yellow')) }
  if (result.kind == 'relic' || result.kind == 'special') { line.push({text:'  '}); line.push(oracleButton('遗物柜','/relics','aqua')) }
  return line
}

function oracleDeliverResult(player,result) {
  if (!player || !result || result.delivered == true) return false
  try {
    var outcome = result.deliver ? result.deliver(player) : true
    var failed = outcome === false
    try { if (outcome && typeof outcome == 'object' && outcome.ok === false) failed = true } catch (ignoredOutcome) {}
    if (failed) {
      console.log('[DivineOracle] reward delivery returned failure: ' + result.name + ' / kind=' + result.kind + ' / id=' + (result.id || ''))
      player.tell(Text.red('这份奖励没有真正写入，请不要继续抽取，并把 latest.log 发给管理员。'))
      return false
    }
    result.delivered = true
    return true
  } catch (error) {
    console.log('[DivineOracle] reward delivery failed: ' + result.name + ' / ' + error)
    if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,1)
    player.tell(Text.red('这份奖励交付失败，已退回 1 枚碎片。请把 latest.log 发给管理员。'))
    return false
  }
}

global.oracleDeliverResult = oracleDeliverResult

function oracleBroadcastRare(player,result) {
  if (!player || !player.server || !result) return
  if (result.rarity != '4★' && result.rarity != '5★' && result.rarity != '6★') return
  var color = result.rarity == '6★' ? 'red' : (result.rarity == '5★' ? 'gold' : 'light_purple')
  var prefix = result.rarity == '6★' ? '★★★★★★' : (result.rarity == '5★' ? '★★★★★' : '★★★★')
  player.server.runCommandSilent(result.rarity == '6★'
    ? 'execute as @a at @s run playsound minecraft:entity.wither.spawn player @s ~ ~ ~ 0.42 1.32'
    : (result.rarity == '5★'
      ? 'execute as @a at @s run playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 0.62 1.00'
      : 'execute as @a at @s run playsound minecraft:block.amethyst_block.resonate player @s ~ ~ ~ 0.45 1.18'))
  if (result.rarity == '5★' || result.rarity == '6★') player.server.runCommandSilent('execute as @a at @s run playsound minecraft:block.bell.resonate player @s ~ ~ ~ 0.24 ' + (result.rarity=='6★'?'0.52':'0.65'))
  player.server.runCommandSilent('tellraw @a ' + JSON.stringify([
    {text:prefix + ' · ',color:color,bold:true},
    {text:String(player.username),color:'yellow',bold:true},
    {text:' 在三纺女的旧匣中抽中了 ',color:'gray'},
    {text:result.name,color:color,bold:true},
    {text:'！',color:'white',bold:true}
  ]))
}

function oracleRevealAndDeliver(player,result,index,total,delay) {
  if (!player || !player.server || !result) return
  var server = player.server
  // 先翻开卡面。此刻仍不发奖，让“看见是什么”与“拿到手”之间留一点余味。
  server.scheduleInTicks(delay,function () {
    try {
      oracleTell(player,oracleResultLine(result,index,total))
      if (result.rarity == '4★' || result.rarity == '5★' || result.rarity == '6★') {
        try { if (global.divineStationProjectReward) global.divineStationProjectReward(player,result) } catch (ignoredProjection) {}
      }
      var u = String(player.username)
      server.runCommandSilent('execute at ' + u + ' run playsound minecraft:entity.experience_orb.pickup player ' + u + ' ~ ~ ~ 0.42 ' + (result.rarity == '6★' ? '0.46' : (result.rarity == '5★' ? '0.58' : (result.rarity == '4★' ? '0.82' : '1.28'))))
    } catch (error) { console.log('[DivineOracle] sequential reveal failed: ' + error) }
  })
  // 奖品名已经完整出现后，再真正发进背包/解锁收藏。
  server.scheduleInTicks(delay + 16,function () {
    try { oracleDeliverResult(player,result) } catch (error) { console.log('[DivineOracle] delayed delivery failed: ' + error) }
  })
  // 稀有播报成为这一张卡真正落地后的尾声。
  if (result.rarity == '4★' || result.rarity == '5★' || result.rarity == '6★') {
    server.scheduleInTicks(delay + 19,function () {
      try { oracleBroadcastRare(player,result) } catch (error) { console.log('[DivineOracle] rare broadcast failed: ' + error) }
    })
  }
}

function oracleRevealSingle(player,result) {
  if (!player || !player.server || !result) return
  var server = player.server
  oracleTell(player,{text:'✦ ' + oracleRarityName(result.rarity) + '。',color:oracleRarityColor(result.rarity),bold:true})
  server.scheduleInTicks(12,function () { try { oracleTell(player,{text:oracleTeaser(result.rarity),color:oracleRarityColor(result.rarity),italic:true}) } catch (ignored) {} })
  server.scheduleInTicks(30,function () { try { oracleTell(player,{text:result.rarity == '6★' ? '所有声音都像被红线轻轻按住了。' : (result.rarity == '5★' ? '匣子里忽然安静了。' : '里面又响了一声。'),color:'white'}) } catch (ignored) {} })

  oracleRunRarityFx(player,result.rarity,0,0)
  oracleRunRarityFx(player,result.rarity,1,20)
  oracleRunRarityFx(player,result.rarity,2,42)
  oraclePlayChargeSounds(player,result.rarity,0)
  oracleRevealAndDeliver(player,result,1,1,56)
  server.scheduleInTicks(82,function () { try { player.tell(Text.darkGray('织痕 · ' + result.stitches + '/' + ORACLE_STITCH_RELIC_COST + '    缓存 · /oracle cache')) } catch (ignored) {} })
}

function oracleSortResults(results) {
  var tagged = []
  var i = 0
  for (i = 0; i < results.length; i++) { results[i]._order = i; tagged.push(results[i]) }
  tagged.sort(function (a,b) {
    var dr = oracleRarityRank(b.rarity) - oracleRarityRank(a.rarity)
    return dr != 0 ? dr : a._order - b._order
  })
  return tagged
}

function oracleDrawMany(player,amount) {
  if (!player || !player.server || amount <= 0) return false
  if (!global.takeDivineTokens || !global.takeDivineTokens(player,amount)) {
    player.tell(Text.red(amount + ' 次抽取需要 ' + amount + ' 枚幻形碎片。'))
    return false
  }

  var results = []
  var i = 0
  for (i = 0; i < amount; i++) {
    var r = oracleResolveRoll(player,'')
    if (r) results.push(r)
  }
  if (results.length <= 0) {
    if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,amount)
    return false
  }
  if (results.length < amount && global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,amount - results.length)

  var sorted = oracleSortResults(results)
  var best = sorted[0]
  oracleTell(player,{text:'✦ 十道线同时沉进旧匣。最亮的一道先浮了上来：' + oracleRarityName(best.rarity) + '。',color:oracleRarityColor(best.rarity),bold:true})
  player.server.scheduleInTicks(13,function () { try { oracleTell(player,{text:oracleTeaser(best.rarity),color:oracleRarityColor(best.rarity),italic:true}) } catch (ignored) {} })
  player.server.scheduleInTicks(31,function () { try { oracleTell(player,{text:'最亮的一道先翻面。后面的九道还压在匣底。',color:'white'}) } catch (ignored) {} })

  // 十连只为“本次最高品质”播放一整套演出。后续卡片只逐张翻面，不重复喷粒子。
  oracleRunRarityFx(player,best.rarity,0,0)
  oracleRunRarityFx(player,best.rarity,1,20)
  oracleRunRarityFx(player,best.rarity,2,44)
  oraclePlayChargeSounds(player,best.rarity,2)

  var firstDelay = 58
  var step = 30
  for (i = 0; i < sorted.length; i++) {
    oracleRevealAndDeliver(player,sorted[i],i + 1,sorted.length,firstDelay + i * step)
  }

  var finishDelay = firstDelay + sorted.length * step + 12
  player.server.scheduleInTicks(finishDelay,function () {
    try {
      oracleTell(player,[
        {text:'✦ 最后一根线落下了。',color:'light_purple',bold:true},
        {text:'  织痕 ' + player.persistentData.getInt('oracleStitches') + '/' + ORACLE_STITCH_RELIC_COST,color:'gray'},
        {text:'  '},oracleButton('奖励缓存','/oracle cache','aqua')
      ])
    } catch (ignored) {}
  })
  return true
}

function oracleSingleRoll(player,silent) {
  if (!player || !player.server) return false
  if (!global.takeDivineTokens || !global.takeDivineTokens(player,1)) {
    if (!silent) player.tell(Text.red('一次抽取需要 1 枚幻形碎片。'))
    return false
  }
  var result = oracleResolveRoll(player,'')
  if (!result) {
    if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,1)
    player.tell(Text.red('旧匣没能固定这条命线，碎片已经退回。'))
    return false
  }
  oracleRevealSingle(player,result)
  return true
}

function oracleDrawTen(player) { return oracleDrawMany(player,10) }
function oracleDrawFive(player) { return oracleDrawMany(player,5) }

// ------------------------------------------------------------
// 菜单 / 预览 / 收藏
// ------------------------------------------------------------

function oracleShow(player) {
  if (!player) return
  var tokens = global.getDivineTokenCount ? global.getDivineTokenCount(player) : 0
  var embers = global.divineSkinGetEmbers ? global.divineSkinGetEmbers(player) : player.persistentData.getInt('oracleEmbers')
  var cache = oracleCacheRead(player)
  oracleTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_purple'},
    {text:'✦ 三纺女的旧匣\n',color:'light_purple',bold:true},
    {text:'旧匣总比人慢半拍。先让你看见一点，再决定把什么东西交到你手里。十道线一起落下时，最亮的那一道会先翻面。\n\n',color:'gray',italic:true},
    {text:'幻形碎片 · ' + tokens + '    余烬 · ' + embers + '    缓存 · ' + cache.length + '\n',color:'gray'},
    {text:'5★ · ' + player.persistentData.getInt('oracleFivePity') + '/' + ORACLE_HARD_PITY + '    4★ · ' + player.persistentData.getInt('oracleFourPity') + '/' + ORACLE_FOUR_HARD_PITY + '    3★ · ' + player.persistentData.getInt('oracleThreePity') + '/' + ORACLE_THREE_HARD_PITY + '\n',color:'dark_gray'},
    {text:'织痕 · ' + player.persistentData.getInt('oracleStitches') + '/' + ORACLE_STITCH_RELIC_COST + '\n\n',color:'blue'},
    oracleButton('单抽','/oracle draw','aqua'),{text:'  '},oracleButton('十连','/oracle ten','gold'),{text:'  '},oracleButton('奖励缓存','/oracle cache','green'),
    {text:'\n'},oracleButton('大奖预览','/oracle preview','light_purple'),{text:'  '},oracleButton('概率','/oracle rates','gray'),{text:'  '},oracleButton('收藏','/oracle collection','yellow'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_purple'}
  ])
}

function oracleRates(player) {
  oracleTell(player,[
    {text:'✦ 旧匣明示概率\n',color:'aqua',bold:true},
    {text:'6★ 红色 · 0.001% 基础 · 彩蛋遗物\n',color:'red',bold:true},
    {text:'5★ 金色 · 0.6% 基础 · 神秘惊喜 / 诸神遗物\n',color:'gold'},
    {text:'4★ 紫色 · 3.4% 基础 · 禁忌消耗品 / 同行契约 / 异界遗珍\n',color:'light_purple'},
    {text:'3★ 蓝色 · 20.0%\n',color:'blue'},
    {text:'2★ 灰色 · 75.999%\n\n',color:'gray'},
    {text:'6★ 没有保底，也不会清空 5★/4★/3★ 保底计数。每 10 抽至少 3★；每 30 抽至少 4★；第 65 抽起提高 5★ 概率，第 80 抽必得 5★。\n',color:'white'},
    {text:'红线属于旧匣没有写进目录的彩蛋；金色命线只留下会被长期记住的东西。',color:'dark_gray',italic:true}
  ])
}

function oraclePreview(player) {
  oracleTell(player,[
    {text:'✦ 红色命线 · 彩蛋\n',color:'red',bold:true},
    {text:'旧匣拒绝公开这一档的具体内容。只有真正抽中时，它才会在世界里留下名字。\n\n',color:'dark_red',italic:true},
    {text:'✦ 金色命线\n',color:'gold',bold:true},
    {text:'神秘惊喜 · 内容在真正解锁前不会公开。\n',color:'light_purple'},
    {text:'诸神遗物 · 每一件都有三次共鸣；最后一次不是加法，而是权柄完全苏醒。\n\n',color:'gold'},
    {text:'✦ 紫色命线\n',color:'light_purple',bold:true},
    {text:'禁忌道具 · 高风险的一次性权柄与远征用品。\n',color:'gray'},
    {text:'随行者 · 有生命代价的契约；真正死亡后契约也会断裂。\n',color:'yellow'},
    {text:'也可能出现来自其他世界的稀有遗珍。\n\n',color:'dark_gray'},
    oracleButton('传奇衣柜','/wardrobe','light_purple'),{text:'  '},oracleButton('诸神回廊','/relics','aqua'),{text:'  '},oracleButton('随行者','/companions','yellow')
  ])
}

function oracleCollection(player) {
  oracleTell(player,[
    {text:'✦ 旧匣留下的痕迹\n',color:'gold',bold:true},
    {text:'神秘惊喜只有真正被你解锁以后，传奇衣柜才会写下它的名字与详情。\n\n',color:'gray',italic:true},
    oracleButton('传奇衣柜','/wardrobe','light_purple'),{text:'  '},oracleButton('诸神遗物','/relics','aqua'),{text:'  '},oracleButton('随行者','/companions','yellow'),{text:'  '},oracleButton('未取走的奖品','/oracle cache','green'),
    {text:'\n\n旧印：',color:'gray'}
  ])
  var i = 0,count = 0
  for (i = 0; i < DIVINE_SEALS.length; i++) {
    if (player.persistentData.getBoolean('divineSeal_' + DIVINE_SEALS[i].id)) { oracleTell(player,{text:'✦ ' + DIVINE_SEALS[i].name,color:DIVINE_SEALS[i].color}); count++ }
  }
  if (count <= 0) player.tell(Text.gray('石壁上还没有一枚旧印发亮。'))
}

function oracleHistory(player) {
  if (global.historyShowOracle) { try { global.historyShowOracle(player); return } catch (ignored) {} }
  player.tell(Text.gray('诸神纪事暂时没有返回旧匣记录。'))
}

function oracleSpendEmbers(player,amount) {
  var now = global.divineSkinGetEmbers ? global.divineSkinGetEmbers(player) : player.persistentData.getInt('oracleEmbers')
  if (now < amount) return false
  if (global.divineSkinAddEmbers) global.divineSkinAddEmbers(player,-amount)
  else player.persistentData.putInt('oracleEmbers',now - amount)
  return true
}

function oracleShop(player) {
  var embers = global.divineSkinGetEmbers ? global.divineSkinGetEmbers(player) : player.persistentData.getInt('oracleEmbers')
  oracleTell(player,[
    {text:'🔥 幻形余烬交换\n',color:'red',bold:true},
    {text:'现有余烬 · ' + embers + '\n',color:'gold'},
    {text:'神秘惊喜中已经解锁的着装，也可以用余烬慢慢换回来。\n',color:'gray'},
    oracleButton('打开传奇衣柜','/wardrobe','light_purple')
  ])
}

function oracleWeaveRelic(player) {
  if (!player || !global.oracleRelicGrantRandom) return false
  var stitches = player.persistentData.getInt('oracleStitches')
  if (stitches < ORACLE_STITCH_RELIC_COST) {
    player.tell(Text.blue('还需要 ' + (ORACLE_STITCH_RELIC_COST - stitches) + ' 道织痕，才能换一件 5★ 神系遗物。'))
    return false
  }
  player.persistentData.putInt('oracleStitches',stitches - ORACLE_STITCH_RELIC_COST)
  var r = global.oracleRelicGrantRandom(player,5,'stitch_exchange')
  return r && r.ok == true
}

// ------------------------------------------------------------
// 管理员测试：不污染保底；动画测试不发奖
// ------------------------------------------------------------

function oracleAnimationTest(player,rarity) {
  if (!player || !player.server) return false
  var fake = {rarity:rarity,name:'演出测试 · ' + oracleRarityName(rarity),kind:'test',displayItem:rarity=='6★'?'minecraft:allium':(rarity=='5★'?'minecraft:nether_star':(rarity=='4★'?'minecraft:amethyst_shard':(rarity=='3★'?'minecraft:lapis_lazuli':'minecraft:light_blue_dye'))),delivered:true}
  oracleTell(player,{text:'【管理员演出测试】不发奖励、不改保底。',color:'dark_gray'})
  oracleRunRarityFx(player,rarity,0,0); oracleRunRarityFx(player,rarity,1,20); oracleRunRarityFx(player,rarity,2,44); oraclePlayChargeSounds(player,rarity,0)
  player.server.scheduleInTicks(58,function () { try { oracleTell(player,oracleResultLine(fake,1,1)); if (global.divineStationProjectReward) global.divineStationProjectReward(player,fake) } catch (ignored) {} })
  return true
}

function oracleDevForce(player,rarity) {
  if (!player) return false
  var p5=player.persistentData.getInt('oracleFivePity'), p4=player.persistentData.getInt('oracleFourPity'), p3=player.persistentData.getInt('oracleThreePity')
  var total=player.persistentData.getInt('divineOracleTotal'), stitches=player.persistentData.getInt('oracleStitches')
  ORACLE_DEV_FORCE_ACTIVE=true
  var result=null
  try { result=oracleResolveRoll(player,rarity) } finally {
    ORACLE_DEV_FORCE_ACTIVE=false
    player.persistentData.putInt('oracleFivePity',p5); player.persistentData.putInt('oracleFourPity',p4); player.persistentData.putInt('oracleThreePity',p3); player.persistentData.putInt('divineOracleTotal',total); player.persistentData.putInt('oracleStitches',stitches)
  }
  if (!result) return false
  result.stitches=stitches
  oracleRevealSingle(player,result)
  return true
}

// ------------------------------------------------------------
// Commands
// ------------------------------------------------------------

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('oracle')
  root.executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleShow(p); return 1 })
  root.then(Commands.literal('draw').executes(function (ctx) { var p=ctx.source.player; return p && oracleSingleRoll(p,false) ? 1 : 0 }))
  root.then(Commands.literal('ten').executes(function (ctx) { var p=ctx.source.player; return p && oracleDrawTen(p) ? 1 : 0 }))
  root.then(Commands.literal('five').executes(function (ctx) { var p=ctx.source.player; return p && oracleDrawFive(p) ? 1 : 0 }))
  root.then(Commands.literal('rates').executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleRates(p); return 1 }))
  root.then(Commands.literal('preview').executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oraclePreview(p); return 1 }))
  root.then(Commands.literal('history').executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleHistory(p); return 1 }))
  root.then(Commands.literal('collection').executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleCollection(p); return 1 }))
  root.then(Commands.literal('shop').executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleShop(p); return 1 }))
  root.then(Commands.literal('weave').executes(function (ctx) { var p=ctx.source.player; return p && oracleWeaveRelic(p) ? 1 : 0 }))

  var cache = Commands.literal('cache')
  cache.executes(function (ctx) { var p=ctx.source.player; if(!p)return 0; oracleCacheShow(p); return 1 })
  cache.then(Commands.literal('claim').executes(function (ctx) { var p=ctx.source.player; return p && oracleCacheClaim(p) ? 1 : 0 }))
  root.then(cache)
  event.register(root)
})

global.oracleSingleRoll = oracleSingleRoll
global.oracleDrawFive = oracleDrawFive
global.oracleDrawTen = oracleDrawTen
global.oracleShow = oracleShow
global.oracleCollection = oracleCollection
global.oracleRates = oracleRates
global.oracleHistory = oracleHistory
global.oracleShop = oracleShop
global.oraclePreview = oraclePreview
global.oracleDevForce = oracleDevForce
global.oracleWeaveRelic = oracleWeaveRelic
global.oracleRarityColor = oracleRarityColor
global.oracleAnimationTest = oracleAnimationTest
global.oracleYsmPoolReady = function () { return true }
global.oracleCacheShow = oracleCacheShow
global.oracleCacheClaim = oracleCacheClaim

console.log('[DivineOracle] V10.8.16 loaded - YSM outfits are mystery surprises; no outfit display projection.')
