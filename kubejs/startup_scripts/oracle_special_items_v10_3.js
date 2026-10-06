// ============================================================
// Oracle Special Items V10.3 · 真正独立物品注册
// Minecraft 1.20.1 / KubeJS 2001.6.5
//
// 重要：这是 registry 内容，服务端和客户端整合包都必须放同一份，且必须完整重启。
// ============================================================

StartupEvents.registry('item', event => {
  event.create('godslayer_totem')
    .displayName('弑神图腾')
    .unstackable()
    .glow(true)
    .texture('minecraft:item/totem_of_undying')

  event.create('forbidden_fruit')
    .displayName('禁忌果实')
    .maxStackSize(16)
    .glow(true)
    .texture('minecraft:item/apple')

  event.create('void_mother_gift')
    .displayName('虚空之母的馈赠')
    .maxStackSize(16)
    .glow(true)
    .texture('minecraft:item/ender_pearl')

  event.create('dragon_blood')
    .displayName('古龙真血')
    .maxStackSize(16)
    .glow(true)
    .texture('minecraft:item/dragon_breath')

  event.create('hunter_oil')
    .displayName('猎神圣油')
    .maxStackSize(16)
    .glow(true)
    .texture('minecraft:item/honey_bottle')

  event.create('worldwalker_seal')
    .displayName('诸界远征印')
    .maxStackSize(16)
    .glow(true)
    .texture('minecraft:item/heart_of_the_sea')

  // 旧版内部渲染物：保留注册 ID 只为兼容旧存档。安装 LuokixiVisuals 后不会再召唤它。
  event.create('black_flame_visual')
    .displayName('黑焰')
    .unstackable()
    .modelJson({
      ambientocclusion: false,
      gui_light: 'front',
      textures: { flame: 'kubejs:item/black_flame' },
      elements: [
        {
          from: [7.88, 0, 0], to: [8.12, 16, 16], shade: false,
          faces: {
            east: {uv:[0,0,16,16], texture:'#flame'},
            west: {uv:[0,0,16,16], texture:'#flame'}
          }
        },
        {
          from: [0, 0, 7.88], to: [16, 16, 8.12], shade: false,
          faces: {
            north: {uv:[0,0,16,16], texture:'#flame'},
            south: {uv:[0,0,16,16], texture:'#flame'}
          }
        }
      ],
      display: {
        fixed: {rotation:[0,0,0], translation:[0,0,0], scale:[1,1,1]},
        ground: {rotation:[0,0,0], translation:[0,3,0], scale:[0.5,0.5,0.5]}
      }
    })
})

console.log('[OracleSpecialItems] V10.3 registry loaded - 6 independent forbidden items + animated black flame visual.')
