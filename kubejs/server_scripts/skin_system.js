// ============================================================
// 传奇衣柜 V10.8.16 · 未解锁完全隐藏 / 神秘惊喜设定版
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.x
//
// 目标：
// - 彻底移除普通 PNG 皮肤奖池
// - 五星外观全部使用 Yes Steve Model（YSM）模型
// - 抽中模型时把 KubeJS 拥有权同步到 YSM auth；衣柜与 YSM 原生授权保持一致
// - 玩家可以立刻点击“穿上”
// - 模型文件仍由 YSM 从 auth/oracle_pool 读取；奖池清单只从 kubejs/config/ysm_oracle_pool.json 读取
// - 没有 Tick；只在脚本加载、管理员重载、登录同步、打开衣柜或抽奖时读取
// - KubeJS persistentData 记录抽奖拥有权；YSM auth 是真正的模型授权层，两者登录时双向校准为“已抽中 = 已授权”
// - V10.8.5 只加载 ysm_oracle_pool.json 中明确写了 free=false 的条目，防止以后误把自由模型塞进奖池
// - 大厅模型展示已在 V10.8.14 全部移除；本文件只负责玩家自己的收藏、授权与换装
// - 奖池模型必须放在 YSM 的 auth/oracle_pool 目录；未抽中的模型由 YSM 原生 auth 阻止穿戴
// - CanSwitchModel 改回 true：玩家可以正常打开 Alt+Y，但只能穿 YSM 已授权的 auth 模型
// - 抽中新模型后只执行两条 YSM 命令：auth add，然后 model set ... - true
// - 衣柜“换装”对已拥有者执行同样两条命令；未拥有者仍由 KubeJS 拦截
// - ysm model disable=false 只负责确保 YSM 渲染开启；脚本永远不执行 disable=true
// - 支持 YSM 实际 model_id 中包含中文、空格、斜杠与 .ysm 后缀（例如 oracle_pool/JK_Kanami v1.51.ysm）
//
// 上传目录：
//   config/yes_steve_model/auth/oracle_pool/
//
// 支持：
// - .ysm
// - .zip
// - 含 ysm.json 的文件夹格式模型
// ============================================================

var YSM_ORACLE_POOL_ROOT = 'config/yes_steve_model/auth/oracle_pool'
var YSM_ORACLE_MAIN_CONFIG = 'kubejs/config/ysm_oracle_pool.json'
var YSM_ORACLE_MAX_MODELS = 64
var YSM_DEFAULT_DUPLICATE_EMBERS = 45
var YSM_DEFAULT_DUPLICATE_TOKENS = 8
var YSM_DEFAULT_EXCHANGE_COST = 220
var YSM_ORACLE_SERVER_FORCE_WEAR = false
var YSM_ORACLE_POOL_MIGRATION = 1080
var YSM_WARDROBE_PAGE_SIZE = 5


// V10.8.5 继续按当前 15 模型池收敛授权。登录/手动 resync 时会撤销已退役模型的旧 auth 和 KubeJS 拥有权。
var YSM_ORACLE_RETIRED_MODELS = [
  {id:'roxy',modelId:'oracle_pool/洛琪希4.0.ysm',name:'洛琪希'},
  {id:'elaina',modelId:'oracle_pool/魔女之旅.伊蕾娜 1.1.ysm',name:'伊蕾娜 · 灰之魔女'},
  {id:'murasame',modelId:'oracle_pool/丛雨.ysm',name:'丛雨'},
  {id:'xitong_kimono',modelId:'oracle_pool/希瞳-和服v1.0.2.ysm',name:'希瞳 · 和服'},
  {id:'yorktown_ii',modelId:'oracle_pool/约克城_II.ysm',name:'约克城 II'},
  {id:'elaina_m',modelId:'oracle_pool/依蕾娜-m.ysm',name:'伊蕾娜 · M'},
  {id:'warden_girl',modelId:'oracle_pool/坚守者娘/minecraft_warden2.0.ysm',name:'坚守者娘'},
  {id:'li_yoba',modelId:'oracle_pool/李柚巴.ysm',name:'李柚巴'},
  {id:'lsly',modelId:'oracle_pool/lsly',name:'lsly'}
]

// 保留旧 global 名称，避免历史、抽奖、展示台之间重新改一整套接口。
// 从这一版开始，这里的“Skin”实际都代表 YSM 神话幻形。
var DIVINE_SKINS = []
var ysmPoolWarnings = []
var ysmPoolLoadedAt = 0

function ysmTell(player,json) {
  if (!player || !player.server) return
  player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json))
}

function ysmButton(text,command,color) {
  return {
    text:'[ ' + text + ' ]',
    color:color,
    bold:true,
    clickEvent:{action:'run_command',value:command},
    hoverEvent:{action:'show_text',contents:{text:text,color:'gray'}}
  }
}

function ysmHash(value) {
  var text = String(value || '')
  var hash = 0
  var i = 0
  for (i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash = hash | 0
  }
  if (hash < 0) hash = -hash
  return hash.toString(36)
}

function ysmSafeId(value) {
  var text = String(value || '').toLowerCase()
  text = text.replace(/[^a-z0-9_\-]/g,'_')
  text = text.replace(/_+/g,'_')
  text = text.replace(/^_+|_+$/g,'')
  if (!text) text = 'ysm_' + ysmHash(value)
  if (/^[0-9]/.test(text)) text = 'ysm_' + text
  return text.substring(0,64)
}

function ysmPrettyName(value) {
  var text = String(value || '')
  text = text.replace(/\.(ysm|zip)$/i,'')
  text = text.replace(/[_\-]+/g,' ')
  text = text.replace(/^\s+|\s+$/g,'')
  return text || '未命名神话幻形'
}

function ysmStem(fileName) {
  var text = String(fileName || '')
  if (/\.oracle\.json$/i.test(text)) return text.replace(/\.oracle\.json$/i,'')
  return text.replace(/\.[^.]+$/,'')
}

function ysmReadJson(path) {
  try {
    var value = JsonIO.read(String(path))
    return value || null
  } catch (error) {
    ysmPoolWarnings.push('无法读取 ' + String(path) + '：' + error)
    return null
  }
}

function ysmObjectField(object,key) {
  if (!object) return null
  try {
    var value = object[key]
    if (value !== undefined && value !== null) return value
  } catch (ignored) {}
  try {
    if (typeof object.get == 'function') {
      var mapped = object.get(key)
      if (mapped !== undefined && mapped !== null) return mapped
    }
  } catch (ignored2) {}
  return null
}

function ysmListLength(list) {
  if (!list) return 0
  try { if (typeof list.length == 'number') return list.length } catch (ignored) {}
  try { if (typeof list.size == 'function') return Number(list.size()) } catch (ignored2) {}
  return 0
}

