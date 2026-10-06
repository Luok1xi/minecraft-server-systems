// ============================================================
// 诸神遗物 V10.6.5 · 火神音效移除 / 黑焰旧紫色回退删除 / 死神 10-8-5 保持
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.x
//
// 规则：
// - 常规神系遗物属于 5★ 金色池；Luokixi 的「薇」是独立 6★ 红色彩蛋遗物。
// - 第一次获得 = 本体；随后重复三次分别升到 共鸣 I / II / III（满命）。
// - 满命后继续重复：转化为余烬 + 幻形碎片。
// - 大多数能力完全事件驱动；黑焰 / 深渊恐惧只在命中后对有限目标启动有硬上限的生命周期。
// ============================================================

var ORACLE_RELIC_MAX_RESONANCE = 3
var ORACLE_BLACK_FLAME_MAX_ACTIVE = 8
var ORACLE_BLACK_FLAME_ACTIVE = {}
var ORACLE_ABYSS_FEAR_MAX_ACTIVE = 10
var ORACLE_ABYSS_FEAR_ACTIVE = {}
var ORACLE_HEARTH_SANCTUARY_COOLDOWN = 180000
var ORACLE_SUN_HEALTH_CAP = 200
var ORACLE_SUN_HEALTH_UUID = '3b72ed12-11de-46b4-8d13-65964c05a901'

