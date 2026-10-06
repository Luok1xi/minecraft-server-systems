// ============================================================
// LSI V10.6.7 · FTB Chunks 领地自然敌对怪生成保护
// Minecraft 1.20.1 / Forge 47.4.x / KubeJS 2001.6.5
//
// 目标：
// - FTB Chunks 已认领区块内，不再自然刷新敌对怪。
// - 不影响刷怪笼、生成蛋、/summon、LSI 血月/挑战事件等命令生成。
// - 不扫描实体，不使用 tick；只在 Forge 正准备生成 Mob 时检查一次。
// ============================================================

(function () {
  var ftbLoaded = false
  try { ftbLoaded = Platform.isLoaded('ftbchunks') } catch (ignoredPlatform) {}

  global.lsiClaimSafeLoaded = ftbLoaded
  global.lsiClaimSafeBlocked = 0
  global.lsiClaimSafeLastBlocked = ''
  global.lsiClaimSafeLastError = ''
  global.lsiClaimSafeLastErrorAt = 0

  if (!ftbLoaded) {
    console.warn('[LSI ClaimSafe] FTB Chunks not loaded; claimed-chunk spawn protection is disabled.')
    return
  }

  var $FTBChunksAPI = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
  var $ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
  var $MobCategory = Java.loadClass('net.minecraft.world.entity.MobCategory')
  var $Enemy = Java.loadClass('net.minecraft.world.entity.monster.Enemy')

  // 只处理“游戏自己刷出来”的敌对怪。
  // 明确不包含：SPAWNER / SPAWN_EGG / COMMAND / DISPENSER / MOB_SUMMONED / EVENT。
  var BLOCKED_SPAWN_REASONS = {
    NATURAL: true,
    CHUNK_GENERATION: true,
    PATROL: true,
    REINFORCEMENT: true
  }

  function isHostileMob(mob) {
    if (!mob) return false
    try {
      var category = mob.getType().getCategory()
      if (category && category.equals($MobCategory.MONSTER)) return true
    } catch (ignoredCategory) {}
    try {
      if (mob instanceof $Enemy) return true
    } catch (ignoredEnemyInterface) {}
    return false
  }

  function isClaimed(mob) {
    var api = $FTBChunksAPI.api()
    if (!api || !api.isManagerLoaded()) return false
    return api.getManager().getChunk(new $ChunkDimPos(mob)) != null
  }

  function warnRateLimited(error) {
    var now = Date.now()
    if (now - Number(global.lsiClaimSafeLastErrorAt || 0) < 30000) return
    global.lsiClaimSafeLastErrorAt = now
    global.lsiClaimSafeLastError = String(error)
    console.warn('[LSI ClaimSafe] Spawn protection check failed; allowing this spawn to avoid breaking gameplay: ' + error)
  }

  ForgeEvents.onEvent('net.minecraftforge.event.entity.living.MobSpawnEvent$FinalizeSpawn', function (event) {
    try {
      var spawnType = event.getSpawnType()
      if (!spawnType) return
      var reason = String(spawnType.name())
      if (!BLOCKED_SPAWN_REASONS[reason]) return

      var mob = event.getEntity()
      if (!isHostileMob(mob)) return
      if (!isClaimed(mob)) return

      // Forge 1.20.1 官方要求：真正阻止 Mob 进入世界要使用 setSpawnCancelled(true)，
      // 单纯 event.cancel() 只是不调用 finalizeSpawn，实体仍可能进入世界。
      event.setSpawnCancelled(true)

      global.lsiClaimSafeBlocked = Number(global.lsiClaimSafeBlocked || 0) + 1
      try {
        var dim = String(mob.level().dimension().location())
        var pos = mob.blockPosition()
        global.lsiClaimSafeLastBlocked = String(mob.getType()) + ' @ ' + dim + ' [' + pos.getX() + ', ' + pos.getY() + ', ' + pos.getZ() + '] (' + reason + ')'
      } catch (ignoredLastBlocked) {}
    } catch (error) {
      // 保护系统自己的异常绝不能导致服务器刷怪流程崩溃。
      warnRateLimited(error)
    }
  })

  console.log('[LSI ClaimSafe] V10.6.7 loaded: natural hostile spawns are blocked inside FTB Chunks claims.')
})()