function ysmListGet(list,index) {
  if (!list) return null
  try {
    if (typeof list.get == 'function') return list.get(index)
  } catch (ignored) {}
  try { return list[index] } catch (ignored2) {}
  return null
}

function ysmNumber(value,fallback) {
  var number = Number(value)
  if (isNaN(number)) return fallback
  return number
}

function ysmBool(value,fallback) {
  if (value === true || value === false) return value
  if (value == null) return fallback
  var text = String(value).toLowerCase()
  if (text == 'true' || text == '1' || text == 'yes' || text == 'on') return true
  if (text == 'false' || text == '0' || text == 'no' || text == 'off') return false
  return fallback
}

function ysmPlainText(value) {
  if (value === undefined || value === null) return ''
  var text = String(value).trim()

  // 兼容两种情况：
  // 1) JsonIO / Rhino 把 JSON 字符串包装成了带双引号的文本；
  // 2) 管理员从 Tab 补全里复制了带引号的 model_id。
  // model_id 本体不应该包含最外层这对引号。
  if (text.length >= 2 && text.charAt(0) == '"' && text.charAt(text.length - 1) == '"') {
    try {
      var parsed = JSON.parse(text)
      if (typeof parsed == 'string') text = parsed
    } catch (ignoredJsonString) {
      text = text.substring(1,text.length - 1)
    }
  }
  return String(text).trim()
}

