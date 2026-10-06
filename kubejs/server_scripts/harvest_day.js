// ============================================================
// 雨母的赞许 · 丰收之日 V3.3
// 低负载版：无 Tick、无自动背包扫描。
//
// - 每位玩家一次性得到一份带礼物 NBT 的 Farmer's Delight 料理
// - /harvest 查看笔记
// - /harvest challenge 接受“亲手再做一份”
// - /harvest done 玩家主动检查一次背包
// - 回忆与口味记录全部由玩家点击触发
// ============================================================

var HARVEST_HISTORY_SIZE = 5
var HARVEST_REWARD_XP = 30

var HARVEST_SOURCE_GUIDE = {
  "wheat": "🌾 小麦 · 普通耕地就能稳定种植。经常做面食的话，家里最好长期留一块麦田。",
  "bread": "🍞 面包 · 用小麦制作。三明治和汉堡一类料理经常需要。",
  "dough": "🥖 面团 · 从小麦继续加工，是饺子、意面和烘焙路线的重要基础。",
  "pasta": "🍝 生意面 · 从面团继续加工。厨房提前备一些，做各种面会轻松很多。",
  "tomato": "🍅 番茄 · 先在野外寻找野生番茄取得种源，再带回农场长期种植。",
  "tomato_sauce": "🍅 番茄酱 · 从番茄继续加工。意面和鱼炖菜非常常用，适合提前准备。",
  "onion": "🧅 洋葱 · 从野生洋葱取得种源。炒饭、汤、汉堡和饺子里都会用到。",
  "cabbage": "🥬 卷心菜 · 从野生卷心菜取得种源。还能继续用砧板处理成卷心菜叶。",
  "rice": "🌾 稻米 · 找到野生稻米以后建立水田。炒饭、米饭和寿司路线都需要。",
  "cooked_rice": "🍚 米饭 · 稻米进一步烹饪得到。寿司料理的基础材料。",
  "carrot": "🥕 胡萝卜 · 村庄农田或者自己的菜园都能稳定供应。",
  "potato": "🥔 马铃薯 · 汤、炖菜和不少正式盘餐都会使用。",
  "beetroot": "❤️ 甜菜根 · 找到种子以后就可以持续种植。",
  "pumpkin": "🎃 南瓜 · 野外取得以后可以长期种植，也可以继续用砧板加工。",
  "melon": "🍉 西瓜 · 建立瓜田以后产量很高，特别适合做饮品和小甜点。",
  "apple": "🍎 苹果 · 橡树和深色橡树树叶有机会掉落。砍树时给厨房留几个。",
  "sweet_berry": "🍓 甜浆果 · 针叶林的浆果丛取得，带回家以后很好扩种。",
  "glow_berry": "✨ 发光浆果 · 去繁茂洞穴寻找。带回来以后也能继续种。",
  "mushroom": "🍄 蘑菇 · 阴暗和潮湿区域比较常见。红、棕两种最好都存一些。",
  "egg": "🥚 鸡蛋 · 养鸡稳定获得。鸡舍对厨房真的非常有用。",
  "milk": "🥛 牛奶 · 养牛以后使用桶取得。饮品、甜点和热菜都会用到。",
  "beef": "🥩 牛肉 · 养牛获得。别全部直接烤掉，留一些给砧板。",
  "minced_beef": "🥩 牛肉馅 · 把生牛肉放到砧板上，用刀继续处理。",
  "beef_patty": "🍔 牛肉饼 · 牛肉馅经过加热得到，是汉堡的核心材料。",
  "chicken": "🍗 鸡肉 · 养鸡获得，也能继续通过砧板加工。",
  "pork": "🐖 猪肉 · 养猪获得，还能进一步进入培根和火腿路线。",
  "bacon": "🥓 培根 · 猪肉继续加工得到。早餐和三明治特别好用。",
  "mutton": "🍖 羊肉 · 养羊获得。通过砧板还能进入羊排料理。",
  "fish": "🐟 鱼 · 钓鱼或者直接去河流、海洋寻找鳕鱼和鲑鱼。",
  "salmon": "🐟 鲑鱼 · 河流和海洋都能找到，也可以通过钓鱼获得。",
  "cod": "🐟 鳕鱼 · 海洋里比较常见，也能直接钓上来。",
  "kelp": "🌿 海带 · 海洋里大量生长。寿司和面汤都会需要。",
  "sugar": "🍬 糖 · 甘蔗制作，是甜点和饮料的常用材料。",
  "honey": "🍯 蜂蜜 · 从蜂巢或蜂箱取得。蜂场稳定以后就很好供应。",
  "cocoa": "🍫 可可豆 · 在丛林树干上寻找。取得以后最好带回家种起来。",
  "bone": "🦴 骨头 · 骷髅掉落。除了骨粉，也能留给厨房熬汤。",
  "ink": "⚫ 墨囊 · 鱿鱼掉落。想做墨鱼汁意面的话别全部拿去染色。",
  "nether_fungi": "🔥 下界菌类 · 去绯红森林或者诡异森林寻找。",
  "bowl": "🥣 碗 · 木板即可制作。厨锅旁长期放一组会方便很多。"
}

var HARVEST_PROFILES = {
  "drink": {
    "effect": "这类饮品更偏向轻松的日常体验。它不一定追求最高的饱腹，而是让普通农作物也多一种值得尝试的吃法。",
    "best": "主城休息 / 农场工作 / 轻松旅行"
  },
  "special_drink": {
    "effect": "这类饮品不只是解渴。有些还拥有普通食物没有的特殊用途，很适合在冒险前后留一份备用。",
    "best": "探索前后 / 状态不佳时 / 随身备用"
  },
  "dessert": {
    "effect": "甜点的价值不只是数值。它们更像是一天忙完以后留给自己的小奖励，也特别适合聚餐。",
    "best": "回家休息 / 聚餐 / 丰收日甜点"
  },
  "snack": {
    "effect": "材料简单、方便携带。最大的优点就是不用每一次饿了，都专门准备一整顿复杂的大餐。",
    "best": "日常跑图 / 旅行零食 / 早期生存"
  },
  "fresh": {
    "effect": "主要依靠农场里的新鲜收获。不需要复杂加工，也很适合喜欢种田或者不想顿顿吃肉的人。",
    "best": "农场生活 / 日常补给 / 蔬菜路线"
  },
  "portable": {
    "effect": "比普通面包更像一顿完整的饭，同时又非常方便带走，是很舒服的旅行主食。",
    "best": "跑图 / 下矿 / 长途探索"
  },
  "warm": {
    "effect": "热汤和热食很能体现 Farmer’s Delight 的厨房感。材料不再只是直接吃，而是真的被慢慢做成了一顿饭。",
    "best": "回家以后 / 夜晚 / 探索结束后"
  },
  "hearty": {
    "effect": "这已经是一顿真正的正餐。准备会比普通零食复杂一点，但也更适合长时间活动之前认真吃一顿。",
    "best": "下矿 / 长途探索 / 正式晚饭"
  },
  "special": {
    "effect": "这类料理最大的魅力来自比较特别的材料和制作路线，很适合发现平时容易错过的厨房玩法。",
    "best": "尝鲜 / 收集料理 / 聚餐"
  },
  "feast": {
    "effect": "这已经不是站着随手吃掉的食物了。它更适合真正摆到桌上，和其他人一起分着吃。",
    "best": "朋友聚餐 / 主城晚饭 / 丰收日宴席"
  }
}

