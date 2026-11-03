/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (farm_engine.js)
 * Core Gameplay Engine & Simulation:
 * - Pollen Flower Fields & Combo System (Bee Swarm Simulator mechanics)
 * - Helpers / Pets AI & Abilities
 * - Farming Plots: 30+ Crops, Water, 5 Fertilizers, 8 Mutations & Hybrids
 * - Day/Night Cycle (Dawn, Day, Sunset, Night) & Dynamic Weather (Rain, Fog, Starfall)
 * - Biome Restoration (0-100%) & 7 Story Chapters (6 Shards of Primordial Seed)
 * - 12-Step Interactive Step-by-Step Tutorial
 * - Deadlock Prevention (Free emergency seeds & Pollen Exchange at Felix's shop)
 * - Persistent Save System with Versioning & Automatic Plot Migration
 */

(function (global) {
  'use strict';

  const SAVE_KEY = 'meowbloom_garden_save_v3';
  const MAP_W = 2400;
  const MAP_H = 1600;

  // Active Game State
  let state = null;

  // Flower fields across the 6 biomes
  let flowerFields = [];
  let trees = [];
  let rocks = [];
  let droppedItems = [];
  let particles = [];
  let floatingTexts = [];
  let ambientCreatures = [];

  // Fishing state
  let fishingState = { active: false, timer: 0, bite: false, x: 0, y: 0 };

  // Canonical Canonical Plot Definitions (8 Garden + 4 Greenhouse)
  const CANONICAL_PLOTS = [
    // 8 Open Garden Plots (Strictly inside the Wooden Fenced Garden on Home Farm)
    { id: 'p1', x: 240, y: 410, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p2', x: 320, y: 410, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p3', x: 400, y: 410, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p4', x: 480, y: 410, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p5', x: 240, y: 490, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p6', x: 320, y: 490, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p7', x: 400, y: 490, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    { id: 'p8', x: 480, y: 490, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: false },
    // 4 Greenhouse Plots (Strictly inside the Glass Dome Greenhouse at x: 720-920, y: 370-550)
    { id: 'gh1', x: 770, y: 420, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: true },
    { id: 'gh2', x: 860, y: 420, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: true },
    { id: 'gh3', x: 770, y: 500, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: true },
    { id: 'gh4', x: 860, y: 500, crop: null, plantedAt: 0, growDuration: 0, watered: false, fertilizer: null, mutation: null, greenhouse: true }
  ];

  // Generate Default Game State
  function getDefaultState() {
    return {
      version: 3,
      player: {
        x: 360,
        y: 350,
        activeCat: 'musya',
        facing: 0,
        level: 1,
        xp: 0,
        coins: 50,
        skillPoints: 0,
        skills: {},
        activeBuffs: {},
        tools: {
          collector: 1,
          axe: 1,
          pickaxe: 1,
          can: 1,
          backpack: 1,
          boots: 1
        },
        waterInCan: 12,
        maxWaterInCan: 12,
        pollen: {
          sunny: 0,
          forest: 0,
          moon: 0,
          crystal: 0,
          life: 0,
          star: 0
        },
        seeds: {
          catnip: 5,
          wheat: 3
        },
        inventory: {},
        activeHelper: 'firefly',
        helpers: {
          firefly: { unlocked: true, level: 1, xp: 0 }
        },
        stats: {
          pollenCollected: 0,
          cropsHarvested: 0,
          mutationsFound: 0,
          treesChopped: 0,
          rocksMined: 0,
          fishCaught: 0,
          dishesCooked: 0,
          ordersCompleted: 0
        }
      },
      companion: {
        x: 330,
        y: 360,
        facing: 0
      },
      combo: {
        count: 0,
        timer: 0,
        maxTimer: 4.5,
        tier: 0
      },
      timeOfDay: 0.15,
      weather: 'sunny',
      weatherTimer: 180,
      biomes: {
        farm: { restoration: 20, shardUnlocked: false },
        forest: { restoration: 0, shardUnlocked: false },
        lake: { restoration: 0, shardUnlocked: false },
        quarry: { restoration: 0, shardUnlocked: false },
        greenhouse: { restoration: 0, shardUnlocked: false },
        altar: { restoration: 0, shardUnlocked: false }
      },
      story: {
        currentChapter: 1,
        tutorialStep: 1, // 1 to 12
        tutorialComplete: false,
        chapterProgress: {
          ch1: { task0: 0, task1: 0, task2: 0, complete: false },
          ch2: { task0: 0, task1: 0, task2: 0, complete: false },
          ch3: { task0: 0, task1: 0, task2: 0, complete: false },
          ch4: { task0: 0, task1: 0, task2: 0, complete: false },
          ch5: { task0: 0, task1: 0, task2: 0, complete: false },
          ch6: { task0: 0, task1: 0, task2: 0, complete: false },
          ch7: { task0: 0, task1: 0, complete: false }
        }
      },
      orders: [
        { id: 'ord_1', title: 'Сбор урожая для домика', req: { catnip: 3 }, rewardCoins: 30, rewardXp: 35, completed: false },
        { id: 'ord_2', title: 'Поставка на мельницу', req: { wheat: 4 }, rewardCoins: 45, rewardXp: 50, completed: false },
        { id: 'ord_3', title: 'Древесина для ремонта', req: { wood: 6 }, rewardCoins: 35, rewardXp: 40, completed: false }
      ],
      plots: JSON.parse(JSON.stringify(CANONICAL_PLOTS)),
      discoveredEncyclopedia: {},
      unlockedTrophies: [],
      lastSaveTime: Date.now()
    };
  }

  // Initialize Flower Fields without overlapping buildings or plots
  function initFlowerFields() {
    flowerFields = [];

    // 1. Home Farm: Sunny Meadow Flower Fields (x: 200-680, y: 640-790)
    for (let i = 0; i < 24; i++) {
      flowerFields.push({
        id: 'fl_farm_' + i,
        x: 200 + (i % 6) * 85 + (Math.sin(i * 3) * 14),
        y: 640 + Math.floor(i / 6) * 45 + (Math.cos(i * 2) * 12),
        biome: 'farm',
        pollenType: 'sunny',
        cropId: i % 3 === 0 ? 'sunflower' : 'amber_daisy',
        pollen: 10,
        maxPollen: 10,
        respawnTimer: 0,
        sway: Math.random() * Math.PI * 2
      });
    }

    // 2. Whispering Forest: Bells & Ferns (x: 1200-2200, y: 220-720)
    for (let i = 0; i < 28; i++) {
      flowerFields.push({
        id: 'fl_forest_' + i,
        x: 1200 + (i % 7) * 140 + (Math.sin(i * 4) * 18),
        y: 220 + Math.floor(i / 7) * 120 + (Math.cos(i * 5) * 15),
        biome: 'forest',
        pollenType: 'forest',
        cropId: i % 2 === 0 ? 'bell' : 'forest_mint',
        pollen: 15,
        maxPollen: 15,
        respawnTimer: 0,
        sway: Math.random() * Math.PI * 2
      });
    }

    // 3. Moonlit Lake: Moon Lilies along lake banks (x: 160-380, y: 1050-1400 and x: 620-840, y: 1050-1400)
    for (let i = 0; i < 20; i++) {
      const isWest = i % 2 === 0;
      const baseX = isWest ? 180 + (i % 4) * 55 : 640 + (i % 4) * 55;
      flowerFields.push({
        id: 'fl_lake_' + i,
        x: baseX + (Math.sin(i * 2) * 12),
        y: 1050 + Math.floor(i / 4) * 70 + (Math.cos(i * 3) * 14),
        biome: 'lake',
        pollenType: 'moon',
        cropId: i % 3 === 0 ? 'moon_lily' : 'reed',
        pollen: 20,
        maxPollen: 20,
        respawnTimer: 0,
        sway: Math.random() * Math.PI * 2
      });
    }

    // 4. Crystal Quarry: Flame Tulips & Crystal Roses (x: 1180-1750, y: 1020-1450)
    for (let i = 0; i < 20; i++) {
      flowerFields.push({
        id: 'fl_quarry_' + i,
        x: 1180 + (i % 5) * 115 + (Math.sin(i * 3) * 15),
        y: 1020 + Math.floor(i / 5) * 90 + (Math.cos(i * 4) * 14),
        biome: 'quarry',
        pollenType: 'crystal',
        cropId: i % 2 === 0 ? 'crystal_rose' : 'flame_tulip',
        pollen: 25,
        maxPollen: 25,
        respawnTimer: 0,
        sway: Math.random() * Math.PI * 2
      });
    }

    // 5. Cosmic Altar: Star Flowers (x: 1980-2300, y: 1040-1420)
    for (let i = 0; i < 16; i++) {
      flowerFields.push({
        id: 'fl_altar_' + i,
        x: 1980 + (i % 4) * 85 + (Math.sin(i * 2) * 12),
        y: 1040 + Math.floor(i / 4) * 95 + (Math.cos(i * 3) * 12),
        biome: 'altar',
        pollenType: 'star',
        cropId: i % 2 === 0 ? 'star_flower' : 'cosmic_spirea',
        pollen: 50,
        maxPollen: 50,
        respawnTimer: 0,
        sway: Math.random() * Math.PI * 2
      });
    }
  }

  // Initialize Trees & Rocks with strict non-overlapping coordinates
  function initEnvironmentEntities() {
    trees = [];
    // Strictly in Whispering Forest (x >= 1100, y = 140 to 760)
    const treeCoords = [
      { x: 1120, y: 160, type: 'birch' }, { x: 1280, y: 140, type: 'oak' }, { x: 1440, y: 190, type: 'oak' },
      { x: 1600, y: 150, type: 'oak' }, { x: 1780, y: 220, type: 'birch' }, { x: 1960, y: 160, type: 'oak' },
      { x: 2160, y: 210, type: 'magic' }, { x: 2280, y: 340, type: 'magic' }, { x: 1150, y: 460, type: 'birch' },
      { x: 1360, y: 530, type: 'oak' }, { x: 1540, y: 440, type: 'oak' }, { x: 1720, y: 590, type: 'birch' },
      { x: 1900, y: 480, type: 'oak' }, { x: 2100, y: 600, type: 'magic' }
    ];
    treeCoords.forEach((c, idx) => {
      trees.push({
        id: 'tree_' + idx,
        x: c.x,
        y: c.y,
        hp: 4,
        maxHp: 4,
        respawnTimer: 0,
        shake: 0,
        type: c.type
      });
    });

    rocks = [];
    // Strictly in Crystal Quarry (x >= 1150, y = 960 to 1480)
    const rockCoords = [
      { x: 1180, y: 980, type: 'granite' }, { x: 1340, y: 940, type: 'amethyst' }, { x: 1500, y: 1020, type: 'iron' },
      { x: 1660, y: 960, type: 'granite' }, { x: 1800, y: 1050, type: 'quartz' }, { x: 1240, y: 1180, type: 'iron' },
      { x: 1400, y: 1240, type: 'granite' }, { x: 1580, y: 1180, type: 'amethyst' }, { x: 1720, y: 1260, type: 'star' },
      { x: 1300, y: 1380, type: 'granite' }, { x: 1480, y: 1420, type: 'iron' }, { x: 1660, y: 1400, type: 'quartz' }
    ];
    rockCoords.forEach((c, idx) => {
      rocks.push({
        id: 'rock_' + idx,
        x: c.x,
        y: c.y,
        hp: 5,
        maxHp: 5,
        respawnTimer: 0,
        shake: 0,
        type: c.type
      });
    });

    ambientCreatures = [];
    for (let i = 0; i < 18; i++) {
      ambientCreatures.push({
        x: 100 + Math.random() * (MAP_W - 200),
        y: 100 + Math.random() * (MAP_H - 200),
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        type: i % 2 === 0 ? 'butterfly' : 'firefly',
        phase: Math.random() * 10
      });
    }
  }

  // ==========================================
  // CORE SIMULATION UPDATE
  // ==========================================
  let playerMovedDistance = 0;

  function update(dt, keys, touch) {
    if (!state) return;
    const p = state.player;
    const comp = state.companion;

    // 1. Movement Speed & Buffs
    const bootsLvl = p.tools.boots || 1;
    let speed = 200 + (bootsLvl - 1) * 35;
    if (p.activeBuffs.speed && Date.now() < p.activeBuffs.speed.expireAt) {
      speed *= p.activeBuffs.speed.val;
    }
    if (p.skills.e1) speed *= (1 + p.skills.e1 * 0.10);

    let moveX = 0;
    let moveY = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    if (touch && touch.active) {
      moveX = touch.dirX;
      moveY = touch.dirY;
    }

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      const nx = moveX / len;
      const ny = moveY / len;
      const dx = nx * speed * dt;
      const dy = ny * speed * dt;

      p.x = Math.max(90, Math.min(MAP_W - 90, p.x + dx));
      p.y = Math.max(90, Math.min(MAP_H - 90, p.y + dy));

      if (Math.abs(moveX) > Math.abs(moveY)) {
        p.facing = (moveX > 0) ? 3 : 2;
      } else {
        p.facing = (moveY > 0) ? 0 : 1;
      }

      // Tutorial Step 1 Check (Movement)
      if (state.story.tutorialStep === 1) {
        playerMovedDistance += Math.hypot(dx, dy);
        if (playerMovedDistance >= 50) {
          advanceTutorialStep(1);
        }
      }

      // Tutorial Step 12 Check (Explore Forest)
      if (state.story.tutorialStep === 12 && p.x >= 1050) {
        advanceTutorialStep(12);
      }
    }

    // 2. Companion Following Physics
    const dComp = Math.hypot(p.x - comp.x, p.y - comp.y);
    if (dComp > 55) {
      const ang = Math.atan2(p.y - comp.y, p.x - comp.x);
      comp.x += Math.cos(ang) * (speed * 1.08) * dt;
      comp.y += Math.sin(ang) * (speed * 1.08) * dt;
      comp.facing = (Math.abs(p.x - comp.x) > Math.abs(p.y - comp.y)) ? (p.x > comp.x ? 3 : 2) : (p.y > comp.y ? 0 : 1);
    }

    // 3. Combo Timer Tick
    if (state.combo.count > 0) {
      state.combo.timer -= dt;
      if (state.combo.timer <= 0) {
        state.combo.count = 0;
        state.combo.tier = 0;
      }
    }

    // 4. Day / Night Cycle Tick
    state.timeOfDay = (state.timeOfDay + dt / 360) % 1.0;

    // 5. Dynamic Weather Tick
    state.weatherTimer -= dt;
    if (state.weatherTimer <= 0) {
      const weathers = ['sunny', 'sunny', 'rain', 'fog', 'starfall'];
      state.weather = weathers[Math.floor(Math.random() * weathers.length)];
      state.weatherTimer = 160 + Math.random() * 120;
      if (state.weather === 'rain') {
        spawnFloatingText(p.x, p.y - 50, '🌧️ Тёплый дождь поливает все грядки!', '#38bdf8');
        state.plots.forEach(pl => { if (pl.crop) pl.watered = true; });
      }
    }

    // 6. Plots Growth
    const now = Date.now();
    state.plots.forEach(plot => {
      if (plot.crop) {
        let speedMult = 1.0;
        if (p.activeCat === 'keti') speedMult *= 1.30;
        if (plot.watered) speedMult *= 1.60;
        if (plot.fertilizer === 'compost') speedMult *= 1.50;
        if (plot.greenhouse) speedMult *= 1.50;
        if (p.skills.g1) speedMult *= (1 + p.skills.g1 * 0.15);

        plot.growthProgress = Math.min(1.0, (now - plot.plantedAt) / (plot.growDuration / speedMult));
      }
    });

    // 7. Active Helper Behavior
    const helperId = p.activeHelper;
    if (helperId === 'bee' && Math.random() < 0.03) {
      const flower = flowerFields[Math.floor(Math.random() * flowerFields.length)];
      if (flower && flower.pollen > 0) {
        flower.pollen = Math.max(0, flower.pollen - 4);
        addPollen(flower.pollenType, 4);
        spawnParticles(flower.x, flower.y, 4, '#fbbf24');
      }
    }

    // 8. Dropped Items & Vacuum Magnet Physics
    const magnetLvlBonus = (p.skills.p3 || 0) * 25;
    const baseMagnet = 110 + magnetLvlBonus;
    const magnetSpeed = 400;

    for (let i = droppedItems.length - 1; i >= 0; i--) {
      const it = droppedItems[i];
      it.life += dt;

      if (it.z > 0 || it.vz > 0) {
        it.z += it.vz * dt;
        it.vz -= 320 * dt;
        if (it.z <= 0) {
          it.z = 0;
          it.vz = -it.vz * 0.45;
          if (Math.abs(it.vz) < 20) it.vz = 0;
        }
      }

      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.vx *= 0.92;
      it.vy *= 0.92;

      const dPlayer = Math.hypot(p.x - it.x, p.y - it.y);
      const dComp = Math.hypot(comp.x - it.x, comp.y - it.y);
      const targetCat = (dComp < dPlayer) ? comp : p;
      const minDist = Math.min(dPlayer, dComp);

      if (minDist < baseMagnet) {
        const ang = Math.atan2(targetCat.y - it.y, targetCat.x - it.x);
        it.x += Math.cos(ang) * magnetSpeed * dt;
        it.y += Math.sin(ang) * magnetSpeed * dt;

        if (minDist < 25) {
          const success = addItemToInventory(it.itemId, it.count || 1);
          if (success) {
            spawnParticles(it.x, it.y, 6, '#fbbf24');
            const itemDef = getItemDef(it.itemId);
            spawnFloatingText(it.x, it.y - 15, `+${it.count || 1} ${itemDef.icon} ${itemDef.name}`, itemDef.rarity.color);
            addXp(4);
            droppedItems.splice(i, 1);
            continue;
          }
        }
      }
    }

    // 9. Flower Pollen Regeneration
    flowerFields.forEach(fl => {
      fl.sway += dt * 2.5;
      if (fl.pollen < fl.maxPollen) {
        fl.respawnTimer += dt;
        if (fl.respawnTimer >= 8.0) {
          fl.pollen = Math.min(fl.maxPollen, fl.pollen + 3);
          fl.respawnTimer = 0;
        }
      }
    });

    // 10. Trees & Rocks Respawn
    trees.forEach(t => {
      if (t.hp <= 0) {
        t.respawnTimer -= dt;
        if (t.respawnTimer <= 0) {
          t.hp = t.maxHp;
          spawnParticles(t.x, t.y, 8, '#22c55e');
        }
      }
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt * 6);
    });

    rocks.forEach(r => {
      if (r.hp <= 0) {
        r.respawnTimer -= dt;
        if (r.respawnTimer <= 0) {
          r.hp = r.maxHp;
          spawnParticles(r.x, r.y, 8, '#c084fc');
        }
      }
      if (r.shake > 0) r.shake = Math.max(0, r.shake - dt * 6);
    });

    // 11. Ambient Creatures Drifting
    ambientCreatures.forEach(c => {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.phase += dt;
      if (c.x < 50 || c.x > MAP_W - 50) c.vx *= -1;
      if (c.y < 50 || c.y > MAP_H - 50) c.vy *= -1;
    });

    // 12. Particles & Floaters
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life >= pt.maxLife) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life += dt;
      ft.y -= 28 * dt;
      if (ft.life >= ft.maxLife) floatingTexts.splice(i, 1);
    }

    // 13. Fishing State Tick
    if (fishingState.active) {
      fishingState.timer += dt;
      if (fishingState.timer > 3.0 && !fishingState.bite) {
        fishingState.bite = true;
        spawnFloatingText(p.x, p.y - 45, '❗ ПОКЛЁВКА! (Жмите E)', '#ef4444');
      }
    }
  }

  // ==========================================
  // TUTORIAL STEP ADVANCEMENT
  // ==========================================
  function advanceTutorialStep(expectedStep) {
    if (!state || state.story.tutorialComplete) return;
    if (state.story.tutorialStep === expectedStep) {
      state.story.tutorialStep++;
      if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('combo');

      if (state.story.tutorialStep > 12) {
        state.story.tutorialComplete = true;
        state.player.coins += 100;
        addXp(100);
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('levelup');
        showToast('🎉 ОБУЧЕНИЕ ПОЛНОСТЬЮ ПРОЙДЕНО! Награда: +100🪙, +100XP!');
      }

      if (global.MeowBloomUI && global.MeowBloomUI.onTutorialStepAdvanced) {
        global.MeowBloomUI.onTutorialStepAdvanced(state.story.tutorialStep);
      }
      saveGame();
    }
  }

  // ==========================================
  // POLLEN GATHERING & COMBO
  // ==========================================
  function gatherPollenTool() {
    const p = state.player;
    const collectorTier = p.tools.collector || 1;
    const collectorDef = global.MeowBloomData.POLLEN_COLLECTORS[collectorTier - 1] || global.MeowBloomData.POLLEN_COLLECTORS[0];

    let basePower = collectorDef.power;
    let radius = collectorDef.radius;

    if (p.skills.p1) basePower *= (1 + p.skills.p1 * 0.20);
    if (p.activeBuffs.pollen && Date.now() < p.activeBuffs.pollen.expireAt) {
      basePower *= p.activeBuffs.pollen.val;
    }
    if (state.weather === 'starfall') basePower *= 2.0;

    let gatheredAny = false;

    flowerFields.forEach(flower => {
      const dist = Math.hypot(p.x - flower.x, p.y - flower.y);
      if (dist < radius && flower.pollen > 0) {
        const take = Math.min(flower.pollen, Math.ceil(basePower));
        flower.pollen -= take;
        addPollen(flower.pollenType, take);
        gatheredAny = true;
        spawnParticles(flower.x, flower.y, 5, global.MeowBloomData.POLLEN_TYPES[flower.pollenType].color);
      }
    });

    if (gatheredAny) {
      state.combo.count++;
      state.combo.timer = state.combo.maxTimer + (p.skills.p2 ? p.skills.p2 * 2 : 0);
      
      const prevTier = state.combo.tier;
      if (state.combo.count >= 50) state.combo.tier = 4;
      else if (state.combo.count >= 30) state.combo.tier = 3;
      else if (state.combo.count >= 15) state.combo.tier = 2;
      else if (state.combo.count >= 5) state.combo.tier = 1;

      if (state.combo.tier > prevTier) {
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('combo');
        spawnFloatingText(p.x, p.y - 50, `⚡ КОМБО x${state.combo.count}!`, '#fbbf24');
      } else {
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('pollen');
      }

      p.stats.pollenCollected += Math.ceil(basePower);
      addXp(2);

      // Tutorial Step 3 Check (Collect Pollen)
      if (state.story.tutorialStep === 3) {
        advanceTutorialStep(3);
      }
    }
  }

  function addPollen(type, amount) {
    if (!state.player.pollen[type]) state.player.pollen[type] = 0;
    
    let mult = 1.0;
    if (state.combo.tier === 1) mult = 1.25;
    else if (state.combo.tier === 2) mult = 1.50;
    else if (state.combo.tier === 3) mult = 2.00;
    else if (state.combo.tier === 4) mult = 3.00;

    const total = Math.ceil(amount * mult);
    state.player.pollen[type] += total;
    checkStoryTask('pollen', type, total);
  }

  // ==========================================
  // FARMING, WATERING, MUTATIONS
  // ==========================================
  function plantCrop(plot, cropId, fertilizerId = null) {
    const p = state.player;
    if (!p.seeds[cropId] || p.seeds[cropId] <= 0) {
      showToast('⚠️ У вас нет семян этого растения!');
      return false;
    }

    const cropDef = global.MeowBloomData.CROPS[cropId];
    p.seeds[cropId]--;

    plot.crop = cropId;
    plot.plantedAt = Date.now();
    plot.growDuration = cropDef.growTime * 1000;
    plot.watered = false;
    plot.fertilizer = fertilizerId;
    plot.growthProgress = 0;

    let mutChance = 0.08;
    if (fertilizerId === 'gold_dust') mutChance += 0.35;
    if (p.skills.g3) mutChance += p.skills.g3 * 0.10;
    if (state.weather === 'starfall') mutChance *= 2.0;

    if (fertilizerId === 'star_essence' || Math.random() < mutChance) {
      const mutKeys = Object.keys(global.MeowBloomData.MUTATIONS);
      plot.mutation = (fertilizerId === 'star_essence') ? 'cosmic' : mutKeys[Math.floor(Math.random() * mutKeys.length)];
      p.stats.mutationsFound++;
    } else {
      plot.mutation = null;
    }

    if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('plant');
    spawnParticles(plot.x, plot.y, 8, '#22c55e');
    spawnFloatingText(plot.x, plot.y - 20, `Посажено: ${cropDef.name}`, '#22c55e');

    // Tutorial Step 7 Check (Plant Seed)
    if (state.story.tutorialStep === 7) {
      advanceTutorialStep(7);
    }

    return true;
  }

  function waterPlot(plot) {
    const p = state.player;
    if (p.waterInCan <= 0) {
      showToast('⚠️ В лейке закончилась вода! Наберите воду в колодце.');
      return false;
    }

    p.waterInCan--;
    plot.watered = true;
    if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('water');
    spawnParticles(plot.x, plot.y, 10, '#38bdf8');
    spawnFloatingText(plot.x, plot.y - 20, '💧 Полили!', '#38bdf8');

    // Tutorial Step 8 Check (Water Crop)
    if (state.story.tutorialStep === 8) {
      advanceTutorialStep(8);
    }
    return true;
  }

  function refillWaterCan() {
    state.player.waterInCan = state.player.maxWaterInCan;
    if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('water');
    spawnParticles(state.player.x, state.player.y, 15, '#38bdf8');
    spawnFloatingText(state.player.x, state.player.y - 30, '🪣 Лейка наполнена водой!', '#38bdf8');
  }

  function harvestPlot(plot) {
    if (!plot.crop || plot.growthProgress < 1.0) return;
    const cropId = plot.crop;
    const cropDef = global.MeowBloomData.CROPS[cropId];
    const p = state.player;

    let count = cropDef.baseYield || 2;
    if (plot.mutation === 'giant') count += 3;
    if (p.skills.g4 && Math.random() < p.skills.g4 * 0.25) count += 1;
    if (p.activeCat === 'keti' && Math.random() < 0.35) count += 1;

    spawnLoot(plot.x, plot.y, cropId, count);

    if (plot.mutation === 'cosmic') spawnLoot(plot.x, plot.y, 'stardust', 1);
    if (plot.mutation === 'crystal') spawnLoot(plot.x, plot.y, 'amethyst', 1);

    if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('harvest');
    spawnParticles(plot.x, plot.y, 14, cropDef.rarity.color);
    spawnFloatingText(plot.x, plot.y - 30, `🌾 Собрано x${count} ${cropDef.name}!`, cropDef.rarity.color);

    p.stats.cropsHarvested += count;
    addXp(15);
    checkStoryTask('harvest', cropId, count);

    const biome = plot.greenhouse ? 'greenhouse' : 'farm';
    state.biomes[biome].restoration = Math.min(100, state.biomes[biome].restoration + 2);

    plot.crop = null;
    plot.plantedAt = 0;
    plot.watered = false;
    plot.fertilizer = null;
    plot.mutation = null;
    plot.growthProgress = 0;

    // Tutorial Step 9 Check (Harvest Crop)
    if (state.story.tutorialStep === 9) {
      advanceTutorialStep(9);
    }
  }

  // ==========================================
  // DEADLOCK PREVENTION & FREE EMERGENCY SEEDS
  // ==========================================
  function getTotalSeedCount() {
    if (!state) return 0;
    let sum = 0;
    for (let k in state.player.seeds) {
      sum += state.player.seeds[k] || 0;
    }
    return sum;
  }

  function canClaimEmergencySeeds() {
    if (!state) return false;
    return state.player.coins < 3 && getTotalSeedCount() === 0;
  }

  function claimEmergencySeeds() {
    if (!canClaimEmergencySeeds()) {
      showToast('⚠️ У вас достаточно монет или семян!');
      return false;
    }
    state.player.seeds.catnip = (state.player.seeds.catnip || 0) + 3;
    spawnFloatingText(state.player.x, state.player.y - 30, '🎁 +3 Семени Мяты от Феликса!', '#fbbf24');
    showToast('🐾 Феликс помог вам бесплатным пакетиком семян кошачьей мяты (x3)!');
    saveGame();
    return true;
  }

  function exchangePollenForCoins() {
    if (!state) return false;
    if ((state.player.pollen.sunny || 0) < 15) {
      showToast('⚠️ Нужно минимум 15 солнечной пыльцы для обмена!');
      return false;
    }
    state.player.pollen.sunny -= 15;
    state.player.coins += 10;
    spawnFloatingText(state.player.x, state.player.y - 30, '+10 🪙 за пыльцу!', '#fbbf24');
    showToast('🌾 Вы успешно обменяли 15 солнечной пыльцы на 10 монет!');
    saveGame();
    return true;
  }

  function exchangePollenForSeeds() {
    if (!state) return false;
    if ((state.player.pollen.sunny || 0) < 12) {
      showToast('⚠️ Нужно минимум 12 солнечной пыльцы для обмена!');
      return false;
    }
    state.player.pollen.sunny -= 12;
    state.player.seeds.catnip = (state.player.seeds.catnip || 0) + 2;
    spawnFloatingText(state.player.x, state.player.y - 30, '+2 🌱 Семян мяты!', '#22c55e');
    showToast('🌱 Вы успешно обменяли 12 солнечной пыльцы на 2 семени мяты!');
    saveGame();
    return true;
  }

  // ==========================================
  // INVENTORY & BACKPACK
  // ==========================================
  function getItemDef(itemId) {
    if (global.MeowBloomData.CROPS[itemId]) return global.MeowBloomData.CROPS[itemId];
    const DEFS = {
      wood: { id: 'wood', name: 'Древесина дуба', icon: '🪵', rarity: global.MeowBloomData.RARITY.COMMON, price: 4 },
      birch: { id: 'birch', name: 'Берёзовый спил', icon: '🪵', rarity: global.MeowBloomData.RARITY.UNCOMMON, price: 10 },
      apple: { id: 'apple', name: 'Спелое яблоко', icon: '🍎', rarity: global.MeowBloomData.RARITY.UNCOMMON, price: 12 },
      stone: { id: 'stone', name: 'Обычный камень', icon: '🪨', rarity: global.MeowBloomData.RARITY.COMMON, price: 4 },
      iron_ore: { id: 'iron_ore', name: 'Железная руда', icon: '⛏️', rarity: global.MeowBloomData.RARITY.UNCOMMON, price: 16 },
      amethyst: { id: 'amethyst', name: 'Аметистовая друза', icon: '💎', rarity: global.MeowBloomData.RARITY.RARE, price: 55 },
      quartz: { id: 'quartz', name: 'Горный хрусталь', icon: '🔮', rarity: global.MeowBloomData.RARITY.EPIC, price: 110 },
      stardust: { id: 'stardust', name: 'Звёздная пыль', icon: '⭐', rarity: global.MeowBloomData.RARITY.LEGENDARY, price: 260 },
      crucian: { id: 'crucian', name: 'Речной карась', icon: '🐟', rarity: global.MeowBloomData.RARITY.COMMON, price: 12 },
      golden_carp: { id: 'golden_carp', name: 'Золотой карп', icon: '🐠', rarity: global.MeowBloomData.RARITY.UNCOMMON, price: 32 },
      moon_squid: { id: 'moon_squid', name: 'Лунный кальмар', icon: '🦑', rarity: global.MeowBloomData.RARITY.RARE, price: 70 },
      star_trout: { id: 'star_trout', name: 'Звёздная форель', icon: '🌟', rarity: global.MeowBloomData.RARITY.EPIC, price: 160 }
    };
    return DEFS[itemId] || { id: itemId, name: itemId, icon: '📦', rarity: global.MeowBloomData.RARITY.COMMON, price: 5 };
  }

  function getBackpackCapacity() {
    const bpLvl = state.player.tools.backpack || 1;
    const caps = [35, 70, 140, 280, 600];
    return caps[bpLvl - 1] || 35;
  }

  function getInventoryCount() {
    let sum = 0;
    for (let k in state.player.inventory) {
      sum += state.player.inventory[k] || 0;
    }
    return sum;
  }

  function addItemToInventory(itemId, count = 1) {
    const cap = getBackpackCapacity();
    const cur = getInventoryCount();
    if (cur + count > cap) {
      showToast('⚠️ Рюкзак переполнен! Продайте урожай у торговца Феликса.');
      return false;
    }
    state.player.inventory[itemId] = (state.player.inventory[itemId] || 0) + count;
    state.discoveredEncyclopedia[itemId] = true;
    return true;
  }

  // ==========================================
  // LOOT & PARTICLES
  // ==========================================
  function spawnLoot(x, y, itemId, count = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      droppedItems.push({
        x: x,
        y: y,
        z: 15,
        vz: 110 + Math.random() * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        itemId: itemId,
        count: 1,
        life: 0
      });
    }
  }

  function spawnParticles(x, y, count = 8, color = '#fbbf24') {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 35 + Math.random() * 80;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.4,
        size: 3 + Math.random() * 3,
        color: color
      });
    }
  }

  function spawnFloatingText(x, y, text, color = '#ffffff') {
    floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      life: 0,
      maxLife: 1.4
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('gameToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  // EXP & Level Progression
  function getXpForLevel(lvl) {
    return Math.floor(55 * Math.pow(1.30, lvl - 1));
  }

  function addXp(amount) {
    const p = state.player;
    p.xp += amount;
    let needed = getXpForLevel(p.level);
    while (p.xp >= needed) {
      p.xp -= needed;
      p.level++;
      p.skillPoints += 1;
      if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('levelup');
      spawnFloatingText(p.x, p.y - 40, `🎉 УРОВЕНЬ ${p.level}! (+1 Очко навыка)`, '#f59e0b');
      showToast(`🐱 Поздравляем! Новый уровень сада: ${p.level}! Доступны новые навыки.`);
      needed = getXpForLevel(p.level);
    }
  }

  function checkStoryTask(type, subtype, amount = 1) {
    const chIdx = state.story.currentChapter;
    const chData = global.MeowBloomData.STORY_CHAPTERS[chIdx - 1];
    if (!chData) return;

    const prog = state.story.chapterProgress['ch' + chIdx];
    if (!prog || prog.complete) return;

    chData.tasks.forEach((task, tIdx) => {
      const key = 'task' + tIdx;
      if (task.type === type) {
        if (!task.subtype || task.subtype === subtype) {
          prog[key] = Math.min(task.target, (prog[key] || 0) + amount);
        }
      } else if (task.type === 'coins' && type === 'coins') {
        prog[key] = Math.min(task.target, (prog[key] || 0) + amount);
      }
    });

    const allDone = chData.tasks.every((t, i) => (prog['task' + i] || 0) >= t.target);
    if (allDone && !prog.complete) {
      prog.complete = true;
      completeChapter(chIdx);
    }
  }

  function completeChapter(chIdx) {
    const chData = global.MeowBloomData.STORY_CHAPTERS[chIdx - 1];
    spawnFloatingText(state.player.x, state.player.y - 60, `🏆 ГЛАВА ${chIdx} ЗАВЕРШЕНА!`, '#f59e0b');
    showToast(`✨ ${chData.rewardDesc}`);
    
    if (chData.biome && state.biomes[chData.biome]) {
      state.biomes[chData.biome].shardUnlocked = true;
      state.biomes[chData.biome].restoration = 100;
    }

    if (chIdx === 2 && !state.unlockedTrophies.includes('trophy_forest')) state.unlockedTrophies.push('trophy_forest');
    if (chIdx === 3 && !state.unlockedTrophies.includes('trophy_fish')) state.unlockedTrophies.push('trophy_fish');
    if (chIdx === 4 && !state.unlockedTrophies.includes('trophy_garden')) state.unlockedTrophies.push('trophy_garden');
    if (chIdx === 6 && !state.unlockedTrophies.includes('trophy_harmony')) state.unlockedTrophies.push('trophy_harmony');

    if (chIdx < 7) {
      state.story.currentChapter = chIdx + 1;
    }
    saveGame();
  }

  // ==========================================
  // STORAGE PERSISTENCE & MIGRATION
  // ==========================================
  function saveGame() {
    try {
      state.lastSaveTime = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save MeowBloom state', e);
    }
  }

  function loadGame() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === 3) {
          state = parsed;
          // Enforce canonical clean coordinates on plots to eliminate any legacy drift
          enforceCanonicalPlots();
          return;
        }
      }

      // Check migration from v2 or v1
      const legacy2 = localStorage.getItem('meowbloom_garden_save_v2');
      if (legacy2) {
        const p2 = JSON.parse(legacy2);
        state = getDefaultState();
        if (p2.player) Object.assign(state.player, p2.player);
        if (p2.story) Object.assign(state.story, p2.story);
        enforceCanonicalPlots();
        saveGame();
        return;
      }
    } catch (e) {
      console.warn('Error loading save, using defaults', e);
    }
    state = getDefaultState();
  }

  function enforceCanonicalPlots() {
    if (!state || !state.plots) return;
    CANONICAL_PLOTS.forEach((cp, idx) => {
      if (state.plots[idx]) {
        state.plots[idx].id = cp.id;
        state.plots[idx].x = cp.x;
        state.plots[idx].y = cp.y;
        state.plots[idx].greenhouse = cp.greenhouse;
      } else {
        state.plots[idx] = JSON.parse(JSON.stringify(cp));
      }
    });
    // Remove any extra plots that might have existed in legacy saves
    if (state.plots.length > CANONICAL_PLOTS.length) {
      state.plots = state.plots.slice(0, CANONICAL_PLOTS.length);
    }
  }

  function initEngine() {
    loadGame();
    initFlowerFields();
    initEnvironmentEntities();
  }

  // Export Engine API
  global.MeowBloomEngine = {
    init: initEngine,
    update: update,
    getState: () => state,
    getFlowerFields: () => flowerFields,
    getTrees: () => trees,
    getRocks: () => rocks,
    getDroppedItems: () => droppedItems,
    getParticles: () => particles,
    getFloatingTexts: () => floatingTexts,
    getAmbientCreatures: () => ambientCreatures,
    getFishingState: () => fishingState,
    gatherPollenTool: gatherPollenTool,
    plantCrop: plantCrop,
    waterPlot: waterPlot,
    refillWaterCan: refillWaterCan,
    harvestPlot: harvestPlot,
    saveGame: saveGame,
    addItemToInventory: addItemToInventory,
    getItemDef: getItemDef,
    addXp: addXp,
    spawnFloatingText: spawnFloatingText,
    spawnParticles: spawnParticles,
    spawnLoot: spawnLoot,
    showToast: showToast,
    advanceTutorialStep: advanceTutorialStep,
    canClaimEmergencySeeds: canClaimEmergencySeeds,
    claimEmergencySeeds: claimEmergencySeeds,
    exchangePollenForCoins: exchangePollenForCoins,
    exchangePollenForSeeds: exchangePollenForSeeds
  };

})(window);
