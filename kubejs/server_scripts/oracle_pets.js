// ============================================================
// 三纺女的同行契约 V10.1 · 有死亡代价的同行者
// Minecraft 1.20.1 / Forge / KubeJS 6
//
// 设计原则：
// - 抽到的是“一次有效契约”，不是永久无限复活的宠物许可证。
// - 主动 /companions dismiss 只是收回契约实体，不消耗契约。
// - 同行者真正死亡，契约立即断裂；必须重新从旧匣抽到才能再次召唤。
// - 不使用 ServerEvents.tick；只在已召唤同行者存在时，用低频 scheduleInTicks 做跟随特效。
// ============================================================

var ORACLE_COMPANIONS = [
  {
    id:'horse',name:'战马契约',shortName:'战马',type:'minecraft:horse',
    flavor:'它会回应真正需要远行的人。被你命名以后，它才算真正属于你。',
    note:'90 生命 · 0.40 速度 · 1.20 跳跃 · 20 护甲 · 自带鞍与钻石马铠',
    summon:'{PersistenceRequired:1b,Silent:1b,Tame:1b,Health:90.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:90.0},{Name:"minecraft:generic.movement_speed",Base:0.40},{Name:"minecraft:horse.jump_strength",Base:1.20},{Name:"minecraft:generic.armor",Base:20.0},{Name:"minecraft:generic.knockback_resistance",Base:0.45}],Variant:1029,SaddleItem:{id:"minecraft:saddle",Count:1b,tag:{DivineCompanionSaddle:1b,HideFlags:1}},ArmorItem:{id:"minecraft:diamond_horse_armor",Count:1b,tag:{DivineCompanionArmor:1b,HideFlags:1}}}'
  },
  {
    id:'wolf',name:'逐风猎犬契约',shortName:'逐风猎犬',type:'minecraft:wolf',
    flavor:'它奔跑时不会追着风。风会自己追上它。',
    note:'90 生命 · 50 攻击 · 24 护甲 · 0.50 基础移速 · 风痕粒子 · 0.70 抗击退',
    summon:'{PersistenceRequired:1b,Silent:1b,Sitting:0b,CollarColor:11b,Health:90.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:90.0},{Name:"minecraft:generic.attack_damage",Base:50.0},{Name:"minecraft:generic.armor",Base:24.0},{Name:"minecraft:generic.movement_speed",Base:0.50},{Name:"minecraft:generic.knockback_resistance",Base:0.70}]}'
  },
  {
    id:'donkey',name:'驮运契约',shortName:'驴子',type:'minecraft:donkey',
    flavor:'它不是为了赢赛跑来的。它只是很擅长把你和一大堆东西一起带回家。',
    note:'80 生命 · 0.36 速度 · 1.05 跳跃 · 18 护甲 · 自带鞍与箱子',
    summon:'{PersistenceRequired:1b,Silent:1b,Tame:1b,ChestedHorse:1b,Health:80.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:80.0},{Name:"minecraft:generic.movement_speed",Base:0.36},{Name:"minecraft:horse.jump_strength",Base:1.05},{Name:"minecraft:generic.armor",Base:18.0},{Name:"minecraft:generic.knockback_resistance",Base:0.40}],SaddleItem:{id:"minecraft:saddle",Count:1b,tag:{DivineCompanionSaddle:1b,HideFlags:1}}}'
  },
  {
    id:'maiden_doll',name:'神女的玩偶壳',shortName:'神女玩偶',type:'minecraft:iron_golem',
    flavor:'神女没有把自己的灵魂放进去。她只留下一个会在你受伤时挡到前面的空壳。',
    note:'200 生命 · 38 攻击 · 30 护甲 · 不会主动伤害契约者 · 会追击你攻击的目标，也会援护攻击你的人',
    summon:'{PersistenceRequired:1b,Silent:1b,PlayerCreated:1b,Health:200.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:200.0},{Name:"minecraft:generic.attack_damage",Base:38.0},{Name:"minecraft:generic.armor",Base:30.0},{Name:"minecraft:generic.movement_speed",Base:0.34},{Name:"minecraft:generic.knockback_resistance",Base:0.90}]}'
  }
]

