// ============================================================
// LSI V10.6.7 · FTB Chunks 安全领地诊断命令
// /claimsafe
// /claimsafe status
// ============================================================

function claimSafeTell(player, parts) {
  if (!player) return
  try { player.tell(parts) } catch (ignoredTell) {}
}

function claimSafeFtbLoaded() {
  try { return Platform.isLoaded('ftbchunks') } catch (ignored) { return false }
}

function claimSafeCurrentChunk(player) {
  var result = {
    modLoaded: false,
    managerLoaded: false,
    claimed: false,
    dimension: '',
    chunkX: 0,
    chunkZ: 0,
    error: ''
  }
  if (!player) return result

  try {
    result.dimension = String(player.level.dimension.location())
  } catch (ignoredDimensionA) {
    try { result.dimension = String(player.level().dimension().location()) } catch (ignoredDimensionB) {}
  }
  try {
    result.chunkX = Math.floor(Number(player.x) / 16)
    result.chunkZ = Math.floor(Number(player.z) / 16)
  } catch (ignoredChunk) {}

  if (!claimSafeFtbLoaded()) return result
  result.modLoaded = true

  try {
    var $FTBChunksAPI = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
    var $ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
    var api = $FTBChunksAPI.api()
    if (!api || !api.isManagerLoaded()) return result
    result.managerLoaded = true
    result.claimed = api.getManager().getChunk(new $ChunkDimPos(player)) != null
  } catch (error) {
    result.error = String(error)
  }
  return result
}

function claimSafeShow(player) {
  if (!player) return 0
  var state = claimSafeCurrentChunk(player)
  var startupEnabled = !!global.lsiClaimSafeLoaded
  var blocked = Number(global.lsiClaimSafeBlocked || 0)
  var last = String(global.lsiClaimSafeLastBlocked || '')
  var lastError = String(global.lsiClaimSafeLastError || '')

  var lines = [
    {text:'✦ LSI 领地安全区 V10.6.7\n',color:'green',bold:true},
    {text:'FTB Chunks：'+(state.modLoaded?'已加载':'未加载')+' · API：'+(state.managerLoaded?'就绪':'未就绪')+'\n',color:(state.modLoaded&&state.managerLoaded)?'green':'red'},
    {text:'当前区块：'+state.dimension+'  ['+state.chunkX+', '+state.chunkZ+'] · ',color:'gray'},
    {text:state.claimed?'已认领\n':'未认领\n',color:state.claimed?'aqua':'yellow'},
    {text:'自然敌对怪保护：'+(startupEnabled?'开启':'未开启')+' · 本次启动已拦截 '+blocked+' 次\n',color:startupEnabled?'green':'red'},
    {text:'会拦：自然刷新 / 巡逻队 / 增援。\n',color:'gray'},
    {text:'不会拦：刷怪笼 / 生成蛋 / /summon / LSI 血月与挑战事件。\n',color:'dark_gray'},
    {text:'玩家能否开门、箱子、机器由 FTB Team Properties 的 Block/Entity Interact Mode 单独控制。',color:'dark_gray'}
  ]
  if (last) lines.push({text:'\n最近一次拦截：'+last,color:'dark_gray'})
  if (state.error) lines.push({text:'\nFTB API 诊断：'+state.error,color:'red'})
  if (lastError) lines.push({text:'\n生成保护最近异常：'+lastError,color:'red'})
  claimSafeTell(player, lines)
  return 1
}

ServerEvents.commandRegistry(function(event) {
  var Commands = event.commands
  var root = Commands.literal('claimsafe').executes(function(ctx) {
    return claimSafeShow(ctx.source.player)
  })
  root.then(Commands.literal('status').executes(function(ctx) {
    return claimSafeShow(ctx.source.player)
  }))
  event.register(root)
})

console.log('[LSI ClaimSafe] Diagnostic command loaded: /claimsafe status')