function ysmNormalizeModelId(value) {
  var text = ysmPlainText(value).replace(/\\/g,'/')

  // 配置里只保存 YSM 命令真正需要的 ID，不保存磁盘根目录。
  // 即：config/yes_steve_model/auth/oracle_pool/a.ysm -> oracle_pool/a.ysm
  text = text.replace(/^\.\//,'')
  text = text.replace(/^config\/yes_steve_model\/auth\//i,'')
  text = text.replace(/^yes_steve_model\/auth\//i,'')
  text = text.replace(/^auth\//i,'')
  return text.trim()
}

function ysmNormalizeEntry(raw,fallbackModelId,fallbackName) {
  if (!raw) raw = {}

  var modelId = ysmNormalizeModelId(
    ysmObjectField(raw,'model_id') ||
    ysmObjectField(raw,'modelId') ||
    fallbackModelId || ''
  )
  if (!modelId) return null

  // YSM 的实际 model_id 可能包含中文、空格、斜杠和 .ysm 后缀。
  // 例如：oracle_pool/JK_Kanami v1.51.ysm
  // 这里只拒绝会破坏命令行的换行/空字符；空格本身是合法的。
  if (/[\r\n\u0000]/.test(modelId)) {
    ysmPoolWarnings.push('model_id 含非法控制字符，已跳过：' + modelId)
    return null
  }

  var rawId = ysmObjectField(raw,'id')
  var id = ysmSafeId(rawId || modelId)
  var rawName = ysmObjectField(raw,'name')
  var rawFeatured = ysmObjectField(raw,'featured')
  var rawEnabled = ysmObjectField(raw,'enabled')
  var rawWeight = ysmObjectField(raw,'weight')
  var rawTexture = ysmObjectField(raw,'texture')
  var rawFlavor = ysmObjectField(raw,'flavor')
  var rawDescription = ysmObjectField(raw,'description')
  var rawAuthor = ysmObjectField(raw,'author')
  var rawLicense = ysmObjectField(raw,'license')
  var rawIcon = ysmObjectField(raw,'icon_item') || ysmObjectField(raw,'iconItem')
  var rawDupEmbers = ysmObjectField(raw,'duplicate_embers') || ysmObjectField(raw,'duplicateEmbers')
  var rawDupTokens = ysmObjectField(raw,'duplicate_tokens') || ysmObjectField(raw,'duplicateTokens')
  var rawExchange = ysmObjectField(raw,'exchange_cost') || ysmObjectField(raw,'exchangeCost')
  var rawOrder = ysmObjectField(raw,'order')
  var rawEquipAnimation = ysmObjectField(raw,'equip_animation') || ysmObjectField(raw,'equipAnimation')
  var rawFree = ysmObjectField(raw,'free')

  // 奖池策略：以后只允许管理员明确标记 free=false 的模型进入。
  // 注意：YSM 真正的服务端授权锁仍来自 config/yes_steve_model/auth 目录；这个字段是奖池侧的防误加保险。
  if (rawFree === null || rawFree === undefined || ysmBool(rawFree,true) !== false) {
    ysmPoolWarnings.push('已跳过未明确 free=false 的模型：' + modelId)
    return null
  }

  var entry = {
    id:id,
    modelId:modelId,
    name:String(rawName || fallbackName || ysmPrettyName(modelId)),
    featured:false,
    enabled:ysmBool(rawEnabled,true),
    weight:Math.max(0.01,ysmNumber(rawWeight,1)),
    texture:String(rawTexture || '-'),
    flavor:String(rawFlavor || rawDescription || '一条金色命线在模型的影子里停了下来。'),
    author:String(rawAuthor || ''),
    license:String(rawLicense || ''),
    iconItem:String(rawIcon || 'minecraft:nether_star'),
    duplicateEmbers:Math.max(0,Math.floor(ysmNumber(rawDupEmbers,YSM_DEFAULT_DUPLICATE_EMBERS))),
    duplicateTokens:Math.max(0,Math.floor(ysmNumber(rawDupTokens,YSM_DEFAULT_DUPLICATE_TOKENS))),
    exchangeCost:Math.max(1,Math.floor(ysmNumber(rawExchange,YSM_DEFAULT_EXCHANGE_COST))),
    order:Math.floor(ysmNumber(rawOrder,9999)),
    equipAnimation:String(rawEquipAnimation || ''),
    free:false
  }

  return entry.enabled ? entry : null
}

function ysmCollectMainConfig(entries) {
  try {
    var data = ysmReadJson(YSM_ORACLE_MAIN_CONFIG)
    if (!data) {
      try { JsonIO.write(YSM_ORACLE_MAIN_CONFIG,{version:9,models:[]}) } catch (ignoredWrite) {}
      ysmPoolWarnings.push('奖池清单为空：' + YSM_ORACLE_MAIN_CONFIG)
      return
    }

    var list = ysmObjectField(data,'models')
    if (!list) list = data
    var length = ysmListLength(list)
    var i = 0
    for (i = 0; i < length; i++) {
      var raw = ysmListGet(list,i)
      if (!raw) continue
      var rawModelId = ysmObjectField(raw,'model_id') || ysmObjectField(raw,'modelId') || ysmObjectField(raw,'id') || ''
      var rawName = ysmObjectField(raw,'name') || ''
      var entry = ysmNormalizeEntry(raw,rawModelId,rawName)
      if (entry) entries.push(entry)
    }
  } catch (error) {
    ysmPoolWarnings.push('主清单读取失败：' + error)
  }
}

// KubeJS 2001.6.5 的 ClassFilter 会阻止 server_scripts 直接使用 java.nio.file
// 扫描任意目录。YSM 模型文件继续放在 auth/oracle_pool；KubeJS 只读取自己的
// kubejs/config/ysm_oracle_pool.json 清单，因此不再触发 ClassFilter。

function ysmReloadPool(server,runYsmReload) {
  ysmPoolWarnings = []
  var rawEntries = []
  ysmCollectMainConfig(rawEntries)

  var seenId = {}
  var seenModel = {}
  var normalized = []
  var i = 0
  for (i = 0; i < rawEntries.length; i++) {
    var entry = rawEntries[i]
    if (!entry || !entry.id || !entry.modelId) continue
    if (seenId[entry.id]) {
      ysmPoolWarnings.push('重复 id 已忽略：' + entry.id)
      continue
    }
    if (seenModel[entry.modelId]) {
      ysmPoolWarnings.push('重复 model_id 已忽略：' + entry.modelId)
      continue
    }
    seenId[entry.id] = true
    seenModel[entry.modelId] = true
    normalized.push(entry)
  }

  normalized.sort(function (a,b) {
    if (a.order != b.order) return a.order - b.order
    return String(a.name).localeCompare(String(b.name))
  })

  if (normalized.length > YSM_ORACLE_MAX_MODELS) {
    ysmPoolWarnings.push('模型超过 ' + YSM_ORACLE_MAX_MODELS + ' 个，后面的模型暂未加入命令界面。')
    normalized = normalized.slice(0,YSM_ORACLE_MAX_MODELS)
  }

  DIVINE_SKINS.length = 0
  for (i = 0; i < normalized.length; i++) DIVINE_SKINS.push(normalized[i])
  ysmPoolLoadedAt = Date.now()

  if (server && runYsmReload) {
    try { server.runCommandSilent('ysm model reload') } catch (error) {
      ysmPoolWarnings.push('YSM 模型重载命令失败：' + error)
    }
  }

  console.log('[YSMOracle] V10.8.16 mystery-wardrobe pool loaded: ' + DIVINE_SKINS.length + ' model(s), locked details=hidden, lobby display=none, warnings=' + ysmPoolWarnings.length)
  return DIVINE_SKINS.length
}

function ysmEnsurePool() {
  if (ysmPoolLoadedAt <= 0) ysmReloadPool(null,false)
}

function skinFind(id) {
  ysmEnsurePool()
  var i = 0
  for (i = 0; i < DIVINE_SKINS.length; i++) {
    if (DIVINE_SKINS[i].id == id || DIVINE_SKINS[i].modelId == id) return DIVINE_SKINS[i]
  }
  return null
}

function skinFindByIndex(index) {
  ysmEnsurePool()
  var i = Math.floor(Number(index)) - 1
  if (i < 0 || i >= DIVINE_SKINS.length) return null
  return DIVINE_SKINS[i]
}

function skinIndexOf(id) {
  ysmEnsurePool()
  var i = 0
  for (i = 0; i < DIVINE_SKINS.length; i++) if (DIVINE_SKINS[i].id == id) return i + 1
  return 0
}

function skinOwned(player,id) {
  if (!player || !id) return false
  var skin = skinFind(id)
  var key = skin ? skin.id : id
  return player.persistentData.getBoolean('oracleYsm_' + key)
}

function skinGetEmbers(player) {
  if (!player) return 0
  return player.persistentData.getInt('oracleEmbers')
}

function skinAddEmbers(player,amount) {
  if (!player || !amount) return skinGetEmbers(player)
  var next = player.persistentData.getInt('oracleEmbers') + amount
  if (next < 0) next = 0
  player.persistentData.putInt('oracleEmbers',next)
  return next
}

// 把 YSM 的字符串参数安全放进 Brigadier 命令。
// model_id 里有空格时必须带引号；中文、斜杠、点号都原样保留。
function ysmCommandArg(value) {
  var text = String(value == null ? '' : value)
  // Brigadier only accepts ASCII letters/digits plus _-.+ without quotes.
  // YSM model ids normally contain '/' and may contain Unicode, so those MUST be quoted.
  if (/^[0-9A-Za-z_.+\-]+$/.test(text)) return text
  return '"' + text.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"'
}

function skinAuth(player,skin) {
  if (!player || !player.server || !skin || !skin.modelId) return 0
  try {
    // 唯一授权路径：/ysm auth <玩家> add <模型>
    return Number(player.server.runCommandSilent('ysm auth ' + player.username + ' add ' + ysmCommandArg(skin.modelId)) || 0)
  } catch (error) {
    console.log('[YSMOracle] Auth command failed for ' + player.username + ' / ' + skin.modelId + ': ' + error)
    return 0
  }
}

function skinDeauth(player,skin) {
  if (!player || !player.server || !skin || !skin.modelId) return 0
  try {
    return Number(player.server.runCommandSilent('ysm auth ' + player.username + ' remove ' + ysmCommandArg(skin.modelId)) || 0)
  } catch (error) {
    console.log('[YSMOracle] Deauth command failed for ' + player.username + ' / ' + skin.modelId + ': ' + error)
    return 0
  }
}

function ysmBuildModelSetCommand(player,skin,ignoreAuth) {
  if (!player || !skin || !skin.modelId) return ''
  var texture = ysmPlainText(skin.texture || '-') || '-'
  var command = 'ysm model set ' + player.username + ' ' + ysmCommandArg(skin.modelId) + ' ' + ysmCommandArg(texture)
  if (ignoreAuth === true) command += ' true'
  return command
}

// 服务器脚本统一从这里切换 YSM 模型。
// V9.8.3 不再把 runCommandSilent() 的数字返回值直接解释为“model_id 不一致”。
// 对第三方 Mod 指令来说，返回码由 Mod 自己实现；0 只能记录为诊断信息，不能替 YSM 下结论。
function ysmSetModel(player,skin,ignoreAuth) {
  if (!player || !player.server || !skin || !skin.modelId) return {sent:false,code:0,command:'',error:'missing argument'}
  var command = ysmBuildModelSetCommand(player,skin,ignoreAuth)
  try {
    var code = player.server.runCommandSilent(command)
    return {sent:true,code:Number(code),command:command,error:''}
  } catch (error) {
    console.log('[YSMOracle] Model set exception for ' + player.username + ' / ' + skin.modelId + ': ' + error)
    return {sent:false,code:0,command:command,error:String(error)}
  }
}

// V9.8.3：只负责“解除 YSM disabled 状态”。
// 已通过实机确认 disable=false 会恢复普通 Alt+Y；本脚本任何路径都不会执行 disable=true。
function ysmEnablePlayerModel(player) {
  if (!player || !player.server) return 0
  try {
    return player.server.runCommandSilent('ysm model disable ' + player.username + ' false')
  } catch (error) {
    console.log('[YSMOracle] Failed to enable YSM model state for ' + player.username + ': ' + error)
    return 0
  }
}

function ysmHiddenModelIds() {
  // V10.7.5 原生授权模式不再隐藏奖池模型。Alt+Y 可以看到它们，YSM auth 自己负责锁/解锁。
  return []
}

function ysmServerConfigArray() {
  return '[]'
}

function skinShowYsmServerConfig(player) {
  if (!player) return
  ysmTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_purple'},
    {text:'✦ YSM 服务器配置 · 原生授权模式\n',color:'gold',bold:true},
    {text:'请打开：存档目录/serverconfig/yes_steve_model-server.toml\n\n',color:'gray'},
    {text:'CanSwitchModel = true\n',color:'green',bold:true},
    {text:'ClientNotDisplayModels = []\n\n',color:'aqua'},
    {text:'奖池模型必须放在 config/yes_steve_model/auth/oracle_pool/。YSM 会把 auth 目录里的模型当成授权模型；未授权玩家即使打开 Alt+Y 也不能真正穿上。\n',color:'gray'},
    {text:'抽中或在衣柜点击“换装”时，脚本只执行两条命令：/ysm auth <玩家> add <模型>，随后 /ysm model set <玩家> <模型> - true。\n',color:'light_purple'},
    {text:'以后新增奖池条目还必须在 ysm_oracle_pool.json 明确写 free:false，否则脚本会拒绝载入。\n',color:'yellow'},
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_purple'}
  ])
}

function skinRetiredContains(id) {
  var value=String(id||'')
  var i=0
  for(i=0;i<YSM_ORACLE_RETIRED_MODELS.length;i++){
    if(String(YSM_ORACLE_RETIRED_MODELS[i].id)==value||String(YSM_ORACLE_RETIRED_MODELS[i].modelId)==value)return true
  }
  return false
}

function skinRetireRemovedModels(player,force) {
  if(!player||!player.server)return 0
  var done=0
  try{done=player.persistentData.getInt('oracleYsmPoolMigration')}catch(ignoredDone){}
  if(!force&&done>=YSM_ORACLE_POOL_MIGRATION)return 0

  var equipped=''
  try{equipped=String(player.persistentData.getString('oracleEquippedYsm')||'')}catch(ignoredEq){}
  var last=''
  try{last=String(player.persistentData.getString('oracleLastYsm')||'')}catch(ignoredLast){}
  var resetVisual=skinRetiredContains(equipped)
  var i=0
  for(i=0;i<YSM_ORACLE_RETIRED_MODELS.length;i++){
    var old=YSM_ORACLE_RETIRED_MODELS[i]
    try{player.persistentData.putBoolean('oracleYsm_'+old.id,false)}catch(ignoredFlag){}
    try{player.server.runCommandSilent('ysm auth '+player.username+' remove '+ysmCommandArg(old.modelId))}catch(ignoredAuth){}
  }
  if(resetVisual){
    try{ysmEnablePlayerModel(player)}catch(ignoredEnable){}
    try{player.server.runCommandSilent('ysm model set '+player.username+' default default')}catch(ignoredReset){}
    try{player.persistentData.putString('oracleEquippedYsm','')}catch(ignoredClear){}
  }
  if(skinRetiredContains(last))try{player.persistentData.putString('oracleLastYsm','')}catch(ignoredLastClear){}
  try{player.persistentData.putInt('oracleYsmPoolMigration',YSM_ORACLE_POOL_MIGRATION)}catch(ignoredMigration){}
  return YSM_ORACLE_RETIRED_MODELS.length
}

function skinEquipAuthorized(player,skin,playFx) {
  if (!player || !player.server || !skin || !skin.modelId) return {ok:false,enableCode:0,authCode:0,equipCode:0,command:''}
  var enableCode=0,authCode=0,equipCode=0
  var authCommand='ysm auth ' + player.username + ' add ' + ysmCommandArg(skin.modelId)
  var equipCommand=ysmBuildModelSetCommand(player,skin,true)
  try {
    // 0) 旧版本可能给玩家留下 disabled=true。先恢复 YSM 渲染，否则 model set 成功也可能看起来完全没变化。
    enableCode=Number(ysmEnablePlayerModel(player)||0)
    // 1) 永久补授权。
    authCode=Number(player.server.runCommandSilent(authCommand)||0)
    // 2) 立即强制穿上；ignore_auth=true，不等待 auth 同步。
    equipCode=Number(player.server.runCommandSilent(equipCommand)||0)
    console.log('[YSMOracle] V10.8.10 wardrobe equip dispatch: player=' + player.username + ', skin=' + skin.id + ', model=' + skin.modelId + ', enable=' + enableCode + ', auth=' + authCode + ', equip=' + equipCode + ', command=' + equipCommand)
  } catch (error) {
    console.log('[YSMOracle] V10.8.10 wardrobe equip exception: player=' + player.username + ', model=' + skin.modelId + ', error=' + error + ', command=' + equipCommand)
    return {ok:false,enableCode:enableCode,authCode:authCode,equipCode:equipCode,command:equipCommand}
  }
  try { player.persistentData.putString('oracleEquippedYsm',skin.id) } catch (ignoredStore) {}
  if (skin.equipAnimation) {
    try { player.server.runCommandSilent('ysm play ' + player.username + ' ' + ysmCommandArg(skin.equipAnimation)) } catch (ignoredAnim) {}
  }
  if (playFx !== false) {
    try { player.server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:block.amethyst_block.chime player ' + player.username + ' ~ ~ ~ 0.72 1.25') } catch (ignoredSound) {}
    try { player.server.runCommandSilent('execute at ' + player.username + ' run particle minecraft:end_rod ~ ~1 ~ 0.45 0.75 0.45 0.04 28 force ' + player.username) } catch (ignoredParticle) {}
  }
  return {ok:true,enableCode:enableCode,authCode:authCode,equipCode:equipCode,command:equipCommand}
}

function skinSyncAuthorization(player,announce) {
  if (!player || !player.server) return {ok:false,owned:0,locked:0}
  ysmEnsurePool()
  skinRetireRemovedModels(player,false)

  var owned = 0
  var locked = 0
  var i = 0
  for (i = 0; i < DIVINE_SKINS.length; i++) {
    var skin = DIVINE_SKINS[i]
    if (skinOwned(player,skin.id)) {
      owned++
      // 已抽中 = YSM 原生永久授权。
      skinAuth(player,skin)
    } else {
      locked++
      // 未抽中的 auth 模型强制撤销授权，防止旧数据或手工 auth 绕过抽取。
      skinDeauth(player,skin)
    }
  }

  try { ysmEnablePlayerModel(player) } catch (ignoredEnable) {}

  var equippedId = player.persistentData.getString('oracleEquippedYsm')
  var equipped = equippedId ? skinFind(equippedId) : null
  if (equipped && skinOwned(player,equipped.id)) {
    try { skinEquipAuthorized(player,equipped,false) } catch (ignoredEquipped) {}
  } else if (equippedId) {
    player.persistentData.putString('oracleEquippedYsm','')
  }

  if (announce) {
    ysmTell(player,[
      {text:'✦ YSM 原生授权已同步\n',color:'gold',bold:true},
      {text:'已永久授权 · ' + owned + '    未解锁 · ' + locked + '\n',color:'gray'},
      {text:'Alt+Y 可正常使用；auth 奖池模型仍只能穿已授权的。',color:'dark_gray'}
    ])
  }
  return {ok:true,owned:owned,locked:locked}
}

function skinGrant(player,id,source) {
  if (!player) return {ok:false,duplicate:false,id:id,name:id,kind:'ysm'}
  var skin = skinFind(id)
  if (!skin) return {ok:false,duplicate:false,id:id,name:id,kind:'ysm'}

  var duplicate = skinOwned(player,skin.id)
  if (duplicate) {
    skinAddEmbers(player,skin.duplicateEmbers)
    if (global.giveDivineTokenSilent) global.giveDivineTokenSilent(player,skin.duplicateTokens)
    else if (global.giveDivineToken) global.giveDivineToken(player,skin.duplicateTokens)
  } else {
    player.persistentData.putBoolean('oracleYsm_' + skin.id,true)
    player.persistentData.putString('oracleLastYsm',skin.id)
    if (global.historyRecordSkinUnlock) {
      try { global.historyRecordSkinUnlock(player,skin.id,skin.name) } catch (ignoredHistory) {}
    }
  }

  var mysterySource = source == 'oracle_5star' || source == 'oracle_featured' || source == 'oracle_standard'
  var wear={ok:false,authOnly:mysterySource}
  if(mysterySource){
    // 抽奖里的“神秘惊喜”只解锁收藏，不自动换装，避免中奖瞬间泄露角色身份，也不触发大厅展示。
    try { ysmEnablePlayerModel(player) } catch (ignoredEnable) {}
    try { skinAuth(player,skin) } catch (ignoredAuth) {}
  }else{
    wear=skinEquipAuthorized(player,skin,true)
  }

  if (!mysterySource) {
    if(duplicate){
      ysmTell(player,[
        {text:'✦ 重复神秘惊喜 · ',color:'gold',bold:true},
        {text:skin.name + '\n',color:'light_purple',bold:true},
        {text:'授权仍然永久有效。重合的金线化为 ' + skin.duplicateEmbers + ' 枚余烬，并退回 ' + skin.duplicateTokens + ' 枚幻形碎片。',color:'gray'}
      ])
    }else{
      ysmTell(player,[
        {text:'★★★★★\n',color:'gold',bold:true},
        {text:'神秘惊喜揭晓 · ' + skin.name + '\n',color:'light_purple',bold:true},
        {text:skin.flavor + '\n\n',color:'gray'},
        {text:wear.ok?'已永久授权，并自动换装。':'已永久解锁；可在传奇衣柜中手动换装。',color:wear.ok?'green':'yellow'},
        {text:'  '},
        ysmButton('打开衣柜','/wardrobe','light_purple')
      ])
    }
  }

  return {ok:true,duplicate:duplicate,id:skin.id,name:skin.name,kind:'ysm',index:skinIndexOf(skin.id),modelId:skin.modelId,equipped:wear.ok==true}
}

function skinApply(player,idOrIndex) {
  if (!player || !player.server) return false
  var skin = /^[0-9]+$/.test(String(idOrIndex)) ? skinFindByIndex(Number(idOrIndex)) : skinFind(String(idOrIndex))
  if (!skin) {
    player.tell(Text.red('衣柜里没有找到这套传奇着装。'))
    return false
  }
  if (!skinOwned(player,skin.id)) {
    player.tell(Text.red('这套着装还没有向你开放。'))
    return false
  }
  var result=skinEquipAuthorized(player,skin,true)
  if(!result.ok){
    player.tell(Text.red('换装命令发送失败。'))
    return false
  }
  ysmTell(player,[{text:'✦ 已换装 · ',color:'gold',bold:true},{text:skin.name,color:'light_purple',bold:true}])
  return true
}

function skinClear(player) {
  if (!player || !player.server) return false

  // 只把当前外观切回 YSM default；已经抽到的 auth 授权不会被撤销。
  // CanSwitchModel=true 时玩家之后可通过 Alt+Y 重新选择任何已授权模型。
  var clearSent = false
  var clearCode = 0
  try {
    ysmEnablePlayerModel(player)
    clearCode = Number(player.server.runCommandSilent('ysm model set ' + player.username + ' default default'))
    clearSent = true
  } catch (error) {
    console.log('[YSMOracle] Clear model failed for ' + player.username + ': ' + error)
  }

  if (!clearSent) {
    player.tell(Text.red('发送 YSM default 模型命令时出现异常，请确认服务端与客户端版本一致。'))
    return false
  }

  player.persistentData.putString('oracleEquippedYsm','')
  ysmTell(player,[
    {text:'✦ 金线从肩头松开。\n',color:'gray',italic:true},
    {text:'传奇着装已卸下；已抽到的永久授权仍保留，可从 Alt+Y 或衣柜再次穿戴。',color:'white'}
  ])
  return true
}

function skinTestByIndex(player,index) {
  if (!player || !player.server) return false
  var skin = skinFindByIndex(index)
  if (!skin) {
    player.tell(Text.red('这个编号没有对应的 YSM 模型。'))
    return false
  }

  // 管理员预览真正使用 YSM 的 ignore_auth=true。
  // V9.6 这里的注释写对了，但实际命令漏了最后的 true；V9.7 起已修复。
  // 这样可以测试模型，但不会写入 KubeJS 拥有权，也不会永久写入 YSM auth。
  var dispatch = null
  try {
    ysmEnablePlayerModel(player)
    dispatch = ysmSetModel(player,skin,true)
  } catch (error) {
    console.log('[YSMOracle] Model test failed for ' + skin.modelId + ': ' + error)
  }

  if (!dispatch || !dispatch.sent) {
    ysmTell(player,[
      {text:'模型测试命令发送异常：',color:'red',bold:true},
      {text:skin.name + '\n',color:'yellow'},
      {text:'model_id：' + skin.modelId + '\n',color:'gray'},
      {text:'执行 /ysm_pool cmd ' + index + ' 查看脚本准备发送的原始命令。',color:'dark_gray'}
    ])
    return false
  }

  if (skin.equipAnimation) {
    try { player.server.runCommandSilent('ysm play ' + player.username + ' ' + ysmCommandArg(skin.equipAnimation)) } catch (ignoredAnim) {}
  }
  ysmTell(player,[
    {text:'模型预览命令已发送：',color:'green',bold:true},
    {text:skin.name + '\n',color:'light_purple'},
    {text:'model_id：' + skin.modelId + '\n',color:'gray'},
    {text:'YSM 返回码：' + dispatch.code + '\n',color:dispatch.code > 0 ? 'green' : 'yellow'},
    {text:dispatch.code > 0 ? 'YSM 报告命令成功。' : '返回码为 0；V9.8.3 不再把它直接判定为 ID 错误，请以人物是否实际切换为准。',color:'dark_gray'},
    {text:'\n本次仅管理员预览，不会授予奖池拥有权，也不会永久写入 YSM auth。',color:'dark_gray'}
  ])
  return true
}

function skinWardrobeProgressBar(owned,total) {
  var width=15,filled=total<=0?0:Math.round(width*owned/total),parts=[],i=0
  for(i=0;i<width;i++)parts.push({text:i<filled?'◆':'◇',color:i<filled?'light_purple':'dark_gray'})
  return parts
}

function skinShowWardrobe(player,page) {
  if(!player)return
  ysmEnsurePool()
  var total=DIVINE_SKINS.length
  var owned=0,i=0
  for(i=0;i<total;i++)if(skinOwned(player,DIVINE_SKINS[i].id))owned++
  var maxPage=Math.max(1,Math.ceil(Math.max(1,total)/YSM_WARDROBE_PAGE_SIZE))
  var safePage=Math.max(1,Math.min(maxPage,Math.floor(Number(page)||1)))
  var start=(safePage-1)*YSM_WARDROBE_PAGE_SIZE
  var end=Math.min(total,start+YSM_WARDROBE_PAGE_SIZE)
  var equipped=''
  try{equipped=String(player.persistentData.getString('oracleEquippedYsm')||'')}catch(ignoredEq){}
  var equippedSkin=equipped?skinFind(equipped):null

  var header=[
    {text:'╔════════ ✦ 传奇衣柜 ✦ ════════╗\n',color:'dark_purple',bold:true},
    {text:'收藏 ',color:'gray'},{text:String(owned),color:'light_purple',bold:true},{text:' / '+total+'   ',color:'dark_gray'},
    {text:'幻形余烬 ',color:'gray'},{text:String(skinGetEmbers(player)),color:'gold',bold:true},{text:'\n'}
  ]
  var bar=skinWardrobeProgressBar(owned,total)
  for(i=0;i<bar.length;i++)header.push(bar[i])
  header.push({text:'  '+Math.round(total<=0?0:owned*100/total)+'%\n',color:'dark_gray'})
  header.push({text:'当前着装 · ',color:'gray'})
  header.push({text:equippedSkin&&skinOwned(player,equippedSkin.id)?equippedSkin.name:'原版外观',color:equippedSkin&&skinOwned(player,equippedSkin.id)?'aqua':'white',bold:true})
  header.push({text:'\n未解锁的神秘惊喜不会显示名字或任何详情。\n',color:'dark_gray',italic:true})
  header.push({text:'第 '+safePage+' / '+maxPage+' 页\n',color:'dark_gray'})
  header.push({text:'╠══════════════════════════╣',color:'dark_purple'})
  ysmTell(player,header)

  if(total<=0){player.tell(Text.gray('金色奖池里暂时还没有登记神秘惊喜。'));return}

  for(i=start;i<end;i++){
    var skin=DIVINE_SKINS[i],has=skinOwned(player,skin.id),current=has&&equipped==skin.id,index=i+1
    var line=[]
    line.push({text:(current?'◆ ':has?'✦ ':'◇ ')+'#'+(index<10?'0':'')+index+' · ',color:current?'gold':has?'light_purple':'dark_gray',bold:true})
    if(!has){
      line.push({text:'？？？',color:'dark_gray',bold:true})
      line.push({text:'\n',color:'dark_gray'})
      ysmTell(player,line)
      continue
    }
    line.push({text:skin.name,color:current?'gold':'white',bold:current})
    if(current)line.push({text:'  · 正在穿戴',color:'yellow'})
    line.push({text:'\n'})
    line.push(ysmButton('换装','/wardrobe equip '+index,'green'));line.push({text:'  '})
    line.push(ysmButton('详情','/wardrobe detail '+index,'aqua'))
    line.push({text:'\n'+skin.flavor,color:'gray'})
    ysmTell(player,line)
  }

  var footer=[{text:'╠══════════════════════════╣\n',color:'dark_purple'}]
  if(safePage>1)footer.push(ysmButton('← 上一页','/wardrobe page '+(safePage-1),'aqua'))
  else footer.push({text:'[ ← 上一页 ]',color:'dark_gray'})
  footer.push({text:'   '})
  footer.push(ysmButton('恢复原版','/wardrobe clear','gray'))
  footer.push({text:'   '})
  if(safePage<maxPage)footer.push(ysmButton('下一页 →','/wardrobe page '+(safePage+1),'aqua'))
  else footer.push({text:'[ 下一页 → ]',color:'dark_gray'})
  footer.push({text:'\n╚══════════════════════════╝',color:'dark_purple',bold:true})
  ysmTell(player,footer)
}

function skinShowWardrobeDetail(player,index) {
  if(!player)return false
  ysmEnsurePool()
  var skin=skinFindByIndex(index)
  if(!skin){player.tell(Text.red('衣柜里没有这个编号。'));return false}
  var has=skinOwned(player,skin.id)
  var page=Math.max(1,Math.ceil(Number(index)/YSM_WARDROBE_PAGE_SIZE))
  if(!has){
    ysmTell(player,[
      {text:'╔══════ ✦ ？？？ ✦ ══════╗\n',color:'dark_purple',bold:true},
      {text:'◇ 尚未解锁\n',color:'dark_gray',bold:true},
      {text:'这份神秘惊喜仍被旧匣封存。名字、外观、作者与任何模型信息都不会提前显示。\n\n',color:'gray',italic:true},
      ysmButton('返回衣柜','/wardrobe page '+page,'aqua'),
      {text:'\n╚══════════════════════╝',color:'dark_purple'}
    ])
    return true
  }
  var equipped=''
  try{equipped=String(player.persistentData.getString('oracleEquippedYsm')||'')}catch(ignoredEq){}
  var msg=[
    {text:'╔══════ ✦ '+skin.name+' ✦ ══════╗\n',color:'dark_purple',bold:true},
    {text:equipped==skin.id?'◆ 正在穿戴\n':'✦ 已永久解锁\n',color:equipped==skin.id?'gold':'green',bold:true},
    {text:skin.flavor+'\n\n',color:'gray'}
  ]
  if(skin.author)msg.push({text:'作者 · '+skin.author+'\n',color:'dark_gray'})
  msg.push({text:'YSM · '+skin.modelId+'\n',color:'dark_gray'})
  msg.push({text:'授权 · 永久有效\n',color:'green'})
  msg.push({text:'╠══════════════════════╣\n',color:'dark_purple'})
  msg.push(ysmButton('换装','/wardrobe equip '+index,'green'));msg.push({text:'  '})
  msg.push(ysmButton('返回衣柜','/wardrobe page '+page,'aqua'))
  msg.push({text:'\n╚══════════════════════╝',color:'dark_purple'})
  ysmTell(player,msg)
  return true
}

function skinFeaturedIds() {
  // V9.5 兼容接口：所有 YSM 都在同一个五星池。
  ysmEnsurePool()
  var result = []
  var i = 0
  for (i = 0; i < DIVINE_SKINS.length; i++) result.push(DIVINE_SKINS[i].id)
  return result
}

function skinStandardIds() {
  // 已取消“常驻/限定”概念。保留空数组只是避免旧脚本找不到函数。
  return []
}

function skinWeightedPick(player,featured,preferUnowned) {
  ysmEnsurePool()
  var pool = []
  var i = 0
  for (i = 0; i < DIVINE_SKINS.length; i++) pool.push(DIVINE_SKINS[i])
  if (pool.length <= 0) return null
  if (preferUnowned && player) {
    var fresh = []
    for (i = 0; i < pool.length; i++) if (!skinOwned(player,pool[i].id)) fresh.push(pool[i])
    if (fresh.length > 0) pool = fresh
  }
  var total = 0
  for (i = 0; i < pool.length; i++) total += pool[i].weight || 1
  var roll = Math.random() * total
  for (i = 0; i < pool.length; i++) {
    roll -= pool[i].weight || 1
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

function skinShowExactCommand(player,index) {
  if (!player || !player.server) return false
  var skin = skinFindByIndex(index)
  if (!skin) {
    player.tell(Text.red('这个编号没有对应的 YSM 模型。'))
    return false
  }
  var command = ysmBuildModelSetCommand(player,skin,true)
  ysmTell(player,[
    {text:'✦ YSM 精确 ID 诊断 #' + index + '\n',color:'gold',bold:true},
    {text:'奖池名：' + skin.name + '\n',color:'light_purple'},
    {text:'model_id：' + skin.modelId + '\n',color:'aqua'},
    {text:'脚本实际发送：\n/',color:'gray'},
    {text:command,color:'yellow',clickEvent:{action:'suggest_command',value:'/' + command},hoverEvent:{action:'show_text',contents:{text:'点击把这条命令填进聊天框',color:'gray'}}},
    {text:'\n\n衣柜正式穿戴同样会附带 ignore_auth=true；未拥有模型仍由 KubeJS 拥有权直接拦截。',color:'dark_gray'}
  ])
  console.log('[YSMOracle] exact command #' + index + ': ' + command)
  return true
}

function skinImportHelp(player) {
  if (!player) return
  ysmTell(player,[
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_purple'},
    {text:'✦ YSM 五星大奖导入入口 · V10.8.6\n',color:'gold',bold:true},
    {text:'① 把 .ysm / .zip / 模型文件夹放进：\n',color:'gray'},
    {text:YSM_ORACLE_POOL_ROOT + '/\n',color:'aqua'},
    {text:'② 文件夹格式模型必须保留模型包根目录里的 ysm.json；不要为了抽奖系统去改它的资源路径。\n',color:'gray'},
    {text:'③ 执行 /ysm model reload。model_id 一律以 /ysm model set 的游戏内 Tab 补全为准；如果显示 oracle_pool/xxx.ysm，就把这一整串原样写进奖池。\n',color:'gray'},
    {text:'④ 在 kubejs/config/ysm_oracle_pool.json 登记 model_id、名字，并明确写 free:false；未写或写 true 会被拒绝加入奖池。\n',color:'gray'},
    {text:'⑤ 执行 /ysm_pool reload，再执行 /ysm_pool config。世界 serverconfig 要使用 CanSwitchModel=true、ClientNotDisplayModels=[]。\n',color:'gray'},
    {text:'⑥ /ysm_pool cmd <编号> 显示模型命令；正式衣柜穿戴与管理员预览都会走 ignore_auth=true，但衣柜会先检查是否已经抽中。\n',color:'gray'},
    {text:'⑦ V10.8.16 起传奇着装在抽奖中统一表现为“神秘惊喜”，大厅不展示任何 YSM 着装；大厅三轨固定为左禁忌、中遗物、右随行者。\n\n',color:'gray'},
    {text:'奖池最小配置：\n',color:'yellow',bold:true},
    {text:'{"id":"moon_priestess","model_id":"oracle_pool/moon_priestess.ysm","name":"月下巡礼者","free":false,"weight":1,"icon_item":"minecraft:amethyst_shard","flavor":"金色命线落下时，她从月光里走出。","enabled":true}\n',color:'dark_gray'},
    {text:'注意：ysm.json 里的 metadata/tips 是 YSM 自己的模型详情；抽奖大厅的名字与简介读取的是 ysm_oracle_pool.json。两者不是同一个配置。\n',color:'light_purple'},
    ysmButton('查看当前池','/ysm_pool','aqua'),{text:'  '},ysmButton('生成 YSM 配置','/ysm_pool config','gold'),{text:'  '},ysmButton('重载','/ysm_pool reload','green'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_purple'}
  ])
}

function skinPoolStatus(player) {
  if (!player) return
  ysmEnsurePool()
  ysmTell(player,[
    {text:'✦ YSM 混合五星奖池\n',color:'gold',bold:true},
    {text:'模型总数 · ' + DIVINE_SKINS.length + '\n',color:'gray'},
    {text:'池规则 · 全部模型同池，不再区分限定/常驻\n',color:'light_purple'},
    {text:'YSM 模型目录 · ' + YSM_ORACLE_POOL_ROOT + '\n',color:'dark_gray'},
    {text:'奖池清单 · ' + YSM_ORACLE_MAIN_CONFIG + '\n',color:'dark_gray'},
    {text:'服务器穿戴 · 抽中后永久补 auth，换装直接使用 ignore_auth=true 保证立即生效\n',color:'green'},
    {text:'YSM 原生授权 · CanSwitchModel=true；Alt+Y 只允许穿已授权的 auth 模型\n',color:'green'},
    {text:'玩家 YSM 状态 · disable=false 保证渲染；已授权模型可由 Alt+Y 或 /wardrobe 穿戴\n',color:'green'},
    {text:'大厅着装展示 · 永久关闭；神秘惊喜不参加大厅展示\n',color:'aqua'},
    {text:'最近载入 · ' + ysmPoolLoadedAt,color:'dark_gray'}
  ])
  var i = 0
  for (i = 0; i < ysmPoolWarnings.length; i++) player.tell(Text.yellow('⚠ ' + ysmPoolWarnings[i]))
}

// 初次脚本加载时读取一次。
ysmReloadPool(null,false)

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('wardrobe')

  root.executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    skinShowWardrobe(player,1)
    return 1
  })

  var pageRoot=Commands.literal('page')
  var wp=0
  for(wp=1;wp<=Math.ceil(YSM_ORACLE_MAX_MODELS/YSM_WARDROBE_PAGE_SIZE);wp++){
    (function(page){pageRoot.then(Commands.literal(String(page)).executes(function(ctx){var player=ctx.source.player;if(!player)return 0;skinShowWardrobe(player,page);return 1}))})(wp)
  }
  root.then(pageRoot)

  var detailRoot=Commands.literal('detail')
  for(wp=1;wp<=YSM_ORACLE_MAX_MODELS;wp++){
    (function(index){detailRoot.then(Commands.literal(String(index)).executes(function(ctx){var player=ctx.source.player;if(!player)return 0;return skinShowWardrobeDetail(player,index)?1:0}))})(wp)
  }
  root.then(detailRoot)

  // V10.8.10：恢复 V10.8.7 的正式 /wardrobe equip <编号>，同时保留 /wardrobe wear <编号> 兼容旧按钮。
  var equip = Commands.literal('equip')
  var ei = 0
  for (ei = 1; ei <= YSM_ORACLE_MAX_MODELS; ei++) {
    (function (index) {
      equip.then(Commands.literal(String(index)).executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return skinApply(player,index) ? 1 : 0
      }))
    })(ei)
  }
  root.then(equip)

  var wear = Commands.literal('wear')
  var i = 0
  for (i = 1; i <= YSM_ORACLE_MAX_MODELS; i++) {
    (function (index) {
      wear.then(Commands.literal(String(index)).executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return skinApply(player,index) ? 1 : 0
      }))
    })(i)
  }
  root.then(wear)
  root.then(Commands.literal('clear').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    return skinClear(player) ? 1 : 0
  }))
  event.register(root)

  var pool = Commands.literal('ysm_pool').requires(function (source) { return source.hasPermission(2) })
  pool.executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    skinPoolStatus(player)
    return 1
  })
  pool.then(Commands.literal('import').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    skinImportHelp(player)
    return 1
  }))

  pool.then(Commands.literal('config').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    skinShowYsmServerConfig(player)
    return 1
  }))

  pool.then(Commands.literal('reload').executes(function (ctx) {
    var count = ysmReloadPool(ctx.source.server,true)
    var player = ctx.source.player
    if (player) {
      player.tell(Text.green('YSM 五星奖池已重载：' + count + ' 个模型。'))
      skinPoolStatus(player)
    }
    return 1
  }))

  pool.then(Commands.literal('list').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    skinShowWardrobe(player,1)
    return 1
  }))

  pool.then(Commands.literal('resync').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    var result = skinSyncAuthorization(player,true)
    return result.ok ? 1 : 0
  }))

  var cmd = Commands.literal('cmd')
  for (i = 1; i <= YSM_ORACLE_MAX_MODELS; i++) {
    (function (index) {
      cmd.then(Commands.literal(String(index)).executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return skinShowExactCommand(player,index) ? 1 : 0
      }))
    })(i)
  }
  pool.then(cmd)

  var test = Commands.literal('test')
  for (i = 1; i <= YSM_ORACLE_MAX_MODELS; i++) {
    (function (index) {
      test.then(Commands.literal(String(index)).executes(function (ctx) {
        var player = ctx.source.player
        if (!player) return 0
        return skinTestByIndex(player,index) ? 1 : 0
      }))
    })(i)
  }
  pool.then(test)
  event.register(pool)
})