function petTell(player,json){if(player&&player.server)player.server.runCommandSilent('tellraw '+player.username+' '+JSON.stringify(json))}
function petButton(text,command,color){return{text:'[ '+text+' ]',color:color,bold:true,clickEvent:{action:'run_command',value:command},hoverEvent:{action:'show_text',contents:{text:text,color:'gray'}}}}
function petFind(id){var i=0;for(i=0;i<ORACLE_COMPANIONS.length;i++)if(ORACLE_COMPANIONS[i].id==id)return ORACLE_COMPANIONS[i];return null}
function petOwned(player,id){return !!(player&&id&&player.persistentData.getBoolean('oraclePet_'+id))}
function petPlayerTag(player){var name=String(player.username);return 'divine_companion_'+name.replace(/[^A-Za-z0-9_]/g,'_')}
function petIdTag(id){return 'divine_companion_id_'+String(id||'').replace(/[^A-Za-z0-9_]/g,'_')}
function petNameStoragePath(player,id){var name=player?String(player.username):'unknown';name=name.replace(/[^A-Za-z0-9_]/g,'_');return 'names.'+name+'.'+String(id||'companion').replace(/[^A-Za-z0-9_]/g,'_')}

function petGiveNamingTag(player,pet){
  if(!player||!pet)return
  try{
    var lore='[\'{"text":"先在铁砧里写下你真正想叫它的名字。","color":"aqua","italic":false}\',\'{"text":"契约断裂以后，这个名字也会随那一次生命一起离开。","color":"gray","italic":false}\']'
    var stack=Item.of('minecraft:name_tag','{DivineCompanionNameTag:1b,display:{Name:\'{"text":"未写下名字的名牌 · '+pet.shortName+'","color":"yellow","italic":false}\',Lore:'+lore+'}}')
    if(global.oracleGiveRewardStack)global.oracleGiveRewardStack(player,stack,'未写下名字的名牌 · '+pet.shortName);else player.give(stack)
  }catch(error){player.give(Item.of('minecraft:name_tag',1))}
}

function petAddDuplicateCompensation(player,silent){
  if(!player)return
  if(global.divineSkinAddEmbers)global.divineSkinAddEmbers(player,8);else player.persistentData.putInt('oracleEmbers',player.persistentData.getInt('oracleEmbers')+8)
  if(silent&&global.giveDivineTokenSilent)global.giveDivineTokenSilent(player,2);else if(global.giveDivineToken)global.giveDivineToken(player,2)
}

function petPlayGrantSound(player,id){
  if(!player||!player.server)return;var u=player.username
  if(id=='wolf'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.wolf.ambient player '+u+' ~ ~ ~ 0.68 1.10')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.phantom.flap player '+u+' ~ ~ ~ 0.35 1.65')
  }else if(id=='horse'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.horse.ambient player '+u+' ~ ~ ~ 0.72 1.06')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:block.note_block.chime player '+u+' ~ ~ ~ 0.48 1.18')
  }else if(id=='maiden_doll'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.iron_golem.repair player '+u+' ~ ~ ~ 0.70 1.25')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:block.amethyst_block.resonate player '+u+' ~ ~ ~ 0.42 0.72')
  }else{
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.donkey.ambient player '+u+' ~ ~ ~ 0.72 1.02')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:block.amethyst_cluster.break player '+u+' ~ ~ ~ 0.32 1.46')
  }
  player.server.runCommandSilent('execute at '+u+' run particle minecraft:happy_villager ~ ~1 ~ 0.55 0.65 0.55 0.05 28 force '+u)
}
function petPlaySummonSound(player,id){
  if(!player||!player.server)return;var u=player.username
  if(id=='wolf'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.wolf.ambient player '+u+' ~ ~ ~ 0.80 1.02')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.phantom.flap player '+u+' ~ ~ ~ 0.40 1.55')
    player.server.runCommandSilent('execute at '+u+' run particle minecraft:cloud ~2 ~0.8 ~2 0.7 0.3 0.7 0.04 28 force '+u)
  }else if(id=='horse'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.horse.gallop player '+u+' ~ ~ ~ 0.55 1.05')
  }else if(id=='maiden_doll'){
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.iron_golem.repair player '+u+' ~ ~ ~ 0.75 0.92')
    player.server.runCommandSilent('execute at '+u+' run playsound minecraft:block.respawn_anchor.set_spawn player '+u+' ~ ~ ~ 0.30 1.26')
  }else player.server.runCommandSilent('execute at '+u+' run playsound minecraft:entity.donkey.ambient player '+u+' ~ ~ ~ 0.70 1.06')
}