var ORACLE_RELICS = [
  {
    id:'rain_mother_gift',tier:5,name:'雨母的回礼',fullName:'雨母的丰年',item:'minecraft:wooden_hoe',color:'aqua',
    deity:'雨母 · 维尔娜',domain:'丰收 · 雨露 · 长桌',
    lore:'她只在意一件事：桌上别空着。',
    effect:'收割成熟作物会额外产出；共鸣提高产量并加入自动补种。潜行右键可发动丰年，满命时还能照顾附近玩家。',
    stages:[
      '收割成熟作物时额外产出 1 份。',
      '额外产出提高到 2 份，并自动补种。',
      '额外产出提高到 3 份；收割附带恢复，丰年范围与增益提高。',
      '满命：基础额外产出 4 份；丰年期间继续增产，并为附近玩家提供恢复、饱食与幸运。'
    ],
    enchants:[['minecraft:efficiency',7],['minecraft:fortune',5],['minecraft:unbreaking',5],['minecraft:mending',1]]
  },
  {
    id:'wind_king_release',tier:5,name:'风王的放行',fullName:'风王的自由',item:'minecraft:elytra',color:'white',
    deity:'风王 · 埃奥伦',domain:'远行 · 自由 · 天空',
    lore:'风不会替你选路。',
    effect:'穿戴羽衣后持续获得移动与坠落保护；共鸣逐步加入跳跃、撞墙保护，满命开放生存飞行。',
    stages:[
      '穿戴时获得速度与缓降。',
      '追加跳跃强化，并免疫坠落伤害。',
      '移动进一步加快；高速撞墙也不再结算伤害。',
      '满命：穿戴期间开放生存飞行。'
    ],
    enchants:[['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'tide_king_command',tier:5,name:'潮王的号令',fullName:'潮王的王潮',item:'minecraft:trident',color:'aqua',
    deity:'潮王 · 奈瑞昂',domain:'海潮 · 牵引 · 王潮',
    lore:'海会回应号令，不会回应请求。',
    effect:'手持三叉戟右键召潮；共鸣 II 起可牵引附近生物，潜行时改为推离。满命扩大范围与强度。',
    stages:[
      '右键召潮，附近鱼群向你靠拢；水下作战获得基础强化。',
      '召潮冷却缩短、范围提高，水下战斗能力继续增强。',
      '召潮开始影响普通生物；普通右键牵引，潜行右键推离。',
      '满命：王潮获得最大范围、牵引强度与水下庇护。'
    ],
    enchants:[['minecraft:loyalty',5],['minecraft:impaling',7],['minecraft:channeling',1],['minecraft:unbreaking',5],['minecraft:mending',1]]
  },
  {
    id:'hearth_guard',tier:5,name:'炉神的庇护',fullName:'炉神的归家',item:'minecraft:shield',color:'gold',
    deity:'炉神 · 最后火种的守护者',domain:'庇护 · 炉火 · 归来',
    lore:'只要炉火还亮着，就有人能回家。',
    effect:'持盾受击时有概率完全挡下伤害并获得庇护；共鸣提高格挡并惠及队友。满命可周期性拒绝一次致命伤。',
    stages:[
      '受击时有概率完全格挡，并获得短暂吸收与抗火。',
      '格挡概率提高；成功后追加恢复。',
      '成功格挡时，附近玩家也会得到短暂抗性与恢复。',
      '满命：格挡进一步提高；致命伤可触发「最后一炉」，救回自己并庇护附近玩家。'
    ],
    enchants:[['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'fire_god_ember',tier:5,name:'火神的余烬',fullName:'火神的黑焰',item:'minecraft:blaze_rod',color:'red',
    deity:'火神 · 行火与黑焰之主',domain:'燃烧 · 爆燃 · 黑焰',
    lore:'这团火不是为了照明。',
    effect:'命中会把神火留在目标身上并周期造成额外伤害；共鸣提高持续时间、伤害与爆燃。满命变为不会自行熄灭的黑焰。',
    stages:[
      '命中附着神火，持续数秒并周期灼伤目标。',
      '神火持续更久、伤害提高，并有更高概率触发爆燃。',
      '神火伤害继续提高；目标死亡时会灼伤附近敌人。',
      '满命：神火转为黑焰，不再自行结束，会持续追到目标死亡。'
    ],
    enchants:[['minecraft:sharpness',7],['minecraft:fire_aspect',4],['minecraft:looting',4],['minecraft:unbreaking',5],['minecraft:mending',1]]
  },
  {
    id:'earth_father_order',tier:5,name:'土父的指令',fullName:'土父的裁决',item:'minecraft:stone_pickaxe',color:'dark_green',
    deity:'土父 · 山脉与地契之主',domain:'山岳 · 地脉 · 放逐',
    lore:'脚下这块地，从来不是中立的。',
    effect:'挖矿会连锁崩解同类矿脉；共鸣 II 起可潜行右键震地。满命攻击非玩家目标时有概率直接放逐到世界下层。',
    stages:[
      '挖掘矿石时，最多额外连锁挖掘 12 个同类矿块。',
      '连锁上限提高到 20，并在触发后获得短暂急迫。',
      '连锁上限提高到 30；潜行右键可震地，伤害并削弱附近敌人。',
      '满命：连锁上限 40，震地强化；攻击非玩家目标时有 25% 概率触发「放逐」，直接送往世界下层。'
    ],
    enchants:[['minecraft:efficiency',8],['minecraft:fortune',5],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'sun_king_favor',tier:5,name:'日王的嘉奖',fullName:'日王的加冕',item:'minecraft:golden_axe',color:'gold',
    deity:'日王 · 索拉恩',domain:'太阳 · 生命 · 日冕',
    lore:'正午从不偷偷奖励谁。',
    effect:'命中会点燃目标并恢复自身；连续作战会积累日冕强化。满命击杀足够敌人后可永久提高最大生命。',
    stages:[
      '命中造成灼烧并获得恢复；持有时攻击者也会被日光灼伤。',
      '连续命中会积累日冕，并获得更强的临时生存能力。',
      '日冕会向附近敌人扩散伤害，连续作战收益提高。',
      '满命：日冕进入完整加冕状态；每累计 20 个敌对击杀，可永久增加最大生命，直到上限。'
    ],
    enchants:[['minecraft:sharpness',8],['minecraft:fire_aspect',4],['minecraft:efficiency',6],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'moon_queen_gaze',tier:5,name:'月后的注视',fullName:'月后的月蚀',item:'minecraft:iron_helmet',color:'light_purple',
    deity:'月后 · 露娜娅',domain:'月影 · 闪避 · 月蚀',
    lore:'月光只需要让刀偏开一点。',
    effect:'佩戴银冠后有概率直接闪避伤害；共鸣提高闪避并赋予反击窗口。满命配合日王遗物可触发日月蚀。',
    stages:[
      '佩戴时有基础闪避概率，成功时完全取消本次伤害。',
      '闪避概率提高；成功后获得短暂隐身与一次月返反击窗口。',
      '闪避与月返继续强化，并能削弱攻击者。',
      '满命：闪避率达到最高；同时拥有日王遗物时，月返可触发日月蚀，压制附近敌人的感官与战斗能力。'
    ],
    enchants:[['minecraft:protection',7],['minecraft:respiration',5],['minecraft:aqua_affinity',1],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'death_god_register',tier:5,name:'死神的名册',fullName:'死神的终句',item:'minecraft:netherite_hoe',color:'dark_red',
    deity:'死神 · 莫尔维恩',domain:'献血 · 终句 · 处刑',
    lore:'被数到最后的东西，通常不会留下第二次机会。',
    effect:'命中任意非玩家生物都会为持有者累计刀数，切换目标不会清空。达到当前阈值时，对这一刀击中的目标提出处决；非满命遇到 Boss 会被拒绝且保留刀数，满命可处决 Boss。',
    stages:[
      '本体：累计 10 刀；刀数属于持有者，换目标不清零。非 Boss 可处决；Boss 拒绝且刀数保留。',
      '共鸣 I：仍为 10 刀；换目标不清零。非 Boss 可处决；Boss 拒绝且刀数保留。',
      '共鸣 II：处决阈值降至 8 刀；Boss 仍会拒绝，拒绝后刀数保持满值。',
      '满命：处决阈值降至 5 刀；Boss 不再拥有拒绝权。只有真正处决成功后刀数才归零。'
    ],
    enchants:[['minecraft:sharpness',7],['minecraft:smite',7],['minecraft:looting',5],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'abyss_god_echo',tier:5,name:'渊神的回声',fullName:'渊神的凝视',item:'minecraft:iron_hoe',color:'dark_aqua',
    deity:'渊神 · 奈瑟',domain:'恐惧 · 凋零 · 深渊',
    lore:'深处不追人。它只等人往下看。',
    effect:'命中会附加黑暗、削弱与强化凋零；共鸣延长持续时间并提高侵蚀。满命时深渊状态会追到目标死亡，并可扩散到附近生物。',
    stages:[
      '命中附加短时深渊侵蚀：黑暗与强化凋零周期造成伤害。',
      '侵蚀持续更久，并追加虚弱与迟缓。',
      '持续时间、伤害与压迫反馈继续提高。',
      '满命：主目标的深渊侵蚀不再自行结束；命中还能把长期恐惧扩散给附近生物。'
    ],
    enchants:[['minecraft:sharpness',7],['minecraft:knockback',2],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'war_god_oath',tier:5,name:'斗神的铁誓',fullName:'斗神的凯旋',item:'minecraft:iron_sword',color:'red',
    deity:'斗神 · 瓦尔卡恩',domain:'战意 · 连击 · 凯旋',
    lore:'这把剑只认继续向前的人。',
    effect:'有效命中会累计战意，并按连击节点给予力量、速度与生存强化。满命达到凯旋节点时获得约五秒事件级无敌。',
    stages:[
      '每 3 次有效命中触发一次战意强化。',
      '每 3 次命中同时提高力量与速度，连战收益增加。',
      '每 6 次命中进入短暂战狂，获得更强力量、速度、吸收与恢复。',
      '满命：每 8 次有效命中触发约 5 秒「凯旋」，期间正常伤害事件会被直接取消。'
    ],
    enchants:[['minecraft:sharpness',8],['minecraft:sweeping',5],['minecraft:looting',5],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'thunder_god_verdict',tier:5,name:'雷神的审判',fullName:'雷神的天罚',item:'minecraft:stick',color:'yellow',
    deity:'雷神 · 天罚与鸣雷之主',domain:'雷击 · 连锁 · 天罚',
    lore:'第一声雷，是警告。第二声通常来不及听。',
    effect:'命中有概率引下神雷；共鸣提高触发与控制能力，并逐步加入连锁。满命时主目标承受双雷并向更多敌人跳跃。',
    stages:[
      '命中有概率对当前目标召下雷击。',
      '落雷更容易触发，并让目标短暂暴露与虚弱。',
      '主目标落雷后会继续连向附近最多 2 个敌人。',
      '满命：主目标同时承受 2 道雷击，雷链可继续追向附近最多 4 个敌人。'
    ],
    enchants:[['minecraft:sharpness',8],['minecraft:looting',5],['minecraft:unbreaking',6],['minecraft:mending',1]]
  },
  {
    id:'luokixi_relic_wei',tier:6,name:'薇',fullName:'薇',item:'minecraft:allium',color:'red',
    deity:'Luokixi',domain:'依偎 · 世界 · 彩蛋',
    lore:'依偎着你，依偎着世界',
    effect:'手持「薇」命中任何可受击生物时，直接将其处决。普通生物、Boss 与玩家一视同仁。',
    stages:['没有共鸣。它不是神权成长线，只是一枚不该出现在奖池里的红色彩蛋。'],
    enchants:[['minecraft:sharpness',10]]
  }
]

// 兼容 V9.4 / 旧 dev_tools 使用过的 ID。
var ORACLE_RELIC_ALIASES = {
  harvest_hymn:'rain_mother_gift',
  skyfeather:'wind_king_release',
  tidal_heart:'tide_king_command',
  hearth_wall:'hearth_guard',
  earth_crown_pick:'earth_father_order',
  dawn_mark:'sun_king_favor',
  moon_watch:'moon_queen_gaze',
  thunder_verdict:'thunder_god_verdict',
  storm_blade:'thunder_god_verdict',
  wind_favor_pick:'earth_father_order'
}


var ORACLE_RELIC_LEGACY_ITEMS = {
  harvest_hymn:'minecraft:diamond_hoe',
  skyfeather:'minecraft:elytra',
  tidal_heart:'minecraft:netherite_chestplate',
  hearth_wall:'minecraft:shield',
  earth_crown_pick:'minecraft:netherite_pickaxe',
  dawn_mark:'minecraft:netherite_axe',
  moon_watch:'minecraft:netherite_helmet',
  thunder_verdict:'minecraft:netherite_sword',
  storm_blade:'minecraft:diamond_sword',
  wind_favor_pick:'minecraft:diamond_pickaxe'
}

// 旧版本曾使用过的实体外形。/relics reforge 只负责把旧壳换回当前神物外形，
// 但 persistentData 的拥有权与共鸣等级完全不变。
var ORACLE_RELIC_PREVIOUS_FORMS = {
  rain_mother_gift:['minecraft:netherite_hoe','minecraft:diamond_hoe'],
  wind_king_release:['minecraft:elytra'],
  tide_king_command:['minecraft:trident'],
  hearth_guard:['minecraft:shield'],
  fire_god_ember:['minecraft:netherite_sword'],
  earth_father_order:['minecraft:netherite_pickaxe'],
  sun_king_favor:['minecraft:netherite_axe'],
  moon_queen_gaze:['minecraft:netherite_helmet'],
  death_god_register:['minecraft:book','minecraft:netherite_sword'],
  abyss_god_echo:['minecraft:netherite_sword'],
  war_god_oath:['minecraft:netherite_sword'],
  thunder_god_verdict:['minecraft:netherite_sword','minecraft:diamond_sword']
}

var ORACLE_SPECIAL_ITEMS = {
  godslayer_totem:{id:'godslayer_totem',name:'弑神图腾',item:'kubejs:godslayer_totem',color:'gold',display:'minecraft:totem_of_undying',glint:true,lore:'它不替你向死亡求情。五道裂纹，是它允许死亡失败五次。像原版图腾一样，握在主手或副手都能生效。'},
  forbidden_fruit:{id:'forbidden_fruit',name:'禁忌果实',item:'kubejs:forbidden_fruit',color:'light_purple',display:'minecraft:apple',glint:true,lore:'一颗被从果园谱系里抹去的苹果。咬下以后，凡人的身体会暂时记起一种不该属于自己的生命尺度。'},
  void_mother_pearl:{id:'void_mother_pearl',name:'虚空之母的馈赠',item:'kubejs:void_mother_gift',color:'dark_purple',display:'minecraft:ender_pearl',glint:true,lore:'它不是珍珠，只是虚空之母随手掐下的一小块空白。捏碎时，你会短暂从现实表面滑开。'},
  dragon_blood:{id:'dragon_blood',name:'古龙真血',item:'kubejs:dragon_blood',color:'dark_red',display:'minecraft:dragon_breath',glint:true,lore:'瓶底沉着一层几乎凝固的暗红。真正的古龙死后很久，血里仍旧保留着成长的蛮横。'},
  hunter_oil:{id:'hunter_oil',name:'猎神圣油',item:'kubejs:hunter_oil',color:'red',display:'minecraft:honey_bottle',glint:true,lore:'旧猎人只在确定今晚会遇见不该存在的东西时才会开封。油很甜，后劲却像一场追杀。'},
  worldwalker_seal:{id:'worldwalker_seal',name:'诸界远征印',item:'kubejs:worldwalker_seal',color:'aqua',display:'minecraft:heart_of_the_sea',glint:true,lore:'印面刻着许多已经不存在的边境。撕开以后，世界会在几分钟里把你误认成一个有资格通行的人。'}
}

var ORACLE_SPECIAL_LEGACY_ITEMS = {
  godslayer_totem:'minecraft:totem_of_undying',
  forbidden_fruit:'minecraft:apple',
  void_mother_pearl:'minecraft:ender_pearl',
  dragon_blood:'minecraft:potion',
  hunter_oil:'minecraft:honey_bottle',
  worldwalker_seal:'minecraft:heart_of_the_sea'
}

function relicTell(player,json) { if (player && player.server) player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json)) }
function relicButton(text,command,color) { return {text:'[ ' + text + ' ]',color:color,bold:true,clickEvent:{action:'run_command',value:command}} }
function relicEscapeJson(text) { return String(text == null ? '' : text).replace(/\\/g,'\\\\').replace(/"/g,'\\"') }
function relicResolveId(id) { return ORACLE_RELIC_ALIASES[id] || id }

function relicFind(id) {
  id = relicResolveId(id)
  var i = 0
  for (i = 0; i < ORACLE_RELICS.length; i++) if (ORACLE_RELICS[i].id == id) return ORACLE_RELICS[i]
  return null
}

function relicOwned(player,id) { return !!(player && relicFind(id) && player.persistentData.getBoolean('oracleRelic_' + relicResolveId(id))) }
function relicResonance(player,id) {
  if (!player) return 0
  var n = player.persistentData.getInt('oracleRelicResonance_' + relicResolveId(id))
  if (n < 0) n = 0
  if (n > ORACLE_RELIC_MAX_RESONANCE) n = ORACLE_RELIC_MAX_RESONANCE
  return n
}

function relicEnchantNbt(list) {
  var parts=[]; var i=0
  for (i=0;i<list.length;i++) parts.push('{id:"'+list[i][0]+'",lvl:'+list[i][1]+'s}')
  return '['+parts.join(',')+']'
}

function relicHashInts(text,index) {
  var h1=0x13572468,h2=0x24681357,i=0,value=String(text)+':'+index
  for(i=0;i<value.length;i++){h1=((h1*31)+value.charCodeAt(i))|0;h2=((h2*33)^value.charCodeAt(i))|0}
  return [h1,h2,(h1^0x5f3759df)|0,(h2^0x6c8e9cf5)|0]
}

function relicAttributeSpecs(relic,res) {
  var a=[]
  function weapon(damage,speed) {
    a.push(['minecraft:generic.attack_damage',damage,0,'mainhand'])
    a.push(['minecraft:generic.attack_speed',speed,0,'mainhand'])
  }
  // 神器的“强”来自神权和自定义属性，不来自材质等级。
  // AttackSpeed 的玩家基础值为 4；这里用负值把每件神器做出不同手感。
  if (relic.id=='rain_mother_gift') weapon(4+res*0.75,-1.45)          // 轻快旧镰
  if (relic.id=='tide_king_command') weapon(8+res*1.25,-2.45)         // 沉重三叉戟
  if (relic.id=='fire_god_ember') weapon(7+res*1.75,-1.95)            // 快速行火权杖
  if (relic.id=='earth_father_order') weapon(6+res*1.25,-2.55)        // 山岳般迟重
  if (relic.id=='sun_king_favor') weapon(10+res*2.0,-2.75)            // 金钺重击
  if (relic.id=='death_god_register') weapon(8+res*1.75,-2.70)        // 终句长镰：慢，但每一下都像在献血
  if (relic.id=='abyss_god_echo') weapon(9+res*1.75,-2.65)            // 长镰大开大合
  if (relic.id=='war_god_oath') weapon(9+res*2.0,-1.95)               // 铁誓连战
  if (relic.id=='thunder_god_verdict') weapon(7+res*2.0,-1.55)        // 木杖却有神雷速度
  if (relic.id=='wind_king_release') {
    a.push(['minecraft:generic.movement_speed',0.06+res*0.02,0,'chest'])
    a.push(['minecraft:generic.max_health',4+res*2,0,'chest'])
  }
  if (relic.id=='moon_queen_gaze') {
    a.push(['minecraft:generic.max_health',8+res*4,0,'head'])
    a.push(['minecraft:generic.armor',2+res,0,'head'])
  }
  if (relic.id=='hearth_guard') {
    a.push(['minecraft:generic.armor',7+res*2,0,'offhand'])
    a.push(['minecraft:generic.knockback_resistance',0.15+res*0.05,0,'offhand'])
  }
  return a
}

function relicAttributeNbt(relic,res) {
  var attrs=relicAttributeSpecs(relic,res),parts=[],i=0
  for(i=0;i<attrs.length;i++){
    var x=attrs[i],uuid=relicHashInts(relic.id,i)
    parts.push('{AttributeName:"'+x[0]+'",Name:"divine.'+relic.id+'.'+i+'",Amount:'+x[1]+',Operation:'+x[2]+',UUID:[I;'+uuid.join(',')+'],Slot:"'+x[3]+'"}')
  }
  return '['+parts.join(',')+']'
}

function relicResText(res) { return res>=3 ? '共鸣 III · 满命' : (res>0 ? '共鸣 ' + (res==1?'I':'II') : '本体') }
function relicDisplayName(relic,res) { return relic ? ((res>=3 && relic.fullName) ? String(relic.fullName) : String(relic.name||'')) : '' }
function relicStageAt(relic,res) {
  if(!relic||!relic.stages||relic.stages.length<=0)return relic?relic.effect:''
  var i=Math.max(0,Math.min(relic.stages.length-1,res||0))
  return String(relic.stages[i]||relic.effect||'')
}
function relicLoreJson(text,color,italic,bold) {
  return '\'{"text":"'+relicEscapeJson(text)+'","color":"'+color+'","italic":'+(italic?'true':'false')+(bold?',"bold":true':'')+'}\''
}

function relicStack(relic,res) {
  var tier=Number(relic&&relic.tier?relic.tier:5)
  var easter=tier==6
  res=easter?0:Math.max(0,Math.min(3,res||0))
  var attrs=relicAttributeNbt(relic,res)
  var extra=easter?'':',Unbreakable:1b'
  if(attrs!='[]') extra+=',AttributeModifiers:'+attrs
  var displayName=relicDisplayName(relic,res)
  var lore=[]
  if(easter) lore.push(relicLoreJson('★★★★★★ · 彩蛋级','red',false,true))
  else lore.push(relicLoreJson('★★★★★ · '+relicResText(res),'gold',false,true))
  lore.push(relicLoreJson(relic.lore,'gray',true,false))
  lore.push(relicLoreJson('能力：'+relic.effect,'white',false,false))
  lore.push(relicLoreJson('「'+relic.domain+'」','dark_gray',false,false))
  if(easter) lore.push(relicLoreJson(relicStageAt(relic,0),'red',false,true))
  else {
    lore.push(relicLoreJson('当前：'+relicStageAt(relic,res),res>=3?'gold':'white',false,true))
    if(res<3&&relic.stages[res+1]) lore.push(relicLoreJson('下一共鸣：'+relic.stages[res+1],'dark_purple',false,false))
  }
  lore.push(relicLoreJson('契约：遗物无法主动遗弃；形体失落后可从遗物回廊召回。','dark_purple',false,false))
  var enchants=[]
  var i=0
  for(i=0;i<relic.enchants.length;i++) enchants.push(relic.enchants[i])
  if(!easter) enchants.push(['minecraft:binding_curse',1])
  enchants.push(['minecraft:vanishing_curse',1])
  // 6★ 不隐藏附魔，让「消失诅咒」和附魔光泽都直接可见。
  var hideFlags=easter?0:1
  var nbt='{DivineRelic:"'+relic.id+'",DivineRelicTier:'+tier+',RelicResonance:'+res+',HideFlags:'+hideFlags+',Enchantments:'+relicEnchantNbt(enchants)+extra+',display:{Name:\'{"text":"'+relicEscapeJson(displayName)+'","color":"'+relic.color+'","italic":false,"bold":true}\',Lore:['+lore.join(',')+']}}'
  return Item.of(relic.item,nbt)
}

function specialNbt(id,charges) {
  var x=ORACLE_SPECIAL_ITEMS[id]; if(!x)return '{}'
  var lore=[]
  lore.push(relicLoreJson('★★★★ · 禁忌道具','light_purple',false,true))
  lore.push(relicLoreJson(x.lore,'gray',false,false))
  if(id=='godslayer_totem') lore.push(relicLoreJson('裂纹 · '+(charges==null?5:charges)+'/5','gold',false,true))
  var extra='DivineSpecial:"'+id+'"'
  if(id=='godslayer_totem')extra+=',DivineCharges:'+(charges==null?5:charges)
  if(id=='dragon_blood')extra+=',Potion:"minecraft:water",CustomPotionColor:9437184'
  if(x.glint)extra+=',Enchantments:[{id:"minecraft:unbreaking",lvl:1s}],HideFlags:1'
  return '{'+extra+',display:{Name:\'{"text":"'+relicEscapeJson(x.name)+'","color":"'+x.color+'","italic":false,"bold":true}\',Lore:['+lore.join(',')+']}}'
}

function specialStack(id,count,charges) {
  var x=ORACLE_SPECIAL_ITEMS[id]; if(!x)return Item.of('minecraft:barrier')
  return Item.of(x.item,count||1,specialNbt(id,charges))
}

function relicGiveStack(player,stack,name) {
  if(global.oracleGiveRewardStack) return global.oracleGiveRewardStack(player,stack,name)
  player.give(stack); return true
}

function relicGlobalSound(server,sound,volume,pitch) {
  if(!server||!sound)return
  try {
    server.runCommandSilent('execute as @a at @s run playsound '+sound+' master @s ~ ~ ~ '+(volume==null?0.8:volume)+' '+(pitch==null?1.0:pitch))
  } catch(ignored) {}
}

function relicLocalSound(player,sound,volume,pitch) {
  if(!player||!player.server||!sound)return
  try { player.server.runCommandSilent('execute at '+player.username+' run playsound '+sound+' master '+player.username+' ~ ~ ~ '+(volume==null?0.7:volume)+' '+(pitch==null?1.0:pitch)) } catch(ignored) {}
}

var ORACLE_RELIC_AWAKENING = {
  rain_mother_gift:{sound:'minecraft:weather.rain.above',line:'雨落下来了。每一块田都像刚刚醒过来。'},
  wind_king_release:{sound:'minecraft:item.elytra.flying',line:'风把最后一扇门吹开。天空从这一刻不再收过路费。'},
  tide_king_command:{sound:'minecraft:entity.elder_guardian.curse',line:'远海抬头。所有潮水同时朝这里转向。'},
  hearth_guard:{sound:'minecraft:item.shield.block',line:'炉火亮了一下。死亡被关在门外。'},
  fire_god_ember:{sound:'',line:'火焰褪去颜色。黑焰第一次真正活了过来。'},
  earth_father_order:{sound:'minecraft:entity.iron_golem.attack',line:'地面沉了一寸。土父开始亲自决定谁该站在这里。'},
  sun_king_favor:{sound:'minecraft:block.beacon.activate',line:'正午落到头顶。嘉奖变成了加冕。'},
  moon_queen_gaze:{sound:'minecraft:block.amethyst_cluster.hit',line:'月光合拢。所有瞄准你的视线都慢了一拍。'},
  death_god_register:{sound:'minecraft:entity.wither.death',line:''},
  abyss_god_echo:{sound:'minecraft:block.sculk_shrieker.shriek',line:'深处睁开了眼。附近的生物先学会了害怕。'},
  war_god_oath:{sound:'minecraft:block.anvil.land',line:'铁册合上。斗神把胜利直接压进了你的手。'},
  thunder_god_verdict:{sound:'minecraft:entity.lightning_bolt.thunder',line:'木杖没有变化。变化的是整片天空。'}
}

function relicBroadcastFullResonance(player,relic) {
  if(!player||!player.server||!relic)return
  var server=player.server
  var awakening=ORACLE_RELIC_AWAKENING[relic.id]||{sound:'minecraft:ui.toast.challenge_complete',line:'神物终于露出了完整的样子。'}
  var fullName=relicDisplayName(relic,3)
  try {
    server.runCommandSilent('tellraw @a '+JSON.stringify([
      {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_gray'},
      {text:'✦ 最后的回声醒了 ✦\n',color:'gold',bold:true},
      {text:String(player.username),color:'aqua',bold:true},
      {text:' 手中的 ',color:'gray'},
      {text:'「'+fullName+'」',color:relic.color,bold:true},
      {text:' 完成了最后一次共鸣。\n',color:'gold'},
      {text:awakening.line,color:'gray',italic:true},
      {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_gray'}
    ]))
  } catch(ignoredTell) {}
  relicGlobalSound(server,'minecraft:ui.toast.challenge_complete',0.85,0.82)
  relicGlobalSound(server,awakening.sound,0.72,0.72)
}

function relicCueFiveStarAcquired(player,relic,source) {
  if(!player||!player.server||!relic)return
  // 正式旧匣已经负责全服文字播报，这里只补声音，避免刷两遍相同文字。
  if(source=='oracle_5star') {
    relicGlobalSound(player.server,'minecraft:ui.toast.challenge_complete',0.70,1.05)
    relicGlobalSound(player.server,'minecraft:block.amethyst_block.chime',0.40,0.72)
  } else {
    relicLocalSound(player,'minecraft:ui.toast.challenge_complete',0.75,1.05)
  }
}

function relicAddEmbers(player,amount) {
  if(global.divineSkinAddEmbers) global.divineSkinAddEmbers(player,amount)
  else player.persistentData.putInt('oracleEmbers',player.persistentData.getInt('oracleEmbers')+amount)
}

function relicCompensateMax(player,relic) {
  relicAddEmbers(player,50)
  if(global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,10)
  else if(global.giveDivineToken) global.giveDivineToken(player,10)
  player.tell(Text.gold('✦ 「' + relicDisplayName(relic,3) + '」已经没有更多沉睡的部分。这次回声化作 50 余烬 + 10 幻形碎片。'))
}

function relicRemoveOldCopy(player,id) {
  if(!player||!player.server)return
  id=relicResolveId(id)
  var relic=relicFind(id)
  var forms=[]
  if(relic&&relic.item) forms.push(String(relic.item))
  var old=ORACLE_RELIC_PREVIOUS_FORMS[id]||[]
  var i=0
  for(i=0;i<old.length;i++) if(forms.indexOf(old[i])<0) forms.push(old[i])
  // 旧版有些是工具标签，有些是书/木棍/盔甲，因此逐个物品 ID 清最稳。
  for(i=0;i<forms.length;i++) {
    try { player.server.runCommandSilent('clear '+player.username+' '+forms[i]+'{DivineRelic:"'+id+'"}') } catch(ignored) {}
  }
}

function relicReforgeOwned(player) {
  if(!player)return 0
  specialMigrateLegacy(player,false)
  var count=0,i=0
  for(i=0;i<ORACLE_RELICS.length;i++) {
    var relic=ORACLE_RELICS[i]
    if(!relicOwned(player,relic.id))continue
    relicRemoveOldCopy(player,relic.id)
    relicGiveStack(player,relicStack(relic,relicResonance(player,relic.id)),relicDisplayName(relic,relicResonance(player,relic.id))+' · 神器重铸')
    count++
  }
  relicTell(player,[
    {text:'✦ 回廊里的神物同时震了一下。\n',color:'gold',bold:true},
    {text:count+' 件遗物重新认出了你的手。它们记得过去的每一次共鸣。',color:'gray',italic:true}
  ])
  relicLocalSound(player,'minecraft:block.smithing_table.use',0.8,0.72)
  return count
}

function relicApplySunHealth(player) {
  if(!player||!player.server)return
  var bonus=player.persistentData.getInt('sunKingPermanentHealth')
  if(bonus<0)bonus=0;if(bonus>ORACLE_SUN_HEALTH_CAP)bonus=ORACLE_SUN_HEALTH_CAP
  try { player.server.runCommandSilent('attribute '+player.username+' minecraft:generic.max_health modifier remove '+ORACLE_SUN_HEALTH_UUID) } catch(ignored) {}
  if(bonus>0) try { player.server.runCommandSilent('attribute '+player.username+' minecraft:generic.max_health modifier add '+ORACLE_SUN_HEALTH_UUID+' sun_king_gift '+bonus+' add') } catch(error){ console.log('[OracleRelics] sun health modifier failed: '+error) }
}

function relicEnableWindFlight(player) {
  if(!player)return false
  try {
    var abilities=player.getAbilities()
    abilities.mayfly=true
    player.onUpdateAbilities()
    player.persistentData.putBoolean('windKingFlightUnlocked',true)
    return true
  } catch(error) { console.log('[OracleRelics] survival flight enable failed: '+error); return false }
}

function relicDisableWindFlight(player) {
  if(!player)return false
  try {
    var creative=false,spectator=false
    try{creative=player.isCreative()}catch(ignored){}
    try{spectator=player.isSpectator()}catch(ignored2){}
    if(creative||spectator)return false
    var abilities=player.getAbilities()
    abilities.flying=false
    abilities.mayfly=false
    player.onUpdateAbilities()
    player.persistentData.putBoolean('windKingFlightUnlocked',false)
    return true
  } catch(error) { console.log('[OracleRelics] survival flight disable failed: '+error); return false }
}

function relicApplyFullUnlocks(player,relic,res) {
  if(!player||!relic||res<3)return
  if(relic.id=='wind_king_release') relicEnableWindFlight(player)
  if(relic.id=='sun_king_favor') relicApplySunHealth(player)
}

function relicCueSixStarAcquired(player,relic,source) {
  if(!player||!player.server||!relic)return
  // 正式 6★ 抽奖由旧匣统一负责全服揭晓；这里只给非抽奖来源一个本地提示。
  if(source=='oracle_6star')return
  relicLocalSound(player,'minecraft:ui.toast.challenge_complete',0.80,0.72)
  relicLocalSound(player,'minecraft:block.amethyst_block.resonate',0.52,0.56)
}

function relicGrant(player,id,source) {
  if(!player)return {ok:false,id:id,name:id,kind:'relic'}
  var relic=relicFind(id)
  if(!relic)return {ok:false,id:id,name:id,kind:'relic'}
  var owned=relicOwned(player,relic.id)
  var res=relicResonance(player,relic.id)

  // 6★「薇」没有共鸣线：首次写入收藏，之后重复抽中直接再给一枝。
  if(Number(relic.tier)==6){
    if(!owned){
      player.persistentData.putBoolean('oracleRelic_'+relic.id,true)
      player.persistentData.putInt('oracleRelicResonance_'+relic.id,0)
      if(global.historyRecordRelicUnlock) try{global.historyRecordRelicUnlock(player,relic.id,relic.name,6)}catch(ignoredSixHistory){}
    }
    relicGiveStack(player,relicStack(relic,0),relic.name)
    relicCueSixStarAcquired(player,relic,source)
    if(source!='oracle_6star') relicTell(player,[
      {text:'★★★★★★ '+relic.name+'\n',color:'red',bold:true},
      {text:relic.lore+'\n',color:'gray',italic:true},
      {text:'彩蛋级 · 命中即处决',color:'red',bold:true}
    ])
    return {ok:true,duplicate:owned==true,id:relic.id,name:relic.name,kind:'relic',tier:6,resonance:0}
  }

  if(!owned){
    player.persistentData.putBoolean('oracleRelic_'+relic.id,true)
    player.persistentData.putInt('oracleRelicResonance_'+relic.id,0)
    relicGiveStack(player,relicStack(relic,0),relic.name)
    if(global.historyRecordRelicUnlock) try{global.historyRecordRelicUnlock(player,relic.id,relic.name,5)}catch(ignored){}
    relicCueFiveStarAcquired(player,relic,source)
    if(source!='oracle_5star') relicTell(player,[{text:'★★★★★ '+relic.name+'\n',color:'gold',bold:true},{text:relicStageAt(relic,0),color:'gray'}])
    return {ok:true,duplicate:false,id:relic.id,name:relic.name,kind:'relic',tier:5,resonance:0}
  }

  if(res<ORACLE_RELIC_MAX_RESONANCE){
    var next=res+1
    player.persistentData.putInt('oracleRelicResonance_'+relic.id,next)
    relicRemoveOldCopy(player,relic.id)
    relicGiveStack(player,relicStack(relic,next),relicDisplayName(relic,next)+' · '+relicResText(next))
    relicApplyFullUnlocks(player,relic,next)
    relicLocalSound(player,next>=3?'minecraft:block.beacon.activate':'minecraft:block.amethyst_block.chime',next>=3?0.9:0.55,next>=3?0.78:(1.05+next*0.08))
    if(next>=3) relicBroadcastFullResonance(player,relic)
    relicTell(player,[
      {text:'✦ 神物回应了你 · ',color:'light_purple',bold:true},{text:relicDisplayName(relic,next)+'\n',color:'gold',bold:true},
      {text:relicResText(next)+(next>=3?' —— 它终于露出了完整的名字。\n':' —— 又一道沉睡的回声醒了。\n'),color:next>=3?'gold':'gray'},
      {text:relicStageAt(relic,next),color:next>=3?'gold':'white'}
    ])
    return {ok:true,duplicate:true,id:relic.id,name:relicDisplayName(relic,next)+' · '+relicResText(next),kind:'relic',tier:5,resonance:next}
  }

  relicCompensateMax(player,relic)
  return {ok:true,duplicate:true,maxed:true,id:relic.id,name:relicDisplayName(relic,3)+' · 满命重复',kind:'relic',tier:5,resonance:3}
}

function relicGrantRandom(player,tier,source) {
  var pool=[],i=0
  tier=Number(tier||5)
  for(i=0;i<ORACLE_RELICS.length;i++)if(Number(ORACLE_RELICS[i].tier)==tier)pool.push(ORACLE_RELICS[i])
  var r=oracleRelicWeightedForPlayer(player,pool)
  return r?relicGrant(player,r.id,source):{ok:false}
}

function oracleRelicWeightedForPlayer(player,pool) {
  if(!pool||pool.length<=0)return null
  // 未拥有 > 未满命 > 满命，仍允许重复触发共鸣，但不会让满命武器吞掉太多金色。
  var weighted=[],i=0
  for(i=0;i<pool.length;i++){
    var owned=relicOwned(player,pool[i].id),res=relicResonance(player,pool[i].id)
    weighted.push({r:pool[i],w:!owned?4:(res<3?2:0.45)})
  }
  var total=0;for(i=0;i<weighted.length;i++)total+=weighted[i].w
  var roll=Math.random()*total
  for(i=0;i<weighted.length;i++){roll-=weighted[i].w;if(roll<=0)return weighted[i].r}
  return weighted[weighted.length-1].r
}

function specialGrant(player,id,count,source) {
  var x=ORACLE_SPECIAL_ITEMS[id]
  if(!player||!x)return {ok:false,id:id,name:id,kind:'special'}
  var charges=id=='godslayer_totem'?5:null
  relicGiveStack(player,specialStack(id,count||1,charges),x.name)
  if(source!='oracle_4star') relicTell(player,[{text:'★★★★ '+x.name+'\n',color:'light_purple',bold:true},{text:x.lore,color:'gray'}])
  return {ok:true,id:id,name:x.name,kind:'special',tier:4}
}

function relicItemNbtString(item,key) {
  try{if(!item||!item.nbt)return '';if(item.nbt[key])return String(item.nbt[key]);if(item.nbt.getString)return String(item.nbt.getString(key))}catch(ignored){}
  return ''
}
function relicItemNbtInt(item,key,def) {
  try{if(!item||!item.nbt)return def||0;if(item.nbt[key]!=null)return Number(item.nbt[key]);if(item.nbt.getInt)return Number(item.nbt.getInt(key))}catch(ignored){}
  return def||0
}
function relicMainHandId(player) { try{return relicResolveId(relicItemNbtString(player.mainHandItem,'DivineRelic'))}catch(ignored){} return '' }
function relicOffHandId(player) { try{return relicResolveId(relicItemNbtString(player.offHandItem,'DivineRelic'))}catch(ignored){} return '' }
function relicAttacker(event) {
  try{if(event.source&&event.source.player)return event.source.player}catch(ignored){}
  try{if(event.source&&event.source.actual&&event.source.actual.isPlayer&&event.source.actual.isPlayer())return event.source.actual}catch(ignored2){}
  return null
}
function relicToDouble(v,f){try{if(typeof v=='number')return isNaN(v)?f:v}catch(ignored){}try{if(v!=null&&typeof v.doubleValue=='function')return Number(v.doubleValue())}catch(ignored2){}try{var p=parseFloat(String(v));return isNaN(p)?f:p}catch(ignored3){return f}}
function relicPos(e){try{return{x:relicToDouble(e.getX(),0),y:relicToDouble(e.getY(),64),z:relicToDouble(e.getZ(),0)}}catch(ignored){}return{x:0,y:64,z:0}}
function relicDim(e){try{return String(e.level.dimension)}catch(ignored){}return 'minecraft:overworld'}
function relicEntityAlive(e){try{return e.isAlive()}catch(ignored){}return false}
function relicMaxHealth(e){try{return relicToDouble(e.getMaxHealth(),0)}catch(ignored){}try{return relicToDouble(e.maxHealth,0)}catch(ignored2){}return 0}
function relicUuid(e){try{return String(e.getUUID())}catch(ignored){}try{return String(e.uuid)}catch(ignored2){}return String(Date.now())+Math.random()}
function relicSetFire(e,seconds){try{e.setSecondsOnFire(seconds);return true}catch(ignored){}return false}
function relicSetFireBy(player,e,seconds,relicId){
  if(!e)return false
  if(player)relicCreditChallenge(player,e,relicId||relicMainHandId(player)||'relic_fire',Math.max(1,Number(seconds)||1)*1000+3500)
  return relicSetFire(e,seconds)
}

function relicPlay(player,sound,vol,pitch) { if(player&&player.server)player.server.runCommandSilent('execute at '+player.username+' run playsound '+sound+' player '+player.username+' ~ ~ ~ '+vol+' '+pitch) }
function relicPlayVoice(player,sound,vol,pitch) { if(player&&player.server)player.server.runCommandSilent('execute at '+player.username+' run playsound '+sound+' voice '+player.username+' ~ ~ ~ '+vol+' '+pitch) }
function relicSoundAt(player,target,sound,vol,pitch,radius) {
  if(!player||!player.server||!target||!sound)return
  var p=relicPos(target),dim=relicDim(target),r=radius||28
  try{player.server.runCommandSilent('execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' run playsound '+sound+' player @a[distance=..'+r+'] ~ ~ ~ '+vol+' '+pitch)}catch(ignored){}
}
function relicParticleAt(entity,particle,count,spread) {
  if(!entity||!entity.server)return
  var p=relicPos(entity),dim=relicDim(entity),s=spread||0.35
  entity.server.runCommandSilent('execute in '+dim+' positioned '+p.x+' '+(p.y+1)+' '+p.z+' run particle '+particle+' ~ ~ ~ '+s+' '+s+' '+s+' 0.03 '+count+' force')
}

var ORACLE_RELIC_LIVING_SELECTOR='type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,type=!minecraft:armor_stand'

// V10.8.17A: 遗物脚本主动制造的 /damage 会同步再次进入 EntityEvents.hurt。
// 用深度锁只屏蔽攻击方遗物的二次触发，避免 fire -> damage -> fire 的无限递归；
// 受击方的月后/壁炉等防御逻辑仍继续正常处理。
var ORACLE_RELIC_INTERNAL_DAMAGE_DEPTH = 0
function relicRunInternalDamage(server,command) {
  if(!server||!command)return 0
  ORACLE_RELIC_INTERNAL_DAMAGE_DEPTH++
  try{return Number(server.runCommandSilent(command)||0)}
  catch(ignored){return 0}
  finally{ORACLE_RELIC_INTERNAL_DAMAGE_DEPTH=Math.max(0,ORACLE_RELIC_INTERNAL_DAMAGE_DEPTH-1)}
}

function relicDamageType(event) {
  try{if(event&&event.source&&typeof event.source.type=='function')return String(event.source.type())}catch(ignored){}
  try{if(event&&event.source&&event.source.type!=null)return String(event.source.type)}catch(ignored2){}
  try{if(event&&event.source&&typeof event.source.getType=='function')return String(event.source.getType())}catch(ignored3){}
  return ''
}

function relicCreditChallenge(player,target,relicId,durationMs){
  if(!player||!target)return false
  try{
    if(global.divineChallengeMarkRelicCredit&&typeof global.divineChallengeMarkRelicCredit=='function'){
      return !!global.divineChallengeMarkRelicCredit(player,target,relicId||relicMainHandId(player)||'relic',durationMs||0)
    }
  }catch(ignored){}
  return false
}

function relicCreditChallengeArea(player,center,radius,relicId,durationMs){
  if(!player||!center)return 0
  try{
    if(global.divineChallengeMarkRelicCreditArea&&typeof global.divineChallengeMarkRelicCreditArea=='function'){
      return Number(global.divineChallengeMarkRelicCreditArea(player,center,radius,relicId||relicMainHandId(player)||'relic',durationMs||0)||0)
    }
  }catch(ignored){}
  return 0
}

function relicAoeDamage(player,center,radius,amount,limit) {
  if(!player||!player.server||!center)return
  var p=relicPos(center),dim=relicDim(center),r=radius||4,l=limit||16
  // 先标记挑战归属，再用 `by 玩家` 生成正常 DamageSource。两层同时存在可兼容模组/原版不同死亡路径。
  relicCreditChallengeArea(player,center,r,relicMainHandId(player)||'relic_aoe',6000)
  try{
    var result=relicRunInternalDamage(player.server,'execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' as @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+r+',limit='+l+'] run damage @s '+amount+' minecraft:generic by '+player.username)
    // 玩家恰好跨维度/离线等极端情况下，不能因为归因增强反而把原来的遗物伤害吃掉。
    if(result<=0)relicRunInternalDamage(player.server,'execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' as @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+r+',limit='+l+'] run damage @s '+amount+' minecraft:generic')
  }catch(ignored){
    try{relicRunInternalDamage(player.server,'execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' as @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+r+',limit='+l+'] run damage @s '+amount+' minecraft:generic')}catch(ignoredFallback){}
  }
}

function relicAoeEffect(player,center,radius,effect,seconds,amplifier,limit) {
  if(!player||!player.server||!center)return
  var p=relicPos(center),dim=relicDim(center),r=radius||4,l=limit||16
  // Wither 的最终 tick 没有 source.player；持续凋零必须提前留下遗物归属。
  if(String(effect)=='minecraft:wither'){
    var creditMs=Number(seconds)>=100000?0:(Math.max(1,Number(seconds)||1)*1000+3500)
    relicCreditChallengeArea(player,center,r,relicMainHandId(player)||'relic_wither',creditMs)
  }
  try{player.server.runCommandSilent('execute in '+dim+' positioned '+p.x+' '+p.y+' '+p.z+' run effect give @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+r+',limit='+l+'] '+effect+' '+seconds+' '+amplifier+' true')}catch(ignored){}
}

function relicWindWorn(player) {
  if(!player||!player.server)return false
  try{return player.server.runCommandSilent('execute as '+player.username+' if data entity @s Inventory[{Slot:102b,tag:{DivineRelic:"wind_king_release"}}] run data get entity @s UUID')>0}catch(ignored){}
  return false
}

// ------------------------------------------------------------
// 连锁开采：同种矿石，单次最多 12/18/26/32（本体/共鸣）
// ------------------------------------------------------------
function relicBlockId(level,x,y,z){try{var b=level.getBlock(x,y,z);return b&&b.id?String(b.id):''}catch(ignored){}return ''}
function relicBlockCoord(block,axis,fallback){
  if(!block)return fallback
  try{if(axis=='x'&&typeof block.getX=='function')return Math.floor(relicToDouble(block.getX(),fallback))}catch(ignored){}
  try{if(axis=='y'&&typeof block.getY=='function')return Math.floor(relicToDouble(block.getY(),fallback))}catch(ignored2){}
  try{if(axis=='z'&&typeof block.getZ=='function')return Math.floor(relicToDouble(block.getZ(),fallback))}catch(ignored3){}
  try{var pos=block.pos;if(pos){if(axis=='x')return Math.floor(relicToDouble(pos.getX(),fallback));if(axis=='y')return Math.floor(relicToDouble(pos.getY(),fallback));if(axis=='z')return Math.floor(relicToDouble(pos.getZ(),fallback))}}catch(ignored4){}
  return fallback
}
function relicIsOre(id){return id.indexOf('_ore')>=0||id=='minecraft:ancient_debris'||id=='minecraft:nether_quartz_ore'||id=='minecraft:nether_gold_ore'}
function relicChainMine(player,block,limit){
  var id=String(block.id);if(!relicIsOre(id))return 0
  var ox=relicBlockCoord(block,'x',0),oy=relicBlockCoord(block,'y',64),oz=relicBlockCoord(block,'z',0)
  var q=[[ox,oy,oz]],seen={},out=[],level=player.level
  while(q.length>0&&out.length<limit){
    var p=q.shift(),k=p[0]+','+p[1]+','+p[2];if(seen[k])continue;seen[k]=1
    if(relicBlockId(level,p[0],p[1],p[2])!=id)continue
    if(!(p[0]==ox&&p[1]==oy&&p[2]==oz))out.push(p)
    q.push([p[0]+1,p[1],p[2]],[p[0]-1,p[1],p[2]],[p[0],p[1]+1,p[2]],[p[0],p[1]-1,p[2]],[p[0],p[1],p[2]+1],[p[0],p[1],p[2]-1])
  }
  var dim=relicDim(player),i=0
  for(i=0;i<out.length;i++) player.server.runCommandSilent('execute in '+dim+' run setblock '+out[i][0]+' '+out[i][1]+' '+out[i][2]+' minecraft:air destroy')
  return out.length
}

function relicCropInfo(block){
  if(!block)return null
  var map={'minecraft:wheat':{age:7,item:'minecraft:wheat'},'minecraft:carrots':{age:7,item:'minecraft:carrot'},'minecraft:potatoes':{age:7,item:'minecraft:potato'},'minecraft:beetroots':{age:3,item:'minecraft:beetroot'},'minecraft:nether_wart':{age:3,item:'minecraft:nether_wart'}}
  return map[String(block.id)]||null
}
function relicBlockAge(block){try{return Number(block.properties.age)}catch(ignored){}return -1}

BlockEvents.broken(function(event){
  try{
    var player=event.player;if(!player)return
    var id=relicMainHandId(player)
    if(id=='earth_father_order'){
      var res=relicResonance(player,id),limit=res>=3?40:(res==2?30:(res==1?20:12))
      var n=relicChainMine(player,event.block,limit)
      if(n>0){
        relicPlay(player,'luokixivisuals:relic_earth_hit',0.52,0.80)
        relicPlay(player,'minecraft:block.stone.break',0.12,0.72)
        relicParticleAt(player,'minecraft:block minecraft:deepslate',12+res*6,0.38)
        if(res>=1)player.server.runCommandSilent('effect give '+player.username+' minecraft:haste '+(5+res*2)+' '+(res>=3?2:(res>=2?1:0))+' true')
        if(res>=2)player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 4 '+(res>=3?1:0)+' true')
        player.tell(Text.darkGreen('✦ 土父让矿脉一起松了口：+'+n+'。'))
      }
    }
    if(id=='rain_mother_gift'){
      var info=relicCropInfo(event.block);if(!info||relicBlockAge(event.block)!=info.age)return
      var rr=relicResonance(player,id)
      var extra=rr>=3?4:(rr==2?3:(rr==1?2:1))
      var feastUntil=Number(player.persistentData.getLong('rainMotherFeastUntil'))
      if(rr>=3&&feastUntil>Date.now())extra+=2
      if(global.oracleGiveRewardStack)global.oracleGiveRewardStack(player,Item.of(info.item,extra),'雨母的额外收成')
      else player.give(Item.of(info.item,extra))
      relicPlay(player,'luokixivisuals:relic_rain_hit',0.28,1.06)
      if(rr>=2)relicPlay(player,'minecraft:weather.rain.above',0.06,1.42)
      relicParticleAt(player,'minecraft:happy_villager',5+rr*3,0.24)
      if(rr>=1){
        var bx=relicBlockCoord(event.block,'x',0),by=relicBlockCoord(event.block,'y',64),bz=relicBlockCoord(event.block,'z',0),crop=String(event.block.id),dim=relicDim(player)
        player.server.scheduleInTicks(2,function(){try{player.server.runCommandSilent('execute in '+dim+' run setblock '+bx+' '+by+' '+bz+' '+crop+'[age=0]')}catch(ignored){}})
      }
      if(rr>=2)player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 3 '+(rr>=3?1:0)+' true')
      if(rr>=3&&feastUntil>Date.now())player.server.runCommandSilent('effect give '+player.username+' minecraft:saturation 1 0 true')
    }
  }catch(error){console.log('[OracleRelics] block effect failed: '+error)}
})


// ------------------------------------------------------------
// 神火 / 黑焰：不用原版燃烧伤害。
// 本体~共鸣 II 是有限时长的神火；满命后变成真正黑焰，直到目标死亡。
// ------------------------------------------------------------
function relicDamageTarget(player,target,amount,damageType,relicId,creditMs) {
  if(!player||!target||!target.server||amount<=0)return false
  relicCreditChallenge(player,target,relicId||relicMainHandId(player)||'relic_damage',creditMs==null?6000:creditMs)
  var tag='divine_damage_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  try{target.addTag(tag)}catch(ignored){return false}
  try{
    var result=relicRunInternalDamage(target.server,'execute in '+relicDim(target)+' run damage @e[tag='+tag+',limit=1] '+amount+' '+(damageType||'minecraft:magic')+' by '+player.username)
    if(result<=0)relicRunInternalDamage(target.server,'execute in '+relicDim(target)+' run damage @e[tag='+tag+',limit=1] '+amount+' minecraft:generic')
  }catch(ignored2){}
  try{target.removeTag(tag)}catch(ignored3){}
  return true
}

function relicBlackFlameTag(target) {
  var raw=relicUuid(target).replace(/[^A-Za-z0-9]/g,'')
  if(raw.length>28)raw=raw.substring(0,28)
  return 'divine_bf_'+raw
}

// 用一次性标签把 Rhino 里的目标实体交给 LuokixiVisuals 命令。
// 命令不存在时返回 false，下面仍会保留轻量原版粒子作为安全回退。
function relicVisualTargetCommand(target,action,args) {
  if(!target||!target.server)return false
  var tag='lxv_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  try{
    target.addTag(tag)
    var result=target.server.runCommandSilent(
      'execute in '+relicDim(target)+' run luokixi_visual '+action+' @e[tag='+tag+',limit=1]'+(args?' '+args:'')
    )
    target.removeTag(tag)
    return result>0
  }catch(error){
    try{target.removeTag(tag)}catch(ignoredRemove){}
    return false
  }
}

function relicEntityHeight(entity) {
  try{return Math.max(0.7,relicToDouble(entity.getBbHeight(),1.8))}catch(ignored){}
  try{return Math.max(0.7,relicToDouble(entity.bbHeight,1.8))}catch(ignored2){}
  return 1.8
}

function relicBlackFlameKillVisual(target,dimOverride) {
  if(!target||!target.server)return
  var dim=dimOverride||relicDim(target),tag=relicBlackFlameTag(target)
  try{target.server.runCommandSilent('execute in '+dim+' run kill @e[type=minecraft:item_display,tag='+tag+']')}catch(ignored){}
}

// 1.4.0：旧紫色 item_display 生成/跟随逻辑已删除；只保留清理函数用于移除旧世界残留。

function relicGodFireVisual(target,res) {
  if(!target)return
  // V10.5：主体由 LuokixiVisuals 的动画火焰负责。KubeJS 只补少量“空气里真的在烧”的颗粒。
  // 满命黑焰不再用墨汁/纯黑粒子堆成一团，只保留烟、灰和极少量末影能量逸散。
  if(res>=3){
    relicParticleAt(target,'minecraft:ash',2,0.24)
    if(Math.random()<0.55)relicParticleAt(target,'minecraft:large_smoke',1,0.20)
  }else{
    relicParticleAt(target,'minecraft:flame',2+Math.min(1,res),0.20)
    if(Math.random()<0.45)relicParticleAt(target,'minecraft:smoke',1,0.17)
  }
}

function relicGodFireDamage(target,res) {
  var max=Math.max(20,relicMaxHealth(target))
  var base=[6,9,12,18][res]||6
  var pct=[0.015,0.020,0.025,0.035][res]||0.015
  var cap=[24,32,44,64][res]||24
  return Math.min(cap,base+max*pct)
}

// 火神遗物按用户要求保持无专属音效：黑焰只通过视觉与伤害反馈表达。
function relicStartBlackFlame(player,target,res){
  if(!player||!target||!player.server)return false
  res=Math.max(0,Math.min(3,res||0))
  var key=relicUuid(target)
  var durationMs=res>=3?0:(res==2?10000:(res==1?8000:6000))
  relicCreditChallenge(player,target,'fire_god_ember',durationMs?durationMs+4000:0)
  if(ORACLE_BLACK_FLAME_ACTIVE[key]){
    var existing=ORACLE_BLACK_FLAME_ACTIVE[key]
    var oldRes=existing.res||0
    existing.res=Math.max(oldRes,res)
    if(existing.res>=3)existing.expiresAt=0
    else existing.expiresAt=Math.max(existing.expiresAt||0,Date.now()+durationMs)
    var remainingTicks=existing.expiresAt>0?Math.max(1,Math.ceil((existing.expiresAt-Date.now())/50)):0
    existing.modVisual=relicVisualTargetCommand(target,'fire',existing.res+' '+remainingTicks)
    try{
      target.persistentData.putInt('divineGodFireLevel',existing.res)
      target.persistentData.putBoolean('divineBlackFlame',existing.res>=3)
    }catch(ignoredExistingData){}
    // 同步维持原版燃烧状态：这样本次近战直接击杀也会按“着火死亡”处理熟肉掉落。
    relicSetFireBy(player,target,Math.max(4,Math.ceil((durationMs||6000)/1000)+2),'fire_god_ember')
    // 1.4.0 起不再生成旧 item_display 紫色黑焰。模组视觉失败时只保留原版灰烬/烟作为降级。
    return true
  }
  var active=0,k=''
  for(k in ORACLE_BLACK_FLAME_ACTIVE)if(ORACLE_BLACK_FLAME_ACTIVE[k])active++
  if(active>=ORACLE_BLACK_FLAME_MAX_ACTIVE){
    relicSetFireBy(player,target,Math.max(4,Math.ceil((durationMs||6000)/1000)+2),'fire_god_ember')
    relicDamageTarget(player,target,relicGodFireDamage(target,res),'minecraft:magic','fire_god_ember',res>=3?0:(durationMs+3500))
    relicGodFireVisual(target,res)
    return false
  }

  var dim=relicDim(target)
  var durationTicks=durationMs?Math.ceil(durationMs/50):0
  var modVisual=relicVisualTargetCommand(target,'fire',res+' '+durationTicks)
  ORACLE_BLACK_FLAME_ACTIVE[key]={res:res,pulses:0,expiresAt:durationMs?Date.now()+durationMs:0,dim:dim,visualTicks:0,modVisual:modVisual}
  try{
    target.persistentData.putInt('divineGodFireLevel',res)
    target.persistentData.putBoolean('divineBlackFlame',res>=3)
  }catch(ignored){}
  // 神火从命中的这一刻就进入原版燃烧状态，而不是只有“看起来像火”的自定义伤害。
  relicSetFireBy(player,target,Math.max(4,Math.ceil((durationMs||6000)/1000)+2),'fire_god_ember')
  // 清理旧版本残留的紫色 item_display；1.4.0 起绝不再重新生成它。
  relicBlackFlameKillVisual(target,dim)

  function cleanup(){
    try{
      target.persistentData.putBoolean('divineBlackFlame',false)
      target.persistentData.putInt('divineGodFireLevel',0)
    }catch(ignoredClear){}
    relicVisualTargetCommand(target,'fire_stop','')
    relicBlackFlameKillVisual(target,dim)
    delete ORACLE_BLACK_FLAME_ACTIVE[key]
  }

  function follow(){
    var state=ORACLE_BLACK_FLAME_ACTIVE[key]
    if(!state)return
    try{
      if(!relicEntityAlive(target)){cleanup();return}
      var r=Math.max(0,Math.min(3,state.res||0))
      if(r<3&&state.expiresAt>0&&Date.now()>=state.expiresAt){cleanup();return}
      if(state.modVisual){
        if(state.visualTicks%5==0)relicGodFireVisual(target,r)
      }else if(state.visualTicks%3==0){
        // 模组视觉不可用时只留无色原版烟灰，不允许旧紫色贴图回退。
        relicGodFireVisual(target,r)
      }
      state.visualTicks++
      player.server.scheduleInTicks(4,follow)
    }catch(error){cleanup()}
  }

  function pulse(){
    var state=ORACLE_BLACK_FLAME_ACTIVE[key]
    if(!state)return
    try{
      if(!relicEntityAlive(target)){cleanup();return}
      var r=Math.max(0,Math.min(3,state.res||0))
      if(r<3&&state.expiresAt>0&&Date.now()>=state.expiresAt){cleanup();return}

      // 每次神火伤害脉冲前补足原版燃烧时间；若这一跳击杀动物，原版战利品条件能看到它确实“正在燃烧”。
      relicSetFireBy(player,target,3,'fire_god_ember')
      relicDamageTarget(player,target,relicGodFireDamage(target,r),'minecraft:magic','fire_god_ember',r>=3?0:5000)
      state.pulses++
      player.server.scheduleInTicks(20,pulse)
    }catch(error){cleanup()}
  }

  follow()
  pulse()
  return true
}

function relicApplyEffectToTarget(player,target,effect,seconds,amplifier) {
  if(!player||!target||!player.server)return false
  if(String(effect)=='minecraft:wither'){
    var creditMs=Number(seconds)>=100000?0:(Math.max(1,Number(seconds)||1)*1000+3500)
    relicCreditChallenge(player,target,relicMainHandId(player)||'relic_wither',creditMs)
  }
  var tag='divine_fx_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  try{target.addTag(tag)}catch(ignored){return false}
  try{player.server.runCommandSilent('execute in '+relicDim(target)+' run effect give @e[tag='+tag+',limit=1] '+effect+' '+seconds+' '+amplifier+' true')}catch(ignored2){}
  try{target.removeTag(tag)}catch(ignored3){}
  return true
}

function relicStartAbyssFear(player,target,res){
  if(!player||!target||!player.server)return false
  res=Math.max(0,Math.min(3,res||0))
  var key=relicUuid(target)
  var durationMs=res>=3?0:(res==2?14000:(res==1?10000:7000))
  relicCreditChallenge(player,target,'abyss_god_echo',durationMs?durationMs+4500:0)

  if(ORACLE_ABYSS_FEAR_ACTIVE[key]){
    var old=ORACLE_ABYSS_FEAR_ACTIVE[key]
    old.res=Math.max(old.res||0,res)
    if(old.res>=3)old.expiresAt=0
    else old.expiresAt=Math.max(old.expiresAt||0,Date.now()+durationMs)
    return true
  }

  var active=0,k=''
  for(k in ORACLE_ABYSS_FEAR_ACTIVE)if(ORACLE_ABYSS_FEAR_ACTIVE[k])active++
  if(active>=ORACLE_ABYSS_FEAR_MAX_ACTIVE){
    relicApplyEffectToTarget(player,target,'minecraft:wither',6,res>=2?2:(res>=1?1:0))
    relicApplyEffectToTarget(player,target,'minecraft:darkness',6,0)
    relicDamageTarget(player,target,4+res*2,'minecraft:magic','abyss_god_echo',durationMs?durationMs+3500:0)
    return false
  }

  ORACLE_ABYSS_FEAR_ACTIVE[key]={res:res,pulses:0,expiresAt:durationMs?Date.now()+durationMs:0}

  function applyFear(r){
    // Wither 图标/视觉仍保留，但真正的高伤害由自定义 damage pulse 提供。
    relicApplyEffectToTarget(player,target,'minecraft:wither',3,r>=3?3:(r==2?2:(r==1?1:0)))
    relicApplyEffectToTarget(player,target,'minecraft:darkness',4,0)
    if(r>=1){
      relicApplyEffectToTarget(player,target,'minecraft:weakness',4,r>=3?2:1)
      relicApplyEffectToTarget(player,target,'minecraft:slowness',4,r>=3?3:(r>=2?2:1))
    }
    if(r>=3)relicApplyEffectToTarget(player,target,'minecraft:mining_fatigue',4,2)
  }

  function pulse(){
    var state=ORACLE_ABYSS_FEAR_ACTIVE[key]
    if(!state)return
    try{
      if(!relicEntityAlive(target)){
        delete ORACLE_ABYSS_FEAR_ACTIVE[key]
        return
      }
      var r=Math.max(0,Math.min(3,state.res||0))
      if(r<3&&state.expiresAt>0&&Date.now()>=state.expiresAt){
        delete ORACLE_ABYSS_FEAR_ACTIVE[key]
        return
      }

      applyFear(r)
      // 强化凋零：3 / 4 / 6 / 8 点生命值每秒，额外叠加原版 Wither 状态。
      relicDamageTarget(player,target,r>=3?8:(r==2?6:(r==1?4:3)),'minecraft:magic','abyss_god_echo',r>=3?0:5000)
      relicParticleAt(target,'minecraft:sculk_soul',10+r*5,0.38)
      relicParticleAt(target,'minecraft:soul',6+r*3,0.34)
      relicParticleAt(target,'minecraft:large_smoke',4+r*2,0.28)
      if(state.pulses%2==0)relicPlay(player,'minecraft:entity.warden.heartbeat',0.20,0.54+r*0.04)
      state.pulses++
      player.server.scheduleInTicks(20,pulse)
    }catch(error){
      delete ORACLE_ABYSS_FEAR_ACTIVE[key]
    }
  }

  relicPlay(player,'minecraft:block.sculk_shrieker.shriek',0.25,0.92)
  pulse()
  return true
}

function relicPlayerSneaking(player){
  try{if(typeof player.isCrouching=='function')return player.isCrouching()}catch(ignored){}
  try{if(typeof player.isShiftKeyDown=='function')return player.isShiftKeyDown()}catch(ignored2){}
  return false
}

function relicIsHostile(entity){
  if(!entity)return false
  try{if(entity.isMonster&&typeof entity.isMonster=='function')return entity.isMonster()}catch(ignored){}
  var id='';try{id=String(entity.type)}catch(ignored2){}
  return id.indexOf('zombie')>=0||id.indexOf('skeleton')>=0||id.indexOf('creeper')>=0||id.indexOf('spider')>=0||id.indexOf('illager')>=0||id.indexOf('wither')>=0||id.indexOf('warden')>=0||id.indexOf('blaze')>=0||id.indexOf('ghast')>=0||id.indexOf('slime')>=0||id.indexOf('phantom')>=0||id.indexOf('witch')>=0||id.indexOf('enderman')>=0
}

var ORACLE_DEATH_HIT_GAP_MS = 220
var ORACLE_DEATH_COUNTDOWN_HIT_GAP_MS = 850
var ORACLE_DEATH_REFUSE_HINT_COOLDOWN_MS = 1600

// 死神最终规则：刀数属于“持有者本人”，不是目标身上的诅咒。
// 本体/共鸣 I = 10 刀，共鸣 II = 8 刀，满命 = 5 刀。
// 这样严格保留项目总纲里的 10 -> 8 -> 5，不再私自插入 6 刀阶段。
function relicDeathThreshold(res){
  res=Math.max(0,Number(res)||0)
  if(res>=3)return 5
  if(res>=2)return 8
  return 10
}
function relicEntityTypeId(entity){try{return String(entity.type)}catch(ignored){}return ''}
function relicEntityHasTag(entity,tag){
  if(!entity||!tag)return false
  try{if(entity.getTags&&entity.getTags().contains(tag))return true}catch(ignoredA){}
  try{if(entity.tags&&entity.tags.contains&&entity.tags.contains(tag))return true}catch(ignoredB){}
  return false
}
function relicDeathTypeMatchesTag(target,tagId){
  if(!target||!target.server||!tagId)return false
  var probe='death_boss_probe_'+String(Date.now())+'_'+String(Math.floor(Math.random()*100000))
  try{
    target.addTag(probe)
    var found=target.server.runCommandSilent('execute in '+relicDim(target)+' if entity @e[tag='+probe+',type=#'+tagId+',limit=1]')>0
    try{target.removeTag(probe)}catch(ignoredRemove){}
    return found
  }catch(ignored){
    try{target.removeTag(probe)}catch(ignoredRemove2){}
    return false
  }
}
function relicDeathIsBoss(target){
  if(!target)return false
  if(relicEntityHasTag(target,'divine_challenge_boss'))return true
  var type=relicEntityTypeId(target)
  if(type.indexOf('ender_dragon')>=0||type.indexOf('wither')>=0||type.indexOf('warden')>=0)return true
  // Forge 生态的 Boss 类型优先走实体类型标签；同时兼容新式 common 标签命名。
  if(relicDeathTypeMatchesTag(target,'forge:bosses'))return true
  if(relicDeathTypeMatchesTag(target,'c:bosses'))return true
  return false
}
function relicDeathCanExecute(target,res){
  if(!target)return false
  try{if(target.isPlayer&&target.isPlayer())return false}catch(ignored){}
  if(res>=3)return true
  return !relicDeathIsBoss(target)
}
function relicDeathGetHits(player,required){
  if(!player)return 0
  var n=0
  try{n=player.persistentData.getInt('deathGodBladeHits')}catch(ignored){}
  if(n<0)n=0
  if(required>0&&n>required)n=required
  return n
}
function relicDeathSetHits(player,count){
  if(!player)return
  try{player.persistentData.putInt('deathGodBladeHits',Math.max(0,Math.floor(Number(count)||0)))}catch(ignored){}
}
function relicDeathClearExecution(player,token){
  if(!player)return
  try{
    var current=String(player.persistentData.getString('deathGodExecutionToken')||'')
    if(token&&current&&current!=token)return
    player.persistentData.putString('deathGodExecutionToken','')
    player.persistentData.putLong('deathGodExecutionUntil',0)
  }catch(ignored){}
}

function relicDeathRefuse(player,target){
  // 拒绝只说这一句；不把内部“刀数保留”解释塞进聊天框。
  if(!player||!player.server)return
  var now=Date.now(),last=0
  try{last=Number(player.persistentData.getLong('deathGodRefuseHintAt'))}catch(ignoredRead){}
  if(last>0&&now-last<ORACLE_DEATH_REFUSE_HINT_COOLDOWN_MS)return
  try{player.persistentData.putLong('deathGodRefuseHintAt',now)}catch(ignoredWrite){}

  try{relicTell(player,{text:'死神拒绝了你的请求',color:'dark_red'})}catch(ignoredTell){}
  try{relicPlay(player,'minecraft:block.sculk_sensor.clicking_stop',0.42,0.58)}catch(ignoredS1){}
  try{relicPlay(player,'minecraft:block.respawn_anchor.deplete',0.24,0.52)}catch(ignoredS2){}
  try{player.server.scheduleInTicks(2,function(){try{relicPlay(player,'minecraft:entity.warden.heartbeat',0.15,0.70)}catch(ignoredS3){}})}catch(ignoredSchedule){}
}

function relicDeathCountdownLine(player,number){
  if(!player)return
  // 用户确认的风格：聊天框只出现数字本身，不加“莫尔维恩：”之类解释性前缀。
  try{relicTell(player,{text:String(number)+'......',color:'dark_red',italic:true})}catch(ignored){}
}

function relicDeathParticleOffset(target,particle,yOffset,spreadY,count,speed,spreadXZ){
  if(!target||!target.server)return
  var p=relicPos(target),dim=relicDim(target)
  var sx=spreadXZ==null?0.35:Number(spreadXZ)
  var sy=spreadY==null?sx:Number(spreadY)
  var n=Math.max(1,Math.floor(Number(count)||1))
  var v=speed==null?0.03:Number(speed)
  try{
    target.server.runCommandSilent(
      'execute in '+dim+' positioned '+p.x+' '+(p.y+Number(yOffset||0))+' '+p.z+
      ' run particle '+particle+' ~ ~ ~ '+sx+' '+sy+' '+sx+' '+v+' '+n+' force'
    )
  }catch(ignored){}
}

function relicDeathVanillaExecutionPulse(target,phase,res){
  if(!target||!relicEntityAlive(target))return
  // V10.6.4：死神处刑重新完全使用 Minecraft 原版粒子。
  // 不再调用 LuokixiVisuals 的 execution_slash 自定义纹理；视觉语言改成“灵魂被抽出 -> 收束 -> 崩散”。
  if(phase==0){
    relicDeathParticleOffset(target,'minecraft:sculk_soul',0.90,0.55,10+res*2,0.018,0.30)
    relicDeathParticleOffset(target,'minecraft:soul',0.85,0.42,7+res,0.012,0.25)
    relicDeathParticleOffset(target,'minecraft:reverse_portal',0.90,0.62,16+res*3,0.055,0.38)
    relicDeathParticleOffset(target,'minecraft:large_smoke',0.65,0.32,5+res,0.018,0.28)
    return
  }
  if(phase==1){
    relicDeathParticleOffset(target,'minecraft:reverse_portal',0.95,0.92,32+res*5,0.075,0.52)
    relicDeathParticleOffset(target,'minecraft:sculk_soul',1.00,0.78,18+res*3,0.025,0.42)
    relicDeathParticleOffset(target,'minecraft:soul',1.20,0.62,10+res*2,0.020,0.34)
    relicDeathParticleOffset(target,'minecraft:dust 0.09 0.0 0.12 1.15',0.95,0.70,10+res*2,0.018,0.40)
    relicDeathParticleOffset(target,'minecraft:large_smoke',0.80,0.50,8+res*2,0.024,0.38)
    return
  }
  if(phase==2){
    // 灵魂向上脱离，底部留下烟和灰烬；用少量紫黑尘粒把青色灵魂压回死神的色调。
    relicDeathParticleOffset(target,'minecraft:sculk_soul',1.35,1.05,30+res*4,0.040,0.50)
    relicDeathParticleOffset(target,'minecraft:soul',1.50,0.95,20+res*3,0.035,0.44)
    relicDeathParticleOffset(target,'minecraft:reverse_portal',1.05,1.10,48+res*6,0.090,0.58)
    relicDeathParticleOffset(target,'minecraft:dust 0.16 0.0 0.035 1.25',1.00,0.80,14+res*2,0.022,0.50)
    relicDeathParticleOffset(target,'minecraft:ash',0.70,0.45,16+res*2,0.018,0.42)
    relicDeathParticleOffset(target,'minecraft:large_smoke',0.65,0.50,12+res*2,0.026,0.42)
    return
  }
  // 最终判决：不是满屏爆炸，而是灵魂、幽匿魂与逆向末影在一瞬间一起断开。
  relicDeathParticleOffset(target,'minecraft:flash',1.00,0.0,1,0.0,0.0)
  relicDeathParticleOffset(target,'minecraft:soul',1.10,1.20,28+res*4,0.095,0.72)
  relicDeathParticleOffset(target,'minecraft:sculk_soul',1.20,1.10,34+res*5,0.080,0.66)
  relicDeathParticleOffset(target,'minecraft:reverse_portal',1.00,1.25,62+res*8,0.145,0.78)
  relicDeathParticleOffset(target,'minecraft:large_smoke',0.90,0.80,18+res*3,0.055,0.58)
  relicDeathParticleOffset(target,'minecraft:ash',0.85,0.72,24+res*3,0.045,0.58)
  relicDeathParticleOffset(target,'minecraft:dust 0.22 0.0 0.045 1.35',1.00,0.90,18+res*3,0.050,0.60)
}

function relicDeathNailCue(player,target,count,required){
  if(!player||!target)return
  relicSoundAt(player,target,'luokixivisuals:relic_death_nail',0.86,1.00,30)
  // 每一钉只给极少量原版灵魂/暗红尘粒，真正的大演出留给 Zero 之后。
  relicParticleAt(target,'minecraft:dust 0.18 0.0 0.025 1.05',3,0.10)
  if(count>=Math.max(1,required-2))relicParticleAt(target,'minecraft:sculk_soul',2,0.12)

  // 倒数永远贴着当前阈值的最后三刀：
  // 10 刀 = 8/9/10，8 刀 = 6/7/8，5 刀 = 3/4/5。
  var voice='',digit=''
  if(count==required-2){voice='luokixivisuals:death_count_3';digit='3'}
  else if(count==required-1){voice='luokixivisuals:death_count_2';digit='2'}
  else if(count==required){voice='luokixivisuals:death_count_1';digit='1'}
  if(voice&&player.server)player.server.scheduleInTicks(2,function(){
    try{
      if(relicEntityAlive(target))relicPlayVoice(player,voice,0.96,1.00)
      relicDeathCountdownLine(player,digit)
    }catch(ignoredVoice){}
  })
}

function relicExecuteDeath(player,target,res){
  if(!player||!target||!player.server)return false
  if(!relicDeathCanExecute(target,res))return false

  var server=player.server,dim=relicDim(target)
  var tag='death_final_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  var token='death_exec_'+String(Date.now())+'_'+String(Math.floor(Math.random()*100000))
  try{target.addTag(tag)}catch(ignoredTag){return false}
  // 最终 /kill 没有 source.player，处决一旦被接受就给挑战实例留下合法归属。
  relicCreditChallenge(player,target,'death_god_register',8000)
  try{
    player.persistentData.putString('deathGodExecutionToken',token)
    player.persistentData.putLong('deathGodExecutionUntil',Date.now()+4200)
  }catch(ignoredExecuting){}

  // 处刑请求被死神接受的瞬间，先给一个独立的低频压迫层。
  // 不替换 Three/Two/One/Zero，也不依赖新音频资源：用原版 Warden / Sculk / Anchor 声音叠成规则被锁死的感觉。
  try{
    relicSoundAt(player,target,'minecraft:entity.warden.heartbeat',1.35,0.55,42)
    relicSoundAt(player,target,'minecraft:block.sculk_shrieker.shriek',0.38,0.50,42)
  }catch(ignoredPressure0){}
  server.scheduleInTicks(7,function(){
    try{
      if(!relicEntityAlive(target))return
      relicSoundAt(player,target,'minecraft:entity.warden.heartbeat',1.55,0.47,42)
      relicSoundAt(player,target,'minecraft:block.respawn_anchor.deplete',0.42,0.58,42)
    }catch(ignoredPressure1){}
  })
  server.scheduleInTicks(16,function(){
    try{
      if(!relicEntityAlive(target))return
      relicSoundAt(player,target,'minecraft:entity.warden.heartbeat',1.75,0.40,42)
    }catch(ignoredPressure2){}
  })

  // One 已经在触发这一刀时播放。约 1.3 秒后 Zero。
  // Zero 之后完全使用原版粒子合成处刑：灵魂抽离 -> 收束 -> 上升 -> 判决崩散。
  server.scheduleInTicks(26,function(){
    try{
      if(relicEntityAlive(target)){
        relicPlayVoice(player,'luokixivisuals:death_count_0',1.00,1.00)
        relicDeathCountdownLine(player,'0')
        relicDeathVanillaExecutionPulse(target,0,res)
      }
    }catch(ignoredZero){}
  })
  server.scheduleInTicks(34,function(){try{relicDeathVanillaExecutionPulse(target,1,res)}catch(ignoredPhase1){}})
  server.scheduleInTicks(41,function(){try{relicDeathVanillaExecutionPulse(target,2,res)}catch(ignoredPhase2){}})
  server.scheduleInTicks(48,function(){
    try{
      if(!relicEntityAlive(target))return
      // 不再调用 luokixi_visual execution；因此客户端不会再出现自定义 execution_slash 贴图。
      relicDeathVanillaExecutionPulse(target,3,res)
      relicSoundAt(player,target,'luokixivisuals:death_slash',0.88,1.00,32)
      relicSoundAt(player,target,'minecraft:entity.soul.escape',0.34,0.58,32)
    }catch(ignoredSlash){}
  })
  server.scheduleInTicks(52,function(){
    try{
      if(!relicEntityAlive(target)){relicDeathClearExecution(player,token);return}
      relicSoundAt(player,target,'luokixivisuals:death_verdict',0.82,0.98,32)
      if(res>=3){
        relicAoeEffect(player,target,12,'minecraft:wither',15,4,24)
        relicAoeEffect(player,target,12,'minecraft:darkness',12,0,24)
        relicAoeEffect(player,target,12,'minecraft:weakness',12,2,24)
        server.runCommandSilent('effect give '+player.username+' minecraft:instant_health 1 5 true')
        server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 8 2 true')
      }
      var killed=server.runCommandSilent('execute in '+dim+' run kill @e[tag='+tag+',limit=1]')
      // 只有这一记处决真的杀到了目标，才清空玩家个人刀数。
      if(killed>0){
        var current=''
        try{current=String(player.persistentData.getString('deathGodExecutionToken')||'')}catch(ignoredToken){}
        if(current==token)relicDeathSetHits(player,0)
      }
      relicDeathClearExecution(player,token)
    }catch(ignoredKill){relicDeathClearExecution(player,token)}
  })
  return true
}

function relicDeathHit(player,target,res){
  if(!player||!target)return false
  var now=Date.now(),required=relicDeathThreshold(res)

  // 一名持有者同时只能进行一次处决演出，避免重复排队执行。
  var executingUntil=0
  try{executingUntil=Number(player.persistentData.getLong('deathGodExecutionUntil'))}catch(ignoredExecutingRead){}
  if(executingUntil>now)return true
  if(executingUntil>0)relicDeathClearExecution(player,'')

  var count=relicDeathGetHits(player,required)
  var lastHit=0
  try{lastHit=Number(player.persistentData.getLong('deathGodLastHitAt'))}catch(ignoredLast){}

  // 已经因为 Boss 拒绝而攒满时，不再要求额外“第 11 刀”。
  // 下一次击中合法目标就直接重新提出处决请求；击中 Boss 则再次拒绝且刀数仍满。
  if(count>=required){
    if(relicDeathCanExecute(target,res)){
      relicDeathNailCue(player,target,required,required)
      return relicExecuteDeath(player,target,res)
    }
    relicDeathRefuse(player,target)
    return false
  }

  var countdownStart=Math.max(1,required-2)
  var requiredGap=count>=countdownStart-1?ORACLE_DEATH_COUNTDOWN_HIT_GAP_MS:ORACLE_DEATH_HIT_GAP_MS
  if(lastHit>0&&now-lastHit<requiredGap)return false

  count=Math.min(required,count+1)
  relicDeathSetHits(player,count)
  try{player.persistentData.putLong('deathGodLastHitAt',now)}catch(ignoredWrite){}
  relicDeathNailCue(player,target,count,required)

  if(count>=required){
    if(!relicDeathCanExecute(target,res)){
      relicDeathRefuse(player,target)
      return false
    }
    return relicExecuteDeath(player,target,res)
  }
  return false
}

function relicWarHit(player,target,res){
  if(!player||!target)return
  var hits=player.persistentData.getInt('warGodRelicHits')+1
  player.persistentData.putInt('warGodRelicHits',hits)

  if(hits%3==0){
    var strength=res>=2?2:(res>=1?1:0)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:strength '+(4+res)+' '+strength+' true')
    if(res>=1)player.server.runCommandSilent('effect give '+player.username+' minecraft:speed '+(4+res)+' '+(res>=2?1:0)+' true')
    relicPlay(player,'minecraft:block.anvil.use',0.24,0.76)
  }

  if(res>=2&&hits%6==0){
    player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 6 2 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 6 1 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 7 2 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 5 1 true')
    relicParticleAt(player,'minecraft:crit',30,0.44)
    relicPlay(player,'minecraft:entity.ravager.step',0.26,0.70)
  }

  if(res>=3&&hits%8==0){
    var until=Date.now()+5000
    player.persistentData.putLong('warGodInvincibleUntil',until)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 5 4 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 5 3 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 5 2 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 8 4 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 5 2 true')
    relicParticleAt(player,'minecraft:totem_of_undying',54,0.52)
    relicParticleAt(player,'minecraft:crit',48,0.56)
    relicPlay(player,'minecraft:entity.ravager.roar',0.46,0.76)
    relicPlay(player,'minecraft:block.anvil.land',0.44,0.58)
    relicPlay(player,'minecraft:entity.iron_golem.attack',0.52,0.52)
    player.tell(Text.red('✦ 斗神祝福：五秒之内，伤害这件事不再适用于你。'))
  }

  if(res>=3&&Number(player.persistentData.getLong('warGodInvincibleUntil'))>Date.now()){
    relicAoeDamage(player,target,3.5,4,12)
    relicAoeEffect(player,target,3.5,'minecraft:slowness',2,2,12)
    relicParticleAt(target,'minecraft:explosion',2,0.08)
  }
}

function relicWarInvincible(player){
  if(!player)return false
  return Number(player.persistentData.getLong('warGodInvincibleUntil'))>Date.now()
}

function relicHearthSanctuary(player){
  if(!player||!player.server)return false
  var now=Date.now(),last=Number(player.persistentData.getLong('hearthSanctuaryLast'))
  if(last>0&&now-last<ORACLE_HEARTH_SANCTUARY_COOLDOWN)return false
  player.persistentData.putLong('hearthSanctuaryLast',now)
  player.server.runCommandSilent('effect give '+player.username+' minecraft:instant_health 1 5 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 10 2 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 12 3 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 15 5 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:fire_resistance 20 0 true')
  player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..9] minecraft:regeneration 10 2 true')
  player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..9] minecraft:resistance 8 1 true')
  player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..9] minecraft:absorption 10 3 true')
  player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..9] minecraft:fire_resistance 15 0 true')
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:flame ~ ~1 ~ 1.7 0.9 1.7 0.05 86 force')
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:totem_of_undying ~ ~1 ~ 1.3 0.9 1.3 0.08 66 force')
  relicPlay(player,'luokixivisuals:relic_hearth_hit',0.74,0.82)
  relicPlay(player,'minecraft:block.campfire.crackle',0.18,0.72)
  player.tell(Text.gold('✦ 最后一炉亮了起来。本应致死的一击已经被炉神改写；现在带着身边的人活着打回去。'))
  return true
}

function relicRefreshWindBlessing(player){
  if(!player||!player.server)return
  var worn=relicWindWorn(player),res=0
  if(worn){
    res=relicResonance(player,'wind_king_release')
    player.persistentData.putBoolean('windRelicBuff',true)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 1000000 '+(res>=2?1:0)+' true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:slow_falling 1000000 0 true')
    if(res>=1)player.server.runCommandSilent('effect give '+player.username+' minecraft:jump_boost 1000000 '+(res>=2?1:0)+' true')
    if(res>=3)relicEnableWindFlight(player)
  }else if(player.persistentData.getBoolean('windRelicBuff')){
    player.persistentData.putBoolean('windRelicBuff',false)
    player.server.runCommandSilent('effect clear '+player.username+' minecraft:speed')
    player.server.runCommandSilent('effect clear '+player.username+' minecraft:slow_falling')
    player.server.runCommandSilent('effect clear '+player.username+' minecraft:jump_boost')
    relicDisableWindFlight(player)
  }
}

function relicRainHarvestWave(player,res){
  if(!player||!player.server)return false
  var now=Date.now(),last=Number(player.persistentData.getLong('rainMotherHarvestWaveLast'))
  var cooldown=res>=3?40000:(res==2?55000:(res==1?75000:90000))
  if(last>0&&now-last<cooldown){player.tell(Text.gray('雨还没走远，再等 '+Math.ceil((cooldown-(now-last))/1000)+' 秒。'));return false}
  player.persistentData.putLong('rainMotherHarvestWaveLast',now)
  var r=res>=3?8:(res==2?6:(res==1?4:3))
  var crops=['minecraft:wheat[age=7] replace minecraft:wheat','minecraft:carrots[age=7] replace minecraft:carrots','minecraft:potatoes[age=7] replace minecraft:potatoes','minecraft:beetroots[age=3] replace minecraft:beetroots']
  var i=0
  for(i=0;i<crops.length;i++)player.server.runCommandSilent('execute at '+player.username+' run fill ~-'+r+' ~-2 ~-'+r+' ~'+r+' ~2 ~'+r+' '+crops[i])
  player.server.runCommandSilent('execute at '+player.username+' run fill ~-'+r+' ~-2 ~-'+r+' ~'+r+' ~1 ~'+r+' minecraft:farmland[moisture=7] replace minecraft:farmland')
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:happy_villager ~ ~1 ~ '+r/2+' 1 '+r/2+' 0.04 '+(38+r*7)+' force')
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:falling_water ~ ~2 ~ '+r/2+' 1 '+r/2+' 0.03 '+(30+r*6)+' force')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration '+(8+res*3)+' '+(res>=2?2:1)+' true')
  if(res>=2)player.server.runCommandSilent('effect give '+player.username+' minecraft:luck '+(12+res*4)+' '+(res>=3?2:1)+' true')
  if(res>=3){
    player.persistentData.putLong('rainMotherFeastUntil',now+20000)
    player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..'+(r+3)+'] minecraft:regeneration 12 2 true')
    player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..'+(r+3)+'] minecraft:saturation 1 1 true')
    player.server.runCommandSilent('execute at '+player.username+' run effect give @a[distance=..'+(r+3)+'] minecraft:luck 20 2 true')
    player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:composter ~ ~1 ~ 3.8 1.0 3.8 0.08 90 force')
  }
  relicPlay(player,'luokixivisuals:relic_rain_hit',0.58,res>=3?0.88:0.98)
  relicPlay(player,'minecraft:weather.rain.above',0.12,1.04)
  player.tell(Text.aqua(res>=3?'✦ 丰饶神域展开：二十秒之内，这片田地被写进了雨母的长桌。':'✦ 雨母把这片田提前推到了收成那一刻。'))
  return true
}

function relicThunder(player,target,res){
  var chance=res>=3?0.60:(res==2?0.48:(res==1?0.38:0.30))
  if(Math.random()>=chance)return false
  var p=relicPos(target),dim=relicDim(target),count=res>=3?2:1,i=0
  var tag='divine_thunder_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  try{target.addTag(tag)}catch(ignoredTag){}
  relicCreditChallenge(player,target,'thunder_god_verdict',8000)
  relicCreditChallengeArea(player,target,res>=3?10:7,'thunder_god_verdict',8000)
  for(i=0;i<count;i++)player.server.runCommandSilent('execute in '+dim+' run summon minecraft:lightning_bolt '+(p.x+(i==1?0.65:0))+' '+p.y+' '+(p.z+(i==1?-0.65:0)))
  if(res>=1){
    relicApplyEffectToTarget(player,target,'minecraft:glowing',6,0)
    relicApplyEffectToTarget(player,target,'minecraft:weakness',5,res>=3?2:0)
  }
  if(res>=2){
    var chainCount=res>=3?4:2,chainRadius=res>=3?10:7
    try{
      player.server.runCommandSilent('execute in '+dim+' at @e[tag='+tag+',limit=1] as @e['+ORACLE_RELIC_LIVING_SELECTOR+',tag=!'+tag+',distance=..'+chainRadius+',sort=nearest,limit='+chainCount+'] at @s run summon minecraft:lightning_bolt ~ ~ ~')
      player.server.runCommandSilent('execute in '+dim+' at @e[tag='+tag+',limit=1] run particle minecraft:electric_spark ~ ~1 ~ '+(res>=3?'2.2 1.0 2.2 0.18 54':'1.4 0.7 1.4 0.12 30')+' force')
    }catch(ignoredChain){}
  }
  try{target.removeTag(tag)}catch(ignoredRemove){}
  relicPlay(player,'minecraft:entity.lightning_bolt.thunder',res>=3?0.52:0.36,res>=3?0.68:1.04)
  if(res>=2)relicPlay(player,'minecraft:block.beacon.power_select',0.24,1.72)
  return true
}

function relicVoidTarget(player,target){
  if(!player||!target||target.isPlayer&&target.isPlayer())return false
  var type='';try{type=String(target.type)}catch(ignored){}
  if(type=='minecraft:ender_dragon')return false
  var dim=relicDim(target),y=dim=='minecraft:the_nether'?-48:-120
  var tag='divine_void_'+String(Date.now())+'_'+Math.floor(Math.random()*100000)
  try{target.addTag(tag)}catch(ignoredTag){return false}
  // out_of_world 死亡同样没有 source.player；放逐前先登记土父归属。
  relicCreditChallenge(player,target,'earth_father_order',15000)

  // 满命“放逐”不是传送门：声音先把空间抽空，约 0.1 秒后目标直接从规则里掉下去。
  relicSoundAt(player,target,'luokixivisuals:earth_banish',0.86,1.00,34)
  relicParticleAt(target,'minecraft:dust 0.025 0.02 0.03 1.2',3,0.16)
  relicParticleAt(target,'minecraft:reverse_portal',3,0.15)
  player.server.scheduleInTicks(2,function(){
    try{
      player.server.runCommandSilent('execute in '+dim+' as @e[tag='+tag+',limit=1] at @s run tp @s ~ '+y+' ~')
      target.removeTag(tag)
    }catch(ignoredMove){}
  })
  return true
}

function relicEarthQuake(player,res){
  if(!player||!player.server||res<2)return false
  var now=Date.now(),last=Number(player.persistentData.getLong('earthFatherQuakeLast'))
  var cooldown=res>=3?30000:45000
  if(last>0&&now-last<cooldown){
    player.tell(Text.darkGray('山脉还在回声里，再等 '+Math.ceil((cooldown-(now-last))/1000)+' 秒。'))
    return false
  }
  player.persistentData.putLong('earthFatherQuakeLast',now)
  var radius=res>=3?10:7,damage=res>=3?8:5
  relicAoeDamage(player,player,radius,damage,res>=3?32:20)
  relicAoeEffect(player,player,radius,'minecraft:slowness',5,res>=3?4:2,res>=3?32:20)
  relicAoeEffect(player,player,radius,'minecraft:weakness',5,res>=3?2:1,res>=3?32:20)
  if(res>=3)relicAoeEffect(player,player,radius,'minecraft:levitation',1,1,24)
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:block minecraft:deepslate ~ ~0.2 ~ '+(radius/2)+' 0.4 '+(radius/2)+' 0.20 '+(res>=3?120:72)+' force')
  player.server.runCommandSilent('execute at '+player.username+' run particle minecraft:explosion ~ ~0.5 ~ '+(radius/3)+' 0.2 '+(radius/3)+' 0.02 '+(res>=3?8:4)+' force')
  relicPlay(player,'minecraft:entity.iron_golem.attack',0.72,0.54)
  relicPlay(player,'minecraft:block.anvil.land',0.58,0.48)
  relicPlay(player,'minecraft:entity.generic.explode',0.34,0.64)
  player.tell(Text.darkGreen(res>=3?'✦ 山脉起身：十格之内，地面只听土父的。':'✦ 山脉起身：脚下的地脉向外撞开。'))
  return true
}

function relicMoonHelmetWorn(player){
  if(!player||!player.server)return false
  try{return player.server.runCommandSilent('execute as '+player.username+' if data entity @s Inventory[{Slot:103b,tag:{DivineRelic:"moon_queen_gaze"}}] run data get entity @s UUID')>0}catch(ignored){}
  return false
}
function relicHasInInventory(player,id){
  if(!player||!player.server)return false
  try{return player.server.runCommandSilent('execute as '+player.username+' if data entity @s Inventory[{tag:{DivineRelic:"'+id+'"}}] run data get entity @s UUID')>0}catch(ignored){}
  return false
}
function relicRefreshMoonNightVision(player){
  if(!player||!player.server)return
  var worn=relicMoonHelmetWorn(player)
  if(worn){player.persistentData.putBoolean('moonRelicNv',true);player.server.runCommandSilent('effect give '+player.username+' minecraft:night_vision 1000000 0 true')}
  else if(player.persistentData.getBoolean('moonRelicNv')){player.persistentData.putBoolean('moonRelicNv',false);player.server.runCommandSilent('effect clear '+player.username+' minecraft:night_vision')}
}

function relicSunAvatarActive(player){
  return !!player&&Number(player.persistentData.getLong('sunKingAvatarUntil'))>Date.now()
}

function relicSunHit(player,target,res){
  relicSetFireBy(player,target,8+res*4,'sun_king_favor')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration '+(3+res)+' '+(res>=2?1:0)+' true')
  relicParticleAt(target,'minecraft:flame',9+res*4,0.31)
  var hits=player.persistentData.getInt('sunKingRelicHits')+1
  player.persistentData.putInt('sunKingRelicHits',hits)

  if(res>=1&&hits%4==0){
    player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 6 '+(res>=3?2:1)+' true')
    relicPlay(player,'minecraft:block.beacon.power_select',0.16,1.52)
  }

  if(res>=2&&hits%5==0){
    relicAoeDamage(player,target,4,4,16)
    relicAoeEffect(player,target,4,'minecraft:glowing',5,0,16)
    relicParticleAt(target,'minecraft:flash',1,0.0)
    relicParticleAt(target,'minecraft:flame',26,0.72)
    relicPlay(player,'minecraft:entity.generic.explode',0.22,1.44)
  }

  if(res>=3&&hits%10==0){
    player.persistentData.putLong('sunKingAvatarUntil',Date.now()+10000)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 10 2 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 10 1 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 10 2 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 12 4 true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:fire_resistance 12 0 true')
    relicParticleAt(player,'minecraft:end_rod',42,0.55)
    relicParticleAt(player,'minecraft:flame',46,0.58)
    relicPlay(player,'minecraft:block.beacon.activate',0.48,1.28)
    relicPlay(player,'minecraft:ui.toast.challenge_complete',0.28,1.58)
    player.tell(Text.gold('✦ 正午化身：十秒之内，你就是日王落在人间的一块太阳。'))
  }

  if(res>=3&&relicSunAvatarActive(player)){
    relicAoeDamage(player,target,4.5,6,18)
    relicAoeEffect(player,target,4.5,'minecraft:glowing',4,0,18)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 2 2 true')
    relicParticleAt(target,'minecraft:flame',18,0.62)
  }
}

function relicMoonRiposte(player,target,res){
  if(!player||!target||res<1)return false
  var until=Number(player.persistentData.getLong('moonQueenRiposteUntil'))
  if(until<=Date.now())return false
  player.persistentData.putLong('moonQueenRiposteUntil',0)
  relicApplyEffectToTarget(player,target,'minecraft:blindness',res>=2?7:4,0)
  if(res>=2){
    relicApplyEffectToTarget(player,target,'minecraft:slowness',6,2)
    relicApplyEffectToTarget(player,target,'minecraft:weakness',6,1)
  }
  relicParticleAt(target,'minecraft:end_rod',5+res,0.24)
  relicParticleAt(target,'minecraft:reverse_portal',4+res,0.22)
  relicSoundAt(player,target,'luokixivisuals:relic_moon_hit',0.48,0.92,26)
  return true
}

function relicMoonEclipse(player,target){
  if(!player||!target)return false
  if(relicResonance(player,'moon_queen_gaze')<3||!relicHasInInventory(player,'sun_king_favor'))return false
  var now=Date.now(),last=Number(player.persistentData.getLong('moonSunEclipseLast'))
  if(last>0&&now-last<12000)return false
  player.persistentData.putLong('moonSunEclipseLast',now)
  relicAoeEffect(player,target,7,'minecraft:blindness',8,0,20)
  relicAoeEffect(player,target,7,'minecraft:darkness',8,0,20)
  relicAoeEffect(player,target,7,'minecraft:weakness',8,2,20)
  relicAoeEffect(player,target,7,'minecraft:slowness',8,2,20)
  relicParticleAt(target,'minecraft:end_rod',40,1.0)
  relicParticleAt(target,'minecraft:reverse_portal',40,1.0)
  relicPlay(player,'minecraft:block.amethyst_block.chime',0.42,0.64)
  relicPlay(player,'minecraft:entity.warden.sonic_charge',0.18,1.18)
  player.tell(Text.lightPurple('✦ 日月蚀：索拉恩的光被露娜娅合上了一瞬。'))
  return true
}

var ORACLE_RELIC_HIT_AUDIO = {
  rain_mother_gift:{sound:'luokixivisuals:relic_rain_hit',vol:0.42,pitch:1.04},
  wind_king_release:{sound:'luokixivisuals:relic_wind_hit',vol:0.40,pitch:1.06},
  tide_king_command:{sound:'luokixivisuals:relic_tide_hit',vol:0.50,pitch:0.96},
  hearth_guard:{sound:'luokixivisuals:relic_hearth_hit',vol:0.52,pitch:0.94},
  earth_father_order:{sound:'luokixivisuals:relic_earth_hit',vol:0.56,pitch:0.92},
  sun_king_favor:{sound:'luokixivisuals:relic_sun_hit',vol:0.45,pitch:1.02},
  moon_queen_gaze:{sound:'luokixivisuals:relic_moon_hit',vol:0.40,pitch:1.05},
  abyss_god_echo:{sound:'luokixivisuals:relic_abyss_hit',vol:0.50,pitch:0.92},
  war_god_oath:{sound:'luokixivisuals:relic_war_hit',vol:0.56,pitch:0.97},
  thunder_god_verdict:{sound:'luokixivisuals:relic_thunder_hit',vol:0.52,pitch:1.02}
}

function relicLuokixiExecute(player,target) {
  if(!player||!target||!player.server)return false
  // 先记归属，兼容挑战事件对“非普通 DamageSource”死亡的识别。
  relicCreditChallenge(player,target,'luokixi_relic_wei',6000)
  try{
    relicParticleAt(target,'minecraft:crimson_spore',18,0.30)
    relicParticleAt(target,'minecraft:heart',5,0.18)
  }catch(ignoredFx){}
  var tag='luokixi_wei_execute_'+Date.now()+'_'+Math.floor(Math.random()*100000)
  var tagged=false
  try{target.addTag(tag);tagged=true}catch(ignoredTag){}
  try{
    var dim=relicDim(target)
    var code=tagged?player.server.runCommandSilent('execute in '+dim+' run kill @e[tag='+tag+',limit=1]'):0
    if(code<=0){
      // Java 实体接口作为命令路径失效时的回退；仍走正常死亡而不是 discard。
      try{target.kill()}catch(ignoredKill){}
    }
  }catch(error){
    try{target.kill()}catch(ignoredFallback){}
  }
  if(tagged)try{target.removeTag(tag)}catch(ignoredRemove){}
  return true
}

function relicWeaponImpactCue(player,target,id,res) {
  if(!player||!target||!id)return
  // 死神的每一击由诅咒系统自己播放“钉入”声音，避免双重命中。
  if(id=='death_god_register')return
  var cue=ORACLE_RELIC_HIT_AUDIO[id]
  if(cue){
    var jitter=(Math.random()-0.5)*0.035
    relicSoundAt(player,target,cue.sound,cue.vol,Math.max(0.5,cue.pitch+jitter),28)
  }

  // 每件遗物只留 2~4 颗辨识粒子；声音承担主体重量。
  if(id=='thunder_god_verdict')relicParticleAt(target,'minecraft:electric_spark',3+res,0.16)
  else if(id=='abyss_god_echo')relicParticleAt(target,'minecraft:soul',2+Math.min(2,res),0.16)
  else if(id=='earth_father_order')relicParticleAt(target,'minecraft:block minecraft:deepslate',3+Math.min(2,res),0.16)
  else if(id=='rain_mother_gift')relicParticleAt(target,'minecraft:happy_villager',2,0.10)
  else if(id=='tide_king_command')relicParticleAt(target,'minecraft:splash',3,0.15)
  else if(id=='fire_god_ember')relicParticleAt(target,res>=3?'minecraft:ash':'minecraft:flame',3,0.14)
  else if(id=='sun_king_favor')relicParticleAt(target,'minecraft:end_rod',2,0.12)
  else if(id=='moon_queen_gaze')relicParticleAt(target,'minecraft:reverse_portal',2,0.12)
  else if(id=='war_god_oath')relicParticleAt(target,'minecraft:crit',3,0.14)
  else if(id=='hearth_guard')relicParticleAt(target,'minecraft:flame',2,0.10)
  else if(id=='wind_king_release')relicParticleAt(target,'minecraft:cloud',2,0.12)
}

EntityEvents.hurt(function(event){
  try{
    var victim=event.entity
    var internalRelicDamage=ORACLE_RELIC_INTERNAL_DAMAGE_DEPTH>0
    var player=internalRelicDamage?null:relicAttacker(event)
    if(player&&victim){
      var id=relicMainHandId(player),res=id?relicResonance(player,id):0
      if(id) relicWeaponImpactCue(player,victim,id,res)

      if(id=='luokixi_relic_wei'){
        relicLuokixiExecute(player,victim)
        event.cancel()
        return
      }

      if(id=='death_god_register'){
        if(relicDeathHit(player,victim,res)){
          event.cancel()
          return
        }
      }

      if(id=='thunder_god_verdict'){
        relicThunder(player,victim,res)
      }
      else if(id=='fire_god_ember'){
        // 黑焰仍由自定义脉冲负责主要伤害，但同时维持原版燃烧状态，确保真正拥有火焰攻击语义与熟肉掉落。
        relicStartBlackFlame(player,victim,res)
        if(res>=1&&Math.random()<(res>=3?0.62:(res>=2?0.46:0.28))){
          // 保留原有爆燃伤害与范围，只把视觉压成一个短促的“火向外吐了一口气”。
          relicAoeDamage(player,victim,res>=3?5:(res>=2?4:3),res>=3?8:(res>=2?6:4),14)
          if(res>=3){
            relicParticleAt(victim,'minecraft:ash',4,0.34)
            relicParticleAt(victim,'minecraft:large_smoke',2,0.30)
          }else{
            relicParticleAt(victim,'minecraft:flame',5+res,0.30)
            relicParticleAt(victim,'minecraft:smoke',2,0.24)
          }
        }
      }
      else if(id=='sun_king_favor'){
        relicSunHit(player,victim,res)
      }
      else if(id=='earth_father_order'){
        var exiled=false
        if(res>=3&&Math.random()<0.25)exiled=relicVoidTarget(player,victim)
        if(!exiled&&res>=2){
          relicApplyEffectToTarget(player,victim,'minecraft:slowness',4,res>=3?4:2)
          relicApplyEffectToTarget(player,victim,'minecraft:weakness',4,res>=3?2:1)
        }
      }
      else if(id=='abyss_god_echo'){
        relicStartAbyssFear(player,victim,res)
        if(res>=3){
          var abyssNow=Date.now(),abyssLast=Number(player.persistentData.getLong('abyssFullWaveLast'))
          if(abyssNow-abyssLast>=1600){
            player.persistentData.putLong('abyssFullWaveLast',abyssNow)
            // 满命才允许“直到死亡”的范围恐惧。主目标由生命周期持续高伤；
            // 周围目标先被永久深渊状态咬住，并吃一记即时神权伤害。
            relicAoeEffect(player,victim,8,'minecraft:wither',1000000,3,8)
            relicAoeEffect(player,victim,8,'minecraft:darkness',1000000,0,8)
            relicAoeEffect(player,victim,8,'minecraft:weakness',1000000,2,8)
            relicAoeEffect(player,victim,8,'minecraft:slowness',1000000,3,8)
            relicAoeDamage(player,victim,8,8,8)
            relicParticleAt(victim,'minecraft:sculk_soul',82,1.40)
            relicParticleAt(victim,'minecraft:large_smoke',32,1.05)
            relicPlay(player,'minecraft:block.sculk_shrieker.shriek',0.36,0.60)
          }
          relicParticleAt(victim,'minecraft:sonic_boom',1,0.0)
          relicPlay(player,'minecraft:entity.warden.sonic_charge',0.20,0.68)
        }
      }
      else if(id=='war_god_oath'){
        relicWarHit(player,victim,res)
      }
      else if(id=='tide_king_command'){
        relicApplyEffectToTarget(player,victim,'minecraft:slowness',3+res,Math.min(2,res))
        if(res>=2)relicApplyEffectToTarget(player,victim,'minecraft:weakness',3+res,res>=3?1:0)
      }

      // 月后不要求手持；闪避后得到的“月返”由下一次攻击消费。
      if(relicMoonHelmetWorn(player)){
        var moonRes=relicResonance(player,'moon_queen_gaze')
        relicMoonRiposte(player,victim,moonRes)
        if(moonRes>=3)relicMoonEclipse(player,victim)
      }
    }

    if(victim&&victim.isPlayer&&victim.isPlayer()){
      // 虚空之母：相位存在期间直接拒绝伤害事件。
      if(Number(victim.persistentData.getLong('voidMotherUntil'))>Date.now()){
        event.cancel()
        var voidCue=Number(victim.persistentData.getLong('voidMotherCueLast'))
        if(Date.now()-voidCue>350){
          victim.persistentData.putLong('voidMotherCueLast',Date.now())
          relicParticleAt(victim,'minecraft:reverse_portal',9,0.30)
          relicPlay(victim,'minecraft:entity.enderman.teleport',0.12,1.55)
        }
        return
      }
      // 斗神满命：真正的事件级无敌，直接取消伤害事件。
      if(relicWarInvincible(victim)){
        event.cancel()
        var warGuardLast=Number(victim.persistentData.getLong('warGodInvincibleCueLast'))
        if(Date.now()-warGuardLast>280){
          victim.persistentData.putLong('warGodInvincibleCueLast',Date.now())
          relicParticleAt(victim,'minecraft:crit',4,0.26)
          relicPlay(victim,'luokixivisuals:relic_war_hit',0.40,0.76)
        }
        return
      }

      // 风王：共鸣后连坠落和高速撞墙也被视为“道路”，不再结算伤害。
      if(relicWindWorn(victim)){
        var wr=relicResonance(victim,'wind_king_release'),dtype=relicDamageType(event)
        var fallLike=dtype.indexOf('fall')>=0
        var wallLike=dtype.indexOf('fly_into_wall')>=0||dtype.indexOf('in_wall')>=0
        if((wr>=1&&fallLike)||(wr>=2&&wallLike)){
          event.cancel()
          relicParticleAt(victim,'minecraft:cloud',5+wr,0.30)
          relicPlay(victim,'luokixivisuals:relic_wind_hit',0.44,1.08)
          return
        }
      }

      // 月后：让攻击落进月影；共鸣后闪避会生成一次反击权。
      if(relicMoonHelmetWorn(victim)){
        var mr=relicResonance(victim,'moon_queen_gaze')
        var dodge=mr>=3?0.50:(mr==2?0.38:(mr==1?0.28:0.18))
        if(Math.random()<dodge){
          event.cancel()
          victim.server.runCommandSilent('effect give '+victim.username+' minecraft:invisibility '+(mr>=3?4:2)+' 0 true')
          victim.server.runCommandSilent('effect give '+victim.username+' minecraft:slow_falling 4 0 true')
          if(mr>=1)victim.persistentData.putLong('moonQueenRiposteUntil',Date.now()+5000)
          relicParticleAt(victim,'minecraft:reverse_portal',20+mr*5,0.38)
          relicParticleAt(victim,'minecraft:end_rod',12+mr*4,0.30)
          relicPlay(victim,'luokixivisuals:relic_moon_hit',0.44,1.05)
          if(mr>=3&&event.source&&event.source.actual){
            try{
              var moonAttacker=event.source.actual
              if(moonAttacker){
                relicApplyEffectToTarget(victim,moonAttacker,'minecraft:darkness',4,0)
                relicApplyEffectToTarget(victim,moonAttacker,'minecraft:weakness',4,1)
              }
            }catch(ignoredMoonAttacker){}
          }
          return
        }
      }

      var pid=relicMainHandId(victim),oid=relicOffHandId(victim),guard=(pid=='hearth_guard'||oid=='hearth_guard')
      if(guard){
        var gr=relicResonance(victim,'hearth_guard')
        var hp=relicToDouble(victim.getHealth(),0),dmg=relicToDouble(event.amount,0)
        if(gr>=3&&hp>0&&dmg>=hp&&relicHearthSanctuary(victim)){
          event.cancel()
          return
        }
        var blockChance=gr>=3?0.55:(gr==2?0.42:(gr==1?0.30:0.18))
        if(Math.random()<blockChance){
          event.cancel()
          victim.server.runCommandSilent('effect give '+victim.username+' minecraft:absorption '+(5+gr*2)+' '+(gr>=2?2:1)+' true')
          victim.server.runCommandSilent('effect give '+victim.username+' minecraft:fire_resistance 12 0 true')
          if(gr>=1)victim.server.runCommandSilent('effect give '+victim.username+' minecraft:regeneration 3 '+(gr>=2?1:0)+' true')
          if(gr>=2){
            victim.server.runCommandSilent('execute at '+victim.username+' run effect give @a[distance=..5] minecraft:resistance 4 1 true')
            victim.server.runCommandSilent('execute at '+victim.username+' run effect give @a[distance=..5] minecraft:regeneration 4 0 true')
          }
          relicPlay(victim,'luokixivisuals:relic_hearth_hit',0.62,0.94)
          relicPlay(victim,'minecraft:item.shield.block',0.18,0.82)
          relicParticleAt(victim,'minecraft:flame',12+gr*5,0.34)
          if(gr>=3&&event.source&&event.source.actual){try{var a=event.source.actual;if(a)relicSetFireBy(victim,a,12,'hearth_guard')}catch(ignored3){}}
          return
        }
      }

      // 日王：持有时，打你的人也会被日光烫回去。
      var sunHeld=(pid=='sun_king_favor'||oid=='sun_king_favor')
      if(sunHeld&&event.source&&event.source.actual){
        try{
          var a2=event.source.actual
          if(a2){
            var sr=relicResonance(victim,'sun_king_favor')
            relicSetFireBy(victim,a2,8+sr*4,'sun_king_favor')
            relicParticleAt(a2,'minecraft:flame',10+sr*4,0.28)
            relicPlay(victim,'minecraft:item.firecharge.use',0.20,1.14)
          }
        }catch(ignored4){}
      }

    }
  }catch(error){console.log('[OracleRelics] hurt effect failed: '+error)}
})

// 潮王主动召潮：右键才扫描附近实体，不做后台水域扫描。
ItemEvents.rightClicked('minecraft:trident',function(event){
  try{
    var p=event.player;if(!p||relicMainHandId(p)!='tide_king_command')return
    var res=relicResonance(p,'tide_king_command')
    var now=Date.now(),last=Number(p.persistentData.getLong('tideKingCallLast'))
    var cooldown=res>=3?12000:(20000-res*2500)
    if(last>0&&now-last<cooldown)return
    p.persistentData.putLong('tideKingCallLast',now)

    var radius=res>=3?30:(18+res*4),step=res>=3?4.0:2.2
    var types=['minecraft:cod','minecraft:salmon','minecraft:pufferfish','minecraft:tropical_fish'],i=0
    for(i=0;i<types.length;i++)p.server.runCommandSilent('execute at '+p.username+' as @e[type='+types[i]+',distance=..'+radius+'] at @s facing entity '+p.username+' eyes run tp @s ^ ^ ^'+step)

    if(res>=2){
      var reverse=relicPlayerSneaking(p),move=reverse?(-step):step,combatRadius=res>=3?18:12,limit=res>=3?40:28
      p.server.runCommandSilent('execute at '+p.username+' as @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+combatRadius+',limit='+limit+'] at @s facing entity '+p.username+' eyes run tp @s ^ ^ ^'+move)
      p.server.runCommandSilent('execute at '+p.username+' run effect give @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+combatRadius+',limit='+limit+'] minecraft:slowness 5 '+(res>=3?3:1)+' true')
      p.server.runCommandSilent('execute at '+p.username+' run effect give @e['+ORACLE_RELIC_LIVING_SELECTOR+',distance=..'+combatRadius+',limit='+limit+'] minecraft:weakness 5 '+(res>=3?2:0)+' true')
    }

    p.server.runCommandSilent('effect give '+p.username+' minecraft:water_breathing '+(14+res*5)+' 0 true')
    p.server.runCommandSilent('effect give '+p.username+' minecraft:dolphins_grace '+(12+res*5)+' '+(res>=3?1:0)+' true')
    p.server.runCommandSilent('effect give '+p.username+' minecraft:strength '+(10+res*3)+' '+(res>=3?2:(res>=1?1:0))+' true')
    p.server.runCommandSilent('effect give '+p.username+' minecraft:conduit_power '+(14+res*5)+' '+(res>=3?2:(res>=2?1:0))+' true')
    if(res>=2)p.server.runCommandSilent('effect give '+p.username+' minecraft:regeneration '+(8+res*2)+' '+(res>=3?2:1)+' true')
    if(res>=3){
      p.server.runCommandSilent('effect give '+p.username+' minecraft:resistance 14 2 true')
      p.server.runCommandSilent('effect give '+p.username+' minecraft:absorption 14 3 true')
      p.server.runCommandSilent('execute at '+p.username+' run particle minecraft:bubble_column_up ~ ~1 ~ 3.2 1.5 3.2 0.18 135 force')
      p.server.runCommandSilent('execute at '+p.username+' run particle minecraft:splash ~ ~1 ~ 2.6 0.9 2.6 0.20 100 force')
      p.server.runCommandSilent('execute at '+p.username+' run particle minecraft:nautilus ~ ~1 ~ 2.1 1.2 2.1 0.12 60 force')
      relicPlay(p,'minecraft:entity.elder_guardian.curse',0.22,0.74)
      relicPlay(p,'minecraft:block.conduit.activate',0.54,0.68)
    }else{
      p.server.runCommandSilent('execute at '+p.username+' run particle minecraft:bubble ~ ~1 ~ 1.4 0.9 1.4 0.10 54 force')
      p.server.runCommandSilent('execute at '+p.username+' run particle minecraft:splash ~ ~1 ~ 1.2 0.7 1.2 0.09 38 force')
    }
    relicPlay(p,'luokixivisuals:relic_tide_hit',0.64,res>=3?0.82:0.94)
    relicPlay(p,'minecraft:block.conduit.ambient.short',0.12,1.02)
    if(res>=2)p.tell(Text.aqua(relicPlayerSneaking(p)?'✦ 逆潮：潮水从你身边炸开，附近生灵被强行推离。':'✦ 召潮：附近生灵正在被潮心拖向你。'))
    if(res>=3)p.tell(Text.aqua('✦ 王潮已经起来了。现在连陆地上的东西也要向潮王低头。'))
  }catch(error){console.log('[OracleRelics] tide active failed: '+error)}
})

// 雨母主动丰年：潜行右键遗物才触发，带冷却。
ItemEvents.rightClicked('minecraft:wooden_hoe',function(event){
  try{
    var p=event.player;if(!p||relicMainHandId(p)!='rain_mother_gift'||!relicPlayerSneaking(p))return
    event.cancel()
    relicRainHarvestWave(p,relicResonance(p,'rain_mother_gift'))
  }catch(error){console.log('[OracleRelics] rain harvest wave failed: '+error)}
})

// 土父：共鸣 II 起，潜行右键镐发动震地；满命强化为山脉起身。
ItemEvents.rightClicked('minecraft:stone_pickaxe',function(event){
  try{
    var p=event.player;if(!p||relicMainHandId(p)!='earth_father_order'||!relicPlayerSneaking(p))return
    var res=relicResonance(p,'earth_father_order')
    if(res<2)return
    event.cancel()
    relicEarthQuake(p,res)
  }catch(error){console.log('[OracleRelics] earth quake failed: '+error)}
})

// 死神不再需要手动武装死刑令：献血达到阈值后，会直接认领当前猎物。

// 四星禁忌道具
//
// V10.3：不再拿普通原版物品 + NBT 硬装成特殊物品。
// 每件禁忌道具现在都有独立 kubejs:* 注册 ID；事件按真实物品 ID 直达，避免右键链和 NBT 判定互相吞事件。
// 弑神图腾尤其不能再用 minecraft:totem_of_undying 作为实体壳，否则原版图腾会先消费整件物品。
var ORACLE_FORBIDDEN_FRUIT_UUID='79d0d89b-7f2a-4cff-b681-9a3f50a1d412'
var ORACLE_SPECIAL_USE_DEBOUNCE=180

function specialIdFromStack(stack){
  if(!stack)return ''
  var nbtId=relicItemNbtString(stack,'DivineSpecial')
  if(nbtId&&ORACLE_SPECIAL_ITEMS[nbtId])return nbtId
  var itemId=''
  try{itemId=String(stack.id)}catch(ignored){}
  var id=''
  for(id in ORACLE_SPECIAL_ITEMS)if(ORACLE_SPECIAL_ITEMS.hasOwnProperty(id)&&ORACLE_SPECIAL_ITEMS[id].item==itemId)return id
  return ''
}

function specialIsCustomStack(stack,id){
  if(!stack||!id||!ORACLE_SPECIAL_ITEMS[id])return false
  try{return String(stack.id)==ORACLE_SPECIAL_ITEMS[id].item}catch(ignored){return false}
}

function specialConsumeCurrent(event,player,id){
  if(!player||!player.server||!id||!ORACLE_SPECIAL_ITEMS[id])return false
  var stack=null,itemId=''
  try{stack=event.item;itemId=String(stack.id)}catch(ignored){}
  try{
    if(itemId==ORACLE_SPECIAL_ITEMS[id].item){
      return player.server.runCommandSilent('clear '+player.username+' '+ORACLE_SPECIAL_ITEMS[id].item+' 1')>0
    }
    var legacy=ORACLE_SPECIAL_LEGACY_ITEMS[id]
    if(legacy&&itemId==legacy&&relicItemNbtString(stack,'DivineSpecial')==id){
      return player.server.runCommandSilent('clear '+player.username+' '+legacy+'{DivineSpecial:"'+id+'"} 1')>0
    }
  }catch(ignored2){}
  return false
}

function specialUseReady(player,id){
  if(!player||!id)return false
  var now=Date.now(),key='oracleSpecialUse_'+id,last=0
  try{last=Number(player.persistentData.getLong(key))}catch(ignored){}
  if(last>0&&now-last<ORACLE_SPECIAL_USE_DEBOUNCE)return false
  try{player.persistentData.putLong(key,now)}catch(ignored2){}
  return true
}

function specialCancel(event){try{event.cancel()}catch(ignored){}}

function specialForbiddenFruit(player){
  if(!player||!player.server)return false
  try{player.server.runCommandSilent('attribute '+player.username+' minecraft:generic.max_health modifier remove '+ORACLE_FORBIDDEN_FRUIT_UUID)}catch(ignored){}
  var current=relicMaxHealth(player),delta=Math.max(0,120-current)
  if(delta>0)try{player.server.runCommandSilent('attribute '+player.username+' minecraft:generic.max_health modifier add '+ORACLE_FORBIDDEN_FRUIT_UUID+' forbidden_fruit '+delta+' add')}catch(ignored2){}
  var token=player.persistentData.getInt('forbiddenFruitToken')+1
  player.persistentData.putInt('forbiddenFruitToken',token)
  player.persistentData.putLong('forbiddenFruitUntil',Date.now()+120000)
  player.server.runCommandSilent('effect give '+player.username+' minecraft:instant_health 1 20 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 20 1 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 120 3 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 300 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:fire_resistance 300 0 true')
  relicPlay(player,'minecraft:entity.generic.eat',0.72,0.58)
  relicPlay(player,'minecraft:block.beacon.activate',0.34,0.82)
  relicParticleAt(player,'minecraft:enchanted_hit',42,0.48)
  relicParticleAt(player,'minecraft:heart',18,0.44)
  player.tell(Text.lightPurple('✦ 禁忌果实融进血里。两分钟内，凡人的生命上限被强行推向 120。'))
  player.server.scheduleInTicks(2400,function(){
    try{
      if(player.persistentData.getInt('forbiddenFruitToken')!=token)return
      if(Number(player.persistentData.getLong('forbiddenFruitUntil'))>Date.now())return
      player.server.runCommandSilent('attribute '+player.username+' minecraft:generic.max_health modifier remove '+ORACLE_FORBIDDEN_FRUIT_UUID)
      if(relicToDouble(player.getHealth(),0)>relicMaxHealth(player))player.setHealth(relicMaxHealth(player))
      player.tell(Text.darkPurple('禁忌果实留下的第二颗心脏慢慢停了。'))
    }catch(ignoredEnd){}
  })
  return true
}

function specialPassable(level,x,y,z){
  try{
    var id=String(level.getBlock(Math.floor(x),Math.floor(y),Math.floor(z)).id)
    if(id=='minecraft:air'||id=='minecraft:cave_air'||id=='minecraft:void_air'||id=='minecraft:water')return true
    if(id=='minecraft:tall_grass'||id=='minecraft:grass'||id=='minecraft:fern'||id=='minecraft:large_fern'||id=='minecraft:vine'||id=='minecraft:glow_lichen')return true
  }catch(ignored){}
  return false
}

function specialVoidBlink(player){
  if(!player||!player.server)return false
  var p=relicPos(player),yaw=0,pitch=0
  try{yaw=relicToDouble(player.getYRot(),0)}catch(ignored){try{yaw=relicToDouble(player.yRot,0)}catch(ignored2){}}
  try{pitch=relicToDouble(player.getXRot(),0)}catch(ignored3){try{pitch=relicToDouble(player.xRot,0)}catch(ignored4){}}
  var yr=yaw*Math.PI/180,pr=pitch*Math.PI/180
  var dx=-Math.sin(yr)*Math.cos(pr),dz=Math.cos(yr)*Math.cos(pr),dy=-Math.sin(pr)
  var best={x:p.x,y:p.y,z:p.z},d=0
  for(d=0.75;d<=10.0;d+=0.50){
    var x=p.x+dx*d,y=p.y+dy*d,z=p.z+dz*d
    if(!specialPassable(player.level,x,y,z)||!specialPassable(player.level,x,y+1.6,z))break
    best={x:x,y:y,z:z}
  }
  try{
    player.server.runCommandSilent('tp '+player.username+' '+best.x.toFixed(3)+' '+best.y.toFixed(3)+' '+best.z.toFixed(3)+' '+yaw.toFixed(2)+' '+pitch.toFixed(2))
    return true
  }catch(error){return false}
}

function specialVoidMother(player){
  if(!player||!player.server)return false
  // V10.6.0：真正的事件级无敌与 UI/effect 时长统一为 25 秒。
  // 重复触发只把结束时间重置为“当前时间 +25 秒”，不累加时长，避免异常永久无敌。
  var durationSeconds=25
  player.persistentData.putLong('voidMotherUntil',Date.now()+durationSeconds*1000)
  player.server.runCommandSilent('effect give '+player.username+' minecraft:invisibility '+durationSeconds+' 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:speed '+durationSeconds+' 2 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:slow_falling '+durationSeconds+' 0 true')
  specialVoidBlink(player)
  relicPlay(player,'luokixivisuals:earth_banish',0.70,1.00)
  relicParticleAt(player,'minecraft:reverse_portal',60,0.60)
  player.tell(Text.darkPurple('✦ 虚空之母把你从现实表面擦去了二十五秒。'))
  return true
}

function specialDragonBlood(player){
  if(!player||!player.server)return false
  try{player.addXP(30970)}catch(ignoredXp){player.server.runCommandSilent('experience add '+player.username+' 30970 points')}
  player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration 12 2 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 20 1 true')
  relicPlay(player,'minecraft:entity.generic.drink',0.88,0.62)
  relicPlay(player,'minecraft:entity.ender_dragon.growl',0.18,0.52)
  relicParticleAt(player,'minecraft:dragon_breath',54,0.52)
  player.tell(Text.darkRed('✦ 古龙真血烧过喉咙。庞大的经验像熔岩一样灌进身体。'))
  return true
}

function specialHunterOil(player){
  if(!player||!player.server)return false
  player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 90 3 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 90 1 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:haste 90 2 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:resistance 90 1 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:absorption 90 2 true')
  relicPlay(player,'minecraft:entity.generic.drink',0.65,0.74)
  relicPlay(player,'minecraft:entity.ravager.roar',0.18,1.18)
  relicParticleAt(player,'minecraft:crit',42,0.46)
  player.tell(Text.red('✦ 猎神圣油开始发热。九十秒内，猎物最好别让你追上。'))
  return true
}

function specialWorldwalker(player){
  if(!player||!player.server)return false
  player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 300 1 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:haste 300 1 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:night_vision 300 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:water_breathing 300 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:fire_resistance 300 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:slow_falling 300 0 true')
  player.server.runCommandSilent('effect give '+player.username+' minecraft:luck 300 1 true')
  relicPlay(player,'minecraft:block.end_portal.spawn',0.44,1.18)
  relicParticleAt(player,'minecraft:end_rod',58,0.65)
  player.tell(Text.aqua('✦ 诸界远征印被撕开。五分钟内，世界的大部分边界都会暂时把你当成过路人。'))
  return true
}

function specialActivate(event,route){
  try{
    var p=event.player,stack=event.item
    if(!p||!stack)return false
    var id=specialIdFromStack(stack)
    if(!id||id=='godslayer_totem')return false
    if(!specialUseReady(p,id))return true

    // 所有 V10.3 禁忌道具都是独立物品；先取消原版交互，再精确消耗自己的 ID。
    specialCancel(event)
    if(!specialConsumeCurrent(event,p,id))return false

    if(id=='forbidden_fruit')return specialForbiddenFruit(p)
    if(id=='void_mother_pearl')return specialVoidMother(p)
    if(id=='dragon_blood')return specialDragonBlood(p)
    if(id=='hunter_oil')return specialHunterOil(p)
    if(id=='worldwalker_seal')return specialWorldwalker(p)
  }catch(error){console.log('[OracleRelics] special activation failed: '+error)}
  return false
}

function specialRegisterUseHandlers(itemId){
  ItemEvents.rightClicked(itemId,function(event){specialActivate(event,'air')})
  ItemEvents.entityInteracted(itemId,function(event){specialActivate(event,'entity')})
}

specialRegisterUseHandlers('kubejs:forbidden_fruit')
specialRegisterUseHandlers('kubejs:void_mother_gift')
specialRegisterUseHandlers('kubejs:dragon_blood')
specialRegisterUseHandlers('kubejs:hunter_oil')
specialRegisterUseHandlers('kubejs:worldwalker_seal')

// 旧版物品只为迁移期保留右键兼容；新抽到的不会再使用这些原版实体壳。
specialRegisterUseHandlers('minecraft:apple')
specialRegisterUseHandlers('minecraft:ender_pearl')
specialRegisterUseHandlers('minecraft:potion')
specialRegisterUseHandlers('minecraft:honey_bottle')
specialRegisterUseHandlers('minecraft:heart_of_the_sea')

BlockEvents.rightClicked(function(event){
  try{specialActivate(event,'block')}catch(error){console.log('[OracleRelics] special block-use failed: '+error)}
})

function specialMigrateLegacy(player,announce){
  if(!player||!player.server)return 0
  var total=0,id=''
  for(id in ORACLE_SPECIAL_LEGACY_ITEMS){
    if(!ORACLE_SPECIAL_LEGACY_ITEMS.hasOwnProperty(id))continue
    var legacy=ORACLE_SPECIAL_LEGACY_ITEMS[id],count=0
    try{count=player.server.runCommandSilent('clear '+player.username+' '+legacy+'{DivineSpecial:"'+id+'"}')}catch(ignored){}
    if(count<=0)continue
    var i=0
    for(i=0;i<count;i++)player.give(specialStack(id,1,id=='godslayer_totem'?5:null))
    total+=count
  }
  if(announce&&total>0)player.tell(Text.gold('✦ '+total+' 件旧式禁忌道具已经换成真正的独立神物。'))
  return total
}

function godslayerRescue(event,p){
  if(!p||!p.server)return false
  var stack=p.mainHandItem,slot='weapon.mainhand'
  if(!stack||String(stack.id)!='kubejs:godslayer_totem'){
    stack=p.offHandItem
    slot='weapon.offhand'
  }
  if(!stack||String(stack.id)!='kubejs:godslayer_totem')return false
  var charges=relicItemNbtInt(stack,'DivineCharges',5)
  if(charges<=0)return false

  var now=Date.now(),last=Number(p.persistentData.getLong('godslayerReviveLast'))
  if(last>0&&now-last<250)return false
  p.persistentData.putLong('godslayerReviveLast',now)
  p.persistentData.putLong('godslayerPreventStripUntil',now+1500)

  event.cancel()
  var next=charges-1
  if(next<=0)p.server.runCommandSilent('item replace entity '+p.username+' '+slot+' with minecraft:air')
  else p.server.runCommandSilent('item replace entity '+p.username+' '+slot+' with kubejs:godslayer_totem'+specialNbt('godslayer_totem',next)+' 1')

  try{p.setHealth(Math.min(relicMaxHealth(p),Math.max(20,relicMaxHealth(p)*0.45)))}catch(ignoredHealth){p.server.runCommandSilent('effect give '+p.username+' minecraft:instant_health 1 8 true')}
  p.server.runCommandSilent('effect give '+p.username+' minecraft:regeneration 12 2 true')
  p.server.runCommandSilent('effect give '+p.username+' minecraft:absorption 18 3 true')
  p.server.runCommandSilent('effect give '+p.username+' minecraft:fire_resistance 18 0 true')
  p.server.runCommandSilent('effect give '+p.username+' minecraft:resistance 6 2 true')
  relicPlay(p,'minecraft:item.totem.use',1.0,0.74)
  relicPlay(p,'minecraft:entity.warden.sonic_boom',0.18,1.28)
  relicParticleAt(p,'minecraft:totem_of_undying',88,0.62)
  p.tell(Text.gold(next>0?'✦ 死亡被弑神图腾顶了回去。裂纹还剩 '+next+'/5。':'✦ 第五道裂纹闭合。图腾替你赢完了最后一次。'))
  return true
}

// 安装 LuokixiVisuals 后由 Forge 层接管：主/副手、原版恢复数据、35 号完整动画都在 Mod 内完成。
// 这里只保留“漏装 Mod 时”的旧式应急回退，避免同一次死亡被两个系统重复处理。
EntityEvents.death(function(event){
  try{
    try{if(Platform.isLoaded('luokixivisuals'))return}catch(ignoredModCheck){}
    var p=event.entity
    if(!p||!p.isPlayer||!p.isPlayer())return
    godslayerRescue(event,p)
  }catch(error){console.log('[OracleRelics] godslayer death rescue failed: '+error)}
})

function relicOnKill(player,entity){
  if(!player||!entity)return
  var id=relicMainHandId(player),res=id?relicResonance(player,id):0

  // 死神刀数记录在持有者自身；普通击杀不会清空刀数，只有正式处决成功才归零。

  if(id=='war_god_oath'){
    var kills=player.persistentData.getInt('warGodRelicKills')+1
    player.persistentData.putInt('warGodRelicKills',kills)
    player.server.runCommandSilent('effect give '+player.username+' minecraft:regeneration '+(3+res)+' '+(res>=2?1:0)+' true')
    player.server.runCommandSilent('effect give '+player.username+' minecraft:saturation 1 0 true')
    relicPlay(player,'minecraft:entity.player.attack.crit',0.30,0.68)
    if(res>=2&&kills%3==0){
      player.server.runCommandSilent('effect give '+player.username+' minecraft:strength 6 '+(res>=3?3:2)+' true')
      player.server.runCommandSilent('effect give '+player.username+' minecraft:speed 6 '+(res>=3?2:1)+' true')
      relicParticleAt(player,'minecraft:crit',36+res*5,0.52)
    }
  }

  if(id=='sun_king_favor'&&res>=3&&relicIsHostile(entity)){
    var tribute=player.persistentData.getInt('sunKingTributeKills')+1
    if(tribute>=20){
      tribute-=20
      var bonus=player.persistentData.getInt('sunKingPermanentHealth')
      if(bonus<ORACLE_SUN_HEALTH_CAP){
        bonus+=10
        if(bonus>ORACLE_SUN_HEALTH_CAP)bonus=ORACLE_SUN_HEALTH_CAP
        player.persistentData.putInt('sunKingPermanentHealth',bonus)
        relicApplySunHealth(player)
        relicPlay(player,'minecraft:ui.toast.challenge_complete',0.34,1.42)
        relicParticleAt(player,'minecraft:end_rod',38,0.52)
        player.tell(Text.gold('✦ 日王记下了这场胜利：永久最大生命 +10。当前额外 +'+bonus+' / +'+ORACLE_SUN_HEALTH_CAP+'。'))
      }
    }
    player.persistentData.putInt('sunKingTributeKills',tribute)
  }

  if(id=='fire_god_ember'&&res>=2){
    relicAoeDamage(player,entity,res>=3?6:4,res>=3?10:6,18)
    if(res>=3){
      relicParticleAt(entity,'minecraft:ash',7,0.48)
      relicParticleAt(entity,'minecraft:large_smoke',4,0.42)
    }else{
      relicParticleAt(entity,'minecraft:flame',7,0.42)
      relicParticleAt(entity,'minecraft:smoke',3,0.34)
    }
  }
}

var ORACLE_RELIC_DROP_WORDS = {
  rain_mother_gift:['别把长桌上的东西往泥里扔。','捡起来。浪费粮食这件事，维尔娜很少笑得出来。','你可以不种田，但别糟蹋她给你的收成。','再松一次手，下一场雨就只下在你头上。'],
  wind_king_release:['自由不是把羽衣扔进沟里。','路你可以不走，风王给你的路别这样丢。','捡起来。七条路都看见你刚才那个动作了。','再扔一次，埃奥伦就让风亲自把你吹回来。'],
  tide_king_command:['王的号令不是漂流物。','捡起来。海底已经有人在笑你了。','再把它扔下，下一道浪先找你。','奈瑞昂把潮水借给你，不是让你拿来练抛物线的。'],
  hearth_guard:['它替你挡过死路，你却想把它扔在地上？','捡起来。家门口没有主动丢盾的规矩。','炉火脾气很好，但也没好到看你糟蹋活路。','真不想要？先回头看看还有没有人在等你回家。'],
  fire_god_ember:['扔？行。下一团火可以先从你的袖口开始。','捡起来。吾的火不是你烧完就倒掉的灰。','地面接得住它，你未必接得住吾的脾气。','再松手一次，吾就当你在主动献一只手。'],
  earth_father_order:['山不会因为你松手就忘了你。','捡起来。你脚下这块地已经替土父记下了。','石头有耐心，祂没有。','扔吧。然后看看下一步地面还肯不肯托住你。'],
  sun_king_favor:['嘉奖掉进泥里？索拉恩今天算开眼了。','抬头。正午还在看。捡起来。','日王给出去的光，没有“退回”这回事。','再扔一次，祂会让你亮到连影子都躲不掉。'],
  moon_queen_gaze:['银冠不该这样落地。','夜会替你藏秘密，不会替你捡东西。','露娜娅看见了。最好别让她再看第二次。','捡起来。月光已经停在那里等你了。'],
  death_god_register:['哈哈……扔吾的宝贝？你胆子倒比猎物大。','捡起来。名册很空，吾不介意先写持有者。','你把镰扔地上，是在提醒吾谁的手最碍事吗？','再松一次。吾保证下一句会比“捡起来”短。'],
  abyss_god_echo:['掉下去？不。下面只是把它递回来了。','松手也没用。奈瑟已经听见你了。','你以为把镰扔掉，身后的东西就会停止呼吸？','捡起来。深处刚刚笑了一声。'],
  war_god_oath:['把铁誓丢掉的人，铁册只记一个词：逃兵。','捡起来。瓦尔卡恩不接受投降这个动作。','剑落地很好听——前提是下一声不是你跪下。','再松手一次，斗神就当你自己退出这场战斗。'],
  thunder_god_verdict:['木棍？你再这么叫一次试试。','扔得不错。要不要吾让雷把它送回你头上？','天罚没有“丢弃”这个选项。','捡起来。不然下一道雷会按你的坐标找失物。']
}
function relicDropAnger(player,id){
  var relic=relicFind(id);if(!player||!relic)return
  var last=Number(player.persistentData.getLong('relicDropAnger_'+id));if(Date.now()-last<700)return
  player.persistentData.putLong('relicDropAnger_'+id,Date.now())
  var lines=ORACLE_RELIC_DROP_WORDS[id]||['神物没有接受你的松手。']
  var line=lines[Math.floor(Math.random()*lines.length)]
  relicTell(player,[{text:(relic.deity||'某位神明')+' · ',color:relic.color,bold:true},{text:line,color:'gray',italic:true}])
  var a=ORACLE_RELIC_AWAKENING[id]
  relicPlay(player,a&&a.sound?a.sound:'minecraft:block.amethyst_block.resonate',0.28,0.66)
}
ItemEvents.dropped(function(event){
  try{
    var p=event.player,item=event.item,id=relicResolveId(relicItemNbtString(item,'DivineRelic'))
    if(!p||!id||!relicFind(id))return
    event.cancel()
    relicDropAnger(p,id)
  }catch(error){console.log('[OracleRelics] drop binding failed: '+error)}
})

function relicPhysicalCount(player,id){
  if(!player||!player.server)return 0
  id=relicResolveId(id);var relic=relicFind(id),forms=[],i=0,total=0
  if(relic&&relic.item)forms.push(String(relic.item))
  var old=ORACLE_RELIC_PREVIOUS_FORMS[id]||[]
  for(i=0;i<old.length;i++)if(forms.indexOf(old[i])<0)forms.push(old[i])
  for(i=0;i<forms.length;i++){
    try{var n=player.server.runCommandSilent('clear '+player.username+' '+forms[i]+'{DivineRelic:"'+id+'"} 0');if(n>0)total+=n}catch(ignored){}
  }
  return total
}
function relicReclaim(player,id,silent){
  if(!player)return false
  id=relicResolveId(id);var relic=relicFind(id)
  if(!relic||!relicOwned(player,id)){if(!silent)player.tell(Text.darkGray('这座神龛没有认出你的名字。'));return false}
  if(relicPhysicalCount(player,id)>0){if(!silent)player.tell(Text.gray('「'+relicDisplayName(relic,relicResonance(player,id))+'」仍在你身上，神龛没有再造第二件。'));return false}
  relicGiveStack(player,relicStack(relic,relicResonance(player,id)),relicDisplayName(relic,relicResonance(player,id))+' · 神龛召回')
  if(!silent){relicTell(player,[{text:'✦ ',color:relic.color,bold:true},{text:relicDisplayName(relic,relicResonance(player,id)),color:'gold',bold:true},{text:' 从神龛阴影里重新落回你的手中。',color:'gray'}]);relicPlay(player,'minecraft:block.respawn_anchor.set_spawn',0.30,1.12)}
  return true
}
function relicReclaimAll(player){
  if(!player)return 0
  var count=0,i=0
  for(i=0;i<ORACLE_RELICS.length;i++)if(relicOwned(player,ORACLE_RELICS[i].id)&&relicPhysicalCount(player,ORACLE_RELICS[i].id)<=0)if(relicReclaim(player,ORACLE_RELICS[i].id,true))count++
  if(count>0){player.tell(Text.gold('✦ 神龛归还了 '+count+' 件失落遗物。'));relicPlay(player,'minecraft:block.respawn_anchor.set_spawn',0.36,1.06)}
  else player.tell(Text.gray('神龛没有发现失落的遗物。'))
  return count
}
function relicStripOnDeath(player){
  if(!player||!player.server)return
  try{if(Number(player.persistentData.getLong('godslayerPreventStripUntil'))>Date.now())return}catch(ignoredGuard){}
  var i=0
  for(i=0;i<ORACLE_RELICS.length;i++){
    var relic=ORACLE_RELICS[i]
    if(relicOwned(player,relic.id))relicRemoveOldCopy(player,relic.id)
  }
  player.persistentData.putBoolean('deathGodPrepared',false)
  player.persistentData.putString('deathGodPreparedUuid','')
}
EntityEvents.death(function(event){
  try{var p=event.entity;if(p&&p.isPlayer&&p.isPlayer())relicStripOnDeath(p)}catch(error){console.log('[OracleRelics] death return-to-domain failed: '+error)}
})

function relicMigrateLegacyPlayer(player){
  if(!player||!player.server)return
  var migrated={}
  var oldId=''
  for(oldId in ORACLE_RELIC_ALIASES){
    if(!ORACLE_RELIC_ALIASES.hasOwnProperty(oldId))continue
    var newId=ORACLE_RELIC_ALIASES[oldId]
    var had=false
    try{had=player.persistentData.getBoolean('oracleRelic_'+oldId)}catch(ignored){}
    if(!had)continue
    if(!player.persistentData.getBoolean('oracleRelic_'+newId)){
      player.persistentData.putBoolean('oracleRelic_'+newId,true)
      player.persistentData.putInt('oracleRelicResonance_'+newId,0)
      migrated[newId]=true
    }
    var oldItem=ORACLE_RELIC_LEGACY_ITEMS[oldId]
    if(oldItem)try{player.server.runCommandSilent('clear '+player.username+' '+oldItem+'{DivineRelic:"'+oldId+'"}')}catch(ignoredClear){}
    player.persistentData.putBoolean('oracleRelic_'+oldId,false)
  }
  var id=''
  for(id in migrated){
    if(!migrated.hasOwnProperty(id))continue
    var r=relicFind(id)
    if(r)relicGiveStack(player,relicStack(r,relicResonance(player,id)),relicDisplayName(r,relicResonance(player,id))+' · 旧契重认')
  }
}

// 月后夜视只在背包变化/登录/重生时检查，不做 Tick。
PlayerEvents.inventoryChanged(function(event){try{relicRefreshMoonNightVision(event.player);relicRefreshWindBlessing(event.player)}catch(ignored){}})
PlayerEvents.loggedIn(function(event){
  var p=event.player;if(!p)return
  try{if(String(p.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return}catch(ignoredFake){}
  p.server.scheduleInTicks(30,function(){try{
    relicMigrateLegacyPlayer(p);specialMigrateLegacy(p,false);relicRefreshMoonNightVision(p);relicRefreshWindBlessing(p);relicApplySunHealth(p)
    if(Number(p.persistentData.getLong('forbiddenFruitUntil'))<=Date.now())try{p.server.runCommandSilent('attribute '+p.username+' minecraft:generic.max_health modifier remove '+ORACLE_FORBIDDEN_FRUIT_UUID)}catch(ignoredFruit){}
  }catch(error){console.log('[OracleRelics] login refresh failed: '+error)}})
})
PlayerEvents.respawned(function(event){
  var p=event.player;if(!p)return
  p.server.scheduleInTicks(20,function(){try{relicRefreshMoonNightVision(p);relicRefreshWindBlessing(p);relicApplySunHealth(p)}catch(ignored){}})
})

function relicDeathStatus(player){
  if(!player)return 0
  var res=relicResonance(player,'death_god_register')
  var required=relicDeathThreshold(res),hits=relicDeathGetHits(player,required),executing=0
  try{executing=Number(player.persistentData.getLong('deathGodExecutionUntil'))>Date.now()?1:0}catch(ignored){}
  relicTell(player,[
    {text:'死神刀数 · ',color:'dark_red',bold:true},
    {text:String(hits)+' / '+String(required),color:hits>=required?'red':'gray',bold:true},
    {text:' · '+relicResText(res)+(executing?' · 处决演出中':''),color:'dark_gray'}
  ])
  return 1
}
function relicDeathTestStage(player,res){
  if(!player)return 0
  var relic=relicFind('death_god_register')
  if(!relic)return 0
  res=Math.max(0,Math.min(3,Math.floor(Number(res)||0)))
  player.persistentData.putBoolean('oracleRelic_death_god_register',true)
  player.persistentData.putInt('oracleRelicResonance_death_god_register',res)
  relicRemoveOldCopy(player,'death_god_register')
  relicGiveStack(player,relicStack(relic,res),relicDisplayName(relic,res)+' · '+relicResText(res))
  relicDeathSetHits(player,0)
  try{player.persistentData.putLong('deathGodLastHitAt',0)}catch(ignoredLast){}
  relicDeathClearExecution(player,'')
  relicTell(player,[
    {text:'[DEV] 死神测试阶段已切换 · ',color:'yellow'},
    {text:relicResText(res),color:'dark_red',bold:true},
    {text:' · 阈值 '+String(relicDeathThreshold(res))+' 刀；测试刀数已清零。',color:'gray'}
  ])
  return 1
}

function relicShow(player){
  if(!player)return
  var warLeft=Math.max(0,Number(player.persistentData.getLong('warGodInvincibleUntil'))-Date.now())
  var deathRes=relicResonance(player,'death_god_register'),deathNeed=relicDeathThreshold(deathRes),deathHits=relicDeathGetHits(player,deathNeed)
  relicTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_purple'},
    {text:'✦ 诸神遗物回廊\n',color:'gold',bold:true},
    {text:'这里没有展柜。石壁只记住曾经认出你的神物；若它在死亡、虚空或别的意外里失去形体，回廊会替你把那一道影子重新叫回来。\n\n',color:'gray',italic:true},
    {text:'金冠余辉 · +'+player.persistentData.getInt('sunKingPermanentHealth')+' 生命\n',color:'gold'},
    {text:'死神名册 · 玩家全局刀数 '+deathHits+'/'+deathNeed+' · 换目标不清零 · 最后三刀 Three→Two→One→Zero\n',color:'dark_red'},
    {text:'铁册战痕 · '+player.persistentData.getInt('warGodRelicHits')+(warLeft>0?' · 凯旋仍在 '+(Math.ceil(warLeft/100)/10)+' 秒':'')+'\n',color:'red'},
    relicButton('召回全部失落遗物','/relics reclaim all','aqua'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_purple'}
  ])
  var i=0
  for(i=0;i<ORACLE_RELICS.length;i++){
    var r=ORACLE_RELICS[i],owned=relicOwned(player,r.id),res=relicResonance(player,r.id)
    // 彩蛋在真正抽中前不占一个“空神龛”，避免回廊提前泄底。
    if(Number(r.tier)==6&&!owned)continue
    if(owned&&Number(r.tier)==6)relicTell(player,[
      {text:'\n★★★★★★ '+relicDisplayName(r,0)+' · 彩蛋级  ',color:'red',bold:true},
      relicButton('从神龛召回','/relics reclaim '+r.id,'red'),
      {text:'\n'+(r.deity||'')+' · '+(r.domain||'')+'\n',color:'dark_red'},
      {text:r.lore+'\n',color:'gray',italic:true},
      {text:relicStageAt(r,0),color:'red',bold:true}
    ])
    else if(owned)relicTell(player,[
      {text:'\n★★★★★ '+relicDisplayName(r,res)+' · '+relicResText(res)+'  ',color:r.color,bold:true},
      relicButton('从神龛召回','/relics reclaim '+r.id,'aqua'),
      {text:'\n'+(r.deity||'')+' · '+(r.domain||'')+'\n',color:'dark_gray'},
      {text:relicStageAt(r,res),color:'gray'}
    ])
    else relicTell(player,{text:'\n◇ 一座没有名字的空神龛。',color:'dark_gray',italic:true})
  }
  relicTell(player,{text:'\n\n有些东西不属于神龛。它们只在紫色命线闪过时出现一次，然后被用掉。',color:'dark_purple',italic:true})
}

ServerEvents.commandRegistry(function(event){
  var Commands=event.commands
  var relicRoot=Commands.literal('relics').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;relicShow(p);return 1})
  relicRoot.then(Commands.literal('reforge').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;relicReforgeOwned(p);return 1}))
  relicRoot.then(Commands.literal('deathstatus').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return relicDeathStatus(p)}))
  var deathTest=Commands.literal('teststage').requires(function(src){return src.hasPermission(2)})
  var deathStage=Commands.literal('death')
  ;[0,1,2,3].forEach(function(stage){deathStage.then(Commands.literal(String(stage)).executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return relicDeathTestStage(p,stage)}))})
  deathTest.then(deathStage)
  relicRoot.then(deathTest)
  var reclaim=Commands.literal('reclaim').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;relicShow(p);return 1})
  reclaim.then(Commands.literal('all').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;relicReclaimAll(p);return 1}))
  var i=0
  for(i=0;i<ORACLE_RELICS.length;i++)(function(id){reclaim.then(Commands.literal(id).executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return relicReclaim(p,id,false)?1:0}))})(ORACLE_RELICS[i].id)
  relicRoot.then(reclaim)
  event.register(relicRoot)
})

