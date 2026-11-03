/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (farm_ui.js)
 * User Interface, Modals, Input Controller & Story Tutorial System:
 * - Top HUD: Cat info, Pollen types, Combo meter, Day/Night & Weather, Water in can, Backpack & Coins
 * - Modal Dialogs: Shop, Workshop (Crafting & Cooking), Helpers/Pets, Skill Tree, Order Board, Encyclopedia, Story Chapters, Settings
 * - Keyboard & Mobile Virtual Joystick Controls
 * - Contextual Interaction Prompts
 * - Interactive Step-by-Step Tutorial & Story Dialogue Popups
 */

(function (global) {
  'use strict';

  let keys = {};
  let touchJoystick = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0 };
  let activePlotForSeedSelect = null;

  // Tutorial Dialogues Sequence
  const TUTORIAL_DIALOGUES = [
    {
      step: 0,
      speaker: 'Кейти',
      avatar: 'assets/keti.jpg',
      title: 'Утро в Великом саду',
      text: 'Муся, просыпайся! Солнце уже встало над нашей полянкой. Пора размять лапки!'
    },
    {
      step: 2,
      speaker: 'Муся',
      avatar: 'assets/musya.jpg',
      title: 'Таинственный росток',
      text: 'Мяу! Кейти, посмотри возле домика! Прямо посреди травы появился светящийся росток. Это же легендарное Первосемя! Ему нужна солнечная пыльца, чтобы окрепнуть.'
    },
    {
      step: 4,
      speaker: 'Кейти',
      avatar: 'assets/keti.jpg',
      title: 'Пыльца собрана!',
      text: 'Отлично! Мы наполнили рюкзачок солнечной пыльцой. Теперь заглянем к торговцу Феликсу — он как раз открыл свою лавку у дороги.'
    },
    {
      step: 6,
      speaker: 'Муся',
      avatar: 'assets/musya.jpg',
      title: 'Посадка семян',
      text: 'Семена мяты в земле! Теперь полей их из лейки (клавиша E). Вода ускоряет рост почти в два раза!'
    },
    {
      step: 8,
      speaker: 'Муся и Кейти',
      avatar: 'assets/musya.jpg',
      title: 'Первый урожай собран!',
      text: 'Ура! Первый урожай готов. Первосемя напиталось жизненной силой и пробило проход в Шепчущий лес! Открывайте новые горизонты и восстанавливайте Великий сад!'
    }
  ];

  function initUI() {
    initInputListeners();
    initModalTriggers();
    updateHUD();

    // Trigger opening tutorial popup if starting fresh
    const state = global.MeowBloomEngine.getState();
    if (state && state.story.tutorialStep === 0) {
      triggerTutorialDialogue(0);
      state.story.tutorialStep = 1;
    }
  }

  // ==========================================
  // INPUT LISTENERS (KEYBOARD & TOUCH)
  // ==========================================
  function initInputListeners() {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (global.MeowBloomEngine) global.MeowBloomEngine.advanceTutorialStep(1);
      }
      if (e.code === 'KeyQ') swapCat();
      else if (e.code === 'KeyE') handleInteract();
      else if (e.code === 'Space') {
        e.preventDefault();
        handleActionTool();
      }
    });

    window.addEventListener('keyup', e => {
      keys[e.code] = false;
    });

    // Touch Virtual Joystick
    const joyZone = document.getElementById('joystickZone');
    const joyThumb = document.getElementById('joystickThumb');
    if (joyZone && joyThumb) {
      const handleTouch = (e) => {
        const touch = e.touches[0];
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const dist = Math.min(45, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);

        touchJoystick.active = true;
        touchJoystick.dirX = Math.cos(ang) * (dist / 45);
        touchJoystick.dirY = Math.sin(ang) * (dist / 45);

        joyThumb.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`;
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

    // Touch Buttons
    const vbtnSwap = document.getElementById('vbtnSwap');
    const vbtnAction = document.getElementById('vbtnAction');
    const vbtnInteract = document.getElementById('vbtnInteract');
    if (vbtnSwap) vbtnSwap.addEventListener('click', swapCat);
    if (vbtnAction) vbtnAction.addEventListener('click', handleActionTool);
    if (vbtnInteract) vbtnInteract.addEventListener('click', handleInteract);
  }

  function swapCat() {
    const state = global.MeowBloomEngine.getState();
    if (!state) return;
    const cur = state.player.activeCat;
    state.player.activeCat = (cur === 'musya') ? 'keti' : 'musya';
    if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('meow');
    global.MeowBloomEngine.spawnParticles(state.player.x, state.player.y, 12, state.player.activeCat === 'musya' ? '#94a3b8' : '#eab308');
    const name = state.player.activeCat === 'musya' ? 'Муся' : 'Кейти';
    global.MeowBloomEngine.spawnFloatingText(state.player.x, state.player.y - 30, `🐾 Активна: ${name}!`, '#fbbf24');
    updateHUD();
    global.MeowBloomEngine.saveGame();
  }

  // ==========================================
  // CONTEXTUAL ACTIONS (E & SPACE)
  // ==========================================
  function handleInteract() {
    const state = global.MeowBloomEngine.getState();
    if (!state) return;
    const p = state.player;

    // 1. Water Well (Refill Can)
    if (Math.hypot(p.x - 220, p.y - 270) < 55) {
      global.MeowBloomEngine.refillWaterCan();
      global.MeowBloomEngine.advanceTutorialStep(8);
      updateHUD();
      return;
    }

    // 2. Primordial Seedling Shrine
    if (Math.hypot(p.x - 420, p.y - 290) < 65) {
      openModal('questsModal');
      global.MeowBloomEngine.advanceTutorialStep(2);
      return;
    }

    // 3. Merchant Felix
    if (Math.hypot(p.x - 620, p.y - 280) < 70) {
      openModal('shopModal');
      global.MeowBloomEngine.advanceTutorialStep(5);
      return;
    }

    // 4. Lake Pier Fishing
    const f = global.MeowBloomEngine.getFishingState();
    if (Math.hypot(p.x - 480, p.y - 1200) < 80) {
      if (!f.active) {
        f.active = true;
        f.timer = 0;
        f.bite = false;
        f.x = 480; f.y = 1250;
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('water');
        global.MeowBloomEngine.showToast('🎣 Удочка заброшена! Ждите поклёвки (сигнал ❗)...');
      } else {
        if (f.bite) {
          f.active = false;
          state.player.stats.fishCaught++;
          const roll = Math.random();
          let fishId = 'crucian';
          if (roll > 0.93) fishId = 'star_trout';
          else if (roll > 0.75) fishId = 'moon_squid';
          else if (roll > 0.40) fishId = 'golden_carp';

          global.MeowBloomEngine.spawnLoot(p.x, p.y - 20, fishId, 1);
          global.MeowBloomEngine.addXp(20);
          if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('harvest');
          global.MeowBloomEngine.showToast(`🐟 Поймана рыба: ${global.MeowBloomEngine.getItemDef(fishId).name}!`);
        } else {
          f.active = false;
          global.MeowBloomEngine.showToast('💨 Слишком рано подсекли!');
        }
      }
      return;
    }

    // 5. Farming Plots
    for (let plot of state.plots) {
      if (Math.hypot(p.x - plot.x, p.y - plot.y) < 45) {
        if (!plot.crop) {
          openSeedSelector(plot);
        } else if (plot.growthProgress >= 1.0) {
          global.MeowBloomEngine.harvestPlot(plot);
          global.MeowBloomEngine.advanceTutorialStep(9);
          updateHUD();
        } else if (!plot.watered) {
          global.MeowBloomEngine.waterPlot(plot);
          global.MeowBloomEngine.advanceTutorialStep(8);
          updateHUD();
        }
        return;
      }
    }
  }

  function handleActionTool() {
    const state = global.MeowBloomEngine.getState();
    if (!state) return;
    const p = state.player;

    // 1. Check near trees (Forest)
    const trees = global.MeowBloomEngine.getTrees();
    for (let t of trees) {
      if (t.hp > 0 && Math.hypot(p.x - t.x, p.y - t.y) < 65) {
        t.hp -= (p.activeCat === 'musya' ? 1.4 : 1.0);
        t.shake = 1.0;
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('chop');
        global.MeowBloomEngine.spawnParticles(t.x, t.y - 20, 6, '#e2e8f0');

        if (t.hp <= 0) {
          t.respawnTimer = 25;
          p.stats.treesChopped++;
          const woodCount = 3 + (p.tools.axe || 1);
          global.MeowBloomEngine.spawnLoot(t.x, t.y, t.type === 'birch' ? 'birch' : 'wood', woodCount);
          if (Math.random() > 0.5) global.MeowBloomEngine.spawnLoot(t.x, t.y, 'apple', 1);
          global.MeowBloomEngine.addXp(15);
        }
        return;
      }
    }

    // 2. Check near rocks (Quarry)
    const rocks = global.MeowBloomEngine.getRocks();
    for (let r of rocks) {
      if (r.hp > 0 && Math.hypot(p.x - r.x, p.y - r.y) < 65) {
        r.hp -= (p.activeCat === 'musya' ? 1.5 : 1.0);
        r.shake = 1.0;
        if (global.MeowBloomAudio) global.MeowBloomAudio.playSfx('mine');
        global.MeowBloomEngine.spawnParticles(r.x, r.y - 15, 8, '#f59e0b');

        if (r.hp <= 0) {
          r.respawnTimer = 30;
          p.stats.rocksMined++;
          const stoneCount = 3 + (p.tools.pickaxe || 1);
          global.MeowBloomEngine.spawnLoot(r.x, r.y, 'stone', stoneCount);
          if (r.type === 'iron') global.MeowBloomEngine.spawnLoot(r.x, r.y, 'iron_ore', 2);
          if (r.type === 'amethyst') global.MeowBloomEngine.spawnLoot(r.x, r.y, 'amethyst', 1);
          if (r.type === 'star') global.MeowBloomEngine.spawnLoot(r.x, r.y, 'stardust', 1);
          global.MeowBloomEngine.addXp(20);
        }
        return;
      }
    }

    // 3. Gather Pollen on flower fields (Bee Swarm mechanic)
    global.MeowBloomEngine.gatherPollenTool();
    global.MeowBloomEngine.advanceTutorialStep(3);
    updateHUD();
  }

  // ==========================================
  // HUD BINDINGS & UPDATE
  // ==========================================
  function updateHUD() {
    const state = global.MeowBloomEngine.getState();
    if (!state) return;
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

    const neededXp = Math.floor(55 * Math.pow(1.30, p.level - 1));
    const xpPct = Math.min(100, Math.floor((p.xp / neededXp) * 100));
    if (xpFill) xpFill.style.width = xpPct + '%';

    // Coins & Backpack
    const coinsLbl = document.getElementById('hudCoins');
    if (coinsLbl) coinsLbl.textContent = p.coins;

    const bpCount = document.getElementById('hudBackpackCount');
    const bpCap = document.getElementById('hudBackpackCap');
    if (bpCount) bpCount.textContent = global.MeowBloomEngine.getInventoryCount ? global.MeowBloomEngine.getInventoryCount() : 0;
    if (bpCap) bpCap.textContent = global.MeowBloomEngine.getBackpackCapacity ? global.MeowBloomEngine.getBackpackCapacity() : 35;

    // Combo Pill
    const comboPill = document.getElementById('hudComboPill');
    const comboCount = document.getElementById('hudComboCount');
    const comboMultiplier = document.getElementById('hudComboMultiplier');
    if (comboPill && comboCount) {
      if (state.combo.count > 0) {
        comboPill.style.display = 'flex';
        comboCount.textContent = state.combo.count;
        let multText = 'x1.25';
        if (state.combo.tier === 2) multText = 'x1.5';
        else if (state.combo.tier === 3) multText = 'x2.0 🔥';
        else if (state.combo.tier === 4) multText = 'x3.0 ⚡';
        if (comboMultiplier) comboMultiplier.textContent = multText;
      } else {
        comboPill.style.display = 'none';
      }
    }

    // Time & Weather Indicator
    const timeWeatherPill = document.getElementById('hudTimeWeatherPill');
    if (timeWeatherPill) {
      let timeStr = '☀️ День';
      if (state.timeOfDay > 0.65 && state.timeOfDay < 0.95) timeStr = '🌙 Ночь';
      else if (state.timeOfDay >= 0.5) timeStr = '🌇 Закат';
      else if (state.timeOfDay <= 0.15) timeStr = '🌅 Утро';

      let weatherIcon = '☀️';
      if (state.weather === 'rain') weatherIcon = '🌧️ Дождь';
      else if (state.weather === 'fog') weatherIcon = '🌫️ Туман';
      else if (state.weather === 'starfall') weatherIcon = '⭐ Звездопад!';

      timeWeatherPill.textContent = `${timeStr} • ${weatherIcon}`;
    }

    // Water In Can
    const waterCanLbl = document.getElementById('hudWaterCan');
    if (waterCanLbl) waterCanLbl.textContent = `${p.waterInCan}/${p.maxWaterInCan}`;

    // Mini Quest Tracker & 12-Step Interactive Tutorial Guidance
    const miniTitle = document.getElementById('miniQuestTitle');
    const miniDesc = document.getElementById('miniQuestDesc');
    const miniReward = document.getElementById('miniQuestReward');

    if (!state.story.tutorialComplete) {
      const step = state.story.tutorialStep || 1;
      const tutSteps = [
        { title: 'Обучение [1/12]: Передвижение котиков', desc: 'Управляйте котиком с помощью WASD или стрелочек', reward: 'Золотая стрелка указывает путь' },
        { title: 'Обучение [2/12]: Первосемя Сада', desc: 'Подойдите к волшебному Первосемени в центре и нажмите [E]', reward: 'Связь с Великим Садом' },
        { title: 'Обучение [3/12]: Сбор пыльцы', desc: 'Подойдите к цветам на поляне и нажмите [Пробел] со сачком', reward: 'Цветочная пыльца в рюкзак' },
        { title: 'Обучение [4/12]: Инвентарь котика', desc: 'Проверьте верхнюю панель: монеты, лейка и вместимость рюкзака', reward: 'Контроль ресурсов' },
        { title: 'Обучение [5/12]: Лавка торговца', desc: 'Подойдите к палатке Феликса [E] или нажмите кнопку «Лавка»', reward: 'Доступ к рынку' },
        { title: 'Обучение [6/12]: Покупка семян', desc: 'Во вкладке «Покупка семян» купите семена кошачьей мяты', reward: 'Семена мяты для посадки' },
        { title: 'Обучение [7/12]: Посадка растений', desc: 'Зайдите в огороженный садик, подойдите к грядке и нажмите [E]', reward: 'Посадка растения' },
        { title: 'Обучение [8/12]: Полив грядки', desc: 'Полейте грядку [E]. Пополнить лейку можно в Колодце слева', reward: 'Ускорение роста x2' },
        { title: 'Обучение [9/12]: Сбор урожая', desc: 'Дождитесь созревания цветка и соберите его [E]', reward: 'Свежий урожай' },
        { title: 'Обучение [10/12]: Продажа урожая', desc: 'Откройте лавку Феликса и продайте урожай во вкладке «Продажа»', reward: 'Золотые монеты 🪙' },
        { title: 'Обучение [11/12]: Доска заказов', desc: 'Откройте «Заказы» на панели и выполните поручение жителей', reward: 'Опыт XP и монеты' },
        { title: 'Обучение [12/12]: Исследование биомов', desc: 'Пройдите по мощёной дороге на восток в Шепчущий Лес', reward: 'Открытие новых территорий' }
      ];
      const curTut = tutSteps[Math.min(step - 1, tutSteps.length - 1)];
      if (miniTitle) miniTitle.textContent = curTut.title;
      if (miniDesc) miniDesc.textContent = curTut.desc;
      if (miniReward) miniReward.textContent = `🎯 Задача: ${curTut.reward}`;
    } else {
      const chIdx = state.story.currentChapter;
      const chData = global.MeowBloomData.STORY_CHAPTERS[chIdx - 1];
      if (chData && miniTitle) {
        miniTitle.textContent = `Глава ${chIdx}: ${chData.title}`;
        const prog = state.story.chapterProgress['ch' + chIdx];
        const activeTask = chData.tasks.find((t, i) => (prog && prog['task' + i] < t.target)) || chData.tasks[0];
        const taskIdx = chData.tasks.indexOf(activeTask);
        const curVal = prog ? (prog['task' + taskIdx] || 0) : 0;
        if (miniDesc) miniDesc.textContent = `${activeTask.text} (${curVal}/${activeTask.target})`;
        if (miniReward) miniReward.textContent = chData.rewardDesc;
      }
    }
  }

  // ==========================================
  // MODAL WINDOWS & TRIGGERS
  // ==========================================
  function initModalTriggers() {
    // Open Buttons
    bindClick('hudSwapBtn', swapCat);
    bindClick('openShopBtn', () => openModal('shopModal'));
    bindClick('openWorkshopBtn', () => openModal('workshopModal'));
    bindClick('openHelpersBtn', () => openModal('helpersModal'));
    bindClick('openSkillTreeBtn', () => openModal('skillsModal'));
    bindClick('openOrderBoardBtn', () => openModal('ordersModal'));
    bindClick('openCollectionBtn', () => openModal('encyclopediaModal'));
    bindClick('openQuestsBtn', () => openModal('questsModal'));
    bindClick('openSettingsBtn', () => openModal('settingsModal'));

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(b => {
      b.addEventListener('click', () => {
        const mid = b.getAttribute('data-close-modal');
        closeModal(mid);
      });
    });

    // Close on backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    });

    // Audio Mute Button
    const muteBtn = document.getElementById('btnToggleMute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (global.MeowBloomAudio) {
          const muted = global.MeowBloomAudio.toggleMute();
          muteBtn.textContent = muted ? '🔇 Звук выключен' : '🔊 Звук включен';
        }
      });
    }

    // Shop Tab Switching
    document.querySelectorAll('[data-shop-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const targetTab = tabBtn.getAttribute('data-shop-tab');
        document.querySelectorAll('[data-shop-tab]').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const sellTab = document.getElementById('shopTabSell');
        const seedsTab = document.getElementById('shopTabSeeds');
        if (targetTab === 'sell') {
          if (sellTab) sellTab.style.display = 'block';
          if (seedsTab) seedsTab.style.display = 'none';
        } else if (targetTab === 'seeds') {
          if (sellTab) sellTab.style.display = 'none';
          if (seedsTab) seedsTab.style.display = 'block';
        }
      });
    });
  }

  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';

    if (modalId === 'shopModal') {
      renderShopModal();
      global.MeowBloomEngine.advanceTutorialStep(5);
    } else if (modalId === 'workshopModal') {
      renderWorkshopModal();
    } else if (modalId === 'helpersModal') {
      renderHelpersModal();
    } else if (modalId === 'skillsModal') {
      renderSkillsModal();
    } else if (modalId === 'ordersModal') {
      renderOrdersModal();
      global.MeowBloomEngine.advanceTutorialStep(11);
    } else if (modalId === 'encyclopediaModal') {
      renderEncyclopediaModal();
    } else if (modalId === 'questsModal') {
      renderQuestsModal();
      global.MeowBloomEngine.advanceTutorialStep(2);
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  // ==========================================
  // MODAL RENDERERS
  // ==========================================
  function renderShopModal() {
    const p = global.MeowBloomEngine.getState().player;
    const sellGrid = document.getElementById('sellItemsGrid');
    const seedsGrid = document.getElementById('seedsItemsGrid');

    if (sellGrid) {
      sellGrid.innerHTML = '';
      const invKeys = Object.keys(p.inventory).filter(k => (p.inventory[k] || 0) > 0);
      if (invKeys.length === 0) {
        sellGrid.innerHTML = `
          <div class="shop-empty-hint" style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; color: #94a3b8;">
            <div style="font-size: 28px; margin-bottom: 8px;">🧺</div>
            <div style="margin-bottom: 12px;">Рюкзак пуст. Вырастите и соберите урожай на грядках!</div>
            <button type="button" class="btn btn-secondary btn-sm" id="btnSwitchToSeedsTab">🌱 Перейти к покупке семян</button>
          </div>
        `;
        const btnGo = sellGrid.querySelector('#btnSwitchToSeedsTab');
        if (btnGo) {
          btnGo.addEventListener('click', () => {
            const seedsTabBtn = document.querySelector('[data-shop-tab="seeds"]');
            if (seedsTabBtn) seedsTabBtn.click();
          });
        }
      } else {
        invKeys.forEach(k => {
          const count = p.inventory[k];
          const def = global.MeowBloomEngine.getItemDef(k);
          const card = document.createElement('div');
          card.className = 'shop-card';
          card.innerHTML = `
            <div class="shop-card-icon">${def.icon}</div>
            <div class="shop-card-name">${def.name} <span class="shop-count">x${count}</span></div>
            <div class="shop-card-price">🪙 ${def.price}</div>
            <button class="btn btn-primary btn-sm btn-sell">Продать 1 (+${def.price}🪙)</button>
          `;
          card.querySelector('.btn-sell').addEventListener('click', () => {
            p.inventory[k]--;
            p.coins += def.price;
            global.MeowBloomEngine.advanceTutorialStep(10);
            renderShopModal();
            updateHUD();
            global.MeowBloomEngine.saveGame();
          });
          sellGrid.appendChild(card);
        });
      }
    }

    if (seedsGrid) {
      seedsGrid.innerHTML = '';

      // Emergency Free Seeds Rescue Banner (Felix Care)
      if (global.MeowBloomEngine.canClaimEmergencySeeds && global.MeowBloomEngine.canClaimEmergencySeeds()) {
        const rescueCard = document.createElement('div');
        rescueCard.style.cssText = 'grid-column: 1 / -1; background: rgba(234, 179, 8, 0.14); border: 2px dashed #eab308; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 8px;';
        rescueCard.innerHTML = `
          <div style="font-weight: bold; color: #fef08a; font-size: 14px; margin-bottom: 4px;">🎁 Забота торговца Феликса</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 10px;">У вас закончились и монеты, и семена! Феликс бесплатно выручает: возьмите 3 семени кошачьей мяты.</div>
          <button type="button" class="btn btn-primary btn-sm" id="btnClaimFreeEmergencySeeds">🎁 Забрать 3 бесплатных семени</button>
        `;
        rescueCard.querySelector('#btnClaimFreeEmergencySeeds').addEventListener('click', () => {
          if (global.MeowBloomEngine.claimEmergencySeeds()) {
            renderShopModal();
            updateHUD();
          }
        });
        seedsGrid.appendChild(rescueCard);
      }

      // Pollen Exchange Banner
      const exchangeCard = document.createElement('div');
      exchangeCard.style.cssText = 'grid-column: 1 / -1; background: rgba(56, 189, 248, 0.10); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 8px;';
      const sunnyPollen = p.inventory['sunny_pollen'] || 0;
      exchangeCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #7dd3fc; font-size: 13px;">🌼 Обмен пыльцы на ресурсы:</strong>
          <span style="font-size: 12px; color: #94a3b8;">У вас пыльцы: <strong>${sunnyPollen}</strong></span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm" id="btnExchCoins">15 пыльцы ➔ +10🪙</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btnExchSeeds">12 пыльцы ➔ 2🌱 семени</button>
        </div>
      `;
      exchangeCard.querySelector('#btnExchCoins').addEventListener('click', () => {
        if (global.MeowBloomEngine.exchangePollenForCoins('sunny_pollen', 15, 10)) {
          renderShopModal();
          updateHUD();
        }
      });
      exchangeCard.querySelector('#btnExchSeeds').addEventListener('click', () => {
        if (global.MeowBloomEngine.exchangePollenForSeeds('sunny_pollen', 12, 'catnip', 2)) {
          renderShopModal();
          updateHUD();
        }
      });
      seedsGrid.appendChild(exchangeCard);

      // Crop Seeds Catalog
      Object.keys(global.MeowBloomData.CROPS).forEach(ck => {
        const cdef = global.MeowBloomData.CROPS[ck];
        if (cdef.seedPrice > 0) {
          const card = document.createElement('div');
          card.className = 'shop-card';
          card.innerHTML = `
            <div class="shop-card-icon">${cdef.icon}</div>
            <div class="shop-card-name">${cdef.name}</div>
            <div class="shop-card-meta">Рост: ${cdef.growTime}с • У вас: ${p.seeds[ck] || 0}</div>
            <div class="shop-card-price">🪙 ${cdef.seedPrice}</div>
            <button class="btn btn-secondary btn-sm btn-buy">Купить</button>
          `;
          card.querySelector('.btn-buy').addEventListener('click', () => {
            if (p.coins < cdef.seedPrice) {
              global.MeowBloomEngine.showToast('⚠️ Недостаточно монет!');
              return;
            }
            p.coins -= cdef.seedPrice;
            p.seeds[ck] = (p.seeds[ck] || 0) + 1;
            global.MeowBloomEngine.advanceTutorialStep(6);
            renderShopModal();
            updateHUD();
            global.MeowBloomEngine.saveGame();
          });
          seedsGrid.appendChild(card);
        }
      });
    }
  }

  function renderWorkshopModal() {
    const p = global.MeowBloomEngine.getState().player;
    const cookingList = document.getElementById('cookingList');
    if (cookingList) {
      cookingList.innerHTML = '';
      global.MeowBloomData.COOKING_RECIPES.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'upgrade-item-card';
        const reqStr = Object.keys(rec.req).map(k => `${global.MeowBloomEngine.getItemDef(k).name}: ${p.inventory[k] || 0}/${rec.req[k]}`).join(', ');
        card.innerHTML = `
          <div class="upgrade-info">
            <strong>${rec.icon} ${rec.name}</strong>
            <div class="upgrade-sub">Ингредиенты: ${reqStr}</div>
            <p class="upgrade-desc">Эффект: ${rec.buff.text}</p>
          </div>
          <button class="btn btn-primary btn-sm btn-cook">Приготовить 🍲</button>
        `;
        card.querySelector('.btn-cook').addEventListener('click', () => {
          const hasAll = Object.keys(rec.req).every(k => (p.inventory[k] || 0) >= rec.req[k]);
          if (!hasAll) {
            global.MeowBloomEngine.showToast('⚠️ Не хватает ингредиентов!');
            return;
          }
          Object.keys(rec.req).forEach(k => { p.inventory[k] -= rec.req[k]; });
          p.activeBuffs[rec.buff.type] = { val: rec.buff.val, expireAt: Date.now() + rec.buff.duration * 1000 };
          global.MeowBloomEngine.showToast(`✨ Блюдо готово: ${rec.name}! ${rec.buff.text}`);
          renderWorkshopModal();
          updateHUD();
          global.MeowBloomEngine.saveGame();
        });
        cookingList.appendChild(card);
      });
    }
  }

  function renderHelpersModal() {
    const p = global.MeowBloomEngine.getState().player;
    const grid = document.getElementById('helpersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(global.MeowBloomData.HELPERS).forEach(hk => {
      const hdef = global.MeowBloomData.HELPERS[hk];
      const isUnlocked = !!(p.helpers && p.helpers[hk] && p.helpers[hk].unlocked);
      const isEquipped = p.activeHelper === hk;

      const card = document.createElement('div');
      card.className = `coll-card ${isUnlocked ? 'found' : 'locked'}`;
      card.innerHTML = `
        <div class="coll-icon">${hdef.icon}</div>
        <div class="coll-title">${hdef.name}</div>
        <div class="coll-rarity" style="color: ${hdef.rarity.color}">${hdef.rarity.symbol} ${hdef.rarity.name}</div>
        <p class="coll-desc">${hdef.ability}</p>
        ${isUnlocked ? `<button class="btn ${isEquipped ? 'btn-secondary' : 'btn-primary'} btn-sm btn-equip">${isEquipped ? 'Экипирован ✓' : 'Выбрать'}</button>` : '<span class="trophy-locked-label">Заперт</span>'}
      `;
      if (isUnlocked && !isEquipped) {
        card.querySelector('.btn-equip').addEventListener('click', () => {
          p.activeHelper = hk;
          global.MeowBloomEngine.showToast(`🐾 Активный спутник: ${hdef.name}!`);
          renderHelpersModal();
          updateHUD();
          global.MeowBloomEngine.saveGame();
        });
      }
      grid.appendChild(card);
    });
  }

  function renderSkillsModal() {
    const p = global.MeowBloomEngine.getState().player;
    const list = document.getElementById('skillTreeList');
    const spCount = document.getElementById('skillPointsCount');
    if (spCount) spCount.textContent = p.skillPoints || 0;
    if (!list) return;

    list.innerHTML = '';
    const branches = [
      { id: 'gardening', name: '🌾 Ветка Садоводства' },
      { id: 'gathering', name: '⚡ Ветка Сбора Пыльцы' },
      { id: 'exploration', name: '🐾 Ветка Исследования' }
    ];

    branches.forEach(b => {
      const bTitle = document.createElement('h4');
      bTitle.className = 'quests-col-title';
      bTitle.textContent = b.name;
      list.appendChild(bTitle);

      const skills = global.MeowBloomData.SKILL_TREE[b.id] || [];
      skills.forEach(sk => {
        const curLvl = p.skills[sk.id] || 0;
        const card = document.createElement('div');
        card.className = 'upgrade-item-card';
        card.innerHTML = `
          <div class="upgrade-info">
            <strong>${sk.icon} ${sk.name} (${curLvl}/${sk.max})</strong>
            <p class="upgrade-desc">${sk.desc}</p>
          </div>
          ${curLvl < sk.max ? `<button class="btn btn-primary btn-sm btn-learn-skill">Изучить (1 Очко)</button>` : '<span class="badge badge-max">МАКС</span>'}
        `;
        if (curLvl < sk.max) {
          card.querySelector('.btn-learn-skill').addEventListener('click', () => {
            if ((p.skillPoints || 0) <= 0) {
              global.MeowBloomEngine.showToast('⚠️ Недостаточно очков навыков! Повышайте уровень.');
              return;
            }
            p.skillPoints--;
            p.skills[sk.id] = curLvl + 1;
            global.MeowBloomEngine.showToast(`✨ Навык "${sk.name}" изучен до уровня ${curLvl + 1}!`);
            renderSkillsModal();
            updateHUD();
            global.MeowBloomEngine.saveGame();
          });
        }
        list.appendChild(card);
      });
    });
  }

  function renderOrdersModal() {
    const state = global.MeowBloomEngine.getState();
    const p = state.player;
    const list = document.getElementById('ordersList');
    if (!list) return;
    list.innerHTML = '';

    state.orders.forEach(ord => {
      const card = document.createElement('div');
      card.className = `quest-card ${ord.completed ? 'completed' : ''}`;
      const reqStr = Object.keys(ord.req).map(k => `${global.MeowBloomEngine.getItemDef(k).name}: ${p.inventory[k] || 0}/${ord.req[k]}`).join(', ');
      card.innerHTML = `
        <div class="quest-card-header">
          <strong>${ord.title}</strong>
          <span class="quest-status">${ord.completed ? 'Выполнен ✓' : 'В процессе'}</span>
        </div>
        <p class="quest-card-desc">Требуется: ${reqStr}</p>
        <div class="quest-card-reward">Награда: 🪙 ${ord.rewardCoins} • ${ord.rewardXp} XP</div>
        ${!ord.completed ? `<button class="btn btn-primary btn-sm btn-complete-order">Сдать заказ</button>` : ''}
      `;
      if (!ord.completed) {
        card.querySelector('.btn-complete-order').addEventListener('click', () => {
          const hasAll = Object.keys(ord.req).every(k => (p.inventory[k] || 0) >= ord.req[k]);
          if (!hasAll) {
            global.MeowBloomEngine.showToast('⚠️ У вас недостаточно ресурсов для этого заказа!');
            return;
          }
          Object.keys(ord.req).forEach(k => { p.inventory[k] -= ord.req[k]; });
          ord.completed = true;
          p.coins += ord.rewardCoins;
          global.MeowBloomEngine.addXp(ord.rewardXp);
          p.stats.ordersCompleted++;
          global.MeowBloomEngine.showToast(`🎉 Заказ выполнен! Получено: +${ord.rewardCoins}🪙, +${ord.rewardXp}XP!`);
          renderOrdersModal();
          updateHUD();
          global.MeowBloomEngine.saveGame();
        });
      }
      list.appendChild(card);
    });
  }

  function renderEncyclopediaModal() {
    const grid = document.getElementById('encyclopediaGrid');
    const state = global.MeowBloomEngine.getState();
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(global.MeowBloomData.CROPS).forEach(ck => {
      const cdef = global.MeowBloomData.CROPS[ck];
      const isFound = !!(state.discoveredEncyclopedia && state.discoveredEncyclopedia[ck]);
      const card = document.createElement('div');
      card.className = `coll-card ${isFound ? 'found' : 'locked'}`;
      card.innerHTML = `
        <div class="coll-icon">${isFound ? cdef.icon : '❓'}</div>
        <div class="coll-title">${isFound ? cdef.name : '??? Неизвестно'}</div>
        <div class="coll-rarity" style="color: ${cdef.rarity.color}">${cdef.rarity.symbol} ${cdef.rarity.name}</div>
        <p class="coll-desc">${isFound ? cdef.desc : 'Вырастите или найдите это растение в Великом саду.'}</p>
      `;
      grid.appendChild(card);
    });
  }

  function renderQuestsModal() {
    const state = global.MeowBloomEngine.getState();
    const chList = document.getElementById('chaptersList');
    if (!chList) return;
    chList.innerHTML = '';

    global.MeowBloomData.STORY_CHAPTERS.forEach(ch => {
      const isCurrent = state.story.currentChapter === ch.chapter;
      const isDone = state.story.currentChapter > ch.chapter;
      const prog = state.story.chapterProgress['ch' + ch.chapter] || {};

      const card = document.createElement('div');
      card.className = `quest-card ${isDone ? 'completed' : ''}`;
      
      let tasksHtml = ch.tasks.map((t, idx) => {
        const cur = prog['task' + idx] || 0;
        const finished = cur >= t.target;
        return `<div>${finished ? '✅' : '⚪'} ${t.text} (${cur}/${t.target})</div>`;
      }).join('');

      card.innerHTML = `
        <div class="quest-card-header">
          <strong>Глава ${ch.chapter}: ${ch.title}</strong>
          <span class="quest-status">${isDone ? 'Завершена ✓' : (isCurrent ? 'Активна' : 'Закрыта')}</span>
        </div>
        <p class="quest-card-desc">${ch.desc}</p>
        <div class="chapter-tasks-box">${tasksHtml}</div>
        <div class="quest-card-reward">Награда: ${ch.rewardDesc}</div>
      `;
      chList.appendChild(card);
    });
  }

  // ==========================================
  // FLOATING SEED SELECTION POPUP
  // ==========================================
  function openSeedSelector(plot) {
    activePlotForSeedSelect = plot;
    const popup = document.getElementById('seedSelectorPopup');
    const list = document.getElementById('seedOptionsList');
    const p = global.MeowBloomEngine.getState().player;
    if (!popup || !list) return;

    list.innerHTML = '';
    let hasAny = false;

    Object.keys(p.seeds).forEach(sk => {
      const count = p.seeds[sk] || 0;
      if (count > 0) {
        hasAny = true;
        const cdef = global.MeowBloomData.CROPS[sk] || { name: sk, icon: '🌱' };
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seed-option-btn';
        btn.innerHTML = `<span>${cdef.icon} ${cdef.name}</span><strong>x${count}</strong>`;
        btn.addEventListener('click', () => {
          global.MeowBloomEngine.plantCrop(plot, sk);
          global.MeowBloomEngine.advanceTutorialStep(7);
          popup.style.display = 'none';
          updateHUD();
        });
        list.appendChild(btn);
      }
    });

    if (!hasAny) {
      list.innerHTML = '<div class="no-seeds-hint">У вас нет семян! Купите семена у торговца Феликса 🏪</div>';
    }

    popup.style.display = 'block';
  }

  // ==========================================
  // TUTORIAL DIALOGUE OVERLAY
  // ==========================================
  function triggerTutorialDialogue(forcedStep = null) {
    const state = global.MeowBloomEngine.getState();
    const step = (forcedStep !== null) ? forcedStep : state.story.tutorialStep;
    const diag = TUTORIAL_DIALOGUES.find(d => d.step === step);
    if (!diag) return;

    const modal = document.getElementById('tutorialModal');
    if (!modal) return;

    document.getElementById('tutSpeakerName').textContent = diag.speaker;
    document.getElementById('tutSpeakerAvatar').src = diag.avatar;
    document.getElementById('tutTitle').textContent = diag.title;
    document.getElementById('tutBodyText').textContent = diag.text;

    modal.style.display = 'flex';
  }

  // Export UI API
  global.MeowBloomUI = {
    init: initUI,
    updateHUD: updateHUD,
    triggerTutorialDialogue: triggerTutorialDialogue,
    getKeys: () => keys,
    getTouch: () => touchJoystick
  };

})(window);