function petGrant(player,id,source){
  if(!player)return{ok:false,duplicate:false,id:id,name:id,kind:'pet'}
  var pet=petFind(id);if(!pet)return{ok:false,duplicate:false,id:id,name:id,kind:'pet'}
  if(petOwned(player,id)){
    petAddDuplicateCompensation(player,source=='oracle_4star')
    if(source!='oracle_4star')petTell(player,[{text:'✦ 重叠的契约 · ',color:'yellow',bold:true},{text:pet.name+'\n',color:'gold'},{text:'同一条命线烧成了 8 枚余烬，并退回 2 枚幻形碎片。',color:'gray'}])
    return{ok:true,duplicate:true,id:id,name:pet.name,kind:'pet',tier:4}
  }
  player.persistentData.putBoolean('oraclePet_'+id,true)
  player.persistentData.putString('oracleLastPet',id)
  petGiveNamingTag(player,pet)
  if(global.historyRecordPetUnlock)try{global.historyRecordPetUnlock(player,id,pet.name)}catch(ignored){}
  if(source!='oracle_4star'){
    petTell(player,[{text:'★★★★\n',color:'light_purple',bold:true},{text:pet.name+'\n',color:'gold',bold:true},{text:pet.flavor+'\n\n',color:'gray',italic:true},{text:pet.note+'\n',color:'dark_gray'},{text:'这是一份有生命的契约。若同行者真正死去，契约也会断裂；想再次呼唤它，只能让旧匣重新把那条命线交给你。\n',color:'dark_red'},petButton('吹响口哨','/companions summon '+id,'green')])
    petPlayGrantSound(player,id)
  }
  return{ok:true,duplicate:false,id:id,name:pet.name,kind:'pet',tier:4}
}

function petSaveCustomName(server,dimension,one,player,id){
  if(!server||!dimension||!one||!player||!id)return;var path=petNameStoragePath(player,id)
  try{server.runCommandSilent('data remove storage myteam:companions '+path)}catch(ignored){}
  try{server.runCommandSilent('execute in '+dimension+' run data modify storage myteam:companions '+path+' set from entity '+one+' CustomName')}catch(ignored2){}
}
function petRestoreCustomName(player,pet){
  if(!player||!player.server||!pet)return;var tag=petPlayerTag(player),selector='@e[type='+pet.type+',tag='+tag+',tag='+petIdTag(pet.id)+',limit=1,sort=nearest,distance=..12]',path=petNameStoragePath(player,pet.id)
  try{player.server.runCommandSilent('execute at '+player.username+' run data modify entity '+selector+' CustomName set from storage myteam:companions '+path)}catch(ignored){}
}
function petSetOwner(player,pet){
  if(!player||!player.server||!pet||pet.type=='minecraft:iron_golem')return
  var selector='@e[type='+pet.type+',tag='+petPlayerTag(player)+',tag='+petIdTag(pet.id)+',limit=1,sort=nearest,distance=..12]'
  try{player.server.runCommandSilent('execute at '+player.username+' run data modify entity '+selector+' Owner set from entity '+player.username+' UUID')}catch(ignored){}
}

