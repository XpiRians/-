/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (farm_render.js)
 * High-performance, rich Canvas 2D Renderer:
 * - Lush Biomes (Lawn, Pine Forest, Shimmering Lake with waves, Quarry Canyon, Domed Greenhouse, Starlit Altar)
 * - Swaying Flower Fields & Pollen Particles
 * - Animated Procedural Cat Sprites (Musya & Keti) with Tool Swings & Companions
 * - Floating Helpers / Pets (Firefly, Pollinator Bee, Forest Sprite, etc.)
 * - Day / Night Atmospheric Tint & Dynamic Lighting (Lanterns, Glowing Crystals, Moonglow)
 * - Weather Rendering (Rain Streaks & Splashes, Fog Haze, Starfall Streaks)
 * - Interactive Tutorial Directional Guide Arrow & Markers
 */

(function (global) {
  'use strict';

  let canvas = null;
  let ctx = null;
  let camera = { x: 0, y: 0, w: 960, h: 600 };

  function initRenderer(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
  }

  function resizeCamera(w, h) {
    camera.w = w;
    camera.h = h;
  }

  function render(dt) {
    if (!ctx || !canvas || !global.MeowBloomEngine) return;
    const state = global.MeowBloomEngine.getState();
    if (!state) return;

    const p = state.player;
    const comp = state.companion;

    // Smooth Camera Follow
    const targetCamX = p.x - camera.w / 2;
    const targetCamY = p.y - camera.h / 2;
    camera.x += (targetCamX - camera.x) * 6 * dt;
    camera.y += (targetCamY - camera.y) * 6 * dt;
    camera.x = Math.max(0, Math.min(2400 - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(1600 - camera.h, camera.y));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // 1. Draw Biomes Ground Base & Paths
    drawGroundAndBiomes(state);

    // 2. Draw Lake, Waves & Wooden Pier
    drawLakeAndPier(state);

    // 3. Draw Primordial Seed Shrine & Cabin
    drawShrineAndBuildings(state);

    // 4. Draw Farming Soil Plots & Growing Crops
    drawFarmingPlots(state);

    // 5. Draw Swaying Flower Fields
    drawFlowerFields(state);

    // 6. Draw Trees (Forest)
    drawTrees(state);

    // 7. Draw Rocks & Minerals (Quarry)
    drawRocks(state);

    // 8. Draw Dropped Bouncy Loot
    drawDroppedLoot(state);

    // 9. Draw Ambient Creatures (Butterflies & Fireflies)
    drawAmbientCreatures(state);

    // 10. Draw Companion Follower Cat
    const otherCat = (p.activeCat === 'musya') ? 'keti' : 'musya';
    drawCatSprite(comp.x, comp.y, otherCat, comp.facing, true, state);

    // 11. Draw Player Active Cat
    drawCatSprite(p.x, p.y, p.activeCat, p.facing, false, state);

    // 12. Draw Floating Active Helper / Pet
    drawActiveHelper(p.x, p.y - 28, p.activeHelper, state);

    // 13. Draw Particles
    drawParticles(state);

    // 14. Draw Floating Damage / Gain Texts
    drawFloatingTexts(state);

    // 15. Draw Interactive Tutorial Arrow & Target Markers
    drawTutorialGuides(state);

    ctx.restore();

    // 16. Screen-Space Atmospheric Day / Night Lighting Tint
    drawDayNightAtmosphere(state);

    // 17. Weather Overlays (Rain, Fog, Starfall)
    drawWeatherOverlay(state);
  }

  // ==========================================
  // GROUND & BIOMES BASE
  // ==========================================
  function drawGroundAndBiomes(state) {
    // 1. Home Farm Base (Emerald meadow)
    ctx.fillStyle = '#1b2c1d';
    ctx.fillRect(0, 0, 2400, 1600);

    // Subtle Grass Tuft Details
    ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
    for (let x = 60; x < 900; x += 90) {
      for (let y = 60; y < 900; y += 90) {
        ctx.fillRect(x + Math.sin(x) * 20, y + Math.cos(y) * 20, 4, 8);
      }
    }

    // 2. Whispering Forest (Deep Pine Spruce)
    ctx.fillStyle = '#122318';
    ctx.fillRect(950, 40, 1420, 780);

    // 3. Crystal Quarry (Violet Granite Rock)
    ctx.fillStyle = '#221b2a';
    ctx.fillRect(980, 840, 900, 720);

    // 4. Cosmic Altar (Midnight Starlight Indigo)
    ctx.fillStyle = '#161228';
    ctx.fillRect(1880, 840, 480, 720);

    // 5. Dirt Road Paths
    ctx.fillStyle = '#2d2319';
    ctx.fillRect(520, 200, 580, 50); // Farm to Forest
    ctx.fillRect(450, 480, 50, 500); // Farm to Lake
    ctx.fillRect(750, 480, 300, 50); // Farm to Greenhouse
    ctx.fillRect(1000, 760, 50, 400); // Forest to Quarry
    ctx.fillRect(1650, 1150, 300, 50); // Quarry to Altar
  }

  // Lake & Pier
  function drawLakeAndPier(state) {
    // Lake Water Basin
    ctx.fillStyle = '#0b2034';
    ctx.beginPath();
    ctx.roundRect(80, 950, 820, 580, 50);
    ctx.fill();

    // Shimmering Waves & Ripples
    const time = performance.now() * 0.002;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const rx = 200 + (i * 105 + Math.sin(time + i * 1.5) * 25);
      const ry = 1040 + (i * 70 + Math.cos(time + i * 1.2) * 20);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 45 + Math.sin(time + i) * 12, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Wooden Fishing Pier
    ctx.fillStyle = '#5c3d23';
    ctx.fillRect(440, 980, 80, 240);
    ctx.strokeStyle = '#382212';
    ctx.lineWidth = 2;
    for (let py = 990; py < 1220; py += 18) {
      ctx.beginPath();
      ctx.moveTo(440, py); ctx.lineTo(520, py);
      ctx.stroke();
    }

    // Fishing Bobber if active
    const f = global.MeowBloomEngine.getFishingState();
    if (f.active) {
      ctx.fillStyle = f.bite ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.bite ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();

      // Fishing line to cat
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y - 10);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();
    }
  }

  // Shrine of the Primordial Seed & Buildings
  function drawShrineAndBuildings(state) {
    const time = performance.now() * 0.003;

    // 1. Primordial Seed Shrine (Right outside the Cabin)
    ctx.fillStyle = '#261b36';
    ctx.beginPath();
    ctx.arc(420, 290, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulsing Seed Crystal
    const pulse = Math.sin(time) * 4;
    ctx.font = `${28 + pulse}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌱', 420, 290);

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('Первосемя', 420, 335);

    // 2. Cozy Cabin (Home Farm)
    ctx.fillStyle = '#4a3321';
    ctx.fillRect(320, 140, 160, 110);
    ctx.fillStyle = '#6b2d2d';
    ctx.beginPath();
    ctx.moveTo(300, 140); ctx.lineTo(400, 80); ctx.lineTo(500, 140);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#26190f';
    ctx.fillRect(380, 185, 40, 65);
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('🏠 Домик Муси и Кейти', 400, 70);

    // 3. Felix Merchant Stall
    ctx.fillStyle = '#3f2d1d';
    ctx.fillRect(580, 240, 90, 65);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(570, 220, 110, 25);
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏪 Лавка Феликса', 625, 210);

    // 4. Water Well (For Refilling Watering Can)
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(220, 270, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(220, 270, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('💧 Колодец', 220, 305);

    // 5. Огороженный садик Муси и Кейти (Enclosed Fenced Garden: plots p1-p8)
    // Dark rich soil bedding under the 8 plots
    ctx.fillStyle = 'rgba(42, 28, 16, 0.45)';
    ctx.beginPath();
    ctx.roundRect(190, 360, 340, 185, 14);
    ctx.fill();
    ctx.strokeStyle = '#5a3d28';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Wooden picket fence around garden with open south gate
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    // North Fence
    for (let fx = 195; fx <= 525; fx += 22) {
      ctx.fillRect(fx, 355, 6, 16);
    }
    ctx.fillRect(190, 360, 340, 4); // Top rail
    // West Fence
    for (let fy = 365; fy <= 535; fy += 20) {
      ctx.fillRect(188, fy, 16, 6);
    }
    ctx.fillRect(190, 360, 4, 180);
    // East Fence
    for (let fy = 365; fy <= 535; fy += 20) {
      ctx.fillRect(524, fy, 16, 6);
    }
    ctx.fillRect(528, 360, 4, 180);
    // South Fence (with opening at 330-390 for entrance gate)
    ctx.fillRect(190, 542, 140, 4);
    ctx.fillRect(390, 542, 140, 4);
    for (let fx = 195; fx <= 330; fx += 22) ctx.fillRect(fx, 536, 6, 16);
    for (let fx = 390; fx <= 525; fx += 22) ctx.fillRect(fx, 536, 6, 16);
    // Garden Title Sign
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.fillText('🏡 Садик Муси и Кейти (Грядки)', 360, 375);

    // 6. Вавилонская теплица (Domed Babel Conservatory: plots gh1-gh4)
    // Foundation & Stone Base
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(720, 365, 195, 180, 16);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Glass Tint & Arches
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.roundRect(726, 371, 183, 168, 12);
    ctx.fill();
    // Conservatory Ribs / Arches
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(720, 455); ctx.lineTo(915, 455);
    ctx.moveTo(815, 365); ctx.lineTo(815, 545);
    ctx.stroke();
    // Greenhouse Header Sign
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ Вавилонская Теплица', 818, 385);

    // 7. Cosmic Altar Pedestal
    ctx.fillStyle = '#261b40';
    ctx.beginPath();
    ctx.arc(2120, 1200, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = '40px sans-serif';
    ctx.fillText('✨', 2120, 1205);
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#e879f9';
    ctx.fillText('Космический Алтарь', 2120, 1295);
  }

  // Farming Soil Plots & Growing Crops
  function drawFarmingPlots(state) {
    state.plots.forEach(plot => {
      // Bed soil
      ctx.fillStyle = plot.watered ? '#24160d' : '#382515';
      ctx.beginPath();
      ctx.roundRect(plot.x - 30, plot.y - 30, 60, 60, 8);
      ctx.fill();

      // Border with fertilizer hint
      ctx.strokeStyle = plot.watered ? '#4a2e18' : '#573c24';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (plot.crop) {
        const cropDef = global.MeowBloomData.CROPS[plot.crop] || { icon: '🌱', rarity: global.MeowBloomData.RARITY.COMMON };
        const prog = plot.growthProgress || 0;

        // Mutation Glowing Aura
        if (plot.mutation) {
          const mutDef = global.MeowBloomData.MUTATIONS[plot.mutation];
          ctx.save();
          ctx.shadowColor = mutDef.color;
          ctx.shadowBlur = 14;
          ctx.strokeStyle = mutDef.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(plot.x - 28, plot.y - 28, 56, 56);
          ctx.restore();
        }

        if (prog < 0.35) {
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌱', plot.x, plot.y - 3);
        } else if (prog < 0.95) {
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌿', plot.x, plot.y - 3);
        } else {
          // Bloomed ready crop! Scaled strictly inside the 60x60 plot boundary
          ctx.save();
          ctx.shadowColor = cropDef.rarity.color;
          ctx.shadowBlur = 10;
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cropDef.icon, plot.x, plot.y - 3);
          ctx.restore();
        }

        // Mini Progress bar strictly inside plot bounds
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(plot.x - 18, plot.y + 18, 36, 4);
        ctx.fillStyle = (prog >= 1.0) ? '#22c55e' : (plot.watered ? '#38bdf8' : '#fbbf24');
        ctx.fillRect(plot.x - 18, plot.y + 18, 36 * Math.min(1.0, prog), 4);
      }
    });
  }

  // Swaying Flower Fields & Pollen Sparkles
  function drawFlowerFields(state) {
    const fields = global.MeowBloomEngine.getFlowerFields();
    fields.forEach(fl => {
      const swayX = Math.sin(fl.sway) * 4;
      const curX = fl.x + swayX;
      const curY = fl.y;

      const pType = global.MeowBloomData.POLLEN_TYPES[fl.pollenType];
      const hasPollen = fl.pollen > 0;

      // Stem
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y + 12);
      ctx.quadraticCurveTo(fl.x, fl.y + 4, curX, curY);
      ctx.stroke();

      // Flower Blossom
      ctx.fillStyle = hasPollen ? pType.color : '#64748b';
      ctx.beginPath();
      ctx.arc(curX, curY - 4, hasPollen ? 7 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Pollen Sparkle
      if (hasPollen && Math.sin(fl.sway * 2) > 0.6) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX + 2, curY - 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Trees Rendering
  function drawTrees(state) {
    const trees = global.MeowBloomEngine.getTrees();
    trees.forEach(t => {
      if (t.hp > 0) {
        const shakeX = (Math.sin(performance.now() * 0.05) * t.shake * 4);
        const tx = t.x + shakeX;
        const ty = t.y;

        // Trunk
        ctx.fillStyle = (t.type === 'birch') ? '#e2e8f0' : (t.type === 'magic' ? '#6366f1' : '#4a3018');
        ctx.fillRect(tx - 8, ty - 16, 16, 26);

        // Foliage Canopy
        ctx.fillStyle = (t.type === 'birch') ? '#2e7d32' : (t.type === 'magic' ? '#818cf8' : '#1e5229');
        ctx.beginPath();
        ctx.arc(tx, ty - 38, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = (t.type === 'birch') ? '#4caf50' : (t.type === 'magic' ? '#a5b4fc' : '#2e7d32');
        ctx.beginPath();
        ctx.arc(tx - 6, ty - 44, 20, 0, Math.PI * 2);
        ctx.fill();

        if (t.hp < t.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(tx - 15, ty - 75, 30, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(tx - 15, ty - 75, 30 * (t.hp / t.maxHp), 4);
        }
      } else {
        // Stump
        ctx.fillStyle = '#3a2310';
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Rocks & Minerals
  function drawRocks(state) {
    const rocks = global.MeowBloomEngine.getRocks();
    rocks.forEach(r => {
      if (r.hp > 0) {
        const shakeX = (Math.sin(performance.now() * 0.05) * r.shake * 4);
        const rx = r.x + shakeX;
        const ry = r.y;

        ctx.fillStyle = '#383241';
        ctx.beginPath();
        ctx.roundRect(rx - 18, ry - 14, 36, 28, 6);
        ctx.fill();

        if (r.type === 'amethyst') {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.moveTo(rx - 6, ry - 18); ctx.lineTo(rx + 2, ry - 28); ctx.lineTo(rx + 9, ry - 18);
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

        if (r.hp < r.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(rx - 15, ry - 30, 30, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(rx - 15, ry - 30, 30 * (r.hp / r.maxHp), 4);
        }
      }
    });
  }

  // Dropped Bouncy Loot
  function drawDroppedLoot(state) {
    const items = global.MeowBloomEngine.getDroppedItems();
    items.forEach(it => {
      const def = global.MeowBloomEngine.getItemDef(it.itemId);
      const curY = it.y - (it.z || 0);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Icon
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, it.x, curY);
    });
  }

  // Ambient Creatures (Butterflies & Fireflies)
  function drawAmbientCreatures(state) {
    const creatures = global.MeowBloomEngine.getAmbientCreatures();
    creatures.forEach(c => {
      if (c.type === 'firefly') {
        const pulse = 0.5 + Math.sin(c.phase * 3) * 0.5;
        ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Butterfly flutter
        const wing = Math.sin(c.phase * 8) * 4;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(c.x - 3, c.y, Math.abs(wing), 4, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 3, c.y, Math.abs(wing), 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // ==========================================
  // PROCEDURAL CAT SPRITES (MUSYA & KETI)
  // ==========================================
  function drawCatSprite(x, y, catType, facing, isCompanion, state) {
    ctx.save();
    ctx.translate(x, y);

    const time = performance.now() * 0.008;
    const isMoving = isCompanion ? true : false; // Active cats move with keys
    const bob = isMoving ? Math.sin(time * 3) * 2 : 0;
    const tailAngle = Math.sin(time * 3) * 0.25;

    let bodyColor, stripeColor, bellyColor, eyeColor, hasBackpack, hasCurledTail;
    if (catType === 'musya') {
      bodyColor = '#8a919e';
      stripeColor = '#474d58';
      bellyColor = '#d9dde4';
      eyeColor = '#eab308'; // Amber eyes
      hasBackpack = true;
      hasCurledTail = false;
    } else {
      bodyColor = '#b88958';
      stripeColor = '#6a4623';
      bellyColor = '#f5ecd9';
      eyeColor = '#10b981'; // Emerald eyes
      hasBackpack = false;
      hasCurledTail = true; // Curled tail
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

    // Stripes
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

    // Musya's Adventurer Leather Backpack
    if (hasBackpack) {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-7, -8 + bob, 14, 10, 3);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
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
    ctx.beginPath();
    ctx.moveTo(-9, headY - 4); ctx.lineTo(-11, headY - 18); ctx.lineTo(-2, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, headY - 10); ctx.lineTo(11, headY - 18); ctx.lineTo(9, headY - 4);
    ctx.closePath();
    ctx.fill();

    // Eyes
    if (facing !== 1) {
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-4, headY - 1, 3, 0, Math.PI * 2);
      ctx.arc(4, headY - 1, 3, 0, Math.PI * 2);
      ctx.fill();
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

    // Companion Love Heart
    if (isCompanion && Math.sin(time * 2) > 0.6) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ec4899';
      ctx.fillText('❤️', 12, headY - 10);
    }

    ctx.restore();
  }

  // Active Helper / Pet Floating Sprite
  function drawActiveHelper(catX, catY, helperId, state) {
    if (!helperId) return;
    const time = performance.now() * 0.005;
    const floatY = catY + Math.sin(time * 2) * 6;
    const floatX = catX + 22 + Math.cos(time * 2) * 4;

    const hDef = global.MeowBloomData.HELPERS[helperId];
    if (!hDef) return;

    ctx.save();
    // Halo glow
    ctx.shadowColor = hDef.rarity.color;
    ctx.shadowBlur = 10;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hDef.icon, floatX, floatY);
    ctx.restore();
  }

  // Particles & Floaters
  function drawParticles(state) {
    const pts = global.MeowBloomEngine.getParticles();
    pts.forEach(pt => {
      const alpha = 1.0 - (pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  function drawFloatingTexts(state) {
    const fts = global.MeowBloomEngine.getFloatingTexts();
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    fts.forEach(ft => {
      const alpha = 1.0 - (ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;
  }

  // Tutorial Guides & Target Marker Arrow
  function drawTutorialGuides(state) {
    if (state.story.tutorialComplete) return;
    const step = state.story.tutorialStep;
    const p = state.player;

    let targetX = 420;
    let targetY = 290;

    if (step === 1) { // Move around (glowing guide near player)
      targetX = p.x + 40; targetY = p.y;
    } else if (step === 2) { // Inspect Primordial Seedling Shrine
      targetX = 420; targetY = 290;
    } else if (step === 3) { // Collect Pollen on field
      targetX = 260; targetY = 640;
    } else if (step === 4) { // Open Inventory (hint near Felix/Player)
      targetX = p.x; targetY = p.y - 20;
    } else if (step === 5) { // Visit Felix Shop
      targetX = 625; targetY = 250;
    } else if (step === 6) { // Buy Seed in Shop
      targetX = 625; targetY = 250;
    } else if (step === 7) { // Plant on Plot in Fenced Garden
      targetX = 240; targetY = 410;
    } else if (step === 8) { // Water Plot
      targetX = 240; targetY = 410;
    } else if (step === 9) { // Harvest Plot
      targetX = 240; targetY = 410;
    } else if (step === 10) { // Sell Harvest at Felix Shop
      targetX = 625; targetY = 250;
    } else if (step === 11) { // View Order Board
      targetX = 625; targetY = 320;
    } else if (step === 12) { // Explore Whispering Forest entrance
      targetX = 960; targetY = 220;
    }

    const time = performance.now() * 0.006;
    const arrowY = targetY - 45 + Math.sin(time * 3) * 8;

    // Glowing Bouncing Guide Arrow
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetX, arrowY + 16);
    ctx.lineTo(targetX - 12, arrowY);
    ctx.lineTo(targetX - 5, arrowY);
    ctx.lineTo(targetX - 5, arrowY - 14);
    ctx.lineTo(targetX + 5, arrowY - 14);
    ctx.lineTo(targetX + 5, arrowY);
    ctx.lineTo(targetX + 12, arrowY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pulsing target circle
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 24 + Math.sin(time * 2) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================
  // SCREEN ATMOSPHERE & WEATHER OVERLAYS
  // ==========================================
  function drawDayNightAtmosphere(state) {
    const t = state.timeOfDay;
    // Calculate light color based on cycle:
    // 0.0 - 0.2: Dawn (warm rose golden)
    // 0.2 - 0.5: Day (clear transparent)
    // 0.5 - 0.7: Sunset (deep orange-purple)
    // 0.7 - 1.0: Night (deep translucent blue-indigo)
    let alpha = 0;
    let r = 0, g = 0, b = 0;

    if (t > 0.65 && t < 0.95) {
      // Night time
      alpha = 0.55 * Math.sin(((t - 0.65) / 0.3) * Math.PI);
      r = 10; g = 15; b = 45;
    } else if (t >= 0.5 && t <= 0.65) {
      // Sunset
      alpha = 0.35 * Math.sin(((t - 0.5) / 0.15) * Math.PI);
      r = 180; g = 80; b = 40;
    } else if (t >= 0.0 && t <= 0.15) {
      // Dawn
      alpha = 0.25 * Math.sin((t / 0.15) * Math.PI);
      r = 255; g = 180; b = 100;
    }

    if (alpha > 0.01) {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawWeatherOverlay(state) {
    const w = state.weather;
    if (w === 'rain') {
      const time = performance.now() * 0.003;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) {
        const rx = (i * 27 + time * 500) % canvas.width;
        const ry = (i * 19 + time * 800) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 18);
        ctx.stroke();
      }
    } else if (w === 'fog') {
      ctx.fillStyle = 'rgba(203, 213, 225, 0.20)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (w === 'starfall') {
      const time = performance.now() * 0.002;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      for (let i = 0; i < 15; i++) {
        const sx = (i * 75 + time * 300) % canvas.width;
        const sy = (i * 60 + time * 450) % canvas.height;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Export API
  global.MeowBloomRender = {
    init: initRenderer,
    resize: resizeCamera,
    render: render
  };

})(window);
