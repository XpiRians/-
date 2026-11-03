/**
 * MUSYA & KETI: 2D TOP-DOWN FARM & ADVENTURE GAME (farm_game.js)
 * High-performance pure Canvas 2D engine.
 * Inspired by Bee Swarm Simulator & Grow a Garden.
 * Features:
 * - 6 Biomes on a 2400x1600 map (Home Farm, Whispering Forest, Moonlit Lake, Crystal Quarry, Greenhouse, Cosmic Altar)
 * - Procedural animated cat sprites (Musya & Keti) with companion follower AI & Q-swap
 * - Bouncy loot drops with smooth vacuum magnet physics
 * - Farming plots with visible growth cycles & watering
 * - Tree chopping & rock mining with tool durability & upgrades
 * - Lake pier fishing with bite reaction mini-game
 * - Cat Merchant Felix (sell crops, buy seeds, upgrade tools & backpack)
 * - Collector's Journal with 24 items across 6 rarity tiers
 * - Quests awarding verified mathematical Feistel-SPN PRP Gallery Trophies
 * - JSON Export/Import & persistent save state
 */

(function () {
  'use strict';

  const SAVE_KEY = 'musya_keti_2d_farm_save';
  const MAP_W = 2400;
  const MAP_H = 1600;

  // 1. ITEMS & RARITIES
  const RARITY = {
    COMMON: { id: 'common', name: 'Обычный', color: '#94a3b8', symbol: '⚪' },
    UNCOMMON: { id: 'uncommon', name: 'Необычный', color: '#22c55e', symbol: '🟢' },
    RARE: { id: 'rare', name: 'Редкий', color: '#3b82f6', symbol: '🔵' },
    EPIC: { id: 'epic', name: 'Эпический', color: '#a855f7', symbol: '🟣' },
    LEGENDARY: { id: 'legendary', name: 'Легендарный', color: '#f59e0b', symbol: '🟠' },
    MYTHIC: { id: 'mythic', name: 'Мифический', color: '#ec4899', symbol: '🌟' }
  };

  const ITEMS = {
    // Crops & Plants
    catnip: { id: 'catnip', name: 'Кошачья мята', cat: 'plants', rarity: RARITY.COMMON, icon: '🌿', price: 4, desc: 'Любимое лакомство Муси и Кейти с бодрящим ароматом.' },
    wheat: { id: 'wheat', name: 'Золотистая пшеница', cat: 'plants', rarity: RARITY.COMMON, icon: '🌾', price: 6, desc: 'Налитые солнцем колоски для питательного корма.' },
    bell: { id: 'bell', name: 'Луговой колокольчик', cat: 'plants', rarity: RARITY.UNCOMMON, icon: '🌸', price: 14, desc: 'Нежный цветок с лесных полян, звенит на ветру.' },
    valerian: { id: 'valerian', name: 'Королевская валериана', cat: 'plants', rarity: RARITY.RARE, icon: '💜', price: 32, desc: 'Редкий фиолетовый корень, дарует безмятежность котикам.' },
    star_flower: { id: 'star_flower', name: 'Звёздный первоцвет', cat: 'plants', rarity: RARITY.EPIC, icon: '🌺', price: 75, desc: 'Светится в сумерках мягким сиянием ночного неба.' },
    babel_blossom: { id: 'babel_blossom', name: 'Вавилонский цветок', cat: 'plants', rarity: RARITY.LEGENDARY, icon: '✨', price: 200, desc: 'Цветок с бесконечным числом фрактальных лепестков.' },

    // Wood & Forest
    wood: { id: 'wood', name: 'Древесина дуба', cat: 'materials', rarity: RARITY.COMMON, icon: '🪵', price: 3, desc: 'Крепкие брёвна из Шепчущего леса для мостов и построек.' },
    birch: { id: 'birch', name: 'Берёзовый спил', cat: 'materials', rarity: RARITY.UNCOMMON, icon: '🪵', price: 9, desc: 'Гладкая светлая кора с тонким ароматом смолы.' },
    acorn: { id: 'acorn', name: 'Лесной желудь', cat: 'materials', rarity: RARITY.COMMON, icon: '🌰', price: 5, desc: 'Твёрдый плод векового дуба, привлекает птиц.' },
    apple: { id: 'apple', name: 'Спелое яблоко', cat: 'materials', rarity: RARITY.UNCOMMON, icon: '🍎', price: 12, desc: 'Сочный лесной десерт.' },
    glow_shroom: { id: 'glow_shroom', name: 'Гриб-светляк', cat: 'plants', rarity: RARITY.RARE, icon: '🍄', price: 35, desc: 'Люминесцентный гриб, растущий в тени старых сосен.' },

    // Mining & Gems
    stone: { id: 'stone', name: 'Обычный камень', cat: 'minerals', rarity: RARITY.COMMON, icon: '🪨', price: 4, desc: 'Гранитные обломки из Кристального карьера.' },
    iron_ore: { id: 'iron_ore', name: 'Железная руда', cat: 'minerals', rarity: RARITY.UNCOMMON, icon: '⛏️', price: 15, desc: 'Тяжелый минерал с металлическим отблеском.' },
    amethyst: { id: 'amethyst', name: 'Аметистовая друза', cat: 'minerals', rarity: RARITY.RARE, icon: '💎', price: 50, desc: 'Сиреневый кристалл, преломляющий солнечные лучи.' },
    quartz: { id: 'quartz', name: 'Горный хрусталь', cat: 'minerals', rarity: RARITY.EPIC, icon: '🔮', price: 110, desc: 'Прозрачный минерал с застывшей чистотой вечности.' },
    stardust: { id: 'stardust', name: 'Звёздная пыль', cat: 'minerals', rarity: RARITY.LEGENDARY, icon: '⭐', price: 250, desc: 'Мерцающие небесные крупицы для Космического Алтаря.' },

    // Fish
    crucian: { id: 'crucian', name: 'Речной карась', cat: 'fish', rarity: RARITY.COMMON, icon: '🐟', price: 10, desc: 'Шустрая рыбка из Лунного озера, любимая добыча Муси.' },
    golden_carp: { id: 'golden_carp', name: 'Золотой карп', cat: 'fish', rarity: RARITY.UNCOMMON, icon: '🐠', price: 28, desc: 'Карп с чешуей цвета чистого золота.' },
    moon_squid: { id: 'moon_squid', name: 'Лунный кальмар', cat: 'fish', rarity: RARITY.RARE, icon: '🦑', price: 65, desc: 'Загадочный обитатель глубин озера, светится в темноте.' },
    star_trout: { id: 'star_trout', name: 'Звёздная форель', cat: 'fish', rarity: RARITY.EPIC, icon: '🌟', price: 140, desc: 'Редчайшая рыба, поднимающаяся на поверхность только в полнолуние.' },

    // Relics
    amber: { id: 'amber', name: 'Лунный янтарь', cat: 'relics', rarity: RARITY.EPIC, icon: '📿', price: 180, desc: 'Застывшая смола тысячелетнего дерева с каплей света внутри.' },
    ancient_tablet: { id: 'ancient_tablet', name: 'Кошачья скрижаль', cat: 'relics', rarity: RARITY.LEGENDARY, icon: '📜', price: 350, desc: 'Древний артефакт с зашифрованными координатами Вавилона.' },
    musya_tear: { id: 'musya_tear', name: 'Слеза Муси', cat: 'relics', rarity: RARITY.MYTHIC, icon: '💎', price: 1000, desc: 'Кристалл абсолютной преданности серебристой кошки.' },
    keti_crown: { id: 'keti_crown', name: 'Венец Кейти', cat: 'relics', rarity: RARITY.MYTHIC, icon: '👑', price: 1000, desc: 'Золотая корона владычицы бесконечных просторов.' }
  };

  // Seeds
  const SEEDS = {
    seed_catnip: { id: 'seed_catnip', cropId: 'catnip', name: 'Семена мяты', icon: '🌱', price: 2, growTime: 6, levelReq: 1 },
    seed_wheat: { id: 'seed_wheat', cropId: 'wheat', name: 'Семена пшеницы', icon: '🌾', price: 4, growTime: 12, levelReq: 1 },
    seed_bell: { id: 'seed_bell', cropId: 'bell', name: 'Семена колокольчика', icon: '🌸', price: 8, growTime: 20, levelReq: 3 },
    seed_valerian: { id: 'seed_valerian', cropId: 'valerian', name: 'Семена валерианы', icon: '💜', price: 18, growTime: 35, levelReq: 5 },
    seed_star: { id: 'seed_star', cropId: 'star_flower', name: 'Семена первоцвета', icon: '🌺', price: 45, growTime: 60, levelReq: 8 },
    seed_babel: { id: 'seed_babel', cropId: 'babel_blossom', name: 'Семена Вавилона', icon: '✨', price: 120, growTime: 90, levelReq: 12 }
  };

  // Upgrades
  const UPGRADES = {
    axe: {
      name: 'Топор Муси 🪓',
      desc: 'Ускоряет рубку деревьев и увеличивает количество выпадающей древесины.',
      levels: [
        { level: 1, name: 'Деревянный топор', cost: 0, power: 1, bonusYield: 0 },
        { level: 2, name: 'Медный топор', cost: 60, power: 1.5, bonusYield: 1 },
        { level: 3, name: 'Железный топор', cost: 180, power: 2.2, bonusYield: 2 },
        { level: 4, name: 'Золотой топор', cost: 450, power: 3.2, bonusYield: 3 },
        { level: 5, name: 'Мифриловый топор', cost: 1000, power: 5.0, bonusYield: 5 }
      ]
    },
    pickaxe: {
      name: 'Кирка Кейти ⛏️',
      desc: 'Увеличивает урон по скалам и шанс выпадения драгоценных кристаллов.',
      levels: [
        { level: 1, name: 'Каменная кирка', cost: 0, power: 1, bonusYield: 0 },
        { level: 2, name: 'Медная кирка', cost: 80, power: 1.5, bonusYield: 1 },
        { level: 3, name: 'Железная кирка', cost: 220, power: 2.2, bonusYield: 2 },
        { level: 4, name: 'Алмазная кирка', cost: 550, power: 3.2, bonusYield: 3 },
        { level: 5, name: 'Звёздная кирка', cost: 1200, power: 5.0, bonusYield: 5 }
      ]
    },
    can: {
      name: 'Волшебная лейка 🪣',
      desc: 'Полив грядки ускоряет рост урожая на 60%.',
      levels: [
        { level: 1, name: 'Глиняная лейка', cost: 0, speedMult: 1.3 },
        { level: 2, name: 'Медная лейка', cost: 50, speedMult: 1.6 },
        { level: 3, name: 'Серебряная лейка', cost: 150, speedMult: 2.0 },
        { level: 4, name: 'Золотая лейка', cost: 400, speedMult: 2.6 }
      ]
    },
    backpack: {
      name: 'Походный рюкзачок 🎒',
      desc: 'Увеличивает предельную вместимость рюкзака.',
      levels: [
        { level: 1, name: 'Холщовая сумка', cost: 0, cap: 30 },
        { level: 2, name: 'Кожаный ранец', cost: 80, cap: 60 },
        { level: 3, name: 'Туристический рюкзак', cost: 200, cap: 120 },
        { level: 4, name: 'Бездонный мешок', cost: 500, cap: 250 },
        { level: 5, name: 'Пространственная сумка', cost: 1200, cap: 600 }
      ]
    },
    boots: {
      name: 'Сапожки-скороходы 👟',
      desc: 'Повышает скорость передвижения котиков по карте.',
      levels: [
        { level: 1, name: 'Мягкие лапки', cost: 0, speed: 200 },
        { level: 2, name: 'Легкие сапожки', cost: 70, speed: 235 },
        { level: 3, name: 'Сапоги ветра', cost: 200, speed: 275 },
        { level: 4, name: 'Крылатые сандалии', cost: 600, speed: 330 }
      ]
    }
  };

  // Biome Zone Boundaries
  const BIOMES = [
    { id: 'farm', name: 'Домашняя ферма', icon: '🏡', bounds: { x1: 50, y1: 50, x2: 900, y2: 850 } },
    { id: 'forest', name: 'Шепчущий лес', icon: '🌲', bounds: { x1: 950, y1: 50, x2: 2350, y2: 800 } },
    { id: 'greenhouse', name: 'Вавилонская теплица', icon: '🏛️', bounds: { x1: 750, y1: 50, x2: 1200, y2: 450 } },
    { id: 'lake', name: 'Лунное озеро', icon: '🌊', bounds: { x1: 50, y1: 900, x2: 950, y2: 1550 } },
    { id: 'quarry', name: 'Кристальный карьер', icon: '⛰️', bounds: { x1: 1000, y1: 850, x2: 1850, y2: 1550 } },
    { id: 'altar', name: 'Космический алтарь', icon: '✨', bounds: { x1: 1900, y1: 850, x2: 2350, y2: 1550 } }
  ];

  // Verified Mathematical Trophies loaded from docs/farm_trophies.json
  let FARM_TROPHIES = {};

  // Default Game State
  function getDefaultState() {
    return {
      player: {
        x: 420,
        y: 450,
        activeCat: 'musya', // 'musya' or 'keti'
        facing: 0, // 0: down, 1: up, 2: left, 3: right
        level: 1,
        xp: 0,
        coins: 40,
        seeds: {
          seed_catnip: 5,
          seed_wheat: 3
        },
        inventory: {}, // item_id -> count
        upgrades: {
          axe: 1,
          pickaxe: 1,
          can: 1,
          backpack: 1,
          boots: 1
        },
        unlockedZones: ['farm'],
        unlockedTrophies: [],
        discoveredItems: {}, // item_id -> true
        stats: {
          cropsHarvested: 0,
          treesChopped: 0,
          rocksMined: 0,
          fishCaught: 0,
          coinsEarned: 0
        }
      },
      follower: {
        x: 400,
        y: 470,
        facing: 0
      },
      // 8 Home Farm Plots + 4 Greenhouse Plots
      plots: [
        { id: 'p1', x: 260, y: 380, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p2', x: 340, y: 380, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p3', x: 420, y: 380, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p4', x: 500, y: 380, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p5', x: 260, y: 460, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p6', x: 340, y: 460, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p7', x: 420, y: 460, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        { id: 'p8', x: 500, y: 460, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: false },
        // Greenhouse Plots
        { id: 'gh1', x: 880, y: 220, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: true },
        { id: 'gh2', x: 960, y: 220, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: true },
        { id: 'gh3', x: 1040, y: 220, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: true },
        { id: 'gh4', x: 1120, y: 220, crop: null, plantedAt: 0, growDuration: 0, watered: false, greenhouse: true }
      ],
      // Quests State
      quests: [
        { id: 'q1', title: 'Первый урожай Кейти', desc: 'Посадите и соберите 3 кошачьи мяты.', type: 'harvest', target: 'catnip', count: 3, current: 0, rewardCoins: 25, rewardXp: 35, completed: false, claimed: false },
        { id: 'q2', title: 'Дровосек Муся', desc: 'Нарубите 10 древесины в Шепчущем лесу.', type: 'chop', target: 'wood', count: 10, current: 0, rewardCoins: 45, rewardXp: 50, completed: false, claimed: false },
        { id: 'q3', title: 'Рыбак на Лунном озере', desc: 'Поймайте 3 рыбы на озерном пирсе.', type: 'fish', target: 'any_fish', count: 3, current: 0, rewardCoins: 60, rewardXp: 70, completed: false, claimed: false },
        { id: 'q4', title: 'Мастер-Горняк', desc: 'Добудьте 12 камня или руды в Кристальном карьере.', type: 'mine', target: 'any_mineral', count: 12, current: 0, rewardCoins: 90, rewardXp: 100, completed: false, claimed: false },
        { id: 'q5', title: 'Цветочный чародей', desc: 'Вырастите и соберите Королевскую валериану.', type: 'harvest', target: 'valerian', count: 2, current: 0, rewardCoins: 150, rewardXp: 180, completed: false, claimed: false }
      ],
      milestones: [
        { id: 'trophy_garden', title: 'Трофей Садовода Муси', reqDesc: 'Собрать 15 любых растений с грядок', stat: 'cropsHarvested', reqVal: 15, res: 32, claimed: false },
        { id: 'trophy_forest', title: 'Трофей Изумрудного Леса', reqDesc: 'Срубить 10 деревьев в Шепчущем лесу', stat: 'treesChopped', reqVal: 10, res: 32, claimed: false },
        { id: 'trophy_fish', title: 'Трофей Золотой Рыбки', reqDesc: 'Поймать 8 рыб на Лунном озере', stat: 'fishCaught', reqVal: 8, res: 32, claimed: false },
        { id: 'trophy_harmony', title: 'Трофей Космической Гармонии', reqDesc: 'Достичь 10 уровня и собрать 3 Звёздной пыли', stat: 'level', reqVal: 10, res: 64, claimed: false }
      ],
      lastSaveTime: Date.now()
    };
  }

  // Active Runtime State
  let state = getDefaultState();
  let canvas, ctx;
  let lastFrameTime = performance.now();
  let keys = {};
  let touchJoystick = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0 };
  let camera = { x: 0, y: 0, w: 960, h: 600 };
  let selectedSeed = 'seed_catnip';
  let activePlotForPlanting = null;

  // Runtime Entities (Trees, Rocks, Pier, Merchant, Dropped Loot, Particles)
  let trees = [];
  let rocks = [];
  let droppedItems = [];
  let particles = [];
  let floatingTexts = [];
  let fishingState = { active: false, timer: 0, bite: false, x: 0, y: 0 };

  // Init World Objects
  function initWorldEntities() {
    trees = [];
    // 14 Trees in Whispering Forest
    const treeCoords = [
      { x: 1080, y: 180 }, { x: 1220, y: 150 }, { x: 1360, y: 220 }, { x: 1540, y: 160 },
      { x: 1720, y: 240 }, { x: 1900, y: 170 }, { x: 2100, y: 220 }, { x: 2220, y: 350 },
      { x: 1150, y: 420 }, { x: 1320, y: 500 }, { x: 1500, y: 440 }, { x: 1680, y: 560 },
      { x: 1860, y: 480 }, { x: 2060, y: 580 }, { x: 2240, y: 520 }
    ];
    treeCoords.forEach((c, idx) => {
      trees.push({
        id: 'tree_' + idx,
        x: c.x,
        y: c.y,
        hp: 3,
        maxHp: 3,
        respawnTimer: 0,
        shake: 0,
        type: idx % 4 === 0 ? 'birch' : 'oak'
      });
    });

    // 12 Rocks in Crystal Quarry
    rocks = [];
    const rockCoords = [
      { x: 1100, y: 980, type: 'granite' }, { x: 1260, y: 940, type: 'amethyst' }, { x: 1420, y: 1020, type: 'iron' },
      { x: 1580, y: 960, type: 'granite' }, { x: 1740, y: 1050, type: 'quartz' }, { x: 1180, y: 1180, type: 'iron' },
      { x: 1340, y: 1240, type: 'granite' }, { x: 1520, y: 1180, type: 'amethyst' }, { x: 1680, y: 1260, type: 'star' },
      { x: 1240, y: 1380, type: 'granite' }, { x: 1440, y: 1420, type: 'iron' }, { x: 1620, y: 1400, type: 'quartz' }
    ];
    rockCoords.forEach((c, idx) => {
      rocks.push({
        id: 'rock_' + idx,
        x: c.x,
        y: c.y,
        hp: 4,
        maxHp: 4,
        respawnTimer: 0,
        shake: 0,
        type: c.type
      });
    });
  }

  // Load Trophy definitions from docs/farm_trophies.json
  async function loadTrophies() {
    try {
      const resp = await fetch('farm_trophies.json');
      if (resp.ok) {
        FARM_TROPHIES = await resp.json();
      }
    } catch (e) {
      console.warn('Could not load farm_trophies.json via fetch, using fallback cache', e);
    }
  }

  // Storage Save / Load
  function saveGame() {
    try {
      state.lastSaveTime = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      const lbl = document.getElementById('lastSaveTimeText');
      if (lbl) lbl.textContent = new Date().toLocaleTimeString();
    } catch (e) {
      console.error('Failed to save game state', e);
    }
  }

  function loadGame() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved data into defaults
        if (parsed.player) Object.assign(state.player, parsed.player);
        if (parsed.plots) state.plots = parsed.plots;
        if (parsed.quests) state.quests = parsed.quests;
        if (parsed.milestones) state.milestones = parsed.milestones;
        if (parsed.follower) Object.assign(state.follower, parsed.follower);
        showToast('🐾 Прогресс фермы Муси и Кейти успешно загружен!');
      }
    } catch (e) {
      console.warn('Could not parse saved farm game, starting fresh', e);
    }
  }

  // EXP & Level Progression
  function getXpForLevel(lvl) {
    return Math.floor(60 * Math.pow(1.35, lvl - 1));
  }

  function addXp(amount) {
    state.player.xp += amount;
    let needed = getXpForLevel(state.player.level);
    while (state.player.xp >= needed) {
      state.player.xp -= needed;
      state.player.level++;
      spawnFloatingText(state.player.x, state.player.y - 40, `🎉 УРОВЕНЬ ${state.player.level}!`, '#f59e0b');
      showToast(`🐱 Поздравляем! Новый уровень фермы: ${state.player.level}!`);
      needed = getXpForLevel(state.player.level);
    }
    updateHud();
  }

  function getInventoryCount() {
    let total = 0;
    for (let k in state.player.inventory) {
      total += state.player.inventory[k] || 0;
    }
    return total;
  }

  function getBackpackCapacity() {
    const lvl = state.player.upgrades.backpack || 1;
    const def = UPGRADES.backpack.levels[lvl - 1] || UPGRADES.backpack.levels[0];
    return def.cap;
  }

  function addItemToInventory(itemId, count = 1) {
    const cap = getBackpackCapacity();
    const cur = getInventoryCount();
    if (cur + count > cap) {
      showToast('⚠️ Рюкзак переполнен! Продайте урожай у торговца.');
      return false;
    }
    state.player.inventory[itemId] = (state.player.inventory[itemId] || 0) + count;
    state.player.discoveredItems[itemId] = true;
    
    // Check quests
    checkQuestsProgress('collect', itemId, count);
    updateHud();
    return true;
  }

  // Bouncy Loot Drop Spawn
  function spawnLoot(x, y, itemId, count = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 80;
      droppedItems.push({
        x: x,
        y: y,
        z: 15,
        vz: 120 + Math.random() * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        itemId: itemId,
        life: 0,
        bobOffset: Math.random() * 10
      });
    }
  }

  // Floating text feedback
  function spawnFloatingText(x, y, text, color = '#ffffff') {
    floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      life: 0,
      maxLife: 1.2
    });
  }

  // Sparkle particle burst
  function spawnParticles(x, y, count = 8, color = '#fbbf24') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
        size: 3 + Math.random() * 3,
        color: color
      });
    }
  }

  // Quests check
  function checkQuestsProgress(type, target, amount = 1) {
    let changed = false;
    state.quests.forEach(q => {
      if (!q.completed) {
        if (q.type === type) {
          if (q.target === target || q.target === 'any_fish' || q.target === 'any_mineral') {
            q.current = Math.min(q.count, q.current + amount);
            if (q.current >= q.count) {
              q.completed = true;
              changed = true;
              showToast(`📜 Задание выполнено: "${q.title}"! Откройте меню заданий.`);
            }
          }
        }
      }
    });

    // Milestone Trophies check
    state.milestones.forEach(m => {
      if (!m.claimed) {
        let val = 0;
        if (m.stat === 'cropsHarvested') val = state.player.stats.cropsHarvested;
        else if (m.stat === 'treesChopped') val = state.player.stats.treesChopped;
        else if (m.stat === 'fishCaught') val = state.player.stats.fishCaught;
        else if (m.stat === 'level') val = state.player.level;

        if (val >= m.reqVal) {
          unlockMilestoneTrophy(m);
        }
      }
    });

    if (changed) updateHud();
  }

  // Milestone Trophy Unlock with Real Babel Exhibit ID
  function unlockMilestoneTrophy(milestone) {
    milestone.claimed = true;
    const trophyData = FARM_TROPHIES[milestone.id];
    if (!trophyData) return;

    state.player.unlockedTrophies.push(milestone.id);
    saveGame();

    // Register into Museum Catalog if catalog.js is present
    if (window.MusyaKetiCatalog && window.MusyaKetiCatalog.addExhibit) {
      window.MusyaKetiCatalog.addExhibit({
        id: trophyData.id,
        number: 1000 + state.player.unlockedTrophies.length,
        resolution: trophyData.resolution,
        title: trophyData.title_ru || milestone.title,
        source: 'Ферма Муси и Кейти (Достижение)',
        date: new Date().toISOString()
      });
    }

    // Show Celebration Modal
    openTrophyCelebrationModal(milestone, trophyData);
  }

  function openTrophyCelebrationModal(milestone, trophyData) {
    const modal = document.getElementById('trophyModal');
    if (!modal) return;
    document.getElementById('celebrationTitle').textContent = milestone.title;
    document.getElementById('celebrationSubtitle').textContent = `Выполнено: ${milestone.reqDesc}. Подлинный шедевр добавлен в каталог!`;
    document.getElementById('trophyIdPill').textContent = trophyData.id.slice(0, 36) + '...';
    
    const link = document.getElementById('trophyGalleryLink');
    if (link) {
      link.href = `index.html?id=${encodeURIComponent(trophyData.id)}&num=${1000 + state.player.unlockedTrophies.length}`;
    }

    // Decode & render on trophy canvas preview
    const previewCanvas = document.getElementById('trophyPreviewCanvas');
    if (previewCanvas && window.MusyaKetiDecoder) {
      try {
        const decoded = window.MusyaKetiDecoder.decodeImage(trophyData.id, trophyData.resolution);
        const pctx = previewCanvas.getContext('2d');
        const imgData = pctx.createImageData(trophyData.resolution, trophyData.resolution);
        imgData.data.set(decoded);
        
        // Draw scaled
        const offCanvas = document.createElement('canvas');
        offCanvas.width = trophyData.resolution;
        offCanvas.height = trophyData.resolution;
        offCanvas.getContext('2d').putImageData(imgData, 0, 0);

        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(offCanvas, 0, 0, 128, 128);
      } catch (e) {
        console.warn('Trophy preview render error', e);
      }
    }

    modal.style.display = 'flex';
  }

  // Active Cat Swap
  function swapActiveCat() {
    const prev = state.player.activeCat;
    state.player.activeCat = (prev === 'musya') ? 'keti' : 'musya';
    
    // Swap follower positions smoothly
    const tmpX = state.player.x;
    const tmpY = state.player.y;
    spawnParticles(tmpX, tmpY, 15, state.player.activeCat === 'musya' ? '#94a3b8' : '#eab308');
    
    const name = state.player.activeCat === 'musya' ? 'Муся' : 'Кейти';
    spawnFloatingText(tmpX, tmpY - 30, `🐾 Активна: ${name}!`, '#fbbf24');
    updateHud();
    saveGame();
  }

  // Current Biome Resolver
  function getCurrentBiome(x, y) {
    for (let b of BIOMES) {
      if (x >= b.bounds.x1 && x <= b.bounds.x2 && y >= b.bounds.y1 && y <= b.bounds.y2) {
        return b;
      }
    }
    return BIOMES[0];
  }

  // ==========================================
  // GAME UPDATE & PHYSICS
  // ==========================================
  function update(dt) {
    const p = state.player;
    const f = state.follower;

    // 1. Move Speed & Upgrades
    const bootsLvl = p.upgrades.boots || 1;
    const baseSpeed = UPGRADES.boots.levels[bootsLvl - 1].speed;
    let moveX = 0;
    let moveY = 0;

    // Keyboard Input
    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Mobile Joystick
    if (touchJoystick.active) {
      moveX = touchJoystick.dirX;
      moveY = touchJoystick.dirY;
    }

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      const nx = moveX / len;
      const ny = moveY / len;
      p.x = Math.max(80, Math.min(MAP_W - 80, p.x + nx * baseSpeed * dt));
      p.y = Math.max(80, Math.min(MAP_H - 80, p.y + ny * baseSpeed * dt));

      if (Math.abs(moveX) > Math.abs(moveY)) {
        p.facing = moveX > 0 ? 3 : 2; // right : left
      } else {
        p.facing = moveY > 0 ? 0 : 1; // down : up
      }
    }

    // 2. Follower AI (Cozy flocking behind player)
    const distToPlayer = Math.hypot(p.x - f.x, p.y - f.y);
    const targetDist = 55;
    if (distToPlayer > targetDist) {
      const fAngle = Math.atan2(p.y - f.y, p.x - f.x);
      const fSpeed = baseSpeed * 1.05;
      f.x += Math.cos(fAngle) * fSpeed * dt;
      f.y += Math.sin(fAngle) * fSpeed * dt;
      if (Math.abs(p.x - f.x) > Math.abs(p.y - f.y)) {
        f.facing = (p.x > f.x) ? 3 : 2;
      } else {
        f.facing = (p.y > f.y) ? 0 : 1;
      }
    }

    // 3. Camera Smooth Following
    const targetCamX = p.x - camera.w / 2;
    const targetCamY = p.y - camera.h / 2;
    camera.x += (targetCamX - camera.x) * 6 * dt;
    camera.y += (targetCamY - camera.y) * 6 * dt;
    camera.x = Math.max(0, Math.min(MAP_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(MAP_H - camera.h, camera.y));

    // 4. Update Crops Growth in Plots
    const now = Date.now();
    state.plots.forEach(plot => {
      if (plot.crop) {
        // Keti Perk: +30% growth speed!
        let speedBoost = (state.player.activeCat === 'keti') ? 1.3 : 1.0;
        if (plot.watered) speedBoost *= 1.6;
        if (plot.greenhouse) speedBoost *= 1.5;
        plot.growthProgress = Math.min(1.0, (now - plot.plantedAt) / (plot.growDuration / speedBoost));
      }
    });

    // 5. Update Dropped Items & Vacuum Magnet Pickup
    const magnetRadius = 110;
    const magnetSpeed = 380;
    for (let i = droppedItems.length - 1; i >= 0; i--) {
      const item = droppedItems[i];
      item.life += dt;

      // Physics bounce
      if (item.z > 0 || item.vz > 0) {
        item.z += item.vz * dt;
        item.vz -= 300 * dt; // gravity
        if (item.z <= 0) {
          item.z = 0;
          item.vz = -item.vz * 0.4;
          if (Math.abs(item.vz) < 20) item.vz = 0;
        }
      }

      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vx *= 0.92;
      item.vy *= 0.92;

      // Vacuum Magnet toward Player or Follower
      const dPlayer = Math.hypot(p.x - item.x, p.y - item.y);
      const dFollower = Math.hypot(f.x - item.x, f.y - item.y);
      const targetCat = (dFollower < dPlayer) ? f : p;
      const minDist = Math.min(dPlayer, dFollower);

      if (minDist < magnetRadius) {
        const angle = Math.atan2(targetCat.y - item.y, targetCat.x - item.x);
        item.x += Math.cos(angle) * magnetSpeed * dt;
        item.y += Math.sin(angle) * magnetSpeed * dt;

        // Pickup collision
        if (minDist < 25) {
          const itemDef = ITEMS[item.itemId] || { name: item.itemId, icon: '📦', rarity: RARITY.COMMON };
          const success = addItemToInventory(item.itemId, 1);
          if (success) {
            spawnParticles(item.x, item.y, 6, itemDef.rarity.color);
            spawnFloatingText(item.x, item.y - 15, `+1 ${itemDef.icon} ${itemDef.name}`, itemDef.rarity.color);
            addXp(4);
            droppedItems.splice(i, 1);
            continue;
          }
        }
      }
    }

    // 6. Update Entities (Trees & Rocks respawn timers)
    trees.forEach(t => {
      if (t.hp <= 0) {
        t.respawnTimer -= dt;
        if (t.respawnTimer <= 0) {
          t.hp = t.maxHp;
          spawnParticles(t.x, t.y, 10, '#22c55e');
        }
      }
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt * 6);
    });

    rocks.forEach(r => {
      if (r.hp <= 0) {
        r.respawnTimer -= dt;
        if (r.respawnTimer <= 0) {
          r.hp = r.maxHp;
          spawnParticles(r.x, r.y, 10, '#a855f7');
        }
      }
      if (r.shake > 0) r.shake = Math.max(0, r.shake - dt * 6);
    });

    // 7. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life >= pt.maxLife) particles.splice(i, 1);
    }

    // 8. Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life += dt;
      ft.y -= 30 * dt;
      if (ft.life >= ft.maxLife) floatingTexts.splice(i, 1);
    }

    // 9. Fishing State Update
    if (fishingState.active) {
      fishingState.timer += dt;
      if (fishingState.timer > 3.0 && !fishingState.bite) {
        fishingState.bite = true;
        spawnFloatingText(p.x, p.y - 45, '❗ КЛЮЁТ! (Жмите E)', '#ef4444');
      }
    }

    // 10. Update Current Biome & Nearby Context Prompts
    updateContextPrompt();
  }

  // ==========================================
  // INTERACTIONS (E & SPACE)
  // ==========================================
  function handleInteract() {
    const p = state.player;

    // 1. Fishing on Pier
    const pierDist = Math.hypot(p.x - 480, p.y - 1200);
    if (pierDist < 80) {
      if (!fishingState.active) {
        fishingState.active = true;
        fishingState.timer = 0;
        fishingState.bite = false;
        fishingState.x = 480;
        fishingState.y = 1250;
        spawnParticles(fishingState.x, fishingState.y, 8, '#38bdf8');
        showToast('🎣 Удочка заброшена! Ждите поклёвки (сигнал ❗)...');
        return;
      } else {
        // Reel in
        if (fishingState.bite) {
          fishingState.active = false;
          state.player.stats.fishCaught++;
          
          // Determine fish catch
          const roll = Math.random();
          let fishId = 'crucian';
          if (roll > 0.94) fishId = 'star_trout';
          else if (roll > 0.75) fishId = 'moon_squid';
          else if (roll > 0.40) fishId = 'golden_carp';

          spawnLoot(p.x, p.y - 20, fishId, 1);
          addXp(20);
          checkQuestsProgress('fish', fishId, 1);
          showToast(`🐟 Отличный улов! Вы поймали ${ITEMS[fishId].name}!`);
        } else {
          fishingState.active = false;
          showToast('💨 Слишком рано подсекли! Рыбка сорвалась.');
        }
        return;
      }
    }

    // 2. Merchant Felix
    const merchantDist = Math.hypot(p.x - 620, p.y - 280);
    if (merchantDist < 70) {
      openModal('shopModal');
      return;
    }

    // 3. Farming Plots
    for (let plot of state.plots) {
      const dist = Math.hypot(p.x - plot.x, p.y - plot.y);
      if (dist < 45) {
        if (!plot.crop) {
          // Open seed planting selector
          openSeedSelector(plot);
          return;
        } else if (plot.growthProgress >= 1.0) {
          // Harvest ready crop!
          harvestPlot(plot);
          return;
        } else if (!plot.watered) {
          // Water crop!
          plot.watered = true;
          spawnParticles(plot.x, plot.y, 12, '#38bdf8');
          spawnFloatingText(plot.x, plot.y - 20, '💧 Полили!', '#38bdf8');
          return;
        }
      }
    }
  }

  function handleActionTool() {
    const p = state.player;

    // 1. Trees Chopping in Forest
    for (let tree of trees) {
      if (tree.hp > 0) {
        const dist = Math.hypot(p.x - tree.x, p.y - tree.y);
        if (dist < 60) {
          const axeLvl = p.upgrades.axe || 1;
          const axePower = UPGRADES.axe.levels[axeLvl - 1].power;
          // Musya Perk: +25% Wood yield & power
          const musyaBonus = (p.activeCat === 'musya') ? 1.35 : 1.0;

          tree.hp -= axePower * musyaBonus;
          tree.shake = 1.0;
          spawnParticles(tree.x, tree.y - 20, 6, '#e2e8f0');

          if (tree.hp <= 0) {
            tree.respawnTimer = 25; // 25s respawn
            state.player.stats.treesChopped++;
            const woodCount = 3 + (UPGRADES.axe.levels[axeLvl - 1].bonusYield || 0);
            spawnLoot(tree.x, tree.y, tree.type === 'birch' ? 'birch' : 'wood', woodCount);
            if (Math.random() > 0.6) spawnLoot(tree.x, tree.y, 'apple', 1);
            if (Math.random() > 0.5) spawnLoot(tree.x, tree.y, 'acorn', 1);
            addXp(15);
            checkQuestsProgress('chop', 'wood', woodCount);
            spawnFloatingText(tree.x, tree.y - 30, '🪓 Дерево срублено!', '#22c55e');
          } else {
            spawnFloatingText(tree.x, tree.y - 20, '🪓 Тюк!', '#e2e8f0');
          }
          return;
        }
      }
    }

    // 2. Mining in Quarry
    for (let rock of rocks) {
      if (rock.hp > 0) {
        const dist = Math.hypot(p.x - rock.x, p.y - rock.y);
        if (dist < 60) {
          const pickLvl = p.upgrades.pickaxe || 1;
          const pickPower = UPGRADES.pickaxe.levels[pickLvl - 1].power;
          // Musya Perk: +35% Mining damage
          const musyaBonus = (p.activeCat === 'musya') ? 1.35 : 1.0;

          rock.hp -= pickPower * musyaBonus;
          rock.shake = 1.0;
          spawnParticles(rock.x, rock.y - 15, 8, '#f59e0b');

          if (rock.hp <= 0) {
            rock.respawnTimer = 30; // 30s respawn
            state.player.stats.rocksMined++;
            const stoneCount = 3 + (UPGRADES.pickaxe.levels[pickLvl - 1].bonusYield || 0);
            spawnLoot(rock.x, rock.y, 'stone', stoneCount);
            
            // Rock specific loot
            if (rock.type === 'iron') spawnLoot(rock.x, rock.y, 'iron_ore', 2);
            else if (rock.type === 'amethyst') spawnLoot(rock.x, rock.y, 'amethyst', 1);
            else if (rock.type === 'quartz') spawnLoot(rock.x, rock.y, 'quartz', 1);
            else if (rock.type === 'star') spawnLoot(rock.x, rock.y, 'stardust', 1);

            addXp(20);
            checkQuestsProgress('mine', 'stone', stoneCount);
            spawnFloatingText(rock.x, rock.y - 30, '⛏️ Скала разрушена!', '#f59e0b');
          } else {
            spawnFloatingText(rock.x, rock.y - 20, '⛏️ Дзынь!', '#fcd34d');
          }
          return;
        }
      }
    }
  }

  function harvestPlot(plot) {
    const cropId = plot.crop;
    const cropDef = ITEMS[cropId];
    if (!cropDef) return;

    // Keti Perk: Chance of double drop!
    const doubleChance = (state.player.activeCat === 'keti') ? 0.35 : 0.15;
    const count = (Math.random() < doubleChance) ? 2 : 1;

    spawnLoot(plot.x, plot.y, cropId, count);
    spawnParticles(plot.x, plot.y, 10, cropDef.rarity.color);
    spawnFloatingText(plot.x, plot.y - 30, `🌾 Урожай собран!`, cropDef.rarity.color);
    
    state.player.stats.cropsHarvested++;
    addXp(12);
    checkQuestsProgress('harvest', cropId, count);

    // Reset plot
    plot.crop = null;
    plot.plantedAt = 0;
    plot.watered = false;
    plot.growthProgress = 0;
    saveGame();
  }

  function plantSeedInPlot(plot, seedId) {
    const count = state.player.seeds[seedId] || 0;
    if (count <= 0) {
      showToast('⚠️ У вас нет этих семян! Купите в лавке торговца.');
      return;
    }

    const seedDef = SEEDS[seedId];
    state.player.seeds[seedId]--;
    plot.crop = seedDef.cropId;
    plot.plantedAt = Date.now();
    plot.growDuration = seedDef.growTime * 1000;
    plot.watered = false;
    plot.growthProgress = 0;

    spawnParticles(plot.x, plot.y, 8, '#22c55e');
    spawnFloatingText(plot.x, plot.y - 20, `Посажено: ${seedDef.name}`, '#22c55e');
    closeSeedSelector();
    saveGame();
  }

  // ==========================================
  // CONTEXT PROMPTS & HUD UPDATE
  // ==========================================
  function updateContextPrompt() {
    const p = state.player;
    const prompt = document.getElementById('interactionPrompt');
    const keyLbl = document.getElementById('promptKey');
    const textLbl = document.getElementById('promptText');
    if (!prompt) return;

    // Check near merchant
    if (Math.hypot(p.x - 620, p.y - 280) < 70) {
      prompt.style.display = 'flex';
      keyLbl.textContent = 'E';
      textLbl.textContent = 'Лавка торговца Феликса 🏪';
      return;
    }

    // Check near lake pier
    if (Math.hypot(p.x - 480, p.y - 1200) < 80) {
      prompt.style.display = 'flex';
      keyLbl.textContent = 'E';
      textLbl.textContent = fishingState.active ? (fishingState.bite ? 'Подсечь рыбу! 🎣' : 'Ждём поклёвки...') : 'Забросить удочку 🎣';
      return;
    }

    // Check near plot
    for (let plot of state.plots) {
      if (Math.hypot(p.x - plot.x, p.y - plot.y) < 45) {
        prompt.style.display = 'flex';
        keyLbl.textContent = 'E';
        if (!plot.crop) {
          textLbl.textContent = 'Посадить семена 🌱';
        } else if (plot.growthProgress >= 1.0) {
          textLbl.textContent = 'Собрать урожай! 🌾';
        } else if (!plot.watered) {
          textLbl.textContent = 'Полить лейкой 💧';
        } else {
          textLbl.textContent = `Растёт (${Math.floor(plot.growthProgress * 100)}%)`;
        }
        return;
      }
    }

    // Check near tree
    for (let tree of trees) {
      if (tree.hp > 0 && Math.hypot(p.x - tree.x, p.y - tree.y) < 60) {
        prompt.style.display = 'flex';
        keyLbl.textContent = 'Space';
        textLbl.textContent = 'Рубить дерево топором 🪓';
        return;
      }
    }

    // Check near rock
    for (let rock of rocks) {
      if (rock.hp > 0 && Math.hypot(p.x - rock.x, p.y - rock.y) < 60) {
        prompt.style.display = 'flex';
        keyLbl.textContent = 'Space';
        textLbl.textContent = 'Добывать породу киркой ⛏️';
        return;
      }
    }

    prompt.style.display = 'none';
  }

  function updateHud() {
    const p = state.player;

    // Cat Info
    const avatar = document.getElementById('hudCatAvatar');
    const badge = document.getElementById('hudCatBadge');
    const name = document.getElementById('hudCatName');
    const perk = document.getElementById('hudPerkHint');
    const lvlTag = document.getElementById('hudLvlTag');
    const xpFill = document.getElementById('hudXpFill');

    if (avatar) avatar.src = (p.activeCat === 'musya') ? 'assets/musya.jpg' : 'assets/keti.jpg';
    if (badge) badge.textContent = (p.activeCat === 'musya') ? 'Муся' : 'Кейти';
    if (name) name.textContent = (p.activeCat === 'musya') ? 'Муся' : 'Кейти';
    if (perk) perk.textContent = (p.activeCat === 'musya') ? '🪵 +25% дерево/руда' : '🌾 +30% рост/двойной урожай';
    if (lvlTag) lvlTag.textContent = `Lv ${p.level}`;

    const neededXp = getXpForLevel(p.level);
    const xpPct = Math.min(100, Math.floor((p.xp / neededXp) * 100));
    if (xpFill) xpFill.style.width = xpPct + '%';

    // Current Zone
    const biome = getCurrentBiome(p.x, p.y);
    const zoneTitle = document.getElementById('hudZoneTitle');
    const zoneIcon = document.getElementById('hudZoneIcon');
    if (zoneTitle) zoneTitle.textContent = biome.name;
    if (zoneIcon) zoneIcon.textContent = biome.icon;

    // Coins & Backpack
    const coinsLbl = document.getElementById('hudCoins');
    const shopCoins = document.getElementById('shopCoinsVal');
    if (coinsLbl) coinsLbl.textContent = p.coins;
    if (shopCoins) shopCoins.textContent = p.coins;

    const bpCount = document.getElementById('hudBackpackCount');
    const bpCap = document.getElementById('hudBackpackCap');
    const invCapLbl = document.getElementById('invCapacityLabel');
    const curCount = getInventoryCount();
    const curCap = getBackpackCapacity();
    if (bpCount) bpCount.textContent = curCount;
    if (bpCap) bpCap.textContent = curCap;
    if (invCapLbl) invCapLbl.textContent = `${curCount} / ${curCap}`;

    // Mini Quest Tracker
    const firstActiveQuest = state.quests.find(q => !q.completed);
    const miniHeader = document.getElementById('miniQuestTitle');
    const miniDesc = document.getElementById('miniQuestDesc');
    const miniReward = document.getElementById('miniQuestReward');
    const alertDot = document.getElementById('questAlertDot');
    
    if (firstActiveQuest) {
      if (miniHeader) miniHeader.textContent = firstActiveQuest.title;
      if (miniDesc) miniDesc.textContent = `${firstActiveQuest.desc} (${firstActiveQuest.current}/${firstActiveQuest.count})`;
      if (miniReward) miniReward.textContent = `Награда: 🪙 ${firstActiveQuest.rewardCoins} • ${firstActiveQuest.rewardXp} XP`;
    } else {
      if (miniHeader) miniHeader.textContent = '🌟 Все задания выполнены!';
      if (miniDesc) miniDesc.textContent = 'Посетите Космический Алтарь или откройте Трофеи.';
    }

    const hasClaimable = state.quests.some(q => q.completed && !q.claimed);
    if (alertDot) alertDot.style.display = hasClaimable ? 'block' : 'none';
  }

  // ==========================================
  // PROCEDURAL CANVAS 2D RENDERING
  // ==========================================
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Camera Transform
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // 1. Draw Biomes Ground Base
    drawBiomesGround();

    // 2. Draw Lake & Pier
    drawLakeAndPier();

    // 3. Draw Farm Soil Plots & Crops
    drawFarmPlots();

    // 4. Draw Buildings (Cabin & Merchant Stall)
    drawBuildings();

    // 5. Draw Trees
    drawTrees();

    // 6. Draw Rocks & Crystals
    drawRocks();

    // 7. Draw Dropped Loot Items
    drawDroppedLoot();

    // 8. Draw Follower Companion Cat
    drawCatSprite(state.follower.x, state.follower.y, state.player.activeCat === 'musya' ? 'keti' : 'musya', state.follower.facing, true);

    // 9. Draw Active Player Cat
    drawCatSprite(state.player.x, state.player.y, state.player.activeCat, state.player.facing, false);

    // 10. Draw Particles
    drawParticles();

    // 11. Draw Floating Texts
    drawFloatingTexts();

    ctx.restore();
  }

  // Draw Biomes Ground with Textures & Boundaries
  function drawBiomesGround() {
    // Farm & Meadows Base
    ctx.fillStyle = '#1c281e'; // Dark lush green
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Subtle grid/tile lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_H);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_H; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_W, y);
      ctx.stroke();
    }

    // Whispering Forest Area (Top Right)
    ctx.fillStyle = '#132219'; // Deep pine dark green
    ctx.fillRect(950, 40, 1400, 780);

    // Crystal Quarry Area (Bottom Right)
    ctx.fillStyle = '#231e28'; // Rocky dark violet-grey
    ctx.fillRect(980, 840, 900, 720);

    // Cosmic Altar Area (Far Right)
    ctx.fillStyle = '#19152b'; // Deep starry indigo
    ctx.fillRect(1880, 840, 480, 720);

    // Paths connecting Farm to Forest and Lake
    ctx.fillStyle = '#2b231a'; // Dirt path
    // Main cross paths
    ctx.fillRect(520, 200, 600, 50); // Path to Forest
    ctx.fillRect(450, 480, 50, 500); // Path to Lake
    ctx.fillRect(750, 480, 300, 50); // Path to Greenhouse
    ctx.fillRect(1000, 760, 50, 400); // Path to Quarry
  }

  // Lake & Pier
  function drawLakeAndPier() {
    // Water Basin
    ctx.fillStyle = '#0f2438';
    ctx.beginPath();
    ctx.roundRect(80, 950, 820, 580, 40);
    ctx.fill();

    // Water Shimmer Ripples
    const time = performance.now() * 0.002;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const rx = 200 + (i * 110 + Math.sin(time + i) * 30);
      const ry = 1050 + (i * 70 + Math.cos(time + i) * 20);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 40 + Math.sin(time + i) * 10, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Wooden Pier
    ctx.fillStyle = '#5c3d24'; // Wood brown
    ctx.fillRect(440, 980, 80, 240);
    // Planks
    ctx.strokeStyle = '#3d2614';
    ctx.lineWidth = 2;
    for (let py = 990; py < 1220; py += 18) {
      ctx.beginPath();
      ctx.moveTo(440, py);
      ctx.lineTo(520, py);
      ctx.stroke();
    }

    // Fishing Bobber if active
    if (fishingState.active) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fishingState.x, fishingState.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Fishing line to player
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y - 10);
      ctx.lineTo(fishingState.x, fishingState.y);
      ctx.stroke();
    }
  }

  // Farm Soil Plots & Growing Crops
  function drawFarmPlots() {
    state.plots.forEach(plot => {
      // Soil Bed
      ctx.fillStyle = plot.watered ? '#26190f' : '#3d2817'; // Wet vs dry soil
      ctx.beginPath();
      ctx.roundRect(plot.x - 30, plot.y - 30, 60, 60, 8);
      ctx.fill();

      // Soil border
      ctx.strokeStyle = plot.watered ? '#452a16' : '#543820';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (plot.crop) {
        const cropDef = ITEMS[plot.crop] || { icon: '🌱', rarity: RARITY.COMMON };
        const progress = plot.growthProgress || 0;

        if (progress < 0.35) {
          // Sprout
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌱', plot.x, plot.y);
        } else if (progress < 0.95) {
          // Growing
          ctx.font = '26px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌿', plot.x, plot.y);
        } else {
          // Ready to harvest! Glowing
          ctx.save();
          ctx.shadowColor = cropDef.rarity.color;
          ctx.shadowBlur = 12;
          ctx.font = '32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cropDef.icon, plot.x, plot.y);
          ctx.restore();
        }

        // Mini Growth Progress Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(plot.x - 20, plot.y + 22, 40, 5);
        ctx.fillStyle = (progress >= 1.0) ? '#22c55e' : (plot.watered ? '#38bdf8' : '#fbbf24');
        ctx.fillRect(plot.x - 20, plot.y + 22, 40 * Math.min(1.0, progress), 5);
      }
    });
  }

  // Buildings (Musya & Keti Cabin & Merchant Stall)
  function drawBuildings() {
    // 1. Cozy Cabin (Home Farm)
    ctx.fillStyle = '#4a3321'; // Log walls
    ctx.fillRect(320, 140, 160, 110);
    // Roof
    ctx.fillStyle = '#6b2d2d'; // Dark tile red
    ctx.beginPath();
    ctx.moveTo(300, 140);
    ctx.lineTo(400, 80);
    ctx.lineTo(500, 140);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#26190f';
    ctx.fillRect(380, 185, 40, 65);
    // Signboard
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('🏠 Домик Муси и Кейти', 400, 70);

    // 2. Merchant Stall
    ctx.fillStyle = '#3f2d1d';
    ctx.fillRect(580, 240, 90, 65);
    // Striped Canopy
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(570, 220, 110, 25);
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🏪 Лавка Феликса', 625, 210);

    // 3. Cosmic Altar Pedestal
    ctx.fillStyle = '#2e204d';
    ctx.beginPath();
    ctx.arc(2120, 1200, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨', 2120, 1210);
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('Алтарь Гармонии', 2120, 1290);
  }

  // Trees Rendering
  function drawTrees() {
    trees.forEach(t => {
      if (t.hp > 0) {
        const shakeX = (Math.sin(performance.now() * 0.05) * t.shake * 4);
        const tx = t.x + shakeX;
        const ty = t.y;

        // Trunk
        ctx.fillStyle = (t.type === 'birch') ? '#e2e8f0' : '#4a3018';
        ctx.fillRect(tx - 8, ty - 15, 16, 25);

        // Canopy
        ctx.fillStyle = (t.type === 'birch') ? '#2e7d32' : '#1e5229';
        ctx.beginPath();
        ctx.arc(tx, ty - 35, 30, 0, Math.PI * 2);
        ctx.fill();

        // Foliage highlight
        ctx.fillStyle = (t.type === 'birch') ? '#4caf50' : '#2e7d32';
        ctx.beginPath();
        ctx.arc(tx - 6, ty - 42, 18, 0, Math.PI * 2);
        ctx.fill();

        // Mini HP bar if damaged
        if (t.hp < t.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(tx - 15, ty - 70, 30, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(tx - 15, ty - 70, 30 * (t.hp / t.maxHp), 4);
        }
      } else {
        // Tree Stump
        ctx.fillStyle = '#3a2310';
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Rocks Rendering
  function drawRocks() {
    rocks.forEach(r => {
      if (r.hp > 0) {
        const shakeX = (Math.sin(performance.now() * 0.05) * r.shake * 4);
        const rx = r.x + shakeX;
        const ry = r.y;

        // Base Rock
        ctx.fillStyle = '#383241';
        ctx.beginPath();
        ctx.roundRect(rx - 18, ry - 14, 36, 28, 6);
        ctx.fill();

        // Crystal Nodes
        if (r.type === 'amethyst') {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.moveTo(rx - 5, ry - 18);
          ctx.lineTo(rx + 2, ry - 28);
          ctx.lineTo(rx + 9, ry - 18);
          ctx.closePath();
          ctx.fill();
        } else if (r.type === 'iron') {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(rx - 8, ry - 6, 6, 6);
          ctx.fillRect(rx + 2, ry - 2, 6, 6);
        } else if (r.type === 'star') {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(rx, ry - 6, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mini HP bar if damaged
        if (r.hp < r.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(rx - 15, ry - 30, 30, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(rx - 15, ry - 30, 30 * (r.hp / r.maxHp), 4);
        }
      }
    });
  }

  // Dropped Loot Rendering
  function drawDroppedLoot() {
    droppedItems.forEach(item => {
      const def = ITEMS[item.itemId] || { icon: '📦', rarity: RARITY.COMMON };
      const curY = item.y - (item.z || 0);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Item icon
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, item.x, curY);
    });
  }

  // ==========================================
  // PROCEDURAL DETAILED CAT SPRITES
  // ==========================================
  function drawCatSprite(x, y, catType, facing, isFollower) {
    ctx.save();
    ctx.translate(x, y);

    const time = performance.now() * 0.008;
    const isWalking = (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || touchJoystick.active);
    const bob = isWalking ? Math.sin(time * 3) * 2 : 0;
    const tailAngle = isWalking ? Math.sin(time * 4) * 0.35 : Math.sin(time) * 0.15;

    // Palette Configuration based on Real Photos
    let bodyColor, stripeColor, bellyColor, eyeColor, hasBackpack, hasCurledTail;
    if (catType === 'musya') {
      // Муся: Silver tabby with dark stripes, bright amber-green eyes, backpack
      bodyColor = '#8a919e';
      stripeColor = '#474d58';
      bellyColor = '#d9dde4';
      eyeColor = '#eab308'; // Amber gold
      hasBackpack = true;
      hasCurledTail = false;
    } else {
      // Кейти: Golden-brown striped tabby, emerald green eyes, distinctive curled tail
      bodyColor = '#b88958';
      stripeColor = '#6a4623';
      bellyColor = '#f5ecd9';
      eyeColor = '#10b981'; // Emerald green
      hasBackpack = false;
      hasCurledTail = true;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, bob, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stripes on Body
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -6 + bob); ctx.lineTo(-6, 6 + bob);
    ctx.moveTo(0, -7 + bob); ctx.lineTo(0, 7 + bob);
    ctx.moveTo(6, -6 + bob); ctx.lineTo(6, 6 + bob);
    ctx.stroke();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 3 + bob, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Musya's Adventurer Backpack
    if (hasBackpack) {
      ctx.fillStyle = '#78350f'; // Leather brown
      ctx.beginPath();
      ctx.roundRect(-7, -8 + bob, 14, 10, 3);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24'; // Gold buckle
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-3, -5 + bob, 6, 4);
    }

    // Tail
    ctx.save();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.translate(-10, 4 + bob);
    ctx.rotate(tailAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (hasCurledTail) {
      // Keti's signature curled tail
      ctx.bezierCurveTo(-10, -5, -14, -18, -6, -20);
    } else {
      ctx.quadraticCurveTo(-12, -4, -14, -12);
    }
    ctx.stroke();
    ctx.restore();

    // Head
    const headY = -10 + bob;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = bodyColor;
    // Left Ear
    ctx.beginPath();
    ctx.moveTo(-9, headY - 4);
    ctx.lineTo(-11, headY - 18);
    ctx.lineTo(-2, headY - 10);
    ctx.closePath();
    ctx.fill();
    // Right Ear
    ctx.beginPath();
    ctx.moveTo(2, headY - 10);
    ctx.lineTo(11, headY - 18);
    ctx.lineTo(9, headY - 4);
    ctx.closePath();
    ctx.fill();

    // Inner pink ears
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-8, headY - 6); ctx.lineTo(-10, headY - 15); ctx.lineTo(-3, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, headY - 10); ctx.lineTo(10, headY - 15); ctx.lineTo(8, headY - 6);
    ctx.closePath();
    ctx.fill();

    // Eyes
    if (facing !== 1) { // Not facing back
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-4, headY - 1, 3, 0, Math.PI * 2);
      ctx.arc(4, headY - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-4, headY - 1, 1.5, 0, Math.PI * 2);
      ctx.arc(4, headY - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Nose
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-2, headY + 3); ctx.lineTo(2, headY + 3); ctx.lineTo(0, headY + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Companion Heart Indicator
    if (isFollower && Math.sin(time) > 0.7) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ec4899';
      ctx.fillText('❤️', 12, headY - 10);
    }

    ctx.restore();
  }

  // Draw Particles
  function drawParticles() {
    particles.forEach(pt => {
      const alpha = 1.0 - (pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  // Draw Floating Texts
  function drawFloatingTexts() {
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    floatingTexts.forEach(ft => {
      const alpha = 1.0 - (ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;
  }

  // ==========================================
  // GAME LOOP
  // ==========================================
  function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
  }

  // ==========================================
  // MODALS & UI CONTROLS
  // ==========================================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';

    if (modalId === 'shopModal') renderShopUI();
    else if (modalId === 'collectionModal') renderCollectionUI();
    else if (modalId === 'questsModal') renderQuestsUI();
    else if (modalId === 'inventoryModal') renderInventoryUI();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  function showToast(msg) {
    const toast = document.getElementById('gameToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  // Shop UI Render
  function renderShopUI() {
    const p = state.player;
    const sellGrid = document.getElementById('sellItemsGrid');
    const seedsGrid = document.getElementById('seedsItemsGrid');
    const upgradesList = document.getElementById('toolUpgradesList');
    document.getElementById('shopCoinsVal').textContent = p.coins;

    // Sell Items Grid
    if (sellGrid) {
      sellGrid.innerHTML = '';
      const invKeys = Object.keys(p.inventory).filter(k => (p.inventory[k] || 0) > 0);
      if (invKeys.length === 0) {
        sellGrid.innerHTML = '<div class="shop-empty-hint">Ваш рюкзак пуст. Соберите урожай или нарубите дров!</div>';
      } else {
        invKeys.forEach(k => {
          const count = p.inventory[k];
          const def = ITEMS[k] || { name: k, icon: '📦', price: 2, rarity: RARITY.COMMON };
          const card = document.createElement('div');
          card.className = 'shop-card';
          card.innerHTML = `
            <div class="shop-card-icon">${def.icon}</div>
            <div class="shop-card-name">${def.name} <span class="shop-count">x${count}</span></div>
            <div class="shop-card-price">🪙 ${def.price} за шт.</div>
            <button class="btn btn-primary btn-sm btn-sell-one" data-item="${k}">Продать 1 (+${def.price}🪙)</button>
          `;
          card.querySelector('.btn-sell-one').addEventListener('click', () => {
            p.inventory[k]--;
            p.coins += def.price;
            p.stats.coinsEarned += def.price;
            renderShopUI();
            updateHud();
            saveGame();
          });
          sellGrid.appendChild(card);
        });
      }
    }

    // Seeds Purchase Grid
    if (seedsGrid) {
      seedsGrid.innerHTML = '';
      Object.keys(SEEDS).forEach(sk => {
        const sdef = SEEDS[sk];
        const owned = p.seeds[sk] || 0;
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
          <div class="shop-card-icon">${sdef.icon}</div>
          <div class="shop-card-name">${sdef.name}</div>
          <div class="shop-card-meta">Рост: ${sdef.growTime}с • У вас: ${owned}</div>
          <div class="shop-card-price">🪙 ${sdef.price}</div>
          <button class="btn btn-secondary btn-sm btn-buy-seed" data-seed="${sk}">Купить</button>
        `;
        card.querySelector('.btn-buy-seed').addEventListener('click', () => {
          if (p.coins < sdef.price) {
            showToast('⚠️ Недостаточно монет!');
            return;
          }
          p.coins -= sdef.price;
          p.seeds[sk] = (p.seeds[sk] || 0) + 1;
          renderShopUI();
          updateHud();
          saveGame();
        });
        seedsGrid.appendChild(card);
      });
    }

    // Upgrades List
    if (upgradesList) {
      upgradesList.innerHTML = '';
      Object.keys(UPGRADES).forEach(uk => {
        const udef = UPGRADES[uk];
        const curLvl = p.upgrades[uk] || 1;
        const nextDef = udef.levels[curLvl];
        const card = document.createElement('div');
        card.className = 'upgrade-item-card';
        if (nextDef) {
          card.innerHTML = `
            <div class="upgrade-info">
              <strong>${udef.name}</strong>
              <div class="upgrade-sub">Текущий уровень: ${curLvl} (${udef.levels[curLvl - 1].name})</div>
              <div class="upgrade-next">След. уровень: <strong>${nextDef.name}</strong></div>
              <p class="upgrade-desc">${udef.desc}</p>
            </div>
            <button class="btn btn-primary btn-sm btn-do-upgrade" data-upgrade="${uk}">Улучшить (🪙 ${nextDef.cost})</button>
          `;
          card.querySelector('.btn-do-upgrade').addEventListener('click', () => {
            if (p.coins < nextDef.cost) {
              showToast('⚠️ Недостаточно монет для улучшения!');
              return;
            }
            p.coins -= nextDef.cost;
            p.upgrades[uk] = curLvl + 1;
            showToast(`⚡ Инструмент улучшен до уровня ${curLvl + 1}!`);
            renderShopUI();
            updateHud();
            saveGame();
          });
        } else {
          card.innerHTML = `
            <div class="upgrade-info">
              <strong>${udef.name}</strong>
              <div class="upgrade-sub">Максимальный уровень (${curLvl}) достигнут! 🌟</div>
            </div>
            <span class="badge badge-max">МАКС</span>
          `;
        }
        upgradesList.appendChild(card);
      });
    }
  }

  // Sell All Action
  function handleSellAll() {
    let totalGain = 0;
    for (let k in state.player.inventory) {
      const count = state.player.inventory[k] || 0;
      if (count > 0 && ITEMS[k]) {
        totalGain += count * ITEMS[k].price;
        state.player.inventory[k] = 0;
      }
    }
    if (totalGain > 0) {
      state.player.coins += totalGain;
      state.player.stats.coinsEarned += totalGain;
      showToast(`💰 Вы успешно продали урожай на 🪙 ${totalGain} монет!`);
      renderShopUI();
      updateHud();
      saveGame();
    } else {
      showToast('В вашем рюкзаке нет предметов для продажи.');
    }
  }

  // Collector's Journal UI Render
  function renderCollectionUI(tab = 'plants') {
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const allKeys = Object.keys(ITEMS);
    let discovered = 0;
    allKeys.forEach(k => { if (state.player.discoveredItems[k]) discovered++; });
    const countLbl = document.getElementById('collDiscoveredCount');
    if (countLbl) countLbl.textContent = `${discovered} / ${allKeys.length}`;

    const filtered = allKeys.filter(k => ITEMS[k].cat === tab);
    filtered.forEach(k => {
      const def = ITEMS[k];
      const isFound = !!state.player.discoveredItems[k];
      const card = document.createElement('div');
      card.className = `coll-card ${isFound ? 'found' : 'locked'}`;
      card.innerHTML = `
        <div class="coll-icon">${isFound ? def.icon : '❓'}</div>
        <div class="coll-title">${isFound ? def.name : '??? Неизвестно'}</div>
        <div class="coll-rarity" style="color: ${def.rarity.color}">${def.rarity.symbol} ${def.rarity.name}</div>
        <p class="coll-desc">${isFound ? def.desc : 'Исследуйте мир Муси и Кейти, чтобы отыскать этот предмет.'}</p>
      `;
      grid.appendChild(card);
    });
  }

  // Quests UI Render
  function renderQuestsUI() {
    const qlist = document.getElementById('questsList');
    const tlist = document.getElementById('trophiesList');

    if (qlist) {
      qlist.innerHTML = '';
      state.quests.forEach(q => {
        const card = document.createElement('div');
        card.className = `quest-card ${q.completed ? 'completed' : ''}`;
        card.innerHTML = `
          <div class="quest-card-header">
            <strong>${q.title}</strong>
            <span class="quest-status">${q.claimed ? 'Выполнено ✓' : (q.completed ? 'Готово к сдаче! 🎉' : `${q.current}/${q.count}`)}</span>
          </div>
          <p class="quest-card-desc">${q.desc}</p>
          <div class="quest-card-reward">Награда: 🪙 ${q.rewardCoins} • ${q.rewardXp} XP</div>
          ${q.completed && !q.claimed ? `<button class="btn btn-primary btn-sm btn-claim-quest" data-qid="${q.id}">Забрать награду</button>` : ''}
        `;
        if (q.completed && !q.claimed) {
          card.querySelector('.btn-claim-quest').addEventListener('click', () => {
            q.claimed = true;
            state.player.coins += q.rewardCoins;
            addXp(q.rewardXp);
            showToast(`🎉 Награда получена: +${q.rewardCoins}🪙, +${q.rewardXp}XP!`);
            renderQuestsUI();
            updateHud();
            saveGame();
          });
        }
        qlist.appendChild(card);
      });
    }

    if (tlist) {
      tlist.innerHTML = '';
      state.milestones.forEach(m => {
        const isUnlocked = state.player.unlockedTrophies.includes(m.id);
        const card = document.createElement('div');
        card.className = `trophy-item-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
          <div class="trophy-badge">${isUnlocked ? '🏆' : '🔒'}</div>
          <div class="trophy-info">
            <strong>${m.title}</strong>
            <p>${m.reqDesc}</p>
            <span class="trophy-meta">Разрешение: ${m.res}×${m.res} • Feistel-SPN PRP</span>
          </div>
          ${isUnlocked ? `<a href="index.html?id=${encodeURIComponent(FARM_TROPHIES[m.id]?.id || '')}" class="btn btn-secondary btn-sm">🖼 В Галерею</a>` : '<span class="trophy-locked-label">В процессе</span>'}
        `;
        tlist.appendChild(card);
      });
    }
  }

  // Inventory UI Render
  function renderInventoryUI() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const invKeys = Object.keys(state.player.inventory).filter(k => (state.player.inventory[k] || 0) > 0);
    if (invKeys.length === 0) {
      grid.innerHTML = '<div class="shop-empty-hint">Рюкзак пуст.</div>';
      return;
    }

    invKeys.forEach(k => {
      const count = state.player.inventory[k];
      const def = ITEMS[k] || { name: k, icon: '📦', rarity: RARITY.COMMON, price: 1 };
      const card = document.createElement('div');
      card.className = 'inv-card';
      card.innerHTML = `
        <div class="inv-icon">${def.icon}</div>
        <div class="inv-name">${def.name}</div>
        <div class="inv-count">x${count}</div>
      `;
      grid.appendChild(card);
    });
  }

  // Floating Seed Selector Popup
  function openSeedSelector(plot) {
    activePlotForPlanting = plot;
    const popup = document.getElementById('seedSelectorPopup');
    const list = document.getElementById('seedOptionsList');
    if (!popup || !list) return;

    list.innerHTML = '';
    const seedKeys = Object.keys(SEEDS);
    let hasAny = false;

    seedKeys.forEach(sk => {
      const count = state.player.seeds[sk] || 0;
      if (count > 0) {
        hasAny = true;
        const sdef = SEEDS[sk];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seed-option-btn';
        btn.innerHTML = `<span>${sdef.icon} ${sdef.name}</span><strong>x${count}</strong>`;
        btn.addEventListener('click', () => plantSeedInPlot(plot, sk));
        list.appendChild(btn);
      }
    });

    if (!hasAny) {
      list.innerHTML = '<div class="no-seeds-hint">У вас нет семян! Зайдите в лавку торговца Феликса 🏪</div>';
    }

    popup.style.display = 'block';
  }

  function closeSeedSelector() {
    const popup = document.getElementById('seedSelectorPopup');
    if (popup) popup.style.display = 'none';
    activePlotForPlanting = null;
  }

  // Save Export / Import
  function exportSaveJSON() {
    const json = JSON.stringify(state, null, 2);
    const textarea = document.getElementById('saveJsonTextarea');
    if (textarea) {
      textarea.value = json;
      textarea.select();
      showToast('📋 Код сохранения скопирован в текстовое поле!');
    }
  }

  function importSaveJSON() {
    const textarea = document.getElementById('saveJsonTextarea');
    if (!textarea || !textarea.value.trim()) {
      showToast('⚠️ Вставьте JSON код сохранения в поле.');
      return;
    }
    try {
      const parsed = JSON.parse(textarea.value.trim());
      if (parsed.player) {
        state = parsed;
        saveGame();
        updateHud();
        showToast('📥 Сохранение успешно восстановлено!');
        closeModal('settingsModal');
      }
    } catch (e) {
      showToast('⚠️ Ошибка: неверный формат JSON кода.');
    }
  }

  function resetGameSave() {
    if (confirm('Сбросить весь прогресс фермы и начать сначала?')) {
      localStorage.removeItem(SAVE_KEY);
      state = getDefaultState();
      saveGame();
      updateHud();
      showToast('🔄 Игра сброшена.');
      closeModal('settingsModal');
    }
  }

  // ==========================================
  // EVENT LISTENERS INITIALIZATION
  // ==========================================
  function initEventListeners() {
    // Keyboard
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyQ') swapActiveCat();
      else if (e.code === 'KeyE') handleInteract();
      else if (e.code === 'Space') {
        e.preventDefault();
        handleActionTool();
      }
    });

    window.addEventListener('keyup', e => {
      keys[e.code] = false;
    });

    // Touch Controls (Mobile Virtual Joystick)
    const joyZone = document.getElementById('joystickZone');
    const joyThumb = document.getElementById('joystickThumb');
    if (joyZone && joyThumb) {
      const handleTouch = (e) => {
        const touch = e.touches[0];
        const rect = joyZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.min(45, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);

        touchJoystick.active = true;
        touchJoystick.dirX = Math.cos(angle) * (dist / 45);
        touchJoystick.dirY = Math.sin(angle) * (dist / 45);

        joyThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      };

      joyZone.addEventListener('touchstart', e => { e.preventDefault(); handleTouch(e); }, { passive: false });
      joyZone.addEventListener('touchmove', e => { e.preventDefault(); handleTouch(e); }, { passive: false });
      joyZone.addEventListener('touchend', e => {
        e.preventDefault();
        touchJoystick.active = false;
        touchJoystick.dirX = 0;
        touchJoystick.dirY = 0;
        joyThumb.style.transform = 'translate(0px, 0px)';
      }, { passive: false });
    }

    // Touch Action Buttons
    const vbtnSwap = document.getElementById('vbtnSwap');
    const vbtnAction = document.getElementById('vbtnAction');
    const vbtnInteract = document.getElementById('vbtnInteract');
    if (vbtnSwap) vbtnSwap.addEventListener('click', swapActiveCat);
    if (vbtnAction) vbtnAction.addEventListener('click', handleActionTool);
    if (vbtnInteract) vbtnInteract.addEventListener('click', handleInteract);

    // Top HUD buttons
    const swapBtn = document.getElementById('hudSwapBtn');
    if (swapBtn) swapBtn.addEventListener('click', swapActiveCat);

    const bpChip = document.getElementById('hudBackpackChip');
    if (bpChip) bpChip.addEventListener('click', () => openModal('inventoryModal'));

    const shopBtn = document.getElementById('openShopBtn');
    if (shopBtn) shopBtn.addEventListener('click', () => openModal('shopModal'));

    const collBtn = document.getElementById('openCollectionBtn');
    if (collBtn) collBtn.addEventListener('click', () => openModal('collectionModal'));

    const questBtn = document.getElementById('openQuestsBtn');
    if (questBtn) questBtn.addEventListener('click', () => openModal('questsModal'));

    const setBtn = document.getElementById('openSettingsBtn');
    if (setBtn) setBtn.addEventListener('click', () => openModal('settingsModal'));

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', e => {
        const mid = btn.getAttribute('data-close-modal');
        closeModal(mid);
      });
    });

    // Close Modals on background click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    });

    // Shop Subtabs
    document.querySelectorAll('[data-shop-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-shop-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-shop-tab');
        document.getElementById('shopTabSell').style.display = (tab === 'sell') ? 'block' : 'none';
        document.getElementById('shopTabSeeds').style.display = (tab === 'seeds') ? 'block' : 'none';
        document.getElementById('shopTabUpgrades').style.display = (tab === 'upgrades') ? 'block' : 'none';
      });
    });

    // Collection Subtabs
    document.querySelectorAll('[data-coll-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-coll-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-coll-tab');
        renderCollectionUI(tab);
      });
    });

    // Sell All & Inventory Links
    const sellAllBtn = document.getElementById('btnSellAll');
    if (sellAllBtn) sellAllBtn.addEventListener('click', handleSellAll);

    const openShopFromInv = document.getElementById('btnOpenShopFromInv');
    if (openShopFromInv) {
      openShopFromInv.addEventListener('click', () => {
        closeModal('inventoryModal');
        openModal('shopModal');
      });
    }

    // Settings actions
    const btnSaveNow = document.getElementById('btnManualSave');
    if (btnSaveNow) btnSaveNow.addEventListener('click', () => { saveGame(); showToast('💾 Игра сохранена!'); });

    const btnReset = document.getElementById('btnResetSave');
    if (btnReset) btnReset.addEventListener('click', resetGameSave);

    const btnExp = document.getElementById('btnExportSave');
    if (btnExp) btnExp.addEventListener('click', exportSaveJSON);

    const btnImp = document.getElementById('btnImportSave');
    if (btnImp) btnImp.addEventListener('click', importSaveJSON);

    const cancelSeedBtn = document.getElementById('cancelSeedSelect');
    if (cancelSeedBtn) cancelSeedBtn.addEventListener('click', closeSeedSelector);

    // Window Resize Handling
    window.addEventListener('resize', handleCanvasResize);

    // Autosave interval every 5 seconds
    setInterval(saveGame, 5000);
  }

  function handleCanvasResize() {
    if (!canvas) return;
    const container = document.getElementById('gameViewportContainer');
    if (!container) return;
    const w = container.clientWidth || 960;
    const h = container.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
    camera.w = w;
    camera.h = h;
  }

  // ==========================================
  // INITIALIZATION ON LOAD
  // ==========================================
  window.addEventListener('DOMContentLoaded', async () => {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    await loadTrophies();
    initWorldEntities();
    loadGame();
    initEventListeners();
    handleCanvasResize();
    updateHud();

    // Start 60fps render loop
    requestAnimationFrame(gameLoop);
  });

})();