function petDimensions(player){
  var out=[],seen={},raw=[],i=0,current=''
  try{current=String(player.level.dimension)}catch(ignored){}
  raw.push(player.persistentData.getString('oracleCompanionDimension'));raw.push(current);raw.push('minecraft:overworld');raw.push('minecraft:the_nether');raw.push('minecraft:the_end')
  for(i=0;i<raw.length;i++)if(raw[i]&&!seen[raw[i]]){seen[raw[i]]=true;out.push(raw[i])}
  return out
}
function petDismissInDimension(server,tag,dimension,player,activeId){
  if(!server||!tag||!dimension)return false
  var selector='@e[tag='+tag+']',one='@e[tag='+tag+',limit=1]',found=0
  try{found=server.runCommandSilent('execute in '+dimension+' if entity '+one)}catch(ignored){found=0}
  if(found<=0)return false
  if(player&&activeId)petSaveCustomName(server,dimension,one,player,activeId)
  // 先做“主动收回”标记，死亡事件看到它以后绝不能撕毁契约。
  try{server.runCommandSilent('execute in '+dimension+' run tag '+selector+' add divine_companion_dismissed')}catch(ignoredTag){}
  try{server.runCommandSilent('execute in '+dimension+' as '+selector+' run data merge entity @s {SaddleItem:{},ArmorItem:{},Items:[],ChestedHorse:0b}')}catch(ignoredInv){}
  try{server.runCommandSilent('execute in '+dimension+' as '+selector+' at @s run tp @s ~ -1000 ~')}catch(ignoredTp){}
  server.runCommandSilent('execute in '+dimension+' run kill '+selector)
  return true
}
function petDismiss(player,announce){
  if(!player||!player.server)return false
  var tag=petPlayerTag(player),dims=petDimensions(player),removed=false,activeId=player.persistentData.getString('oracleCompanionActiveId'),i=0
  for(i=0;i<dims.length;i++)if(petDismissInDimension(player.server,tag,dims[i],player,activeId))removed=true
  if(removed){player.persistentData.putString('oracleCompanionDimension','');player.persistentData.putString('oracleCompanionActiveId','')}
  if(announce)player.tell(removed?Text.gray('口哨停下，同行者沿着契约的另一端离开了。'):Text.gray('附近没有正在回应你的同行者。'))
  return removed
}

function petSummon(player,id){
  if(!player||!player.server)return false
  var pet=petFind(id);if(!pet)return false
  if(!petOwned(player,id)){player.tell(Text.red('这条契约已经断了，或者从未认出你。旧匣必须重新把它交给你。'));return false}
  var now=Date.now(),lastCall=Number(player.persistentData.getLong('oracleCompanionLastCall'))
  if(lastCall>0&&now-lastCall<15000){player.tell(Text.gray('口哨的回声还没散。再等 '+Math.ceil((15000-(now-lastCall))/1000)+' 秒。'));return false}
  petDismiss(player,false)
  var tag=petPlayerTag(player),idTag=petIdTag(id),base=pet.summon,nbt=base.substring(0,base.length-1)+',Tags:["divine_companion","'+tag+'","'+idTag+'"]}'
  var result=player.server.runCommandSilent('execute at '+player.username+' run summon '+pet.type+' ~2 ~ ~2 '+nbt)
  if(result<=0){player.tell(Text.red('口哨没有得到回应。换到开阔一点的位置再试。'));return false}
  petSetOwner(player,pet);petRestoreCustomName(player,pet)
  player.persistentData.putString('oracleCompanionActiveId',id);player.persistentData.putLong('oracleCompanionLastCall',now)
  try{player.persistentData.putString('oracleCompanionDimension',String(player.level.dimension))}catch(ignored){}
  var pulseToken=player.persistentData.getInt('oracleCompanionPulseToken')+1;player.persistentData.putInt('oracleCompanionPulseToken',pulseToken)
  petTell(player,[{text:'🐾 '+pet.shortName+' 回应了你的口哨。\n',color:'gold',bold:true},{text:pet.flavor+'\n',color:'gray',italic:true},{text:'记住：它若真正死去，这条契约也会随之断裂。',color:'dark_red'}])
  petPlaySummonSound(player,id);petStartPulse(player,id,pulseToken)
  return true
}

