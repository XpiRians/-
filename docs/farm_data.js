/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (МЯУЦВЕТ — ТАЙНА ВЕЛИКОГО САДА)
 * Game Data Definitions (farm_data.js)
 * Comprehensive static database for:
 * - 30+ Crops & Mutations, Hybrid Crossbreeding
 * - 8 Helpers / Companions
 * - Pollen Flower Fields & Collectors
 * - 6 Biomes & 7 Story Chapters (Shards of the Primordial Seed)
 * - Crafting & Cooking Recipes
 * - NPCs, Dialogues, Quests & Order Board
 * - Skill Tree & Achievements
 */

(function (global) {
  'use strict';

  // 1. RARITIES
  const RARITY = {
    COMMON: { id: 'common', name: 'Обычный', color: '#94a3b8', symbol: '⚪', mult: 1.0 },
    UNCOMMON: { id: 'uncommon', name: 'Необычный', color: '#22c55e', symbol: '🟢', mult: 1.5 },
    RARE: { id: 'rare', name: 'Редкий', color: '#3b82f6', symbol: '🔵', mult: 2.5 },
    EPIC: { id: 'epic', name: 'Эпический', color: '#a855f7', symbol: '🟣', mult: 4.5 },
    LEGENDARY: { id: 'legendary', name: 'Легендарный', color: '#f59e0b', symbol: '🟠', mult: 8.0 },
    MYTHIC: { id: 'mythic', name: 'Мифический', color: '#ec4899', symbol: '🌟', mult: 15.0 },
    SECRET: { id: 'secret', name: 'Секретный', color: '#06b6d4', symbol: '🔮', mult: 30.0 }
  };

  // 2. MUTATIONS
  const MUTATIONS = {
    golden: { id: 'golden', name: 'Золотое', color: '#fbbf24', symbol: '✨', priceMult: 3.0, desc: 'Покрыто чистым золотым сиянием.' },
    giant: { id: 'giant', name: 'Гигантское', color: '#4ade80', symbol: '🌿', priceMult: 2.5, yieldBonus: 3, desc: 'Выросло огромным и даёт тройной урожай!' },
    radiant: { id: 'radiant', name: 'Светящееся', color: '#a78bfa', symbol: '💡', priceMult: 2.2, desc: 'Мягко освещает поляну в ночные часы.' },
    prismatic: { id: 'prismatic', name: 'Радужное', color: '#38bdf8', symbol: '🌈', priceMult: 4.0, desc: 'Переливается всеми цветами радуги и даёт бонусную пыльцу.' },
    crystal: { id: 'crystal', name: 'Кристаллическое', color: '#c084fc', symbol: '💎', priceMult: 3.5, gemDrop: true, desc: 'Стебли застыли в чистейший драгоценный хрусталь.' },
    moonlit: { id: 'moonlit', name: 'Лунное', color: '#818cf8', symbol: '🌙', priceMult: 3.0, nightBonus: true, desc: 'Вобрало в себя холодный серебряный свет луны.' },
    cosmic: { id: 'cosmic', name: 'Космическое', color: '#f43f5e', symbol: '⭐', priceMult: 6.0, stardustDrop: true, desc: 'Пахнет далёкими звёздами и рождает звёздную пыль.' },
    ancient: { id: 'ancient', name: 'Древнее', color: '#d97706', symbol: '📜', priceMult: 5.0, relicDrop: true, desc: 'Потомок изначальной флоры времён до Катастрофы.' }
  };

  // 3. 30+ UNIQUE CROPS & PLANTS
  const CROPS = {
    // Basic / Home Farm
    catnip: {
      id: 'catnip', name: 'Кошачья мята', icon: '🌿', cat: 'plants', rarity: RARITY.COMMON,
      seedPrice: 3, sellPrice: 6, growTime: 7, baseYield: 2, biome: 'farm',
      desc: 'Любимое лакомство Муси и Кейти. Дарит бодрость и мурчание.'
    },
    wheat: {
      id: 'wheat', name: 'Золотистая пшеница', icon: '🌾', cat: 'plants', rarity: RARITY.COMMON,
      seedPrice: 5, sellPrice: 9, growTime: 12, baseYield: 3, biome: 'farm',
      desc: 'Плотные налитые колосья. Главный ингредиент для выпечки на мельнице.'
    },
    sunflower: {
      id: 'sunflower', name: 'Солнечный подсолнух', icon: '🌻', cat: 'plants', rarity: RARITY.COMMON,
      seedPrice: 7, sellPrice: 14, growTime: 16, baseYield: 2, biome: 'farm',
      desc: 'Поворачивает золотую шляпку за солнцем и щедро делится пыльцой.'
    },
    strawberry: {
      id: 'strawberry', name: 'Сладкая земляника', icon: '🍓', cat: 'plants', rarity: RARITY.UNCOMMON,
      seedPrice: 12, sellPrice: 22, growTime: 20, baseYield: 3, biome: 'farm',
      desc: 'Ароматная лесная ягода для приготовления ягодных пирогов.'
    },
    amber_daisy: {
      id: 'amber_daisy', name: 'Янтарная ромашка', icon: '🌼', cat: 'plants', rarity: RARITY.UNCOMMON,
      seedPrice: 14, sellPrice: 26, growTime: 24, baseYield: 2, biome: 'farm',
      desc: 'Лепестки с мягким медовым запахом, привлекает полезных мотыльков.'
    },

    // Forest Biome Plants
    bell: {
      id: 'bell', name: 'Луговой колокольчик', icon: '🌸', cat: 'plants', rarity: RARITY.UNCOMMON,
      seedPrice: 16, sellPrice: 30, growTime: 25, baseYield: 2, biome: 'forest',
      desc: 'Тихо звенит на ветру Шепчущего леса. Успокаивает лесных духов.'
    },
    forest_mint: {
      id: 'forest_mint', name: 'Лесная мята', icon: '🌱', cat: 'plants', rarity: RARITY.UNCOMMON,
      seedPrice: 18, sellPrice: 34, growTime: 28, baseYield: 3, biome: 'forest',
      desc: 'Дикая мята с освежающим хвойным оттенком.'
    },
    fern: {
      id: 'fern', name: 'Мшистый папоротник', icon: '🪴', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 25, sellPrice: 50, growTime: 36, baseYield: 2, biome: 'forest',
      desc: 'Древнее лесное растение. В его тени часто прячутся лесные светлячки.'
    },
    mushroom_tree: {
      id: 'mushroom_tree', name: 'Грибное дерево', icon: '🍄', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 32, sellPrice: 65, growTime: 42, baseYield: 2, biome: 'forest',
      desc: 'Необычный симбиоз белого гриба и дубовой ветви.'
    },
    valerian: {
      id: 'valerian', name: 'Королевская валериана', icon: '💜', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 40, sellPrice: 85, growTime: 50, baseYield: 2, biome: 'forest',
      desc: 'Глубокий фиолетовый корень. Обожаем кошками и усиливает магию сада.'
    },

    // Lake Biome Plants
    moon_lily: {
      id: 'moon_lily', name: 'Лунная лилия', icon: '🪷', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 45, sellPrice: 95, growTime: 55, baseYield: 2, biome: 'lake',
      desc: 'Раскрывается только под сиянием луны. Дарует лунную росу.'
    },
    reed: {
      id: 'reed', name: 'Светящийся тростник', icon: '🌾', cat: 'plants', rarity: RARITY.UNCOMMON,
      seedPrice: 20, sellPrice: 38, growTime: 30, baseYield: 3, biome: 'lake',
      desc: 'Растёт у самой кромки пирса. Стебли используются для лучших поплавков.'
    },
    silver_daffodil: {
      id: 'silver_daffodil', name: 'Серебряный нарцисс', icon: '🪻', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 50, sellPrice: 105, growTime: 60, baseYield: 2, biome: 'lake',
      desc: 'Отражает рябь лунного озера своими зеркальными лепестками.'
    },

    // Quarry Biome Plants
    crystal_rose: {
      id: 'crystal_rose', name: 'Кристальная роза', icon: '🌹', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 55, sellPrice: 120, growTime: 65, baseYield: 2, biome: 'quarry',
      desc: 'Шипы из чистейшего кварца, лепестки звенят как горный хрусталь.'
    },
    flame_tulip: {
      id: 'flame_tulip', name: 'Огненный тюльпан', icon: '🌷', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 70, sellPrice: 150, growTime: 75, baseYield: 2, biome: 'quarry',
      desc: 'Рождён в расщелинах горячих камней. Излучает приятное живое тепло.'
    },
    frost_heather: {
      id: 'frost_heather', name: 'Морозный вереск', icon: '🪻', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 80, sellPrice: 175, growTime: 80, baseYield: 2, biome: 'quarry',
      desc: 'Покрыт тонкой изморозью даже в тёплые дни. Нужен для охлаждения экстрактов.'
    },

    // Greenhouse / Babel Biome Plants
    sunberry: {
      id: 'sunberry', name: 'Солнечная ягода', icon: '🫐', cat: 'plants', rarity: RARITY.RARE,
      seedPrice: 60, sellPrice: 130, growTime: 60, baseYield: 4, biome: 'greenhouse',
      desc: 'Созревает в тепле Вавилонской теплицы, светится изнутри.'
    },
    lilac_iris: {
      id: 'lilac_iris', name: 'Сиреневый ирис', icon: '🪻', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 90, sellPrice: 195, growTime: 90, baseYield: 2, biome: 'greenhouse',
      desc: 'Элегантный цветок, посаженный древними садовниками Вавилона.'
    },
    rainbow_orchid: {
      id: 'rainbow_orchid', name: 'Радужная орхидея', icon: '🌺', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 110, sellPrice: 240, growTime: 100, baseYield: 2, biome: 'greenhouse',
      desc: 'Каждый лепесток окрашен в собственный оттенок спектра.'
    },
    babel_blossom: {
      id: 'babel_blossom', name: 'Вавилонский цветок', icon: '✨', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 180, sellPrice: 420, growTime: 140, baseYield: 1, biome: 'greenhouse',
      desc: 'Цветок с бесконечным фрактальным узором. Связан с библиотекой Вавилона.'
    },
    chrono_bud: {
      id: 'chrono_bud', name: 'Хроно-бутон', icon: '⏳', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 220, sellPrice: 500, growTime: 160, baseYield: 1, biome: 'greenhouse',
      desc: 'Кажется, что время вокруг него течёт то быстрее, то медленнее.'
    },

    // Cosmic Altar Plants
    sky_clover: {
      id: 'sky_clover', name: 'Небесный четырёхлистник', icon: '🍀', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 100, sellPrice: 220, growTime: 90, baseYield: 3, biome: 'altar',
      desc: 'Дарует колоссальную удачу при поиске сундуков и редкой рыбы.'
    },
    star_flower: {
      id: 'star_flower', name: 'Звёздный первоцвет', icon: '🌟', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 200, sellPrice: 460, growTime: 150, baseYield: 2, biome: 'altar',
      desc: 'Рождён из упавшей кометы на вершине Космического алтаря.'
    },
    cosmic_spirea: {
      id: 'cosmic_spirea', name: 'Космическая спирея', icon: '💫', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 260, sellPrice: 600, growTime: 180, baseYield: 1, biome: 'altar',
      desc: 'Побеги извиваются в форме спиральных галактик.'
    },
    flower_of_eternity: {
      id: 'flower_of_eternity', name: 'Цветок Вечности', icon: '🌌', cat: 'plants', rarity: RARITY.MYTHIC,
      seedPrice: 500, sellPrice: 1200, growTime: 240, baseYield: 1, biome: 'altar',
      desc: 'Легендарное растение, расцветающее раз в тысячелетие.'
    },
    primordial_bloom: {
      id: 'primordial_bloom', name: 'Первоцвет Великого Сада', icon: '👑', cat: 'plants', rarity: RARITY.MYTHIC,
      seedPrice: 1000, sellPrice: 2500, growTime: 300, baseYield: 1, biome: 'farm',
      desc: 'Живое воплощение восстановленного Первосемени. Венец садоводства!'
    },

    // Hybrid Plants (Created via crossbreeding workbench)
    twilight_bloom: {
      id: 'twilight_bloom', name: 'Сумеречный бутон', icon: '🪷', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 0, sellPrice: 320, growTime: 110, baseYield: 2, biome: 'greenhouse', isHybrid: true,
      desc: 'Гибрид Подсолнуха и Лунной лилии. Светится мягким пурпурным теплом.'
    },
    sapphire_bell: {
      id: 'sapphire_bell', name: 'Сапфировый колокольчик', icon: '🔔', cat: 'plants', rarity: RARITY.EPIC,
      seedPrice: 0, sellPrice: 350, growTime: 120, baseYield: 2, biome: 'greenhouse', isHybrid: true,
      desc: 'Гибрид Кристальной розы и Колокольчика. Издаёт хрустальную мелодию.'
    },
    golden_lotus: {
      id: 'golden_lotus', name: 'Золотой лотос', icon: '🏵️', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 0, sellPrice: 650, growTime: 170, baseYield: 1, biome: 'greenhouse', isHybrid: true,
      desc: 'Гибрид Кошачьей мяты и Королевской валерианы. Цветок абсолютного кошачьего блаженства.'
    },
    amethyst_poppy: {
      id: 'amethyst_poppy', name: 'Аметистовый мак', icon: '🌺', cat: 'plants', rarity: RARITY.LEGENDARY,
      seedPrice: 0, sellPrice: 700, growTime: 180, baseYield: 1, biome: 'greenhouse', isHybrid: true,
      desc: 'Гибрид Огненного тюльпана и Морозного вереска. Пыльца ускоряет работу всех инструментов.'
    }
  };

  // 4. CROSSBREEDING HYBRID RECIPES
  const HYBRID_RECIPES = [
    { parentA: 'sunflower', parentB: 'moon_lily', result: 'twilight_bloom', name: 'Сумеречный бутон' },
    { parentA: 'crystal_rose', parentB: 'bell', result: 'sapphire_bell', name: 'Сапфировый колокольчик' },
    { parentA: 'catnip', parentB: 'valerian', result: 'golden_lotus', name: 'Золотой лотос' },
    { parentA: 'flame_tulip', parentB: 'frost_heather', result: 'amethyst_poppy', name: 'Аметистовый мак' }
  ];

  // 5. FERTILIZERS
  const FERTILIZERS = {
    compost: { id: 'compost', name: 'Органический компост', icon: '🍂', price: 15, speedBonus: 0.5, desc: 'Ускоряет рост на 50%.' },
    gold_dust: { id: 'gold_dust', name: 'Золотая пыльца', icon: '✨', price: 35, mutationBonus: 0.35, desc: 'Повышает шанс мутации на +35%.' },
    moon_dew: { id: 'moon_dew', name: 'Лунная роса', icon: '💧', price: 50, nightBonus: 0.8, desc: 'Удваивает ночной рост растений.' },
    crystal_grit: { id: 'crystal_grit', name: 'Кристальная крошка', icon: '💎', price: 75, yieldBonus: 2, desc: 'Увеличивает урожай на +2 единицы.' },
    star_essence: { id: 'star_essence', name: 'Звёздная эссенция', icon: '⭐', price: 150, guaranteedRareMutation: true, desc: 'Гарантирует редкую или космическую мутацию!' }
  };

  // 6. HELPERS / PETS (8 COMPANIONS)
  const HELPERS = {
    firefly: {
      id: 'firefly', name: 'Светлячок Люми', icon: '🪲', rarity: RARITY.COMMON,
      baseRadius: 130, ability: 'Освещает тьму и увеличивает радиус вакуумного магнита на +30%.',
      perk: { magnetBonus: 35, lightRadius: 100 }
    },
    bee: {
      id: 'bee', name: 'Пчёлка Жужжа', icon: '🐝', rarity: RARITY.UNCOMMON,
      ability: 'Самостоятельно подлетает к цветам на полях и каждые 8 секунд собирает +5 пыльцы.',
      perk: { autoPollen: 5, interval: 8 }
    },
    sprite: {
      id: 'sprite', name: 'Лесной Дух Листик', icon: '🧚', rarity: RARITY.RARE,
      ability: 'Шанс +25% найти редкие семена при срубе деревьев и сборе урожая.',
      perk: { seedDropRate: 0.25 }
    },
    beetle: {
      id: 'beetle', name: 'Кристальный Жук Гемми', icon: '🪲', rarity: RARITY.RARE,
      ability: 'Увеличивает урон кирки на +35% и шанс найти аметисты в скалах.',
      perk: { miningDamage: 0.35, gemBonus: 0.2 }
    },
    butterfly: {
      id: 'butterfly', name: 'Лунная Бабочка Селена', icon: '🦋', rarity: RARITY.EPIC,
      ability: 'Приманивает редкую рыбу на озере: шанс поклёвки золотого карпа +40%.',
      perk: { fishRarity: 0.4 }
    },
    gold_moth: {
      id: 'gold_moth', name: 'Золотой Мотылёк Аурум', icon: '🦋', rarity: RARITY.EPIC,
      ability: 'Увеличивает стоимость продажи всех товаров в лавке торговца на +20%.',
      perk: { sellBonus: 0.20 }
    },
    gnome: {
      id: 'gnome', name: 'Грибной Гномик Боровик', icon: '🧙‍♂️', rarity: RARITY.LEGENDARY,
      ability: 'Отыскивает скрытые сундуки сокровищ и редкие грибы-светляки.',
      perk: { treasureSense: true, shroomBonus: 0.5 }
    },
    star_kitten: {
      id: 'star_kitten', name: 'Звёздный Котёнок Нова', icon: '🐱', rarity: RARITY.MYTHIC,
      ability: 'Создаёт звёздный резонанс: удваивает сбор всей космической пыльцы!',
      perk: { starPollenMult: 2.0, xpBonus: 0.3 }
    }
  };

  // 7. POLLEN TYPES & TOOLS
  const POLLEN_TYPES = {
    sunny: { id: 'sunny', name: 'Солнечная пыльца', color: '#fbbf24', icon: '☀️' },
    forest: { id: 'forest', name: 'Лесная пыльца', color: '#4ade80', icon: '🌲' },
    moon: { id: 'moon', name: 'Лунная пыльца', color: '#818cf8', icon: '🌙' },
    crystal: { id: 'crystal', name: 'Кристальная пыльца', color: '#c084fc', icon: '💎' },
    life: { id: 'life', name: 'Вавилонская пыльца', color: '#38bdf8', icon: '✨' },
    star: { id: 'star', name: 'Звёздная пыльца', color: '#f43f5e', icon: '⭐' }
  };

  const POLLEN_COLLECTORS = [
    { level: 1, name: 'Деревянная лопатка', power: 1, radius: 45, icon: '🪵', cost: 0 },
    { level: 2, name: 'Медный сборщик', power: 2, radius: 55, icon: '🪓', cost: 80 },
    { level: 3, name: 'Золотой серп', power: 4, radius: 70, icon: '🌾', cost: 250, sweepEffect: true },
    { level: 4, name: 'Кристальный пыльцелов', power: 7, radius: 90, icon: '💎', cost: 700, bonusCrit: 0.25 },
    { level: 5, name: 'Звёздный экстрактор', power: 12, radius: 115, icon: '🌟', cost: 1800, starVortex: true }
  ];

  // 8. 6 BIOMES & SHARDS OF THE PRIMORDIAL SEED
  const BIOMES_INFO = {
    farm: {
      id: 'farm', name: 'Домашняя ферма', icon: '🏡', pollen: 'sunny',
      shard: 'Осколок Солнца', color: '#fbbf24',
      desc: 'Уютная поляна с домиком Муси и Кейти, грядками и лавкой торговца Феликса.'
    },
    forest: {
      id: 'forest', name: 'Шепчущий лес', icon: '🌲', pollen: 'forest',
      shard: 'Осколок Леса', color: '#22c55e',
      desc: 'Вековые дубы и стройные берёзы, усыпанные грибами и лесными цветами.'
    },
    lake: {
      id: 'lake', name: 'Лунное озеро', icon: '🌊', pollen: 'moon',
      shard: 'Осколок Воды', color: '#38bdf8',
      desc: 'Глубокие чистые воды с дощатым рыбацким пирсом и плавающими лилиями.'
    },
    quarry: {
      id: 'quarry', name: 'Кристальный карьер', icon: '⛰️', pollen: 'crystal',
      shard: 'Осколок Земли', color: '#a855f7',
      desc: 'Каменистое ущелье, наполненное гранитными валунами и мерцающими аметистами.'
    },
    greenhouse: {
      id: 'greenhouse', name: 'Вавилонская теплица', icon: '🏛️', pollen: 'life',
      shard: 'Осколок Жизни', color: '#06b6d4',
      desc: 'Древний стеклянный купол, ускоряющий созревание редчайших цветов.'
    },
    altar: {
      id: 'altar', name: 'Космический алтарь', icon: '✨', pollen: 'star',
      shard: 'Осколок Космоса', color: '#ec4899',
      desc: 'Священный пьедестал на вершине скалы, открывающий врата к Первосемени.'
    }
  };

  // 9. 7 STORY CHAPTERS
  const STORY_CHAPTERS = [
    {
      chapter: 1, title: 'Пробуждение Первосемени',
      desc: 'Муся и Кейти находят у порога домика мерцающий росток Первосемени. Чтобы вернуть саду жизнь, нужно освоить сбор солнечной пыльцы и вырастить первый урожай.',
      biome: 'farm', targetShard: 'Осколок Солнца',
      tasks: [
        { id: 'ch1_1', text: 'Собрать 30 солнечной пыльцы на ромашковой поляне', target: 30, type: 'pollen', subtype: 'sunny' },
        { id: 'ch1_2', text: 'Посадить и собрать 3 кошачьи мяты на грядке', target: 3, type: 'harvest', subtype: 'catnip' },
        { id: 'ch1_3', text: 'Продать урожай торговцу Феликсу и заработать 50 монет', target: 50, type: 'coins' }
      ],
      rewardDesc: 'Осколок Солнца активирован! Открыт проход в Шепчущий лес.'
    },
    {
      chapter: 2, title: 'Тайна Шепчущего леса',
      desc: 'Лес погрузился в полумрак. Лесной дух Листик просит нарубить древесины для моста и опылить древние лесные колокольчики.',
      biome: 'forest', targetShard: 'Осколок Леса',
      tasks: [
        { id: 'ch2_1', text: 'Нарубить 15 дубовых брёвен в лесу', target: 15, type: 'chop' },
        { id: 'ch2_2', text: 'Собрать 60 лесной пыльцы', target: 60, type: 'pollen', subtype: 'forest' },
        { id: 'ch2_3', text: 'Вырастить Королевскую валериану', target: 1, type: 'harvest', subtype: 'valerian' }
      ],
      rewardDesc: 'Осколок Леса сияет изумрудом! Открыт спутник Листик и доступ к Лунному озеру.'
    },
    {
      chapter: 3, title: 'Секреты Лунного озера',
      desc: 'Лунное озеро потеряло своё серебристое свечение. Выдра Марина ждёт вас на пирсе с удочкой.',
      biome: 'lake', targetShard: 'Осколок Воды',
      tasks: [
        { id: 'ch3_1', text: 'Поймать 5 рыб на пирсе озера', target: 5, type: 'fish' },
        { id: 'ch3_2', text: 'Собрать 80 лунной пыльцы ночью', target: 80, type: 'pollen', subtype: 'moon' },
        { id: 'ch3_3', text: 'Вырастить Лунную лилию', target: 1, type: 'harvest', subtype: 'moon_lily' }
      ],
      rewardDesc: 'Осколок Воды очищен! Вода озера озарилась мягким лунным светом.'
    },
    {
      chapter: 4, title: 'Сердце Кристального карьера',
      desc: 'Барсук Брок раскопал старую штольню. Скалы Кристального карьера полны аметистов и руды.',
      biome: 'quarry', targetShard: 'Осколок Земли',
      tasks: [
        { id: 'ch4_1', text: 'Разбить 8 скал и добыть руду киркой', target: 8, type: 'mine' },
        { id: 'ch4_2', text: 'Собрать 100 кристальной пыльцы', target: 100, type: 'pollen', subtype: 'crystal' },
        { id: 'ch4_3', text: 'Вырастить Кристальную розу', target: 1, type: 'harvest', subtype: 'crystal_rose' }
      ],
      rewardDesc: 'Осколок Земли сияет пурпуром! Открыта мастерская гибридов.'
    },
    {
      chapter: 5, title: 'Забытые семена Вавилонской теплицы',
      desc: 'Стеклянный купол теплицы хранит тайны фрактальных цветов библиотеки Вавилона. Пришло время создать первый гибрид.',
      biome: 'greenhouse', targetShard: 'Осколок Жизни',
      tasks: [
        { id: 'ch5_1', text: 'Создать гибрид в верстаке селекции', target: 1, type: 'hybrid' },
        { id: 'ch5_2', text: 'Вырастить Вавилонский цветок', target: 1, type: 'harvest', subtype: 'babel_blossom' },
        { id: 'ch5_3', text: 'Собрать 120 вавилонской пыльцы', target: 120, type: 'pollen', subtype: 'life' }
      ],
      rewardDesc: 'Осколок Жизни пробудил древние купола! Разблокирован путь к Алтарю.'
    },
    {
      chapter: 6, title: 'Последний осколок Космического алтаря',
      desc: 'На вершине горы Сфинкс Астра ждёт звёздную пыль для активации небесного портала.',
      biome: 'altar', targetShard: 'Осколок Космоса',
      tasks: [
        { id: 'ch6_1', text: 'Собрать 150 звёздной пыльцы у Алтаря', target: 150, type: 'pollen', subtype: 'star' },
        { id: 'ch6_2', text: 'Добыть 3 единицы Звёздной пыли', target: 3, type: 'stardust' },
        { id: 'ch6_3', text: 'Вырастить Звёздный первоцвет', target: 1, type: 'harvest', subtype: 'star_flower' }
      ],
      rewardDesc: 'Все 6 осколков собраны! Начинается ритуал Возрождения.'
    },
    {
      chapter: 7, title: 'Возрождение Великого сада',
      desc: 'Объедините все 6 осколков у Первосемени возле домика. Великий сад снова расцветёт во всём своём неземном великолепии!',
      biome: 'farm', targetShard: 'Первосемя Возрождения',
      tasks: [
        { id: 'ch7_1', text: 'Довести восстановление всех 6 биомов до 100%', target: 6, type: 'restore_all' },
        { id: 'ch7_2', text: 'Вырастить легендарный Первоцвет Великого Сада', target: 1, type: 'harvest', subtype: 'primordial_bloom' }
      ],
      rewardDesc: 'ВЕЛИКИЙ САД ВОЗРОЖДЁН! Открыт режим «Новое Цветение» (Престиж).'
    }
  ];

  // 10. NPCS & DIALOGUES
  const NPCS = {
    felix: {
      id: 'felix', name: 'Торговец Феликс', icon: '🐱', role: 'Семена и Садовые товары', biome: 'farm',
      dialogue: 'Мяу! Добро пожаловать в мою лавку! У меня лучшие семена во всём Великом саду и самые честные цены на ваш урожай.'
    },
    sylvan: {
      id: 'sylvan', name: 'Мудрый Филин Сильван', icon: '🦉', role: 'Хранитель Шепчущего леса', biome: 'forest',
      dialogue: 'У-ху! Деревья помнят былые дни. Руби сухой валежник бережно, котик, и лес одарит тебя волшебной смолой.'
    },
    marina: {
      id: 'marina', name: 'Выдра Марина', icon: '🦦', role: 'Мастер рыбалки', biome: 'lake',
      dialogue: 'Привет, пушистые рыбаки! На озере сегодня отличный клев. Главное — не дёргать удочку раньше времени!'
    },
    brock: {
      id: 'brock', name: 'Барсук Брок', icon: '🦡', role: 'Горный мастер', biome: 'quarry',
      dialogue: 'Хмф! Кирка любит сильные лапки! В глубине карьера прячутся такие аметисты, что дух захватывает.'
    },
    astra: {
      id: 'astra', name: 'Звёздная Кошка Астра', icon: '✨', role: 'Хранительница Алтаря', biome: 'altar',
      dialogue: 'Звёзды говорят со мной на языке света. Собери осколки Первосемени, и Гармония вернётся в этот мир.'
    }
  };

  // 11. COOKING RECIPES (BREAD, PIES, TEAS)
  const COOKING_RECIPES = [
    {
      id: 'berry_pie', name: 'Земляничный пирог', icon: '🥧',
      req: { wheat: 2, strawberry: 3 },
      buff: { type: 'speed', val: 1.35, duration: 120, text: 'Скорость бега +35% на 2 минуты' },
      desc: 'Свежеиспеченный пирог с золотистой корочкой.'
    },
    {
      id: 'floral_tea', name: 'Цветочный чай с мятой', icon: '🍵',
      req: { catnip: 3, bell: 2 },
      buff: { type: 'pollen', val: 2.0, duration: 90, text: 'Сбор пыльцы x2 на 1.5 минуты' },
      desc: 'Ароматный настой трав, обостряет кошачье чутье.'
    },
    {
      id: 'shroom_soup', name: 'Густой грибной суп', icon: '🍲',
      req: { mushroom_tree: 2, wheat: 1 },
      buff: { type: 'mining', val: 1.5, duration: 120, text: 'Урон по скалам и деревьям +50%' },
      desc: 'Сытное блюдо для долгих экспедиций в карьер.'
    },
    {
      id: 'golden_cookie', name: 'Золотое печенье', icon: '🍪',
      req: { wheat: 3, sunflower: 2 },
      buff: { type: 'coins', val: 1.25, duration: 180, text: '+25% к монетам за продажу урожая' },
      desc: 'Тает во рту, оставляя сладкий медовый привкус.'
    },
    {
      id: 'star_nectar', name: 'Звёздный нектар', icon: '🍹',
      req: { star_flower: 1, moon_lily: 1 },
      buff: { type: 'luck', val: 2.0, duration: 150, text: 'Шанс редких мутаций и сокровищ x2' },
      desc: 'Напиток богов, мерцающий созвездиями в стеклянном бокале.'
    }
  ];

  // 12. SKILL TREE NODES (18 SKILLS)
  const SKILL_TREE = {
    gardening: [
      { id: 'g1', name: 'Быстрый росток', max: 3, icon: '🌱', desc: 'Ускоряет базовый рост всех растений на +15% за уровень.' },
      { id: 'g2', name: 'Экономный полив', max: 3, icon: '💧', desc: 'Расход воды из лейки снижен на 20% за уровень.' },
      { id: 'g3', name: 'Мастер мутаций', max: 3, icon: '✨', desc: 'Шанс редкой мутации растения повышен на +10% за уровень.' },
      { id: 'g4', name: 'Щедрая грядка', max: 3, icon: '🌾', desc: 'Шанс получить дополнительный урожай +25% за уровень.' },
      { id: 'g5', name: 'Цветочный чародей', max: 1, icon: '🌸', desc: 'Цветы на грядках не увядают и растут в 2 раза быстрее ночью!' }
    ],
    gathering: [
      { id: 'p1', name: 'Пыльцевой вихрь', max: 3, icon: '🌪️', desc: 'Увеличивает силу сбора пыльцы сборщиком на +20% за уровень.' },
      { id: 'p2', name: 'Длинная серия', max: 3, icon: '⚡', desc: 'Время удержания комбо сбора продлено на +2 секунды за уровень.' },
      { id: 'p3', name: 'Магнитный шторм', max: 3, icon: '🧲', desc: 'Радиус притяжения предметов вакуумом увеличен на +25 пикселей за уровень.' },
      { id: 'p4', name: 'Двойной сбор', max: 3, icon: '💎', desc: 'Шанс удвоения собранной пыльцы +12% за уровень.' },
      { id: 'p5', name: 'Аура Садовника', max: 1, icon: '👑', desc: 'Помощники приносят вдвое больше пыльцы при комбо 30+!' }
    ],
    exploration: [
      { id: 'e1', name: 'Мягкие лапки', max: 3, icon: '🐾', desc: 'Базовая скорость передвижения котиков увеличена на +10% за уровень.' },
      { id: 'e2', name: 'Зоркий глаз', max: 3, icon: '👁️', desc: 'Подсвечивает спрятанные сундуки и секретные проходы издалека.' },
      { id: 'e3', name: 'Удачливый рыбак', max: 3, icon: '🎣', desc: 'Окно реакции при поклёвке рыбы расширено на 35% за уровень.' },
      { id: 'e4', name: 'Горный мастер', max: 3, icon: '⛏️', desc: 'Урон инструментами по скалам и деревьям увеличен на +30% за уровень.' },
      { id: 'e5', name: 'Крылья Ветра', max: 1, icon: '🪶', desc: 'Котики могут совершать быстрый рывок на клавишу Shift!' }
    ]
  };

  // Export to global scope
  global.MeowBloomData = {
    RARITY,
    MUTATIONS,
    CROPS,
    HYBRID_RECIPES,
    FERTILIZERS,
    HELPERS,
    POLLEN_TYPES,
    POLLEN_COLLECTORS,
    BIOMES_INFO,
    STORY_CHAPTERS,
    NPCS,
    COOKING_RECIPES,
    SKILL_TREE
  };

})(window);
