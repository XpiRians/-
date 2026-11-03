/**
 * MUSYA & KETI: INFINITE GALLERY - Farm UI Controller (farm_ui.js)
 * Manages reactive UI rendering for crops, characters, buildings, upgrades, quests, and trophies.
 */

(function () {
  'use strict';

  const Farm = window.MusyaKetiFarm;
  if (!Farm) {
    console.error('Farm engine not found.');
    return;
  }

  const game = Farm.game;

  // DOM Elements
  const farmLvlBadge = document.getElementById('farmLvlBadge');
  const farmRankTitle = document.getElementById('farmRankTitle');
  const farmXpText = document.getElementById('farmXpText');
  const farmXpBar = document.getElementById('farmXpBar');
  const storageCapText = document.getElementById('storageCapText');

  const resCoins = document.getElementById('resCoins');
  const resCatnip = document.getElementById('resCatnip');
  const resWood = document.getElementById('resWood');
  const resStone = document.getElementById('resStone');
  const resFish = document.getElementById('resFish');
  const resFood = document.getElementById('resFood');
  const resStardust = document.getElementById('resStardust');

  const cropSelectorBar = document.getElementById('cropSelectorBar');
  const plotsGrid = document.getElementById('plotsGrid');
  const buildingsGrid = document.getElementById('buildingsGrid');
  const upgradesGrid = document.getElementById('upgradesGrid');
  const territoriesGrid = document.getElementById('territoriesGrid');
  const questsList = document.getElementById('questsList');

  // Cat Elements
  const musyaLevelText = document.getElementById('musyaLevelText');
  const musyaXpBar = document.getElementById('musyaXpBar');
  const btnFeedMusya = document.getElementById('btnFeedMusya');
  const btnExpeditionMusya = document.getElementById('btnExpeditionMusya');
  const musyaExpeditionStatus = document.getElementById('musyaExpeditionStatus');
  const musyaExpeditionBar = document.getElementById('musyaExpeditionBar');

  const ketiLevelText = document.getElementById('ketiLevelText');
  const ketiXpBar = document.getElementById('ketiXpBar');
  const btnFeedKeti = document.getElementById('btnFeedKeti');

  // Actions
  const btnPlantAll = document.getElementById('btnPlantAll');
  const btnHarvestAll = document.getElementById('btnHarvestAll');
  const btnTradeCatnip = document.getElementById('btnTradeCatnip');

  // Modals
  const offlineModal = document.getElementById('offlineModal');
  const offlineMinutes = document.getElementById('offlineMinutes');
  const offlineGainsList = document.getElementById('offlineGainsList');
  const offlineClaimBtn = document.getElementById('offlineClaimBtn');

  const expeditionModal = document.getElementById('expeditionModal');
  const expeditionResultsBox = document.getElementById('expeditionResultsBox');
  const expeditionOpenGalleryBtn = document.getElementById('expeditionOpenGalleryBtn');
  const expeditionCloseBtn = document.getElementById('expeditionCloseBtn');

  // Tabs
  const tabButtons = document.querySelectorAll('.farm-tab-btn');
  const tabContents = document.querySelectorAll('.farm-tab-content');

  // Rank Names
  const RANKS = [
    'Уютный садик',
    'Маленькая ферма',
    'Ухоженный огород',
    'Большое кошачье поместье',
    'Цветущая усадьба',
    'Процветающее владение',
    'Королевство Муси и Кейти',
    'Великая цитадель гармонии',
    'Космический оазис Вавилона',
    'Бесконечная ферма звезд'
  ];

  // Subtle Notification Pill (Never intrusive, disappears in 1.8s)
  let activeNotice = null;
  function showFarmNotice(text, type = 'info') {
    if (activeNotice) activeNotice.remove();

    const pill = document.createElement('div');
    pill.className = `farm-notice-pill farm-notice-${type}`;
    pill.textContent = text;
    document.body.appendChild(pill);
    activeNotice = pill;

    setTimeout(() => {
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(8px)';
      pill.style.transition = 'all 0.2s ease';
      setTimeout(() => {
        if (pill.parentElement) pill.remove();
        if (activeNotice === pill) activeNotice = null;
      }, 200);
    }, 1800);
  }

  // Tab Switcher
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(`tab-${tabId}`);
      if (target) target.classList.add('active');
    });
  });

  // Render Top Counters
  function renderDashboard(state) {
    if (farmLvlBadge) farmLvlBadge.textContent = `Lv ${state.farmLevel}`;

    const rankIdx = Math.min(RANKS.length - 1, Math.floor((state.farmLevel - 1) / 2));
    if (farmRankTitle) farmRankTitle.textContent = RANKS[rankIdx];

    const neededXp = state.farmLevel * 80;
    if (farmXpText) farmXpText.textContent = `${Math.floor(state.farmXp)} / ${neededXp} XP`;
    if (farmXpBar) farmXpBar.style.width = `${Math.min(100, (state.farmXp / neededXp) * 100)}%`;

    const maxCap = game.getMaxStorage();
    if (storageCapText) storageCapText.textContent = maxCap.toLocaleString();

    if (resCoins) resCoins.textContent = Math.floor(state.coins).toLocaleString();
    if (resCatnip) resCatnip.textContent = `${Math.floor(state.catnip)} / ${maxCap}`;
    if (resWood) resWood.textContent = `${Math.floor(state.wood)} / ${maxCap}`;
    if (resStone) resStone.textContent = `${Math.floor(state.stone)} / ${maxCap}`;
    if (resFish) resFish.textContent = `${Math.floor(state.fish)} / ${maxCap}`;
    if (resFood) resFood.textContent = `${Math.floor(state.catfood)} / ${maxCap}`;
    if (resStardust) resStardust.textContent = (state.stardust || 0).toFixed(1);

    // Cats UI
    if (musyaLevelText) musyaLevelText.textContent = `Уровень ${state.cats.musya.level}`;
    const musyaNeeded = state.cats.musya.level * 40;
    if (musyaXpBar) musyaXpBar.style.width = `${Math.min(100, (state.cats.musya.xp / musyaNeeded) * 100)}%`;

    if (ketiLevelText) ketiLevelText.textContent = `Уровень ${state.cats.keti.level}`;
    const ketiNeeded = state.cats.keti.level * 40;
    if (ketiXpBar) ketiXpBar.style.width = `${Math.min(100, (state.cats.keti.xp / ketiNeeded) * 100)}%`;

    // Expedition Status
    if (musyaExpeditionStatus) {
      if (state.cats.musya.expeditionActive) {
        musyaExpeditionStatus.style.display = 'block';
        if (btnExpeditionMusya) btnExpeditionMusya.disabled = true;

        const leftMs = Math.max(0, state.cats.musya.expeditionEnds - Date.now());
        const totalMs = 30 * 1000;
        const progress = Math.min(100, ((totalMs - leftMs) / totalMs) * 100);
        if (musyaExpeditionBar) musyaExpeditionBar.style.width = `${progress}%`;
      } else {
        musyaExpeditionStatus.style.display = 'none';
        if (btnExpeditionMusya) btnExpeditionMusya.disabled = false;
      }
    }
  }

  // Render Crop Selector
  function renderCropSelector(state) {
    if (!cropSelectorBar) return;
    cropSelectorBar.innerHTML = '';

    Object.values(Farm.CROPS).forEach(crop => {
      const isUnlocked = state.farmLevel >= crop.minFarmLevel;
      const isSelected = game.selectedCropId === crop.id;

      const btn = document.createElement('button');
      btn.className = `crop-select-pill ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
      btn.type = 'button';

      if (isUnlocked) {
        btn.innerHTML = `<span class="crop-ico">${crop.icon}</span> <span>${crop.name}</span> <small>(${crop.cost} 🪙 | ${crop.growTime}s)</small>`;
        btn.addEventListener('click', () => {
          game.selectedCropId = crop.id;
          renderCropSelector(game.state);
        });
      } else {
        btn.innerHTML = `<span class="crop-ico">🔒</span> <span>${crop.name}</span> <small>(Lv ${crop.minFarmLevel})</small>`;
      }

      cropSelectorBar.appendChild(btn);
    });
  }

  // Render Plots Grid
  function renderPlots(state) {
    if (!plotsGrid) return;
    plotsGrid.innerHTML = '';

    const now = Date.now();
    const ketiLvl = state.cats.keti.level || 1;
    const ketiGrowthMultiplier = 1 + (ketiLvl - 1) * 0.10 + (state.upgrades.auto_water || 0) * 0.20;

    state.plots.forEach(plot => {
      const card = document.createElement('div');
      card.className = `plot-card ${plot.crop ? 'has-crop' : 'empty'} ${plot.ready ? 'is-ready' : ''}`;

      if (!plot.crop) {
        card.innerHTML = `
          <div class="plot-empty-icon">🌱</div>
          <div class="plot-state-text">Свободная земля</div>
          <button class="btn btn-secondary btn-sm" type="button">Посадить</button>
        `;
        card.addEventListener('click', () => {
          game.plantCrop(plot.id);
        });
      } else {
        const spec = Farm.CROPS[plot.crop];
        const growMs = (spec.growTime * 1000) / ketiGrowthMultiplier;
        const elapsed = now - plot.plantedAt;
        const progress = plot.ready ? 100 : Math.min(100, (elapsed / growMs) * 100);

        card.innerHTML = `
          <div class="plot-crop-icon">${spec.icon}</div>
          <div class="plot-crop-name">${spec.name}</div>
          <div class="plot-progress-wrap">
            <div class="plot-progress-bar" style="width: ${progress}%;"></div>
          </div>
          <div class="plot-state-text">${plot.ready ? 'Готово к сбору! ✨' : `Созревает... (${Math.ceil(Math.max(0, growMs - elapsed) / 1000)}s)`}</div>
        `;

        if (plot.ready) {
          card.addEventListener('click', () => {
            game.harvestCrop(plot.id);
          });
        }
      }

      plotsGrid.appendChild(card);
    });
  }

  // Render Buildings Grid
  function renderBuildings(state) {
    if (!buildingsGrid) return;
    buildingsGrid.innerHTML = '';

    Object.values(Farm.BUILDINGS).forEach(b => {
      const lvl = state.buildings[b.id] || 0;
      const costScale = Math.pow(b.costScale, lvl);
      const coinCost = Math.floor((b.baseCost.coins || 0) * costScale);
      const woodCost = Math.floor((b.baseCost.wood || 0) * costScale);
      const stoneCost = Math.floor((b.baseCost.stone || 0) * costScale);
      const starCost = b.baseCost.stardust || 0;

      const card = document.createElement('div');
      card.className = `building-card ${lvl > 0 ? 'active' : ''}`;

      let costStr = `${coinCost.toLocaleString()} 🪙`;
      if (woodCost > 0) costStr += ` + ${woodCost} 🪵`;
      if (stoneCost > 0) costStr += ` + ${stoneCost} 🪨`;
      if (starCost > 0) costStr += ` + ${starCost} ⭐`;

      card.innerHTML = `
        <div class="b-header">
          <span class="b-icon">${b.icon}</span>
          <div>
            <h4 class="b-title">${b.name}</h4>
            <span class="b-level">Уровень: ${lvl}</span>
          </div>
        </div>
        <p class="b-desc">${b.desc}</p>
        <div class="b-footer">
          <div class="b-cost">${costStr}</div>
          <button class="btn btn-primary btn-sm btn-buy-b" type="button">${lvl === 0 ? 'Построить' : 'Улучшить'}</button>
        </div>
      `;

      card.querySelector('.btn-buy-b').addEventListener('click', (e) => {
        e.stopPropagation();
        game.buyBuilding(b.id);
      });

      buildingsGrid.appendChild(card);
    });
  }

  // Render Upgrades Grid
  function renderUpgrades(state) {
    if (!upgradesGrid) return;
    upgradesGrid.innerHTML = '';

    Farm.UPGRADES.forEach(u => {
      const lvl = state.upgrades[u.id] || 0;
      const isMax = lvl >= u.maxLevel;
      const costScale = Math.pow(u.costScale, lvl);
      const coinCost = Math.floor((u.baseCost.coins || 0) * costScale);
      const woodCost = Math.floor((u.baseCost.wood || 0) * costScale);
      const stoneCost = Math.floor((u.baseCost.stone || 0) * costScale);

      let costStr = isMax ? 'МАКС.' : `${coinCost.toLocaleString()} 🪙`;
      if (!isMax && woodCost > 0) costStr += ` + ${woodCost} 🪵`;
      if (!isMax && stoneCost > 0) costStr += ` + ${stoneCost} 🪨`;

      const card = document.createElement('div');
      card.className = `upgrade-card ${lvl > 0 ? 'active' : ''} ${isMax ? 'maxed' : ''}`;

      card.innerHTML = `
        <div class="up-header">
          <span class="up-icon">${u.icon}</span>
          <div>
            <h4 class="up-title">${u.name}</h4>
            <span class="up-lvl">Уровень: ${lvl} / ${u.maxLevel}</span>
          </div>
        </div>
        <p class="up-desc">${u.desc}</p>
        <div class="up-footer">
          <div class="up-cost">${costStr}</div>
          <button class="btn btn-secondary btn-sm btn-buy-up" type="button" ${isMax ? 'disabled' : ''}>${isMax ? 'Изучено' : 'Прокачать'}</button>
        </div>
      `;

      if (!isMax) {
        card.querySelector('.btn-buy-up').addEventListener('click', () => {
          game.buyUpgrade(u.id);
        });
      }

      upgradesGrid.appendChild(card);
    });
  }

  // Render Territories Grid
  function renderTerritories(state) {
    if (!territoriesGrid) return;
    territoriesGrid.innerHTML = '';

    Farm.TERRITORIES.forEach(t => {
      const isUnlocked = state.unlockedTerritories.includes(t.id);
      const meetsLevel = state.farmLevel >= t.reqLevel;

      let costStr = 'Бесплатно';
      if (t.cost.coins) costStr = `${t.cost.coins} 🪙`;
      if (t.cost.wood) costStr += ` + ${t.cost.wood} 🪵`;
      if (t.cost.stone) costStr += ` + ${t.cost.stone} 🪨`;
      if (t.cost.stardust) costStr += ` + ${t.cost.stardust} ⭐`;

      const card = document.createElement('div');
      card.className = `terr-card ${isUnlocked ? 'unlocked' : (meetsLevel ? 'available' : 'locked')}`;

      card.innerHTML = `
        <div class="terr-header">
          <span class="terr-icon">${t.icon}</span>
          <div>
            <h4 class="terr-title">${t.name}</h4>
            <span class="terr-req">Требуется Lv ${t.reqLevel}</span>
          </div>
        </div>
        <p class="terr-bonus">${t.bonusText}</p>
        <div class="terr-footer">
          <div class="terr-cost">${isUnlocked ? 'Открыто ✓' : costStr}</div>
          ${!isUnlocked ? `<button class="btn btn-primary btn-sm btn-unlock-t" ${!meetsLevel ? 'disabled' : ''}>Исследовать</button>` : ''}
        </div>
      `;

      if (!isUnlocked) {
        const btn = card.querySelector('.btn-unlock-t');
        if (btn && meetsLevel) {
          btn.addEventListener('click', () => {
            game.unlockTerritory(t.id);
          });
        }
      }

      territoriesGrid.appendChild(card);
    });
  }

  // Render Quests and Trophies List
  function renderQuests(state) {
    if (!questsList) return;
    questsList.innerHTML = '';

    Farm.QUESTS.forEach(q => {
      const isDone = state.completedQuests.includes(q.id);

      const card = document.createElement('div');
      card.className = `quest-card ${isDone ? 'completed' : ''}`;

      let rewardStr = '';
      if (q.reward.coins) rewardStr += `+${q.reward.coins} 🪙 `;
      if (q.reward.wood) rewardStr += `+${q.reward.wood} 🪵 `;
      if (q.reward.stardust) rewardStr += `+${q.reward.stardust} ⭐ `;
      if (q.reward.xp) rewardStr += `+${q.reward.xp} XP `;

      let trophyBadge = '';
      if (q.trophyKey && Farm.FARM_TROPHIES[q.trophyKey]) {
        const tr = Farm.FARM_TROPHIES[q.trophyKey];
        trophyBadge = `
          <div class="quest-trophy-tag">
            <span>🏆 ЭКСПОНАТ: ${tr.title_ru} (${tr.resolution}×${tr.resolution})</span>
            ${isDone ? `<a href="index.html?id=${encodeURIComponent(tr.id)}" class="btn btn-secondary btn-sm">ОСМОТРЕТЬ В ГАЛЕРЕЕ</a>` : '<small>(Разблокируется по завершении)</small>'}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="quest-main-info">
          <span class="quest-status-icon">${isDone ? '✓' : '○'}</span>
          <div style="flex: 1;">
            <h4 class="quest-title">${q.title}</h4>
            <p class="quest-desc">${q.desc}</p>
            ${trophyBadge}
          </div>
          <div class="quest-reward-box">
            <span class="reward-label">Награда:</span>
            <span class="reward-val">${rewardStr}</span>
          </div>
        </div>
      `;

      questsList.appendChild(card);
    });
  }

  // Full View Refresh
  function renderAll(state) {
    renderDashboard(state);
    renderCropSelector(state);
    renderPlots(state);
    renderBuildings(state);
    renderUpgrades(state);
    renderTerritories(state);
    renderQuests(state);
  }

  // Event Listeners for Quick Actions
  if (btnPlantAll) {
    btnPlantAll.addEventListener('click', () => {
      const count = game.plantAll();
      if (count > 0) showFarmNotice(`Засеяно ${count} грядок! 🌱`, 'success');
    });
  }

  if (btnHarvestAll) {
    btnHarvestAll.addEventListener('click', () => {
      const count = game.harvestAll();
      if (count > 0) showFarmNotice(`Собрано ${count} урожаев! 🌾`, 'success');
    });
  }

  if (btnTradeCatnip) {
    btnTradeCatnip.addEventListener('click', () => {
      game.tradeCatnip(25);
    });
  }

  // Feed Actions
  if (btnFeedMusya) btnFeedMusya.addEventListener('click', () => game.feedCat('musya'));
  if (btnFeedKeti) btnFeedKeti.addEventListener('click', () => game.feedCat('keti'));

  // Musya Expedition Action
  if (btnExpeditionMusya) {
    btnExpeditionMusya.addEventListener('click', () => {
      game.startExpedition();
    });
  }

  // Settings & Saves
  const btnExportSave = document.getElementById('btnExportSave');
  const importSaveFile = document.getElementById('importSaveFile');
  const btnResetSave = document.getElementById('btnResetSave');

  if (btnExportSave) {
    btnExportSave.addEventListener('click', () => {
      const jsonStr = game.exportSave();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musya_keti_farm_save_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showFarmNotice('Сохранение экспортировано в JSON! 💾', 'success');
    });
  }

  if (importSaveFile) {
    importSaveFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = game.importSave(event.target.result);
        if (success) {
          showFarmNotice('Прогресс успешно восстановлен из файла! 🎉', 'success');
        } else {
          showFarmNotice('Ошибка чтения файла сохранения.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  if (btnResetSave) {
    btnResetSave.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите сбросить весь прогресс фермы Муси и Кейти?')) {
        game.resetState();
        showFarmNotice('Прогресс фермы сброшен к начальному состоянию.', 'info');
      }
    });
  }

  // Handle Offline Gains Modal
  function checkOfflineModal() {
    if (game.offlineSummary && offlineModal) {
      const s = game.offlineSummary;
      if (s.minutes > 0 && (s.wood > 0 || s.stone > 0 || s.fish > 0 || s.coins > 0 || s.food > 0 || s.readyCrops > 0)) {
        if (offlineMinutes) offlineMinutes.textContent = s.minutes;
        if (offlineGainsList) {
          offlineGainsList.innerHTML = `
            ${s.coins > 0 ? `<div class="gain-item">🪙 +${s.coins.toLocaleString()} Монет</div>` : ''}
            ${s.wood > 0 ? `<div class="gain-item">🪵 +${s.wood.toLocaleString()} Древесины</div>` : ''}
            ${s.stone > 0 ? `<div class="gain-item">🪨 +${s.stone.toLocaleString()} Камня</div>` : ''}
            ${s.fish > 0 ? `<div class="gain-item">🐟 +${s.fish.toLocaleString()} Рыбки</div>` : ''}
            ${s.food > 0 ? `<div class="gain-item">🥫 +${s.food.toLocaleString()} Корма</div>` : ''}
            ${s.readyCrops > 0 ? `<div class="gain-item">🌱 Созрело грядок: ${s.readyCrops}</div>` : ''}
          `;
        }
        offlineModal.classList.add('active');
      }
    }
  }

  if (offlineClaimBtn) {
    offlineClaimBtn.addEventListener('click', () => {
      if (offlineModal) offlineModal.classList.remove('active');
      showFarmNotice('Ресурсы перемещены в амбар! 🌾', 'success');
    });
  }

  // Expedition Result Modal Handlers
  if (expeditionCloseBtn) {
    expeditionCloseBtn.addEventListener('click', () => {
      if (expeditionModal) expeditionModal.classList.remove('active');
    });
  }

  // Game Engine Notifications & Events
  game.subscribe((state, event, payload) => {
    if (event === 'tick') {
      renderDashboard(state);
      renderPlots(state);
    } else if (event === 'update') {
      renderAll(state);
    } else if (event === 'message') {
      showFarmNotice(payload.text, payload.type);
    } else if (event === 'quest_completed') {
      showFarmNotice(`🏆 ЗАДАНИЕ ВЫПОЛНЕНО: ${payload.quest.title}!`, 'success');
      renderAll(state);
    } else if (event === 'expedition_done') {
      if (expeditionModal && expeditionResultsBox) {
        expeditionResultsBox.innerHTML = `
          <div style="font-size: 1.1rem; font-weight: 700; color: #facc15; margin-bottom: 0.5rem;">+${payload.coins} 🪙, +${payload.stardust} ⭐</div>
          <div style="font-size: 0.8125rem; color: #a78bfa; margin-bottom: 0.5rem;">🐾 Муся обнаружила уникальные координаты:</div>
          <div style="background: rgba(0,0,0,0.5); padding: 0.5rem; font-family: monospace; font-size: 0.6875rem; word-break: break-all; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">${payload.id}</div>
        `;
        if (expeditionOpenGalleryBtn) {
          expeditionOpenGalleryBtn.href = `index.html?id=${encodeURIComponent(payload.id)}&num=${payload.number || 1}`;
        }
        expeditionModal.classList.add('active');
      }
    }
  });

  // Init
  game.init();
  renderAll(game.state);
  checkOfflineModal();

})();