function petEntityHasTag(entity,tag){
  if(!entity||!tag)return false
  try{if(entity.getTags&&entity.getTags().contains(tag))return true}catch(ignoredA){}
  try{if(entity.tags&&entity.tags.contains(tag))return true}catch(ignoredB){}
  try{return String(entity.nbt).indexOf(tag)>=0}catch(ignoredC){return false}
}
function petEntityHasCompanionTag(entity){return petEntityHasTag(entity,'divine_companion')}
function petEntityType(entity){try{return String(entity.type)}catch(ignored){}return''}
function petEntityDimension(entity){try{var v=String(entity.level.dimension),m=v.match(/[a-z0-9_.-]+:[a-z0-9_./-]+/g);if(m&&m.length)return m[m.length-1]}catch(ignored){}return'minecraft:overworld'}
function petEntityPos(entity){try{return{x:Number(entity.getX()),y:Number(entity.getY()),z:Number(entity.getZ())}}catch(ignored){}return{x:0,y:64,z:0}}
function petIdFromEntity(entity){var i=0;for(i=0;i<ORACLE_COMPANIONS.length;i++)if(petEntityHasTag(entity,petIdTag(ORACLE_COMPANIONS[i].id)))return ORACLE_COMPANIONS[i].id;return''}
function petOwnerForEntity(server,entity){
  if(!server||!entity)return null
  try{var ps=server.players,i=0;for(i=0;i<ps.length;i++)if(petEntityHasTag(entity,petPlayerTag(ps[i])))return ps[i]}catch(ignored){}
  return null
}
function petEntityUuid(entity){try{return String(entity.getUUID())}catch(ignored){}return''}
function petIsPlayer(entity){try{return !!(entity&&entity.isPlayer&&entity.isPlayer())}catch(ignored){}return false}
function petUuidNbt(entity){
  if(!entity)return ''
  try{var raw=String(entity.nbt.get('UUID'));if(raw.indexOf('[I;')==0)return raw}catch(ignored){}
  try{var raw2=String(entity.nbt.UUID);if(raw2.indexOf('[I;')==0)return raw2}catch(ignored2){}
  return ''
}

function petSoundAtEntity(entity,kind){
  if(!entity||!entity.server)return
  var type=petEntityType(entity),dim=petEntityDimension(entity),pos=petEntityPos(entity),species='minecraft:block.note_block.chime',accent='minecraft:block.amethyst_block.resonate',pitch=1
  if(type.indexOf('wolf')>=0){species=kind=='attack'?'minecraft:entity.wolf.growl':(kind=='death'?'minecraft:entity.wolf.death':'minecraft:entity.wolf.hurt');accent=kind=='attack'?'minecraft:entity.phantom.flap':(kind=='death'?'minecraft:block.beacon.deactivate':'minecraft:entity.player.attack.sweep');pitch=kind=='attack'?1.25:(kind=='death'?0.72:0.92)}
  else if(type.indexOf('horse')>=0){species=kind=='death'?'minecraft:entity.horse.death':'minecraft:entity.horse.hurt';accent=kind=='death'?'minecraft:block.beacon.deactivate':'minecraft:block.note_block.bell';pitch=0.82}
  else if(type.indexOf('donkey')>=0){species=kind=='death'?'minecraft:entity.donkey.death':'minecraft:entity.donkey.hurt';pitch=0.78}
  else if(type.indexOf('iron_golem')>=0){species=kind=='attack'?'minecraft:entity.iron_golem.attack':(kind=='death'?'minecraft:entity.iron_golem.death':'minecraft:entity.iron_golem.damage');accent=kind=='attack'?'minecraft:block.anvil.land':'minecraft:block.respawn_anchor.deplete';pitch=kind=='attack'?0.70:0.82}
  entity.server.runCommandSilent('execute in '+dim+' positioned '+pos.x+' '+pos.y+' '+pos.z+' run playsound '+species+' player @a[distance=..24] ~ ~ ~ 0.55 '+pitch)
  entity.server.runCommandSilent('execute in '+dim+' positioned '+pos.x+' '+pos.y+' '+pos.z+' run playsound '+accent+' player @a[distance=..24] ~ ~ ~ 0.26 '+(pitch+0.18))
}