var HARVEST_DISHES = [
  {
    "id": "hot_cocoa",
    "item": "farmersdelight:hot_cocoa",
    "name": "热可可",
    "icon": "☕",
    "weight": 4,
    "rarity": "暖饮",
    "station": "厨锅",
    "profile": "special_drink",
    "flavor": "一杯暖乎乎的可可。光是拿在手上，就已经很像“今天别再赶路了”。",
    "ingredients": [
      "牛奶",
      "糖",
      "可可豆"
    ],
    "sources": [
      "milk",
      "sugar",
      "cocoa"
    ],
    "steps": [
      "准备牛奶、糖和可可豆。",
      "把材料放进加热中的厨锅。",
      "煮好以后盛出来。"
    ],
    "tip": "第一次找到丛林时多带一些可可豆回来，以后就不用为了喝一杯再跑很远。",
    "giftable": true
  },
  {
    "id": "apple_cider",
    "item": "farmersdelight:apple_cider",
    "name": "苹果酒",
    "icon": "🍎",
    "weight": 4,
    "rarity": "暖饮",
    "station": "厨锅",
    "profile": "drink",
    "flavor": "苹果慢慢煮出甜香以后，比直接从树下捡起来吃有仪式感多了。",
    "ingredients": [
      "苹果",
      "糖"
    ],
    "sources": [
      "apple",
      "sugar"
    ],
    "steps": [
      "准备苹果和糖。",
      "放进厨锅。",
      "慢慢熬成一杯热饮。"
    ],
    "tip": "砍树时给厨房留几个苹果。",
    "giftable": true
  },
  {
    "id": "melon_juice",
    "item": "farmersdelight:melon_juice",
    "name": "西瓜汁",
    "icon": "🍉",
    "weight": 5,
    "rarity": "清凉饮品",
    "station": "厨房加工",
    "profile": "drink",
    "flavor": "简单、清爽，而且西瓜田成熟以后几乎不用担心材料。",
    "ingredients": [
      "西瓜"
    ],
    "sources": [
      "melon"
    ],
    "steps": [
      "收获成熟西瓜。",
      "按照配方加工成西瓜汁。"
    ],
    "tip": "西瓜非常高产，这种饮料不用省着。",
    "giftable": true
  },
  {
    "id": "apple_pie",
    "item": "farmersdelight:apple_pie",
    "name": "苹果派",
    "icon": "🥧",
    "weight": 3,
    "rarity": "甜点",
    "station": "烘焙",
    "profile": "dessert",
    "flavor": "刚烤好的苹果派只要摆上桌，厨房就突然很像一个真正的家。",
    "ingredients": [
      "苹果",
      "糖",
      "烘焙材料"
    ],
    "sources": [
      "apple",
      "sugar",
      "wheat"
    ],
    "steps": [
      "准备苹果。",
      "准备糖和烘焙材料。",
      "按照配方完成整份苹果派。"
    ],
    "tip": "可以专门留一个箱子存水果、糖和小麦。",
    "giftable": true
  },
  {
    "id": "sweet_berry_cheesecake",
    "item": "farmersdelight:sweet_berry_cheesecake",
    "name": "甜浆果芝士蛋糕",
    "icon": "🍰",
    "weight": 2,
    "rarity": "精致甜点",
    "station": "烘焙",
    "profile": "dessert",
    "flavor": "酸甜浆果加上奶香，是那种端出来以后大家都会多看两眼的甜点。",
    "ingredients": [
      "甜浆果",
      "奶类材料",
      "糖",
      "烘焙材料"
    ],
    "sources": [
      "sweet_berry",
      "milk",
      "sugar",
      "wheat"
    ],
    "steps": [
      "准备甜浆果。",
      "准备奶类材料和糖。",
      "备好烘焙材料。",
      "完成芝士蛋糕。"
    ],
    "tip": "甜浆果带回家以后很好扩种。",
    "giftable": true
  },
  {
    "id": "chocolate_pie",
    "item": "farmersdelight:chocolate_pie",
    "name": "巧克力派",
    "icon": "🍫",
    "weight": 2,
    "rarity": "精致甜点",
    "station": "烘焙",
    "profile": "dessert",
    "flavor": "今天厨房里如果能闻到巧克力香，那已经很难算普通的一天了。",
    "ingredients": [
      "可可豆",
      "牛奶",
      "糖",
      "派类材料"
    ],
    "sources": [
      "cocoa",
      "milk",
      "sugar",
      "wheat"
    ],
    "steps": [
      "准备可可豆。",
      "准备牛奶和糖。",
      "备好派类材料。",
      "完成巧克力派。"
    ],
    "tip": "第一批可可豆最好拿一部分回家扩种。",
    "giftable": true
  },
  {
    "id": "sweet_berry_cookie",
    "item": "farmersdelight:sweet_berry_cookie",
    "name": "甜浆果曲奇",
    "icon": "🍪",
    "weight": 5,
    "rarity": "小点心",
    "station": "工作台",
    "profile": "snack",
    "flavor": "不算大餐，但很适合顺手多做几块塞进旅行背包。",
    "ingredients": [
      "小麦",
      "甜浆果"
    ],
    "sources": [
      "wheat",
      "sweet_berry"
    ],
    "steps": [
      "准备小麦。",
      "摘一些甜浆果。",
      "做成曲奇。"
    ],
    "tip": "顺手多做一些，出门会很方便。",
    "giftable": true
  },
  {
    "id": "honey_cookie",
    "item": "farmersdelight:honey_cookie",
    "name": "蜂蜜曲奇",
    "icon": "🍯",
    "weight": 4,
    "rarity": "小点心",
    "station": "工作台",
    "profile": "snack",
    "flavor": "麦香里加一点蜂蜜，就是很简单的丰收季味道。",
    "ingredients": [
      "小麦",
      "蜂蜜"
    ],
    "sources": [
      "wheat",
      "honey"
    ],
    "steps": [
      "准备小麦。",
      "取得蜂蜜。",
      "制作蜂蜜曲奇。"
    ],
    "tip": "有稳定蜂场以后会非常便宜。",
    "giftable": true
  },
  {
    "id": "melon_popsicle",
    "item": "farmersdelight:melon_popsicle",
    "name": "西瓜冰棒",
    "icon": "🍧",
    "weight": 4,
    "rarity": "小甜品",
    "station": "工作台",
    "profile": "dessert",
    "flavor": "不一定每次丰收都要坐下一桌大餐。一根冰棒有时已经足够。",
    "ingredients": [
      "西瓜",
      "冰",
      "木棍"
    ],
    "sources": [
      "melon"
    ],
    "steps": [
      "准备西瓜。",
      "准备冰和木棍。",
      "按照配方做成冰棒。"
    ],
    "tip": "西瓜产量高，放心多做。",
    "giftable": true
  },
  {
    "id": "glow_berry_custard",
    "item": "farmersdelight:glow_berry_custard",
    "name": "发光浆果蛋奶羹",
    "icon": "✨",
    "weight": 3,
    "rarity": "特色甜点",
    "station": "厨锅",
    "profile": "dessert",
    "flavor": "会微微发亮的甜点，本身就有一个很好的“值得尝一次”的理由。",
    "ingredients": [
      "发光浆果",
      "鸡蛋",
      "牛奶",
      "糖"
    ],
    "sources": [
      "glow_berry",
      "egg",
      "milk",
      "sugar"
    ],
    "steps": [
      "准备发光浆果。",
      "准备鸡蛋、牛奶和糖。",
      "放进厨锅烹饪。"
    ],
    "tip": "发光浆果带回家以后就能长期种。",
    "giftable": true
  },
  {
    "id": "fruit_salad",
    "item": "farmersdelight:fruit_salad",
    "name": "水果沙拉",
    "icon": "🍓",
    "weight": 5,
    "rarity": "清爽料理",
    "station": "工作台",
    "profile": "fresh",
    "flavor": "不需要开火，把刚摘下来的东西装进碗里就已经很好。",
    "ingredients": [
      "水果或浆果",
      "碗"
    ],
    "sources": [
      "apple",
      "sweet_berry",
      "glow_berry",
      "bowl"
    ],
    "steps": [
      "准备可以使用的水果和浆果。",
      "拿一个碗。",
      "组合成水果沙拉。"
    ],
    "tip": "旅行路上顺手摘水果，这道菜往往不需要特别准备。",
    "giftable": true
  },
  {
    "id": "mixed_salad",
    "item": "farmersdelight:mixed_salad",
    "name": "混合沙拉",
    "icon": "🥗",
    "weight": 5,
    "rarity": "清爽料理",
    "station": "工作台",
    "profile": "fresh",
    "flavor": "一份真正来自菜园的料理，很适合喜欢种田的人。",
    "ingredients": [
      "绿叶蔬菜",
      "番茄",
      "甜菜根",
      "碗"
    ],
    "sources": [
      "cabbage",
      "tomato",
      "beetroot",
      "bowl"
    ],
    "steps": [
      "准备绿叶。",
      "准备番茄和甜菜根。",
      "装进碗里。"
    ],
    "tip": "卷心菜叶很值得常备。",
    "giftable": true
  },
  {
    "id": "nether_salad",
    "item": "farmersdelight:nether_salad",
    "name": "下界沙拉",
    "icon": "🔥",
    "weight": 3,
    "rarity": "特色料理",
    "station": "工作台",
    "profile": "special",
    "flavor": "今天这一份“丰收”，偏偏不是从农田里来的。",
    "ingredients": [
      "下界菌类",
      "碗"
    ],
    "sources": [
      "nether_fungi",
      "bowl"
    ],
    "steps": [
      "前往下界寻找菌类。",
      "准备一个碗。",
      "按照配方组合。"
    ],
    "tip": "第一次去下界时可以把不同菌类都存一点。",
    "giftable": true
  },
  {
    "id": "barbecue_stick",
    "item": "farmersdelight:barbecue_stick",
    "name": "烧烤肉串",
    "icon": "🍢",
    "weight": 5,
    "rarity": "便携小食",
    "station": "工作台",
    "profile": "snack",
    "flavor": "零散熟肉、番茄和洋葱串起来，就能突然变得很像一顿饭。",
    "ingredients": [
      "熟肉或熟鱼",
      "番茄",
      "洋葱",
      "木棍"
    ],
    "sources": [
      "beef",
      "chicken",
      "pork",
      "fish",
      "tomato",
      "onion"
    ],
    "steps": [
      "准备熟肉或熟鱼。",
      "准备番茄和洋葱。",
      "准备木棍。",
      "串成肉串。"
    ],
    "tip": "特别适合清厨房里的零散熟肉。",
    "giftable": true
  },
  {
    "id": "egg_sandwich",
    "item": "farmersdelight:egg_sandwich",
    "name": "鸡蛋三明治",
    "icon": "🥪",
    "weight": 5,
    "rarity": "便携主食",
    "station": "工作台",
    "profile": "portable",
    "flavor": "材料便宜、准备很快，是那种可以长期住在旅行背包里的饭。",
    "ingredients": [
      "面包",
      "熟鸡蛋"
    ],
    "sources": [
      "bread",
      "egg"
    ],
    "steps": [
      "准备面包。",
      "把鸡蛋烹熟。",
      "组合成三明治。"
    ],
    "tip": "有鸡舍以后基本随时都能做。",
    "giftable": true
  },
  {
    "id": "chicken_sandwich",
    "item": "farmersdelight:chicken_sandwich",
    "name": "鸡肉三明治",
    "icon": "🥪",
    "weight": 5,
    "rarity": "便携主食",
    "station": "工作台",
    "profile": "portable",
    "flavor": "热鸡肉加上脆蔬菜，比普通面包更像一顿完整旅行餐。",
    "ingredients": [
      "面包",
      "熟鸡肉",
      "绿叶蔬菜",
      "胡萝卜"
    ],
    "sources": [
      "bread",
      "chicken",
      "cabbage",
      "carrot"
    ],
    "steps": [
      "准备面包。",
      "烹熟鸡肉。",
      "准备绿叶和胡萝卜。",
      "组合成三明治。"
    ],
    "tip": "提前处理鸡肉以后会很快。",
    "giftable": true
  },
  {
    "id": "hamburger",
    "item": "farmersdelight:hamburger",
    "name": "汉堡包",
    "icon": "🍔",
    "weight": 4,
    "rarity": "丰盛主食",
    "station": "工作台",
    "profile": "hearty",
    "flavor": "从牛肉馅到牛肉饼，再到完整汉堡，很能体现“加工以后更像一顿饭”的感觉。",
    "ingredients": [
      "面包",
      "牛肉饼",
      "绿叶蔬菜",
      "番茄",
      "洋葱"
    ],
    "sources": [
      "bread",
      "beef",
      "minced_beef",
      "beef_patty",
      "cabbage",
      "tomato",
      "onion"
    ],
    "steps": [
      "把生牛肉加工成牛肉馅。",
      "把牛肉馅加热成牛肉饼。",
      "准备番茄、洋葱和绿叶。",
      "用面包组合。"
    ],
    "tip": "牛肉馅和牛肉饼一次多做一点。",
    "giftable": true
  },
  {
    "id": "bacon_sandwich",
    "item": "farmersdelight:bacon_sandwich",
    "name": "培根三明治",
    "icon": "🥓",
    "weight": 4,
    "rarity": "便携主食",
    "station": "工作台",
    "profile": "portable",
    "flavor": "培根变成三明治以后特别适合出门的时候随手带走。",
    "ingredients": [
      "面包",
      "熟培根",
      "番茄",
      "绿叶蔬菜"
    ],
    "sources": [
      "bread",
      "pork",
      "bacon",
      "tomato",
      "cabbage"
    ],
    "steps": [
      "准备并烹熟培根。",
      "准备番茄和绿叶。",
      "夹进面包。"
    ],
    "tip": "熟培根特别适合长期常备。",
    "giftable": true
  },
  {
    "id": "mutton_wrap",
    "item": "farmersdelight:mutton_wrap",
    "name": "羊肉卷",
    "icon": "🌯",
    "weight": 4,
    "rarity": "便携主食",
    "station": "工作台",
    "profile": "portable",
    "flavor": "热羊肉和洋葱卷起来，是很扎实的一份旅行餐。",
    "ingredients": [
      "面包",
      "熟羊肉",
      "洋葱",
      "绿叶蔬菜"
    ],
    "sources": [
      "bread",
      "mutton",
      "onion",
      "cabbage"
    ],
    "steps": [
      "准备熟羊肉。",
      "准备洋葱和绿叶。",
      "按照配方卷起来。"
    ],
    "tip": "羊场不只是羊毛来源。",
    "giftable": true
  },
  {
    "id": "stuffed_potato",
    "item": "farmersdelight:stuffed_potato",
    "name": "填馅马铃薯",
    "icon": "🥔",
    "weight": 4,
    "rarity": "家常料理",
    "station": "厨房料理",
    "profile": "hearty",
    "flavor": "普通马铃薯塞进肉和奶香以后，突然就从配菜变成了一顿饭。",
    "ingredients": [
      "马铃薯",
      "肉类材料",
      "奶类材料"
    ],
    "sources": [
      "potato",
      "beef",
      "milk"
    ],
    "steps": [
      "准备马铃薯。",
      "准备肉类。",
      "准备奶类材料。",
      "完成填馅。"
    ],
    "tip": "马铃薯别全部拿去煮汤。",
    "giftable": true
  },
  {
    "id": "cabbage_rolls",
    "item": "farmersdelight:cabbage_rolls",
    "name": "卷心菜卷",
    "icon": "🥬",
    "weight": 4,
    "rarity": "家常料理",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "很适合把厨房只剩一点点的材料重新变成完整料理。",
    "ingredients": [
      "卷心菜叶",
      "合适的馅料"
    ],
    "sources": [
      "cabbage",
      "beef",
      "chicken",
      "pork",
      "fish",
      "mushroom"
    ],
    "steps": [
      "准备卷心菜叶。",
      "选择合适的馅料。",
      "放进厨锅。"
    ],
    "tip": "特别适合清零散库存。",
    "giftable": true
  },
  {
    "id": "salmon_roll",
    "item": "farmersdelight:salmon_roll",
    "name": "鲑鱼卷",
    "icon": "🍣",
    "weight": 3,
    "rarity": "特色主食",
    "station": "工作台",
    "profile": "special",
    "flavor": "鱼片和米饭碰到一起以后，稻田终于不只是为了炒饭存在。",
    "ingredients": [
      "鲑鱼片",
      "米饭"
    ],
    "sources": [
      "salmon",
      "rice",
      "cooked_rice"
    ],
    "steps": [
      "取得鲑鱼。",
      "用砧板处理成鱼片。",
      "准备米饭。",
      "组合成鲑鱼卷。"
    ],
    "tip": "捕鱼时一次多处理几条鱼。",
    "giftable": true
  },
  {
    "id": "cod_roll",
    "item": "farmersdelight:cod_roll",
    "name": "鳕鱼卷",
    "icon": "🍣",
    "weight": 3,
    "rarity": "特色主食",
    "station": "工作台",
    "profile": "special",
    "flavor": "鳕鱼比较容易找到，很适合第一次尝试寿司路线。",
    "ingredients": [
      "鳕鱼片",
      "米饭"
    ],
    "sources": [
      "cod",
      "rice",
      "cooked_rice"
    ],
    "steps": [
      "取得鳕鱼。",
      "加工成鳕鱼片。",
      "准备米饭。",
      "组合成鳕鱼卷。"
    ],
    "tip": "鳕鱼通常比想象中好找。",
    "giftable": true
  },
  {
    "id": "kelp_roll",
    "item": "farmersdelight:kelp_roll",
    "name": "海带卷",
    "icon": "🍙",
    "weight": 4,
    "rarity": "便携主食",
    "station": "工作台",
    "profile": "portable",
    "flavor": "米饭、海带和蔬菜组合起来，很适合拿着出门。",
    "ingredients": [
      "海带",
      "米饭",
      "蔬菜"
    ],
    "sources": [
      "kelp",
      "rice",
      "cooked_rice",
      "carrot",
      "cabbage"
    ],
    "steps": [
      "收集海带。",
      "准备米饭。",
      "准备蔬菜。",
      "按照配方卷起来。"
    ],
    "tip": "有海带场以后非常舒服。",
    "giftable": true
  },
  {
    "id": "dumplings",
    "item": "farmersdelight:dumplings",
    "name": "饺子",
    "icon": "🥟",
    "weight": 3,
    "rarity": "热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "面团、菜和馅料一起下锅以后，就真的有了认真做饭的感觉。",
    "ingredients": [
      "面团",
      "卷心菜",
      "洋葱",
      "合适的馅料"
    ],
    "sources": [
      "dough",
      "cabbage",
      "onion",
      "beef",
      "chicken",
      "pork",
      "mushroom"
    ],
    "steps": [
      "准备面团。",
      "准备卷心菜和洋葱。",
      "选择肉类或蘑菇馅。",
      "放进厨锅。"
    ],
    "tip": "没有肉时可以看看蘑菇路线。",
    "giftable": true
  },
  {
    "id": "bone_broth",
    "item": "farmersdelight:bone_broth",
    "name": "骨汤",
    "icon": "🍲",
    "weight": 4,
    "rarity": "温暖热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "刷怪留下来的骨头终于不只有骨粉这一种归宿。",
    "ingredients": [
      "骨头",
      "合适的蘑菇或植物"
    ],
    "sources": [
      "bone",
      "mushroom"
    ],
    "steps": [
      "准备骨头。",
      "准备合适辅料。",
      "放进厨锅慢慢熬。"
    ],
    "tip": "骨头可以给厨房留一点。",
    "giftable": true
  },
  {
    "id": "beef_stew",
    "item": "farmersdelight:beef_stew",
    "name": "牛肉炖",
    "icon": "🥘",
    "weight": 4,
    "rarity": "丰盛热食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "牛肉、胡萝卜和马铃薯慢慢炖在一起，是最朴素也最让人安心的一顿饭。",
    "ingredients": [
      "牛肉",
      "胡萝卜",
      "马铃薯"
    ],
    "sources": [
      "beef",
      "carrot",
      "potato"
    ],
    "steps": [
      "准备牛肉。",
      "准备胡萝卜和马铃薯。",
      "放进厨锅慢炖。"
    ],
    "tip": "胡萝卜和马铃薯都很适合量产。",
    "giftable": true
  },
  {
    "id": "chicken_soup",
    "item": "farmersdelight:chicken_soup",
    "name": "鸡肉汤",
    "icon": "🍲",
    "weight": 4,
    "rarity": "温暖热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "鸡肉和蔬菜熬成热汤，特别适合折腾一天以后回家喝。",
    "ingredients": [
      "鸡肉",
      "胡萝卜",
      "绿叶蔬菜",
      "其他蔬菜"
    ],
    "sources": [
      "chicken",
      "carrot",
      "cabbage"
    ],
    "steps": [
      "准备鸡肉。",
      "准备胡萝卜和绿叶。",
      "补上需要的其他蔬菜。",
      "放进厨锅。"
    ],
    "tip": "很适合直接利用菜园库存。",
    "giftable": true
  },
  {
    "id": "vegetable_soup",
    "item": "farmersdelight:vegetable_soup",
    "name": "蔬菜汤",
    "icon": "🥣",
    "weight": 5,
    "rarity": "温暖热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "完全不用肉，一片完整菜园就足够做出一顿热饭。",
    "ingredients": [
      "胡萝卜",
      "马铃薯",
      "甜菜根",
      "绿叶蔬菜"
    ],
    "sources": [
      "carrot",
      "potato",
      "beetroot",
      "cabbage"
    ],
    "steps": [
      "准备胡萝卜。",
      "准备马铃薯和甜菜根。",
      "加入绿叶。",
      "放进厨锅。"
    ],
    "tip": "纯种田玩家也可以稳定量产。",
    "giftable": true
  },
  {
    "id": "fish_stew",
    "item": "farmersdelight:fish_stew",
    "name": "鱼炖菜",
    "icon": "🐟",
    "weight": 3,
    "rarity": "丰盛热食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "比直接烤鱼多几步，但也真的把捕鱼、番茄和厨房连了起来。",
    "ingredients": [
      "鱼",
      "番茄酱",
      "洋葱"
    ],
    "sources": [
      "fish",
      "tomato",
      "tomato_sauce",
      "onion"
    ],
    "steps": [
      "准备鱼。",
      "准备番茄酱。",
      "准备洋葱。",
      "放进厨锅。"
    ],
    "tip": "提前准备番茄酱会省很多时间。",
    "giftable": true
  },
  {
    "id": "fried_rice",
    "item": "farmersdelight:fried_rice",
    "name": "炒饭",
    "icon": "🍚",
    "weight": 5,
    "rarity": "家常主食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "稻米、鸡蛋和普通蔬菜碰在一起，就是非常可靠的一碗主食。",
    "ingredients": [
      "稻米",
      "鸡蛋",
      "胡萝卜",
      "洋葱"
    ],
    "sources": [
      "rice",
      "egg",
      "carrot",
      "onion"
    ],
    "steps": [
      "准备稻米。",
      "准备鸡蛋。",
      "准备胡萝卜和洋葱。",
      "放进厨锅。"
    ],
    "tip": "稻田和鸡舍齐了以后特别稳定。",
    "giftable": true
  },
  {
    "id": "pumpkin_soup",
    "item": "farmersdelight:pumpkin_soup",
    "name": "南瓜汤",
    "icon": "🎃",
    "weight": 3,
    "rarity": "温暖热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "南瓜终于不只是摆在门口，而是真的变成一碗浓浓的晚饭。",
    "ingredients": [
      "南瓜",
      "绿叶蔬菜",
      "猪肉",
      "牛奶"
    ],
    "sources": [
      "pumpkin",
      "cabbage",
      "pork",
      "milk"
    ],
    "steps": [
      "准备南瓜。",
      "准备绿叶。",
      "准备猪肉和牛奶。",
      "放进厨锅。"
    ],
    "tip": "处理南瓜时可以多备一点。",
    "giftable": true
  },
  {
    "id": "baked_cod_stew",
    "item": "farmersdelight:baked_cod_stew",
    "name": "焗鳕鱼炖菜",
    "icon": "🐟",
    "weight": 3,
    "rarity": "丰盛热食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "鳕鱼、马铃薯、鸡蛋和番茄放在一起，比站在炉子旁直接啃鱼认真多了。",
    "ingredients": [
      "鳕鱼",
      "马铃薯",
      "鸡蛋",
      "番茄"
    ],
    "sources": [
      "cod",
      "potato",
      "egg",
      "tomato"
    ],
    "steps": [
      "准备鳕鱼。",
      "准备马铃薯。",
      "准备鸡蛋和番茄。",
      "放进厨锅。"
    ],
    "tip": "有鸡舍和菜园以后通常只差鱼。",
    "giftable": true
  },
  {
    "id": "noodle_soup",
    "item": "farmersdelight:noodle_soup",
    "name": "面条汤",
    "icon": "🍜",
    "weight": 4,
    "rarity": "温暖主食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "热汤、面条、鸡蛋和肉冒着热气端上来时，已经很像“好好吃顿饭”了。",
    "ingredients": [
      "生意面",
      "鸡蛋",
      "海带",
      "猪肉"
    ],
    "sources": [
      "dough",
      "pasta",
      "egg",
      "kelp",
      "pork"
    ],
    "steps": [
      "准备生意面。",
      "准备鸡蛋和海带。",
      "准备猪肉。",
      "放进厨锅。"
    ],
    "tip": "生意面和海带提前备好以后会很快。",
    "giftable": true
  },
  {
    "id": "onion_soup",
    "item": "farmersdelight:onion_soup",
    "name": "洋葱汤",
    "icon": "🧅",
    "weight": 4,
    "rarity": "温暖热食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "普通洋葱慢慢煮以后，也能变成一顿很舒服的热汤。",
    "ingredients": [
      "洋葱",
      "面包",
      "牛奶"
    ],
    "sources": [
      "onion",
      "bread",
      "milk"
    ],
    "steps": [
      "准备洋葱。",
      "准备面包。",
      "准备牛奶。",
      "放进厨锅。"
    ],
    "tip": "洋葱非常值得多种一点。",
    "giftable": true
  },
  {
    "id": "mushroom_rice",
    "item": "farmersdelight:mushroom_rice",
    "name": "蘑菇饭",
    "icon": "🍄",
    "weight": 3,
    "rarity": "家常主食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "蘑菇的香味全煮进米饭里，不需要肉也能是一顿很满足的饭。",
    "ingredients": [
      "红蘑菇",
      "棕蘑菇",
      "稻米",
      "根茎蔬菜"
    ],
    "sources": [
      "mushroom",
      "rice",
      "carrot",
      "potato"
    ],
    "steps": [
      "准备两种蘑菇。",
      "准备稻米。",
      "准备根茎蔬菜。",
      "放进厨锅。"
    ],
    "tip": "红、棕两种蘑菇都可以长期存一点。",
    "giftable": true
  },
  {
    "id": "bacon_and_eggs",
    "item": "farmersdelight:bacon_and_eggs",
    "name": "培根煎蛋",
    "icon": "🍳",
    "weight": 5,
    "rarity": "早餐",
    "station": "厨房料理",
    "profile": "hearty",
    "flavor": "猪圈和鸡舍稳定以后，这就是很容易做、又真的像早餐的一盘。",
    "ingredients": [
      "培根",
      "鸡蛋"
    ],
    "sources": [
      "pork",
      "bacon",
      "egg"
    ],
    "steps": [
      "准备培根。",
      "烹熟培根。",
      "准备鸡蛋。",
      "完成早餐。"
    ],
    "tip": "熟培根特别适合常备。",
    "giftable": true
  },
  {
    "id": "pasta_with_meatballs",
    "item": "farmersdelight:pasta_with_meatballs",
    "name": "肉丸意面",
    "icon": "🍝",
    "weight": 3,
    "rarity": "丰盛主食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "牛肉馅、意面和番茄酱三条加工路线最后汇进同一个锅，很有厨房发展起来的感觉。",
    "ingredients": [
      "牛肉馅",
      "生意面",
      "番茄酱"
    ],
    "sources": [
      "beef",
      "minced_beef",
      "dough",
      "pasta",
      "tomato",
      "tomato_sauce"
    ],
    "steps": [
      "准备牛肉馅。",
      "准备生意面。",
      "准备番茄酱。",
      "放进厨锅。"
    ],
    "tip": "三种半成品都很值得提前批量做。",
    "giftable": true
  },
  {
    "id": "pasta_with_mutton_chop",
    "item": "farmersdelight:pasta_with_mutton_chop",
    "name": "羊排意面",
    "icon": "🍝",
    "weight": 2,
    "rarity": "精致主食",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "比普通面食更费准备，也更像一顿真正认真做出来的晚饭。",
    "ingredients": [
      "羊肉料理材料",
      "生意面",
      "番茄酱"
    ],
    "sources": [
      "mutton",
      "dough",
      "pasta",
      "tomato",
      "tomato_sauce"
    ],
    "steps": [
      "准备羊肉料理材料。",
      "准备生意面。",
      "准备番茄酱。",
      "放进厨锅。"
    ],
    "tip": "羊肉别全部直接烤掉。",
    "giftable": true
  },
  {
    "id": "roasted_mutton_chops",
    "item": "farmersdelight:roasted_mutton_chops",
    "name": "烤羊排",
    "icon": "🍖",
    "weight": 2,
    "rarity": "正式盘餐",
    "station": "厨房料理",
    "profile": "hearty",
    "flavor": "这已经不是该边跑边吃的东西，而是应该找张桌子坐下来的晚饭。",
    "ingredients": [
      "羊排",
      "配菜"
    ],
    "sources": [
      "mutton",
      "carrot",
      "potato",
      "cabbage"
    ],
    "steps": [
      "准备羊肉。",
      "在砧板上继续加工。",
      "准备配菜。",
      "完成正式盘餐。"
    ],
    "tip": "羊排材料可以一次多准备一些。",
    "giftable": true
  },
  {
    "id": "vegetable_noodles",
    "item": "farmersdelight:vegetable_noodles",
    "name": "蔬菜面",
    "icon": "🍜",
    "weight": 4,
    "rarity": "家常主食",
    "station": "厨锅",
    "profile": "warm",
    "flavor": "不用肉，也完全可以是一碗很完整的面。",
    "ingredients": [
      "生意面",
      "胡萝卜",
      "蘑菇",
      "绿叶蔬菜",
      "其他蔬菜"
    ],
    "sources": [
      "dough",
      "pasta",
      "carrot",
      "mushroom",
      "cabbage"
    ],
    "steps": [
      "准备生意面。",
      "准备胡萝卜和蘑菇。",
      "准备绿叶和其他蔬菜。",
      "放进厨锅。"
    ],
    "tip": "完整菜园发展起来以后特别舒服。",
    "giftable": true
  },
  {
    "id": "steak_and_potatoes",
    "item": "farmersdelight:steak_and_potatoes",
    "name": "牛排配马铃薯",
    "icon": "🥩",
    "weight": 3,
    "rarity": "正式盘餐",
    "station": "厨房料理",
    "profile": "hearty",
    "flavor": "牛排、马铃薯和配菜摆在一起，就是很扎实的一顿正式晚饭。",
    "ingredients": [
      "牛排",
      "马铃薯",
      "配菜"
    ],
    "sources": [
      "beef",
      "potato",
      "carrot",
      "cabbage"
    ],
    "steps": [
      "准备牛排。",
      "准备马铃薯。",
      "准备配菜。",
      "完成正式盘餐。"
    ],
    "tip": "牛肉和马铃薯都很适合量产。",
    "giftable": true
  },
  {
    "id": "ratatouille",
    "item": "farmersdelight:ratatouille",
    "name": "蔬菜杂烩",
    "icon": "🥘",
    "weight": 4,
    "rarity": "丰盛蔬菜料理",
    "station": "厨锅",
    "profile": "hearty",
    "flavor": "不需要肉，一片成熟菜园就足够做出非常有分量的一顿。",
    "ingredients": [
      "番茄",
      "洋葱",
      "甜菜根",
      "其他蔬菜"
    ],
    "sources": [
      "tomato",
      "onion",
      "beetroot",
      "carrot",
      "potato",
      "cabbage"
    ],
    "steps": [
      "准备番茄和洋葱。",
      "准备甜菜根。",
      "补一种其他蔬菜。",
      "放进厨锅。"
    ],
    "tip": "完整菜园几乎可以原地解决材料。",
    "giftable": true
  },
  {
    "id": "squid_ink_pasta",
    "item": "farmersdelight:squid_ink_pasta",
    "name": "墨鱼汁意面",
    "icon": "🦑",
    "weight": 2,
    "rarity": "特色料理",
    "station": "厨锅",
    "profile": "special",
    "flavor": "黑色意面本身就很有记忆点，也会让人发现墨囊原来不只是染料。",
    "ingredients": [
      "生意面",
      "鱼",
      "番茄",
      "墨囊"
    ],
    "sources": [
      "dough",
      "pasta",
      "fish",
      "tomato",
      "ink"
    ],
    "steps": [
      "准备生意面。",
      "准备鱼和番茄。",
      "取得墨囊。",
      "放进厨锅。"
    ],
    "tip": "别把所有墨囊都拿去染色。",
    "giftable": true
  },
  {
    "id": "grilled_salmon",
    "item": "farmersdelight:grilled_salmon",
    "name": "香烤鲑鱼",
    "icon": "🐟",
    "weight": 3,
    "rarity": "正式盘餐",
    "station": "厨房料理",
    "profile": "hearty",
    "flavor": "同样是鲑鱼，认真摆成一盘以后，就完全不像站在熔炉旁直接啃掉。",
    "ingredients": [
      "鲑鱼",
      "配菜"
    ],
    "sources": [
      "salmon",
      "carrot",
      "potato",
      "cabbage"
    ],
    "steps": [
      "取得鲑鱼。",
      "准备配菜。",
      "完成香烤鲑鱼。"
    ],
    "tip": "钓鱼时多留几条给厨房。",
    "giftable": true
  },
  {
    "id": "roast_chicken_block",
    "item": "farmersdelight:roast_chicken_block",
    "name": "烤鸡大餐",
    "icon": "🍗",
    "weight": 1,
    "rarity": "大型宴席",
    "station": "厨锅 · 宴席",
    "profile": "feast",
    "flavor": "今天这一份明显不是为了一个人偷偷站在厨房里吃掉的。",
    "ingredients": [
      "鸡肉",
      "多种蔬菜",
      "宴席配料"
    ],
    "sources": [
      "chicken",
      "carrot",
      "potato",
      "cabbage",
      "onion"
    ],
    "steps": [
      "准备鸡肉。",
      "准备多种蔬菜和宴席配料。",
      "在厨锅完成完整宴席。"
    ],
    "tip": "这种料理很适合叫别人一起准备。",
    "giftable": false
  },
  {
    "id": "stuffed_pumpkin_block",
    "item": "farmersdelight:stuffed_pumpkin_block",
    "name": "填馅南瓜",
    "icon": "🎃",
    "weight": 1,
    "rarity": "大型宴席",
    "station": "厨锅 · 宴席",
    "profile": "feast",
    "flavor": "把整个南瓜塞满农场收获，它大概就是“丰收日”最直观的样子。",
    "ingredients": [
      "南瓜",
      "稻米",
      "洋葱",
      "蘑菇",
      "马铃薯",
      "浆果",
      "蔬菜"
    ],
    "sources": [
      "pumpkin",
      "rice",
      "onion",
      "mushroom",
      "potato",
      "sweet_berry",
      "cabbage"
    ],
    "steps": [
      "准备完整南瓜。",
      "准备稻米和洋葱。",
      "准备蘑菇、马铃薯和浆果。",
      "补齐其他蔬菜。",
      "完成宴席。"
    ],
    "tip": "多人分头找材料会舒服很多。",
    "giftable": false
  },
  {
    "id": "honey_glazed_ham_block",
    "item": "farmersdelight:honey_glazed_ham_block",
    "name": "蜜汁火腿",
    "icon": "🍖",
    "weight": 1,
    "rarity": "大型宴席",
    "station": "厨锅 · 宴席",
    "profile": "feast",
    "flavor": "蜂蜜和火腿最后变成一整桌食物，已经很有节日的样子了。",
    "ingredients": [
      "火腿料理材料",
      "蜂蜜",
      "宴席配菜"
    ],
    "sources": [
      "pork",
      "honey",
      "carrot",
      "potato"
    ],
    "steps": [
      "准备火腿料理材料。",
      "准备蜂蜜。",
      "准备配菜。",
      "完成宴席。"
    ],
    "tip": "猪圈和蜂场都有以后会轻松很多。",
    "giftable": false
  },
  {
    "id": "shepherds_pie_block",
    "item": "farmersdelight:shepherds_pie_block",
    "name": "牧羊人派",
    "icon": "🥧",
    "weight": 1,
    "rarity": "大型宴席",
    "station": "厨锅 · 宴席",
    "profile": "feast",
    "flavor": "羊肉、马铃薯和蔬菜最后变成一整份宴席，很适合真的坐下来分享。",
    "ingredients": [
      "羊肉",
      "马铃薯",
      "蔬菜",
      "宴席材料"
    ],
    "sources": [
      "mutton",
      "potato",
      "carrot",
      "onion"
    ],
    "steps": [
      "准备羊肉。",
      "准备马铃薯。",
      "准备蔬菜。",
      "完成整份宴席。"
    ],
    "tip": "羊场和马铃薯田都会帮很多忙。",
    "giftable": false
  }
]