global.oracleRelicCatalog=ORACLE_RELICS
global.oracleRelicFind=relicFind
global.oracleRelicOwned=relicOwned
global.oracleRelicResonance=relicResonance
global.oracleRelicGrant=relicGrant
global.oracleRelicGrantRandom=relicGrantRandom
global.oracleRelicIdsByTier=function(tier){var out=[],i=0;for(i=0;i<ORACLE_RELICS.length;i++)if(Number(ORACLE_RELICS[i].tier)==Number(tier))out.push(ORACLE_RELICS[i].id);return out}
global.oracleRelicShow=relicShow
global.oracleRelicOnKill=relicOnKill
global.oracleRelicReforgeOwned=relicReforgeOwned
global.oracleRelicBroadcastFullResonance=relicBroadcastFullResonance
global.oracleSpecialGrant=specialGrant
global.oracleSpecialStack=specialStack
global.oracleSpecialCatalog=ORACLE_SPECIAL_ITEMS
global.oracleRelicReclaim=relicReclaim
global.oracleRelicReclaimAll=relicReclaimAll

console.log('[OracleRelics] V10.8.17A loaded - internal relic damage recursion guard; 6-star Luokixi relic and vanilla fire state preserved.')

// V10.6.5 迁移清理：旧版紫色 item_display 黑焰不再属于正式视觉。
// 只在服务器加载时清一次已加载实体，不增加任何常驻 tick。
ServerEvents.loaded(function(event){
  try{
    var server=event.server,dims=['minecraft:overworld','minecraft:the_nether','minecraft:the_end'],seen={}
    function clearDim(dim){
      dim=String(dim||'')
      if(!dim||seen[dim])return
      seen[dim]=true
      try{server.runCommandSilent('execute in '+dim+' run kill @e[type=minecraft:item_display,tag=divine_black_flame_visual]')}catch(ignoredKill){}
    }
    for(var i=0;i<dims.length;i++)clearDim(dims[i])
    try{
      var it=server.getAllLevels().iterator()
      while(it.hasNext()){
        var level=it.next(),dim=''
        try{if(level.dimension&&level.dimension.location)dim=String(level.dimension.location())}catch(ignoredLocation){}
        if(!dim)try{dim=String(level.dimension)}catch(ignoredDim){}
        clearDim(dim)
      }
    }catch(ignoredLevels){}
  }catch(error){console.log('[OracleRelics] legacy black flame cleanup failed: '+error)}
})