function petDollTarget(player,target){
  if(!player||!target||!player.server||!petOwned(player,'maiden_doll')||player.persistentData.getString('oracleCompanionActiveId')!='maiden_doll')return
  if(petIsPlayer(target)&&String(target.username)==String(player.username))return
  var uuidNbt=petUuidNbt(target);if(!uuidNbt)return
  var tag=petPlayerTag(player),idTag=petIdTag('maiden_doll')
  try{
    player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:iron_golem,tag='+tag+',tag='+idTag+',distance=..40,limit=1] run data merge entity @s {AngerTime:600,AngryAt:'+uuidNbt+'}')
  }catch(ignored){}
}

function petStartPulse(player,id,token){
  if(!player||!player.server)return
  player.server.scheduleInTicks(10,function pulse(){
    try{
      if(!player||!player.server)return
      if(player.persistentData.getInt('oracleCompanionPulseToken')!=token)return
      if(player.persistentData.getString('oracleCompanionActiveId')!=id||!petOwned(player,id))return
      var tag=petPlayerTag(player),idTag=petIdTag(id)
      if(id=='wolf'){
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:wolf,tag='+tag+',tag='+idTag+',distance=..40,limit=1] at @s run particle minecraft:cloud ~ ~0.45 ~ 0.30 0.12 0.30 0.015 7 force')
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:wolf,tag='+tag+',tag='+idTag+',distance=..40,limit=1] run effect give @s minecraft:speed 2 1 true')
      }else if(id=='maiden_doll'){
        // 玩偶壳没有驯服跟随 AI：离主人太远时让它像“守护犬”一样追上来。
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:iron_golem,tag='+tag+',tag='+idTag+',distance=8..18,limit=1] at @s facing entity '+player.username+' eyes run tp @s ^ ^ ^0.75')
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:iron_golem,tag='+tag+',tag='+idTag+',distance=18..80,limit=1] at @s facing entity '+player.username+' eyes run tp @s ^ ^ ^2.2')
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:iron_golem,tag='+tag+',tag='+idTag+',distance=80..,limit=1] run tp @s '+player.username)
        player.server.runCommandSilent('execute at '+player.username+' as @e[type=minecraft:iron_golem,tag='+tag+',tag='+idTag+',distance=..40,limit=1] at @s run particle minecraft:end_rod ~ ~1.2 ~ 0.26 0.38 0.26 0.01 3 force')
      }
      player.server.scheduleInTicks(10,pulse)
    }catch(error){try{console.log('[OraclePets] pulse failed: '+error)}catch(ignored){} }
  })
}

EntityEvents.hurt(function(event){
  try{
    var victim=event.entity,attacker=null;try{attacker=event.source.actual}catch(ignored){}
    if(petEntityHasCompanionTag(victim))petSoundAtEntity(victim,'hurt')
    if(petEntityHasCompanionTag(attacker)){
      petSoundAtEntity(attacker,'attack')
      var owner=petOwnerForEntity(attacker.server,attacker)
      if(owner&&victim&&victim.isPlayer&&victim.isPlayer()&&String(victim.username)==String(owner.username)){event.cancel();return}
    }
    // 玩家主动攻击时，神女玩偶把同一目标视作需要处理的威胁。
    if(petIsPlayer(attacker)&&victim&&!petIsPlayer(victim))petDollTarget(attacker,victim)
    // 玩家被攻击时，玩偶也会转向攻击者。
    if(petIsPlayer(victim)&&attacker&&!petIsPlayer(attacker))petDollTarget(victim,attacker)
  }catch(error){console.log('[OraclePets] companion combat bridge failed: '+error)}
})