function harvestTell(player, json) {
  if (!player || !player.server) return
  player.server.runCommandSilent('tellraw ' + player.username + ' ' + JSON.stringify(json))
}

function harvestButton(text, command, color) {
  return {text:'[ ' + text + ' ]',color:color,bold:true,clickEvent:{action:'run_command',value:command},hoverEvent:{action:'show_text',contents:{text:text,color:'gray'}}}
}

function harvestGetDish(id) {
  var i = 0
  for (i = 0; i < HARVEST_DISHES.length; i++) if (HARVEST_DISHES[i].id == id) return HARVEST_DISHES[i]
  return null
}

function harvestGetPlayerDish(player) {
  if (!player) return null
  return harvestGetDish(player.persistentData.getString('harvestAssignedDish'))
}

function harvestGetHistory(player) {
  var raw = player.persistentData.getString('harvestDishHistory')
  if (!raw) return []
  return raw.split(',')
}

function harvestContains(array, value) {
  var i = 0
  for (i = 0; i < array.length; i++) if (array[i] == value) return true
  return false
}

function harvestAddHistory(player, id) {
  var old = harvestGetHistory(player)
  var next = [id]
  var i = 0
  for (i = 0; i < old.length; i++) {
    if (old[i] == id) continue
    next.push(old[i])
    if (next.length >= HARVEST_HISTORY_SIZE) break
  }
  player.persistentData.putString('harvestDishHistory', next.join(','))
}