PlayerEvents.loggedIn(function (event) {
  var player = event.player
  if (!player || !player.server) return
  try { if (String(player.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer') >= 0) return } catch (ignoredFake) {}

  // 清理旧版普通 PNG 皮肤契据；旧 persistentData 不再参与新奖池。
  var oldIds = ['violet_wanderer','brass_automaton','quiet_wayfarer','golden_messenger']
  var i = 0
  for (i = 0; i < oldIds.length; i++) {
    try {
      player.server.runCommandSilent(
        'clear ' + player.username + ' minecraft:paper{DivineSkinCertificate:"' + oldIds[i] + '"}'
      )
    } catch (ignored) {}
  }

  // 登录后做一次权限对账：已抽中模型永久补齐 YSM auth，未拥有模型撤销 auth；同时迁移清理已退役的 9 个模型。
  // CanSwitchModel=true 后 Alt+Y 由 YSM 原生 auth 自己判定是否可穿，不再依赖 KubeJS 强锁。
  // 没有 Tick，不会持续扫描玩家。
  player.server.scheduleInTicks(60,function () {
    try { skinSyncAuthorization(player,false) } catch (error) {
      console.log('[YSMOracle] Login auth sync failed for ' + player.username + ': ' + error)
    }
  })
})

global.divineSkinCatalog = DIVINE_SKINS
global.divineSkinFind = skinFind
global.divineSkinFindByIndex = skinFindByIndex
global.divineSkinIndexOf = skinIndexOf
global.divineSkinOwned = skinOwned
global.divineSkinGrant = skinGrant
global.divineSkinApply = skinApply
global.divineSkinClear = skinClear
global.divineSkinTestByIndex = skinTestByIndex
global.divineSkinShowWardrobe = skinShowWardrobe
global.divineSkinShowWardrobeDetail = skinShowWardrobeDetail
global.divineSkinFeaturedIds = skinFeaturedIds
global.divineSkinStandardIds = skinStandardIds
global.divineSkinWeightedPick = skinWeightedPick
global.divineSkinGetEmbers = skinGetEmbers
global.divineSkinAddEmbers = skinAddEmbers
global.divineSkinReloadPool = ysmReloadPool
global.divineSkinSyncAuthorization = skinSyncAuthorization
global.divineSkinRetireRemovedModels = skinRetireRemovedModels
global.divineSkinPoolStatus = skinPoolStatus
global.divineSkinImportHelp = skinImportHelp
global.divineSkinShowExactCommand = skinShowExactCommand

global.divineSkinShowYsmServerConfig = skinShowYsmServerConfig