EntityEvents.death(function(event){
  try{
    var entity=event.entity;if(!petEntityHasCompanionTag(entity))return
    petSoundAtEntity(entity,'death')
    if(petEntityHasTag(entity,'divine_companion_dismissed'))return
    var id=petIdFromEntity(entity),owner=petOwnerForEntity(entity.server,entity)
    if(!id||!owner)return
    owner.persistentData.putBoolean('oraclePet_'+id,false)
    owner.persistentData.putString('oracleCompanionActiveId','')
    owner.persistentData.putString('oracleCompanionDimension','')
    owner.persistentData.putInt('oracleCompanionPulseToken',owner.persistentData.getInt('oracleCompanionPulseToken')+1)
    try{owner.server.runCommandSilent('data remove storage myteam:companions '+petNameStoragePath(owner,id))}catch(ignoredName){}
    var pet=petFind(id)
    petTell(owner,[{text:'✦ 契约断裂\n',color:'dark_red',bold:true},{text:(pet?pet.name:id)+' 没有沿口哨回来。\n',color:'gold'},{text:'这一次死亡已经把契约本身撕开。若还想再次见到它，只能等待旧匣重新交出同一条紫色命线。',color:'gray',italic:true}])
    owner.server.runCommandSilent('execute at '+owner.username+' run playsound minecraft:block.beacon.deactivate player '+owner.username+' ~ ~ ~ 0.72 0.55')
  }catch(error){console.log('[OraclePets] companion death contract failed: '+error)}
})

PlayerEvents.loggedOut(function(event){try{var p=event.player;if(!p)return;try{if(String(p.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return}catch(ignoredFake){};petDismiss(p,false)}catch(ignored){}})
PlayerEvents.loggedIn(function(event){try{var p=event.player;if(!p)return;try{if(String(p.getClass().getName()).indexOf('com.advancedfakeplayers.entity.FakeServerPlayer')>=0)return}catch(ignoredFake){};if(p.server)p.server.scheduleInTicks(20,function(){try{petDismiss(p,false)}catch(ignored2){}})}catch(ignored){}})

function petShow(player){
  if(!player)return
  petTell(player,[{text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_green'},{text:'🐾 风里留下的契约\n',color:'yellow',bold:true},{text:'口哨只能叫回仍然活着的同行者。主动让它离开不会损伤契约；真正的死亡会让那条命线断掉。这里没有复活按钮。\n',color:'gray',italic:true},petButton('让当前同行者离开','/companions dismiss','red'),{text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_green'}])
  var i=0,owned=0
  for(i=0;i<ORACLE_COMPANIONS.length;i++){
    var pet=ORACLE_COMPANIONS[i]
    if(petOwned(player,pet.id)){owned++;petTell(player,[{text:'\n✦ '+pet.name+'  ',color:'gold',bold:true},petButton('呼唤','/companions summon '+pet.id,'green'),{text:'\n'+pet.flavor+'\n',color:'gray',italic:true},{text:pet.note,color:'dark_gray'}])}
    else petTell(player,{text:'\n◇ 风里有一段没有回应的口哨。',color:'dark_gray',italic:true})
  }
  petTell(player,{text:'\n\n仍在回应你的契约 · '+owned+'/'+ORACLE_COMPANIONS.length,color:'gray'})
}
function petIds(){var out=[],i=0;for(i=0;i<ORACLE_COMPANIONS.length;i++)out.push(ORACLE_COMPANIONS[i].id);return out}

ServerEvents.commandRegistry(function(event){
  var Commands=event.commands,root=Commands.literal('companions')
  root.executes(function(ctx){var p=ctx.source.player;if(!p)return 0;petShow(p);return 1})
  root.then(Commands.literal('dismiss').executes(function(ctx){var p=ctx.source.player;if(!p)return 0;petDismiss(p,true);return 1}))
  var summon=Commands.literal('summon'),i=0
  for(i=0;i<ORACLE_COMPANIONS.length;i++)(function(id){summon.then(Commands.literal(id).executes(function(ctx){var p=ctx.source.player;if(!p)return 0;return petSummon(p,id)?1:0}))})(ORACLE_COMPANIONS[i].id)
  root.then(summon);event.register(root)
})

global.oracleCompanionCatalog=ORACLE_COMPANIONS
global.oracleCompanionFind=petFind
global.oracleCompanionOwned=petOwned
global.oracleCompanionGrant=petGrant
global.oracleCompanionSummon=petSummon
global.oracleCompanionShow=petShow
global.oracleCompanionIds=petIds

console.log('[OraclePets] V10.1 loaded - mortal contracts, wind wolf, maiden doll guardian.')