function harvestOpinionKey(id) { return 'harvestOpinion_' + id }
function harvestSeenKey(id) { return 'harvestSeen_' + id }
function harvestLastDayKey(id) { return 'harvestLastDay_' + id }

function harvestTaste(player, id) {
  var opinion = player.persistentData.getString(harvestOpinionKey(id))
  if (opinion == 'love') return 1.25
  if (opinion == 'change') return 0.55
  return 1.0
}

function harvestChooseDish(player) {
  var history = harvestGetHistory(player)
  var pool = []
  var total = 0
  var i = 0

  for (i = 0; i < HARVEST_DISHES.length; i++) {
    var dish = HARVEST_DISHES[i]
    if (!dish.giftable) continue
    if (harvestContains(history, dish.id)) continue
    pool.push(dish)
    total += dish.weight * harvestTaste(player, dish.id)
  }

  if (pool.length <= 0) {
    for (i = 0; i < HARVEST_DISHES.length; i++) {
      if (!HARVEST_DISHES[i].giftable) continue
      pool.push(HARVEST_DISHES[i])
      total += HARVEST_DISHES[i].weight * harvestTaste(player, HARVEST_DISHES[i].id)
    }
  }

  var roll = Math.random() * total
  for (i = 0; i < pool.length; i++) {
    roll -= pool[i].weight * harvestTaste(player, pool[i].id)
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

function harvestGiftNbt(runId) {
  // 只写轻量标记，不覆盖 Farmer's Delight 原有 Tooltip。
  return '{DivineHarvestGift:1b,DivineHarvestRun:' + runId + '}'
}

function harvestGiveGift(player, dish, runId) {
  var result = player.server.runCommandSilent('give ' + player.username + ' ' + dish.item + harvestGiftNbt(runId) + ' 1')
  return result > 0
}

function harvestRecordEncounter(player, dish) {
  var seen = player.persistentData.getInt(harvestSeenKey(dish.id))
  var previousDay = player.persistentData.getInt(harvestLastDayKey(dish.id))
  var currentDay = 0

  try {
    var level = player.server.getLevel('minecraft:overworld')
    currentDay = Math.floor(Number(level.getLevelData().getDayTime()) / 24000)
  } catch (ignored) {}

  player.persistentData.putInt('harvestCurrentSeenBefore', seen)
  player.persistentData.putString('harvestCurrentPreviousOpinion', player.persistentData.getString(harvestOpinionKey(dish.id)))
  player.persistentData.putInt('harvestCurrentPreviousDay', previousDay)
  player.persistentData.putInt(harvestSeenKey(dish.id), seen + 1)
  player.persistentData.putInt(harvestLastDayKey(dish.id), currentDay)
}

function harvestAssignPlayer(player, announce, realMemory) {
  if (!player || !player.server) return null
  var server = player.server
  var runId = server.persistentData.getInt('divineRunId')
  if (player.persistentData.getInt('harvestAssignedRunId') == runId) {
    if (announce) harvestShowGift(player)
    return harvestGetPlayerDish(player)
  }

  var tries = 0
  var dish = null
  while (tries < 8) {
    dish = harvestChooseDish(player)
    if (dish && harvestGiveGift(player, dish, runId)) break
    if (dish) dish.giftable = false
    tries++
  }
  if (!dish || tries >= 8) return null

  player.persistentData.putInt('harvestAssignedRunId', runId)
  player.persistentData.putString('harvestAssignedDish', dish.id)
  player.persistentData.putBoolean('harvestChallengeAccepted', false)
  player.persistentData.putInt('harvestRewardRunId', 0)

  if (realMemory) {
    harvestAddHistory(player, dish.id)
    harvestRecordEncounter(player, dish)

    if (global.historyRecordHarvestGift && typeof global.historyRecordHarvestGift == 'function') {
      try {
        global.historyRecordHarvestGift(player, dish.id, dish.name)
      } catch (historyError) {
        console.log('[HarvestDay] Gift history failed: ' + historyError)
      }
    }
  } else {
    player.persistentData.putInt('harvestCurrentSeenBefore', 0)
    player.persistentData.putString('harvestCurrentPreviousOpinion', '')
  }

  if (announce) harvestShowGift(player)
  return dish
}

function harvestGiftOpening(player, dish) {
  var seen = player.persistentData.getInt('harvestCurrentSeenBefore')
  var opinion = player.persistentData.getString('harvestCurrentPreviousOpinion')
  var previousDay = player.persistentData.getInt('harvestCurrentPreviousDay')
  var currentDay = 0

  try {
    var level = player.server.getLevel('minecraft:overworld')
    currentDay = Math.floor(Number(level.getLevelData().getDayTime()) / 24000)
  } catch (ignored) {}

  if (seen <= 0) {
    return {
      lead:'屋檐响了三声。你回头时，餐布下面已经多了一份：\n',
      quote:'“这是维尔娜的席位，不是债。”'
    }
  }

  var gap = previousDay > 0 ? currentDay - previousDay : 0

  if (seen == 1) {
    if (opinion == 'love') {
      return {
        lead:'雨点落在同一只盘沿上。老厨师看见菜名，先替你笑了：\n',
        quote:'“维尔娜记得你上次把盘子吃得很干净。”'
      }
    }
    if (opinion == 'change') {
      return {
        lead:'餐布掀开以后，老厨师沉默了好一会儿。盘里还是那道菜：\n',
        quote:'“你明明说过想换一张菜单。雨母大概另有打算。”'
      }
    }
    return {
      lead:'这只盘子并不陌生。你第二次在雨声里看见了它：\n',
      quote:'“有些味道要第二次遇见，才知道是不是喜欢。”'
    }
  }

  if (seen <= 3) {
    return {
      lead:'厨师没有再看菜单，只把熟悉的盘子推到你面前：\n',
      quote:gap > 10 ? '“隔了很久，它还是找到了回来的路。”' : '“长桌已经开始把它当成你的旧座位了。”'
    }
  }

  return {
    lead:'雨母的长桌上，有一只盘子似乎早就写上了你的名字：\n',
    quote:opinion == 'change' ? '“这次若仍不合口味，我亲自替你把菜单藏起来。”' : '“有些人靠名字被记住，有些人靠一道总会回来的菜。”'
  }
}

function harvestMemoryDialogue(player, dish) {
  var seen = player.persistentData.getInt('harvestCurrentSeenBefore')
  var oldOpinion = player.persistentData.getString('harvestCurrentPreviousOpinion')

  if (oldOpinion == 'love') {
    if (seen >= 4) return '老厨师把菜单翻到已经起毛的那一页：“这道菜现在几乎算是你的旧朋友了。”'
    return '老厨师笑了一下：“我记得。上一次，你连盘底的酱汁都没有留下。”'
  }
  if (oldOpinion == 'good') {
    if (seen >= 3) return '老厨师用指节敲了敲盘沿：“你总说尚可，可每次都还是坐到了这张桌旁。”'
    return '老厨师用指节敲了敲菜单：“上一次，你说它还配得上一盏灯。”'
  }
  if (oldOpinion == 'change') {
    if (seen >= 3) return '老厨师把脸埋进菜单后面：“我已经替你换过纸了。看来是雨母坚持。”'
    return '老厨师沉默了一会儿：“你上次明明说过，想换一张菜单。”'
  }
  return seen >= 3 ? '老厨师已经不用查书：“这道菜来过很多次。你们大概都认识彼此了。”' : '老厨师从书脊里抽出一张旧纸：“这道菜，以前也坐过你的桌。”'
}

function harvestShowGift(player) {
  var dish = harvestGetPlayerDish(player)
  if (!dish) return

  var profile = HARVEST_PROFILES[dish.profile] || HARVEST_PROFILES.hearty
  var server = player.server
  var target = String(player.username)

  if (!global.divineQueueTell) return

  // 第一幕：雨母的餐盘。重复料理会根据次数与上次评价换一套对白。
  var opening = harvestGiftOpening(player, dish)
  global.divineQueueTell(server, target, 174, [
    {text:opening.lead,color:'gray'},
    {text:dish.icon + ' ' + dish.name,color:'gold',bold:true},
    {text:'  ·  ' + dish.rarity + '\n',color:'dark_gray'},
    {text:opening.quote,color:'aqua',italic:true}
  ])

  // 正面神恩的惊喜声：升级、雨落、悦灵接物、经验轻响。
  if (global.divineQueueCommand) {
    global.divineQueueCommand(server, 168, 'execute at ' + target + ' run playsound minecraft:entity.player.levelup player ' + target + ' ~ ~ ~ 0.94 1.04')
    global.divineQueueCommand(server, 180, 'execute at ' + target + ' run playsound minecraft:weather.rain.above player ' + target + ' ~ ~ ~ 0.40 1.18')
    global.divineQueueCommand(server, 192, 'execute at ' + target + ' run playsound minecraft:entity.allay.item_given player ' + target + ' ~ ~ ~ 0.58 1.20')
    global.divineQueueCommand(server, 204, 'execute at ' + target + ' run playsound minecraft:entity.experience_orb.pickup player ' + target + ' ~ ~ ~ 0.44 1.44')
  }

  // 第二幕：这道菜为什么被选中。
  global.divineQueueTell(server, target, 236, [
    {text:'维尔娜为何把这只盘子推到你面前？\n',color:'light_purple',bold:true},
    {text:dish.flavor,color:'gray'}
  ])

  // 第三幕：料理在旅途中的用途。
  global.divineQueueTell(server, target, 300, [
    {text:'炉边旧纸上的一行字\n',color:'aqua',bold:true},
    {text:profile.effect + '\n\n',color:'gray'},
    {text:'适合 · ',color:'dark_green',bold:true},
    {text:profile.best,color:'green'}
  ])

  // 第四幕：玩家选择。
  global.divineQueueTell(server, target, 370, [
    {text:'若吃过以后还愿意记住它：\n',color:'dark_gray'},
    harvestButton('翻开料理笔记','/harvest','green'),
    {text:'  '},
    harvestButton('向炉火回敬一份','/harvest challenge','gold')
  ])

  // 第五幕：旧菜单回忆。
  if (player.persistentData.getInt('harvestCurrentSeenBefore') > 0) {
    var line = harvestMemoryDialogue(player, dish)

    global.divineQueueTell(server, target, 448, [
      {text:'旧菜单\n',color:'dark_gray',bold:true},
      {text:line + '\n\n',color:'gray',italic:true},
      {text:'那么这一次呢？\n',color:'yellow'},
      harvestButton('愿再吃一次','/harvest memory love','light_purple'),
      {text:'  '},
      harvestButton('尚可','/harvest memory good','green'),
      {text:'  '},
      harvestButton('换一张菜单','/harvest memory change','aqua')
    ])
  }
}

function showHarvestRecipe(player) {
  if (!player || !player.server) return
  var dish = harvestGetPlayerDish(player)
  if (!dish) {
    harvestTell(player, {text:'雨母的长桌旁，没有找到属于你的那只餐盘。',color:'gray'})
    return
  }

  var ingredients = '要准备些什么\n'
  var steps = '大致怎么做\n'
  var i = 0
  for (i = 0; i < dish.ingredients.length; i++) ingredients += '  • ' + dish.ingredients[i] + '\n'
  for (i = 0; i < dish.steps.length; i++) steps += '  ' + (i + 1) + '. ' + dish.steps[i] + '\n'

  harvestTell(player, [
    {text:'━━━━━━━━━━━━━━━━━━━━━━━━━━\n',color:'dark_green'},
    {text:'维尔娜长桌上的料理笔记 · ' + dish.icon + ' ' + dish.name + '\n',color:'gold',bold:true},
    {text:'锅灶 · ' + dish.station + '\n\n',color:'gray'},
    {text:ingredients + '\n',color:'white'},
    {text:steps + '\n',color:'gray'},
    {text:'厨房手记 · ',color:'light_purple',bold:true},
    {text:dish.tip + '\n\n',color:'gray'},
    harvestButton('向炉火回敬一份','/harvest challenge','gold'),
    {text:'  '},
    harvestButton('我做好了','/harvest done','green'),
    {text:'\n━━━━━━━━━━━━━━━━━━━━━━━━━━',color:'dark_green'}
  ])

  harvestTell(player, {text:'食材来源：',color:'aqua',bold:true})
  var shown = {}
  for (i = 0; i < dish.sources.length; i++) {
    var key = dish.sources[i]
    if (shown[key]) continue
    shown[key] = true
    if (HARVEST_SOURCE_GUIDE[key]) harvestTell(player, {text:'  ' + HARVEST_SOURCE_GUIDE[key],color:'gray'})
  }
}

function harvestCountAll(player, itemId) {
  return player.server.runCommandSilent('clear ' + player.username + ' ' + itemId + ' 0')
}

function harvestCountGifts(player, itemId) {
  return player.server.runCommandSilent('clear ' + player.username + ' ' + itemId + '{DivineHarvestGift:1b} 0')
}

function harvestNonGiftCount(player, itemId) {
  var value = harvestCountAll(player, itemId) - harvestCountGifts(player, itemId)
  return value < 0 ? 0 : value
}

function harvestAcceptChallenge(player) {
  var dish = harvestGetPlayerDish(player)
  if (!dish) return false

  player.persistentData.putBoolean('harvestChallengeAccepted', true)
  player.persistentData.putInt('harvestChallengeBaseline', harvestNonGiftCount(player, dish.item))

  harvestTell(player, [
    {text:'老厨师把一张沾着面粉与雨水的纸推到你面前。\n',color:'gold'},
    {text:'“雨母已经请过你一次。若你愿意回敬炉火，就照这张旧法再做一份。”\n',color:'gray',italic:true},
    {text:'做好以后，点击「我做好了」；系统只在那一刻检查一次背包。',color:'dark_green'}
  ])

  player.server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:block.note_block.pling player ' + player.username + ' ~ ~ ~ 0.58 1.28')
  return true
}

function harvestDone(player, forced) {
  if (!player || !player.server) return false

  var server = player.server
  var runId = server.persistentData.getInt('divineRunId')
  var dish = harvestGetPlayerDish(player)

  if (!dish) return false

  if (player.persistentData.getInt('harvestRewardRunId') == runId) {
    player.tell(Text.gray('老厨师已经把这一页收进本轮的旧菜单。'))
    return false
  }

  if (!forced && !player.persistentData.getBoolean('harvestChallengeAccepted')) {
    player.tell(Text.gray('先翻开料理笔记，接受雨母留下的回礼约定。'))
    return false
  }

  if (!forced) {
    var baseline = player.persistentData.getInt('harvestChallengeBaseline')
    var current = harvestNonGiftCount(player, dish.item)

    if (current <= baseline) {
      player.tell(Text.gray('老厨师看了一眼空盘：“还没好。炉火急不得。”'))
      return false
    }
  }

  player.persistentData.putInt('harvestRewardRunId', runId)
  player.addXP(HARVEST_REWARD_XP)

  if (global.giveDivineToken) global.giveDivineToken(player, 1)

  harvestTell(player, [
    {text:dish.icon + ' ' + dish.name + '\n',color:'gold',bold:true},
    {text:'“第一份是雨母的赞许；这一份，是你献回炉火的答礼。”\n',color:'gray',italic:true},
    {text:'丰收回礼完成 · +' + HARVEST_REWARD_XP + ' 经验',color:'green'}
  ])

  server.runCommandSilent('execute at ' + player.username + ' run playsound minecraft:entity.player.levelup player ' + player.username + ' ~ ~ ~ 0.92 1.06')

  if (global.divineQueueCommand) {
    global.divineQueueCommand(
      server,
      8,
      'execute at ' + player.username + ' run playsound minecraft:weather.rain.above player ' + player.username + ' ~ ~ ~ 0.34 1.30'
    )

    global.divineQueueCommand(
      server,
      16,
      'execute at ' + player.username + ' run playsound minecraft:entity.experience_orb.pickup player ' + player.username + ' ~ ~ ~ 0.56 1.46'
    )
  }

  server.runCommandSilent('execute at ' + player.username + ' run particle minecraft:happy_villager ~ ~1 ~ 0.45 0.55 0.45 0.04 18 force ' + player.username)

  if (global.historyRecordHarvestCooked && typeof global.historyRecordHarvestCooked == 'function') {
    try {
      global.historyRecordHarvestCooked(player, dish.id, dish.name)
    } catch (historyError) {
      console.log('[HarvestDay] Cooked history failed: ' + historyError)
    }
  }

  return true
}

function harvestSetOpinion(player, opinion) {
  var dish = harvestGetPlayerDish(player)
  if (!dish) return false

  player.persistentData.putString(harvestOpinionKey(dish.id), opinion)

  if (opinion == 'love') {
    player.tell(Text.lightPurple('老厨师点点头：“好。下次翻菜单，我先看这一页。”'))
  }
  else if (opinion == 'good') {
    player.tell(Text.green('老厨师嗯了一声：“尚可就好。许多菜，要到第二次才会被人惦记。”'))
  }
  else {
    player.tell(Text.aqua('老厨师把纸条翻到背面：“明白。下一次落雨，我换一道。”'))
  }

  return true
}

function startHarvestDay(server) {
  if (!server || server.persistentData.getBoolean('harvestDayActive')) return
  server.persistentData.putBoolean('harvestDayActive', true)
  var i = 0
  for (i = 0; i < server.players.size(); i++) harvestAssignPlayer(server.players.get(i), true, true)
  console.log('[HarvestDay] Rain Mother feast started; no background scanner')
}

function cleanupHarvestDay(server) {
  if (!server) return
  server.persistentData.putBoolean('harvestDayActive', false)
}

function applyHarvestGiftToPlayer(player) {
  if (!player || !player.server) return
  if (!player.server.persistentData.getBoolean('harvestDayActive')) return
  harvestAssignPlayer(player, true, true)
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var root = Commands.literal('harvest')

  root.executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    showHarvestRecipe(player)
    return 1
  })

  root.then(Commands.literal('challenge').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    return harvestAcceptChallenge(player) ? 1 : 0
  }))

  root.then(Commands.literal('done').executes(function (ctx) {
    var player = ctx.source.player
    if (!player) return 0
    return harvestDone(player, false) ? 1 : 0
  }))

  var memory = Commands.literal('memory')
  memory.then(Commands.literal('love').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; return harvestSetOpinion(p,'love') ? 1 : 0 }))
  memory.then(Commands.literal('good').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; return harvestSetOpinion(p,'good') ? 1 : 0 }))
  memory.then(Commands.literal('change').executes(function (ctx) { var p = ctx.source.player; if (!p) return 0; return harvestSetOpinion(p,'change') ? 1 : 0 }))
  root.then(memory)

  event.register(root)
})

function harvestDevReroll(player) {
  if (!player || !player.server) return false
  var runId = player.server.persistentData.getInt('divineRunId')
  player.persistentData.putInt('harvestAssignedRunId', runId - 1)
  var dish = harvestAssignPlayer(player, true, false)
  return dish != null
}

function harvestDevShow(player) {
  if (!player) return false
  harvestShowGift(player)
  return true
}

function harvestDevComplete(player) { return harvestDone(player, true) }

global.startHarvestDay = startHarvestDay
global.cleanupHarvestDay = cleanupHarvestDay
global.applyHarvestGiftToPlayer = applyHarvestGiftToPlayer
global.showHarvestRecipe = showHarvestRecipe
global.harvestDevReroll = harvestDevReroll
global.harvestDevShow = harvestDevShow
global.harvestDevComplete = harvestDevComplete
