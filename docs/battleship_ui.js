/**
 * INFINITE GALLERY: BATTLESHIP (battleship_ui.js)
 * Master User Interface & Gameplay Controller:
 * - Seamless Screen Transitions: Menu -> Lobby -> Placement -> Battle -> Victory/Defeat
 * - Interactive Ship Placement with Drag & Drop, Click-to-place, and Rotate
 * - Live Previews (Green for valid, Red for invalid placement)
 * - 120s Placement Countdown & 25s Turn Countdown
 * - Dual Board Battle Arena with Fog of War & Targeting Crosshairs
 * - Integrated AI Practice Mode ("Адмирал Мяу") & Online Mode (Supabase)
 */

(function (global) {
  'use strict';

  const { GRID_SIZE, COL_LETTERS, FLEET_SPEC, CELL_STATE, Board, formatCoordinate } = global.BattleshipCore;
  const { BattleFX } = global.BattleshipRender;
  const Audio = global.BattleshipAudio;
  const { NavalAI } = global.BattleshipAI;
  const Online = global.BattleshipOnline;

  // Game Modes: 'ai' or 'online'
  let gameMode = 'ai';
  let playerBoard = new Board();
  let opponentBoard = new Board(); // Used directly in AI mode
  let fx = null;
  let ai = null;

  // Battle State Machine
  const BATTLE_STATE = {
    MENU: 'MENU',
    LOBBY: 'LOBBY',
    PLACEMENT: 'PLACEMENT',
    PLAYER_TURN: 'PLAYER_TURN',
    PLAYER_ANIMATING: 'PLAYER_ANIMATING',
    AI_THINKING: 'AI_THINKING',
    AI_ANIMATING: 'AI_ANIMATING',
    ONLINE_WAITING: 'ONLINE_WAITING',
    GAME_OVER: 'GAME_OVER'
  };
  let currentBattleState = BATTLE_STATE.MENU;
  let stateWatchdogTimer = null;

  function setBattleState(newState) {
    currentBattleState = newState;
    if (stateWatchdogTimer) {
      clearTimeout(stateWatchdogTimer);
      stateWatchdogTimer = null;
    }

    // Auto-recovery watchdog for transient animation/thinking states
    if (newState === BATTLE_STATE.PLAYER_ANIMATING || 
        newState === BATTLE_STATE.AI_ANIMATING || 
        newState === BATTLE_STATE.AI_THINKING) {
      stateWatchdogTimer = setTimeout(() => {
        console.warn('Battle State Watchdog triggered! Unsticking state from:', currentBattleState);
        if (currentBattleState === BATTLE_STATE.GAME_OVER) return;

        if (gameMode === 'ai') {
          if (isMyTurn) {
            setBattleState(BATTLE_STATE.PLAYER_TURN);
            updateTurnStatusUI();
            renderBattleBoards();
            startTurnTimer();
          } else {
            setBattleState(BATTLE_STATE.AI_THINKING);
            updateTurnStatusUI();
            renderBattleBoards();
            startTurnTimer();
            triggerAiTurn();
          }
        } else {
          setBattleState(isMyTurn ? BATTLE_STATE.PLAYER_TURN : BATTLE_STATE.ONLINE_WAITING);
          updateTurnStatusUI();
          renderBattleBoards();
        }
      }, 3000);
    }
  }

  // Current State
  let activeScreen = 'menu';
  let selectedDockShip = null; // { type, size, index }
  let placementOrientation = true; // true = horizontal, false = vertical
  let unplacedFleet = [];

  // Match State
  let isMyTurn = true;
  let currentRoomCode = null;
  let isRoomHost = false;
  let turnTimerId = null;
  let turnTimeLeft = 25;
  let prepTimerId = null;
  let prepTimeLeft = 120;
  let consecutiveTimeouts = 0;
  let matchStats = { hits: 0, misses: 0, shipsDestroyed: 0, startTime: 0 };
  let onlinePollInterval = null;
  let onlineAppliedShots = 0;

  function init() {
    fx = new BattleFX();
    const fxCanvas = document.getElementById('battleFxCanvas');
    if (fxCanvas) fx.init(fxCanvas);

    ai = new NavalAI('normal');

    setupDOMEvents();
    showScreen('menu');

    // Update Player name input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
      nameInput.value = Online.getPlayerInfo().name;
      nameInput.addEventListener('change', () => {
        Online.setPlayerName(nameInput.value);
      });
    }
  }

  function showScreen(screenId) {
    activeScreen = screenId;
    document.querySelectorAll('.screen-container').forEach(sc => {
      sc.style.display = 'none';
      sc.classList.remove('active');
    });
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
    }

    if (screenId === 'menu') {
      setBattleState(BATTLE_STATE.MENU);
    } else if (screenId === 'lobby') {
      setBattleState(BATTLE_STATE.LOBBY);
    } else if (screenId === 'placement') {
      setBattleState(BATTLE_STATE.PLACEMENT);
      initPlacementPhase();
    }
  }

  // =========================================================================
  // SCREEN 1: MAIN MENU
  // =========================================================================
  function setupDOMEvents() {
    // Mode Buttons
    bindClick('btnPlayAi', startAiMatch);
    bindClick('btnQuickPlay', startQuickMatch);
    bindClick('btnCreateRoom', handleCreateRoom);
    bindClick('btnBrowseRooms', handleBrowseRooms);
    bindClick('btnJoinCode', handleJoinByCodeModal);

    // Placement Controls
    bindClick('btnRotateShip', toggleOrientation);
    bindClick('btnAutoPlace', handleAutoPlace);
    bindClick('btnClearFleet', handleClearFleet);
    bindClick('btnReadyBattle', handleReadyBattle);
    bindClick('btnPlacementLeave', leaveCurrentMatch);

    // Lobby Controls
    bindClick('btnLeaveLobby', leaveCurrentMatch);
    bindClick('btnCopyRoomCode', copyRoomCode);

    // Modals
    bindClick('btnModalCloseJoin', () => closeModal('modalJoinCode'));
    bindClick('btnConfirmJoinCode', submitJoinCode);
    bindClick('btnModalCloseRooms', () => closeModal('modalRoomsList'));
    bindClick('btnRefreshRooms', handleBrowseRooms);

    // Game Over
    bindClick('btnRematch', handleRematch);
    bindClick('btnReturnMenu', () => {
      leaveCurrentMatch();
      showScreen('menu');
    });

    // Sound toggle
    bindClick('btnToggleSound', () => {
      const muted = Audio.toggleMute();
      const btn = document.getElementById('btnToggleSound');
      if (btn) btn.textContent = muted ? '🔇' : '🔊';
    });
  }

  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  // =========================================================================
  // MATCH LAUNCHERS
  // =========================================================================
  function startAiMatch() {
    gameMode = 'ai';
    isRoomHost = true;
    playerBoard.clear();
    opponentBoard.clear();
    opponentBoard.generateRandomFleet(); // AI places its legal secret fleet
    ai.reset();

    document.getElementById('placementOpponentName').textContent = 'Адмирал Мяу (ИИ)';
    showScreen('placement');
  }

  async function startQuickMatch() {
    gameMode = 'online';
    showToast('Поиск открытой комнаты...');
    try {
      const room = await Online.quickMatch();
      handleJoinedRoom(room);
    } catch (err) {
      showToast('⚠️ Ошибка поиска: ' + err.message, 'error');
    }
  }

  async function handleCreateRoom() {
    gameMode = 'online';
    try {
      const room = await Online.createRoom();
      handleJoinedRoom(room);
    } catch (err) {
      showToast('⚠️ Ошибка создания комнаты: ' + err.message, 'error');
    }
  }

  async function handleBrowseRooms() {
    openModal('modalRoomsList');
    const listEl = document.getElementById('roomsListContainer');
    if (!listEl) return;
    listEl.innerHTML = '<div class="rooms-loading">Загрузка открытых комнат...</div>';

    try {
      const rooms = await Online.getOpenRooms();
      if (!rooms || rooms.length === 0) {
        listEl.innerHTML = '<div class="rooms-empty">Нет открытых комнат. Создайте свою!</div>';
        return;
      }

      listEl.innerHTML = '';
      rooms.forEach(r => {
        const item = document.createElement('div');
        item.className = 'room-card-item';
        item.innerHTML = `
          <div class="room-card-info">
            <strong>${escapeHtml(r.player1_name || 'Адмирал')}</strong>
            <span class="room-code-tag">Код: ${r.code}</span>
          </div>
          <button class="btn btn-primary btn-sm btn-join-room" data-code="${r.code}">Войти</button>
        `;
        item.querySelector('.btn-join-room').addEventListener('click', () => {
          closeModal('modalRoomsList');
          joinByCode(r.code);
        });
        listEl.appendChild(item);
      });
    } catch (err) {
      listEl.innerHTML = '<div class="rooms-empty">Ошибка загрузки комнат</div>';
    }
  }

  function handleJoinByCodeModal() {
    const input = document.getElementById('inputJoinRoomCode');
    if (input) input.value = '';
    openModal('modalJoinCode');
  }

  function submitJoinCode() {
    const input = document.getElementById('inputJoinRoomCode');
    if (!input || !input.value.trim()) return;
    closeModal('modalJoinCode');
    joinByCode(input.value.trim());
  }

  async function joinByCode(code) {
    gameMode = 'online';
    showToast(`Подключение к ${code.toUpperCase()}...`);
    try {
      const room = await Online.joinRoom(code);
      handleJoinedRoom(room);
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error');
    }
  }

  function handleJoinedRoom(room) {
    currentRoomCode = room.code;
    const myId = Online.getPlayerInfo().id;
    isRoomHost = room.player1_id === myId;

    if (room.status === 'waiting') {
      // Show waiting lobby
      document.getElementById('lobbyRoomCodeText').textContent = room.code;
      document.getElementById('lobbyP1Name').textContent = room.player1_name || 'Создатель';
      document.getElementById('lobbyP2Name').textContent = 'Ожидание соперника...';
      showScreen('lobby');
      startRoomPolling();
    } else if (room.status === 'placement') {
      // Both connected, go to fleet placement!
      const oppName = isRoomHost ? room.player2_name : room.player1_name;
      document.getElementById('placementOpponentName').textContent = oppName || 'Соперник';
      showScreen('placement');
      startRoomPolling();
    }
  }

  function startRoomPolling() {
    if (onlinePollInterval) clearInterval(onlinePollInterval);
    onlinePollInterval = setInterval(async () => {
      if (gameMode !== 'online' || !currentRoomCode) return;
      try {
        const room = await Online.getRoom(currentRoomCode);
        if (!room) return;

        if (activeScreen === 'lobby' && room.status === 'placement') {
          handleJoinedRoom(room);
        } else if (activeScreen === 'placement' && room.status === 'battle') {
          // Both ready! Start battle!
          startBattlePhase(room);
        } else if (activeScreen === 'battle') {
          syncOnlineBattleState(room);
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, 1500);
  }

  function copyRoomCode() {
    if (!currentRoomCode) return;
    navigator.clipboard.writeText(currentRoomCode).then(() => {
      showToast(`Код комнаты ${currentRoomCode} скопирован!`);
    });
  }

  // =========================================================================
  // SCREEN 2: SHIP PLACEMENT PHASE
  // =========================================================================
  function initPlacementPhase() {
    playerBoard.clear();
    placementOrientation = true;
    selectedDockShip = null;
    startPrepTimer();

    // Prepare initial dock fleet: 1x4, 2x3, 3x2, 4x1
    unplacedFleet = [];
    let idSeq = 1;
    FLEET_SPEC.forEach(spec => {
      for (let i = 0; i < spec.count; i++) {
        unplacedFleet.push({
          id: `ship_${idSeq++}`,
          type: spec.type,
          name: spec.name,
          size: spec.size,
          icon: spec.icon,
          placed: false
        });
      }
    });

    renderPlacementGrid();
    renderShipDock();
    updatePlacementReadyButton();
  }

  function startPrepTimer() {
    if (prepTimerId) clearInterval(prepTimerId);
    prepTimeLeft = 120;
    updatePrepTimerUI();

    prepTimerId = setInterval(() => {
      prepTimeLeft--;
      updatePrepTimerUI();
      if (prepTimeLeft <= 0) {
        clearInterval(prepTimerId);
        // Time expired! Auto-fill and lock
        if (!playerBoard.isFleetComplete()) {
          playerBoard.generateRandomFleet();
        }
        handleReadyBattle();
      }
    }, 1000);
  }

  function updatePrepTimerUI() {
    const mins = String(Math.floor(prepTimeLeft / 60)).padStart(2, '0');
    const secs = String(prepTimeLeft % 60).padStart(2, '0');
    const el = document.getElementById('placementTimer');
    if (el) el.textContent = `${mins}:${secs}`;
  }

  function toggleOrientation() {
    placementOrientation = !placementOrientation;
    const btn = document.getElementById('btnRotateShip');
    if (btn) {
      btn.innerHTML = placementOrientation ? '🔁 Направление: Горизонтально' : '🔁 Направление: Вертикально';
    }
    Audio.playSonarPing();
  }

  function renderPlacementGrid() {
    const gridEl = document.getElementById('placementGrid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell placement-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        // Visual marking if ship occupies this cell
        const ship = playerBoard.ships.find(s => s.occupies(x, y));
        if (ship) {
          cell.classList.add('has-ship');
        }

        // Hover Preview Events
        cell.addEventListener('mouseenter', () => handleCellHover(x, y));
        cell.addEventListener('mouseleave', clearCellHover);
        cell.addEventListener('click', () => handleCellClick(x, y));

        // Right-click rotates orientation on the fly!
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleOrientation();
          handleCellHover(x, y);
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function renderShipDock() {
    const dockEl = document.getElementById('shipDockList');
    if (!dockEl) return;
    dockEl.innerHTML = '';

    // Group remaining unplaced ships
    const available = unplacedFleet.filter(s => !s.placed);

    if (available.length === 0) {
      dockEl.innerHTML = '<div class="dock-empty">Все 10 кораблей размещены на поле! Нажмите «Готов к бою».</div>';
      return;
    }

    // Select first available ship by default if none selected
    if (!selectedDockShip || !available.some(s => s.id === selectedDockShip.id)) {
      selectedDockShip = available[0];
    }

    available.forEach(s => {
      const card = document.createElement('div');
      card.className = `dock-ship-card ${selectedDockShip && selectedDockShip.id === s.id ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="dock-icon">${s.icon}</span>
        <div class="dock-info">
          <div class="dock-name">${s.name} (${s.size} ${declOfNum(s.size, ['клетка', 'клетки', 'клеток'])})</div>
          <div class="dock-blocks">${'<span class="ship-pip"></span>'.repeat(s.size)}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        selectedDockShip = s;
        renderShipDock();
        Audio.playSonarPing();
      });
      dockEl.appendChild(card);
    });
  }

  function handleCellHover(x, y) {
    clearCellHover();
    if (!selectedDockShip) return;

    const size = selectedDockShip.size;
    const canPlace = playerBoard.canPlaceShip(size, x, y, placementOrientation);

    for (let i = 0; i < size; i++) {
      const cx = placementOrientation ? x + i : x;
      const cy = placementOrientation ? y : y + i;
      if (cx < GRID_SIZE && cy < GRID_SIZE) {
        const cell = document.querySelector(`.placement-cell[data-x="${cx}"][data-y="${cy}"]`);
        if (cell) {
          cell.classList.add(canPlace ? 'preview-valid' : 'preview-invalid');
        }
      }
    }
  }

  function clearCellHover() {
    document.querySelectorAll('.placement-cell').forEach(c => {
      c.classList.remove('preview-valid', 'preview-invalid');
    });
  }

  function handleCellClick(x, y) {
    // If clicking an existing ship, pick it up back into dock!
    const existingShip = playerBoard.ships.find(s => s.occupies(x, y));
    if (existingShip) {
      playerBoard.removeShip(existingShip.id);
      const fleetItem = unplacedFleet.find(f => f.id === existingShip.id);
      if (fleetItem) fleetItem.placed = false;
      selectedDockShip = fleetItem;
      renderPlacementGrid();
      renderShipDock();
      updatePlacementReadyButton();
      Audio.playWaterSplash();
      return;
    }

    // Place selected ship
    if (!selectedDockShip) return;

    const placed = playerBoard.placeShip(
      selectedDockShip.id,
      selectedDockShip.type,
      selectedDockShip.size,
      x,
      y,
      placementOrientation
    );

    if (placed) {
      selectedDockShip.placed = true;
      Audio.playSonarPing();
      renderPlacementGrid();
      renderShipDock();
      updatePlacementReadyButton();
    } else {
      Audio.playWaterSplash();
      showToast('⚠️ Здесь нельзя разместить корабль! Корабли не могут соприкасаться даже углами.');
    }
  }

  function handleAutoPlace() {
    playerBoard.generateRandomFleet();
    unplacedFleet.forEach(f => { f.placed = true; });
    selectedDockShip = null;
    renderPlacementGrid();
    renderShipDock();
    updatePlacementReadyButton();
    Audio.playSonarPing();
  }

  function handleClearFleet() {
    playerBoard.clear();
    unplacedFleet.forEach(f => { f.placed = false; });
    selectedDockShip = unplacedFleet[0];
    renderPlacementGrid();
    renderShipDock();
    updatePlacementReadyButton();
    Audio.playWaterSplash();
  }

  function updatePlacementReadyButton() {
    const btn = document.getElementById('btnReadyBattle');
    if (!btn) return;
    const isReady = playerBoard.isFleetComplete();
    btn.disabled = !isReady;
    btn.classList.toggle('ready-pulse', isReady);
  }

  async function handleReadyBattle() {
    if (!playerBoard.isFleetComplete()) return;
    if (prepTimerId) clearInterval(prepTimerId);

    const readyBtn = document.getElementById('btnReadyBattle');
    if (readyBtn) {
      readyBtn.disabled = true;
      readyBtn.textContent = 'Ожидание соперника...';
    }

    if (gameMode === 'ai') {
      // Immediately start battle against AI!
      showBattleIntro('Адмирал Мяу (ИИ)', () => {
        startBattlePhase();
      });
    } else {
      // Submit fleet to Supabase room
      try {
        const serialized = playerBoard.serializeFleet();
        const updatedRoom = await Online.submitPlacement(currentRoomCode, serialized);
        if (updatedRoom.status === 'battle') {
          startBattlePhase(updatedRoom);
        }
      } catch (err) {
        showToast('⚠️ Ошибка синхронизации: ' + err.message, 'error');
      }
    }
  }

  // =========================================================================
  // SCREEN 3: BATTLE PHASE
  // =========================================================================
  function showBattleIntro(oppName, onComplete) {
    const overlay = document.getElementById('battleIntroOverlay');
    const oppLabel = document.getElementById('introOpponentLabel');
    if (oppLabel) oppLabel.textContent = oppName;

    if (overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => {
        overlay.style.display = 'none';
        if (onComplete) onComplete();
      }, 1800);
    } else {
      if (onComplete) onComplete();
    }
  }

  function startBattlePhase(room = null) {
    if (prepTimerId) clearInterval(prepTimerId);
    showScreen('battle');
    consecutiveTimeouts = 0;
    onlineAppliedShots = 0;
    matchStats = { hits: 0, misses: 0, shipsDestroyed: 0, startTime: Date.now() };

    if (gameMode === 'ai') {
      // Random coin flip for who goes first
      isMyTurn = Math.random() < 0.5;
      updateTurnStatusUI();
      if (!isMyTurn) {
        setBattleState(BATTLE_STATE.AI_THINKING);
        triggerAiTurn();
      } else {
        setBattleState(BATTLE_STATE.PLAYER_TURN);
      }
    } else if (room) {
      const myId = Online.getPlayerInfo().id;
      const isP1 = room.player1_id === myId;
      isMyTurn = (room.current_turn === 'player1' && isP1) || (room.current_turn === 'player2' && !isP1);
      setBattleState(isMyTurn ? BATTLE_STATE.PLAYER_TURN : BATTLE_STATE.ONLINE_WAITING);
      updateTurnStatusUI();
    }

    renderBattleBoards();
    startTurnTimer();
    Audio.playSonarPing();
  }

  function startTurnTimer() {
    if (turnTimerId) clearInterval(turnTimerId);
    turnTimeLeft = 25;
    updateTurnTimerUI();

    turnTimerId = setInterval(() => {
      turnTimeLeft--;
      updateTurnTimerUI();

      if (turnTimeLeft === 5) {
        Audio.playTimerWarning();
      }

      if (turnTimeLeft <= 0) {
        handleTurnTimeout();
      }
    }, 1000);
  }

  function updateTurnTimerUI() {
    const el = document.getElementById('turnTimerDisplay');
    if (el) {
      el.textContent = `${turnTimeLeft}с`;
      el.classList.toggle('timer-warning', turnTimeLeft <= 5);
    }
  }

  function handleTurnTimeout() {
    clearInterval(turnTimerId);
    if (currentBattleState === BATTLE_STATE.PLAYER_ANIMATING || currentBattleState === BATTLE_STATE.AI_ANIMATING) {
      // Don't timeout mid-animation
      return;
    }

    if (isMyTurn) {
      consecutiveTimeouts++;
      showToast('⏳ Время вышло! Ход пропущен.');

      if (consecutiveTimeouts >= 3) {
        // 3 timeouts in a row = forfeit!
        endMatch(false, 'Техническое поражение из-за бездействия.');
        return;
      }

      // Pass turn to opponent
      isMyTurn = false;
      updateTurnStatusUI();
      startTurnTimer();

      if (gameMode === 'ai') {
        setBattleState(BATTLE_STATE.AI_THINKING);
        triggerAiTurn();
      } else {
        setBattleState(BATTLE_STATE.ONLINE_WAITING);
      }
    } else {
      // Opponent timed out
      isMyTurn = true;
      setBattleState(BATTLE_STATE.PLAYER_TURN);
      updateTurnStatusUI();
      startTurnTimer();
    }
  }

  function updateTurnStatusUI() {
    const statusText = document.getElementById('turnStatusText');
    const badge = document.getElementById('turnBadge');

    if (statusText) {
      statusText.textContent = isMyTurn ? 'Ваш выстрел! Выберите клетку на поле противника.' : 'Ход соперника... Ожидайте залпа.';
    }
    if (badge) {
      badge.textContent = isMyTurn ? '🎯 ВАШ ХОД' : '⏳ ХОД ВРАГА';
      badge.className = `turn-badge ${isMyTurn ? 'turn-my' : 'turn-enemy'}`;
    }

    updateFleetCountersUI();
  }

  function updateFleetCountersUI() {
    // Player remaining ships
    const myRemain = playerBoard.getRemainingShipsCount();
    document.getElementById('myShips4').textContent = myRemain[4];
    document.getElementById('myShips3').textContent = myRemain[3];
    document.getElementById('myShips2').textContent = myRemain[2];
    document.getElementById('myShips1').textContent = myRemain[1];

    // Enemy remaining ships
    const oppRemain = opponentBoard.getRemainingShipsCount();
    document.getElementById('oppShips4').textContent = oppRemain[4];
    document.getElementById('oppShips3').textContent = oppRemain[3];
    document.getElementById('oppShips2').textContent = oppRemain[2];
    document.getElementById('oppShips1').textContent = oppRemain[1];
  }

  function renderBattleBoards() {
    renderMyFleetBoard();
    renderOpponentRadarBoard();
  }

  // 1. My Board (shows my ships, incoming hits, and misses)
  function renderMyFleetBoard() {
    const el = document.getElementById('myFleetBoardGrid');
    if (!el) return;
    el.innerHTML = '';

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell fleet-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        const state = playerBoard.grid[y][x];
        const ship = playerBoard.ships.find(s => s.occupies(x, y));

        if (ship && !ship.sunk && state !== CELL_STATE.HIT) {
          cell.classList.add('cell-ship');
        } else if (state === CELL_STATE.HIT) {
          cell.classList.add(ship && ship.sunk ? 'cell-sunk' : 'cell-hit');
          cell.innerHTML = '<span class="cell-icon">🔥</span>';
        } else if (state === CELL_STATE.MISS || state === CELL_STATE.HALO) {
          cell.classList.add('cell-miss');
          cell.innerHTML = '<span class="cell-dot">•</span>';
        }

        el.appendChild(cell);
      }
    }
  }

  // 2. Opponent Radar Board (Fog of War)
  function renderOpponentRadarBoard() {
    const el = document.getElementById('oppRadarBoardGrid');
    if (!el) return;
    el.innerHTML = '';

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell radar-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        const state = opponentBoard.grid[y][x];
        const isExplored = (state === CELL_STATE.HIT || state === CELL_STATE.MISS || state === CELL_STATE.HALO);

        if (isExplored) {
          cell.classList.add('explored');
          if (state === CELL_STATE.HIT) {
            const ship = opponentBoard.ships.find(s => s.occupies(x, y));
            cell.classList.add(ship && ship.sunk ? 'cell-sunk' : 'cell-hit');
            cell.innerHTML = '<span class="cell-icon">🔥</span>';
          } else {
            cell.classList.add('cell-miss');
            cell.innerHTML = '<span class="cell-dot">•</span>';
          }
        } else {
          // Unexplored: clickable when it's our turn!
          cell.addEventListener('click', () => handlePlayerShot(x, y, cell));
        }

        el.appendChild(cell);
      }
    }
  }

  // =========================================================================
  // FIRING LOGIC & ANIMATIONS
  // =========================================================================
  async function handlePlayerShot(x, y, targetCell) {
    if (currentBattleState !== BATTLE_STATE.PLAYER_TURN || !isMyTurn) return;
    if (opponentBoard.grid[y][x] === CELL_STATE.HIT ||
        opponentBoard.grid[y][x] === CELL_STATE.MISS ||
        opponentBoard.grid[y][x] === CELL_STATE.HALO) {
      return;
    }

    // Set state to ANIMATING to lock interactions and stop turn timer countdown
    setBattleState(BATTLE_STATE.PLAYER_ANIMATING);
    if (turnTimerId) clearInterval(turnTimerId);
    isMyTurn = false;
    consecutiveTimeouts = 0;
    Audio.playShotCannon();

    // Source coordinates from my board
    const myBoardEl = document.getElementById('myFleetBoardGrid');
    const myBoardRect = myBoardEl ? myBoardEl.getBoundingClientRect() : { left: 100, top: 100, width: 300, height: 300 };
    const targetRect = targetCell ? targetCell.getBoundingClientRect() : { left: 400, top: 100, width: 30, height: 30 };
    const fxEl = document.getElementById('battleFxCanvas');
    const fxRect = fxEl ? fxEl.getBoundingClientRect() : { left: 0, top: 0 };

    const fromX = myBoardRect.left + myBoardRect.width / 2 - fxRect.left;
    const fromY = myBoardRect.top + myBoardRect.height / 2 - fxRect.top;
    const toX = targetRect.left + targetRect.width / 2 - fxRect.left;
    const toY = targetRect.top + targetRect.height / 2 - fxRect.top;

    // Launch ballistic shell animation!
    fx.launchShell(fromX, fromY, toX, toY, () => {
      if (currentBattleState === BATTLE_STATE.GAME_OVER) return;

      // On Impact:
      if (gameMode === 'ai') {
        const shotResult = opponentBoard.receiveShot(x, y);

        if (shotResult.result === 'invalid') {
          console.warn('Invalid player shot attempt:', x, y);
          isMyTurn = true;
          setBattleState(BATTLE_STATE.PLAYER_TURN);
          startTurnTimer();
          updateTurnStatusUI();
          return;
        }

        if (shotResult.result === 'hit') {
          matchStats.hits++;
          Audio.playExplosionHit();
          fx.spawnExplosion(toX, toY, false);
          appendCombatLog(`Залп по ${formatCoordinate(x, y)}: ПОПАДАНИЕ! Дополнительный выстрел.`);
          renderBattleBoards();

          // Rule: HIT grants extra turn!
          isMyTurn = true;
          setBattleState(BATTLE_STATE.PLAYER_TURN);
          startTurnTimer();
          updateTurnStatusUI();
        } else if (shotResult.result === 'sunk') {
          matchStats.hits++;
          matchStats.shipsDestroyed++;
          Audio.playExplosionHit();
          Audio.playShipSunkHorn();
          fx.spawnExplosion(toX, toY, true);

          const shipName = (shotResult.ship && shotResult.ship.name) ? shotResult.ship.name : 'Корабль';
          appendCombatLog(`Залп по ${formatCoordinate(x, y)}: ${shipName.toUpperCase()} ПОТОПЛЕН!`);
          renderBattleBoards();

          if (shotResult.allSunk) {
            endMatch(true, 'Все корабли вражеского флота уничтожены!');
            return;
          }

          // Rule: Sunk also grants extra turn!
          isMyTurn = true;
          setBattleState(BATTLE_STATE.PLAYER_TURN);
          startTurnTimer();
          updateTurnStatusUI();
        } else {
          // Miss!
          matchStats.misses++;
          Audio.playWaterSplash();
          fx.spawnWaterSplash(toX, toY);
          appendCombatLog(`Залп по ${formatCoordinate(x, y)}: Мимо. Ход переходит противнику.`);
          renderBattleBoards();

          // Pass turn to AI
          isMyTurn = false;
          setBattleState(BATTLE_STATE.AI_THINKING);
          updateTurnStatusUI();
          startTurnTimer();
          triggerAiTurn();
        }
      } else {
        // Online Supabase shot execution
        executeOnlineShot(x, y, toX, toY);
      }
    });
  }

  function triggerAiTurn() {
    if (currentBattleState === BATTLE_STATE.GAME_OVER) return;
    setBattleState(BATTLE_STATE.AI_THINKING);

    setTimeout(() => {
      if (currentBattleState === BATTLE_STATE.GAME_OVER) return;
      if (isMyTurn) return; // Guard in case turn changed

      // AI selects shot
      const shotCoord = ai.chooseNextShot(playerBoard.getRemainingShipsCount());
      if (!shotCoord || shotCoord.x < 0 || shotCoord.y < 0) {
        console.warn('AI has no legal shots remaining');
        return;
      }

      // Execute shot on player board
      const shotResult = playerBoard.receiveShot(shotCoord.x, shotCoord.y);
      if (shotResult.result === 'invalid') {
        console.warn('AI shot returned invalid, retrying...');
        isMyTurn = false;
        setBattleState(BATTLE_STATE.AI_THINKING);
        triggerAiTurn();
        return;
      }
      ai.registerShotResult(shotCoord.x, shotCoord.y, shotResult.result, shotResult.ship, shotResult.halo);

      // Transition to AI_ANIMATING
      setBattleState(BATTLE_STATE.AI_ANIMATING);
      if (turnTimerId) clearInterval(turnTimerId);

      Audio.playShotCannon();

      // Calculate ballistic shell arc from enemy board to my board
      const oppBoardEl = document.getElementById('oppRadarBoardGrid');
      const myBoardEl = document.getElementById('myFleetBoardGrid');
      const fxEl = document.getElementById('battleFxCanvas');
      const myCell = document.querySelector(`.fleet-cell[data-x="${shotCoord.x}"][data-y="${shotCoord.y}"]`);

      const fxRect = fxEl ? fxEl.getBoundingClientRect() : { left: 0, top: 0 };
      const oppRect = oppBoardEl ? oppBoardEl.getBoundingClientRect() : { left: 500, top: 100, width: 300, height: 300 };
      const myRect = myBoardEl ? myBoardEl.getBoundingClientRect() : { left: 100, top: 100, width: 300, height: 300 };

      const fromX = oppRect.left + oppRect.width / 2 - fxRect.left;
      const fromY = oppRect.top + oppRect.height / 2 - fxRect.top;

      let toX = myRect.left + (shotCoord.x + 0.5) * (myRect.width / 10) - fxRect.left;
      let toY = myRect.top + (shotCoord.y + 0.5) * (myRect.height / 10) - fxRect.top;

      if (myCell) {
        const cellRect = myCell.getBoundingClientRect();
        toX = cellRect.left + cellRect.width / 2 - fxRect.left;
        toY = cellRect.top + cellRect.height / 2 - fxRect.top;
      }

      fx.launchShell(fromX, fromY, toX, toY, () => {
        if (currentBattleState === BATTLE_STATE.GAME_OVER) return;

        if (shotResult.result === 'hit') {
          Audio.playExplosionHit();
          fx.spawnExplosion(toX, toY, false);
          appendCombatLog(`Враг стреляет по ${formatCoordinate(shotCoord.x, shotCoord.y)}: Поврежден ваш корабль!`);
          renderMyFleetBoard();
          updateFleetCountersUI();

          // AI gets another shot!
          isMyTurn = false;
          setBattleState(BATTLE_STATE.AI_THINKING);
          startTurnTimer();
          triggerAiTurn();
        } else if (shotResult.result === 'sunk') {
          Audio.playExplosionHit();
          Audio.playShipSunkHorn();
          fx.spawnExplosion(toX, toY, true);

          const shipName = (shotResult.ship && shotResult.ship.name) ? shotResult.ship.name : 'Корабль';
          appendCombatLog(`Враг стреляет по ${formatCoordinate(shotCoord.x, shotCoord.y)}: Ваш ${shipName} ПОТОПЛЕН!`);
          renderMyFleetBoard();
          updateFleetCountersUI();

          if (shotResult.allSunk) {
            endMatch(false, 'Ваш флот полностью уничтожен.');
            return;
          }

          // AI gets another shot!
          isMyTurn = false;
          setBattleState(BATTLE_STATE.AI_THINKING);
          startTurnTimer();
          triggerAiTurn();
        } else {
          // Miss!
          Audio.playWaterSplash();
          fx.spawnWaterSplash(toX, toY);
          appendCombatLog(`Враг стреляет по ${formatCoordinate(shotCoord.x, shotCoord.y)}: Всплеск воды, мимо!`);
          renderMyFleetBoard();
          updateFleetCountersUI();

          // Turn returns to player!
          isMyTurn = true;
          setBattleState(BATTLE_STATE.PLAYER_TURN);
          updateTurnStatusUI();
          startTurnTimer();
        }
      });
    }, 600 + Math.random() * 300);
  }

  async function executeOnlineShot(x, y, toX, toY) {
    try {
      const res = await Online.fireShot(currentRoomCode, x, y);
      if (!res.success) {
        showToast('⚠️ ' + (res.error || 'Ошибка выстрела'), 'error');
        isMyTurn = true;
        setBattleState(BATTLE_STATE.PLAYER_TURN);
        updateTurnStatusUI();
        startTurnTimer();
        return;
      }

      onlineAppliedShots++; // Track our fired shot

      if (res.result === 'hit' || res.result === 'sunk') {
        matchStats.hits++;
        Audio.playExplosionHit();
        fx.spawnExplosion(toX, toY, res.result === 'sunk');
        if (res.result === 'sunk') Audio.playShipSunkHorn();

        opponentBoard.grid[y][x] = CELL_STATE.HIT;
        const shipName = res.ship_type ? res.ship_type.toUpperCase() : 'КОРАБЛЬ';
        appendCombatLog(`Залп по ${formatCoordinate(x, y)}: ${res.result === 'sunk' ? shipName + ' ПОТОПЛЕН!' : 'ПОПАДАНИЕ!'}`);
        renderBattleBoards();

        if (res.all_sunk) {
          endMatch(res.winner === (isRoomHost ? 'player1' : 'player2'), 'Все вражеские корабли уничтожены!');
          return;
        }

        // Hit grants extra turn!
        isMyTurn = true;
        setBattleState(BATTLE_STATE.PLAYER_TURN);
        updateTurnStatusUI();
        startTurnTimer();
      } else {
        matchStats.misses++;
        Audio.playWaterSplash();
        fx.spawnWaterSplash(toX, toY);
        opponentBoard.grid[y][x] = CELL_STATE.MISS;
        appendCombatLog(`Залп по ${formatCoordinate(x, y)}: Мимо. Ход переходит противнику.`);
        renderBattleBoards();

        // Pass turn to opponent
        isMyTurn = false;
        setBattleState(BATTLE_STATE.ONLINE_WAITING);
        updateTurnStatusUI();
        startTurnTimer();
      }
    } catch (e) {
      showToast('⚠️ ' + (e.message || 'Ошибка сети при выстреле'), 'error');
      isMyTurn = true;
      setBattleState(BATTLE_STATE.PLAYER_TURN);
      updateTurnStatusUI();
      startTurnTimer();
    }
  }

  function syncOnlineBattleState(room) {
    if (!room) return;

    if (room.status === 'finished') {
      const myId = Online.getPlayerInfo().id;
      const iWon = (room.winner === 'player1' && room.player1_id === myId) ||
                   (room.winner === 'player2' && room.player2_id === myId);
      endMatch(iWon, iWon ? 'Победа! Вы уничтожили флот противника!' : 'Поражение. Ваш флот уничтожен.');
      return;
    }

    if (room.status !== 'battle') return;

    const myRole = isRoomHost ? 'player1' : 'player2';
    const oppRole = isRoomHost ? 'player2' : 'player1';

    // Apply any new incoming shots from history
    const history = room.shots_history || [];
    if (history.length > onlineAppliedShots) {
      for (let i = onlineAppliedShots; i < history.length; i++) {
        const shot = history[i];
        if (shot.shooter === oppRole) {
          // Opponent shot at our fleet!
          const shotResult = playerBoard.receiveShot(shot.x, shot.y);

          // Get board cell coordinates for FX
          const myCell = document.querySelector(`.fleet-cell[data-x="${shot.x}"][data-y="${shot.y}"]`);
          const fxCanvas = document.getElementById('battleFxCanvas');
          const fxRect = fxCanvas ? fxCanvas.getBoundingClientRect() : { left: 0, top: 0 };
          let toX = 150, toY = 150;
          if (myCell) {
            const r = myCell.getBoundingClientRect();
            toX = r.left + r.width / 2 - fxRect.left;
            toY = r.top + r.height / 2 - fxRect.top;
          }

          if (shot.result === 'hit' || shot.result === 'sunk') {
            Audio.playExplosionHit();
            fx.spawnExplosion(toX, toY, shot.result === 'sunk');
            if (shot.result === 'sunk') Audio.playShipSunkHorn();
            appendCombatLog(`Враг стреляет по ${formatCoordinate(shot.x, shot.y)}: ${shot.result === 'sunk' ? 'ВАШ КОРАБЛЬ ПОТОПЛЕН!' : 'Поврежден ваш корабль!'}`);
          } else {
            Audio.playWaterSplash();
            fx.spawnWaterSplash(toX, toY);
            appendCombatLog(`Враг стреляет по ${formatCoordinate(shot.x, shot.y)}: Всплеск воды, мимо!`);
          }
        } else if (shot.shooter === myRole) {
          // Mark on opponent board if not marked yet
          if (shot.result === 'hit' || shot.result === 'sunk') {
            opponentBoard.grid[shot.y][shot.x] = CELL_STATE.HIT;
          } else {
            opponentBoard.grid[shot.y][shot.x] = CELL_STATE.MISS;
          }
        }
      }
      onlineAppliedShots = history.length;
      renderBattleBoards();
      updateFleetCountersUI();
    }

    const myId = Online.getPlayerInfo().id;
    const isP1 = room.player1_id === myId;
    isMyTurn = (room.current_turn === 'player1' && isP1) || (room.current_turn === 'player2' && !isP1);
    setBattleState(isMyTurn ? BATTLE_STATE.PLAYER_TURN : BATTLE_STATE.ONLINE_WAITING);
    updateTurnStatusUI();
  }

  function appendCombatLog(msg) {
    const logEl = document.getElementById('combatLogList');
    if (!logEl) return;
    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = `[${new Date().toLocaleTimeString().slice(3)}] ${msg}`;
    logEl.insertBefore(item, logEl.firstChild);
    while (logEl.children.length > 30) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  // =========================================================================
  // GAME OVER & STATS
  // =========================================================================
  function endMatch(isVictory, subtitle = '') {
    setBattleState(BATTLE_STATE.GAME_OVER);
    if (turnTimerId) clearInterval(turnTimerId);
    if (prepTimerId) clearInterval(prepTimerId);
    if (stateWatchdogTimer) clearTimeout(stateWatchdogTimer);

    if (isVictory) {
      Audio.playVictoryFanfare();
    } else {
      Audio.playDefeatDirge();
    }

    // Reveal opponent board completely!
    renderRevealedOpponentBoard();

    const titleEl = document.getElementById('modalGameOverTitle');
    const subEl = document.getElementById('modalGameOverSubtitle');
    if (titleEl) {
      titleEl.textContent = isVictory ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ';
      titleEl.className = isVictory ? 'gameover-title victory' : 'gameover-title defeat';
    }
    if (subEl) subEl.textContent = subtitle;

    // Calculate match duration
    const durationSec = Math.floor((Date.now() - matchStats.startTime) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const totalShots = matchStats.hits + matchStats.misses;
    const accuracy = totalShots > 0 ? Math.round((matchStats.hits / totalShots) * 100) : 0;

    document.getElementById('statHits').textContent = matchStats.hits;
    document.getElementById('statMisses').textContent = matchStats.misses;
    document.getElementById('statAccuracy').textContent = `${accuracy}%`;
    document.getElementById('statDestroyed').textContent = matchStats.shipsDestroyed;
    document.getElementById('statDuration').textContent = `${mins}м ${secs}с`;

    openModal('modalGameOver');
  }

  function renderRevealedOpponentBoard() {
    // Show remaining unsunk ships on radar
    const el = document.getElementById('oppRadarBoardGrid');
    if (!el) return;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = el.querySelector(`.radar-cell[data-x="${x}"][data-y="${y}"]`);
        if (!cell) continue;
        const ship = opponentBoard.ships.find(s => s.occupies(x, y));
        if (ship && opponentBoard.grid[y][x] !== CELL_STATE.HIT) {
          cell.classList.add('cell-revealed-ship');
        }
      }
    }
  }

  function handleRematch() {
    closeModal('modalGameOver');
    if (gameMode === 'ai') {
      startAiMatch();
    } else {
      // Re-queue
      startQuickMatch();
    }
  }

  function leaveCurrentMatch() {
    setBattleState(BATTLE_STATE.MENU);
    if (turnTimerId) clearInterval(turnTimerId);
    if (prepTimerId) clearInterval(prepTimerId);
    if (stateWatchdogTimer) clearTimeout(stateWatchdogTimer);
    if (onlinePollInterval) clearInterval(onlinePollInterval);

    if (gameMode === 'online' && currentRoomCode) {
      Online.leaveRoom(currentRoomCode);
      currentRoomCode = null;
    }
    showScreen('menu');
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function showToast(text, type = 'info') {
    const toast = document.getElementById('gameToast');
    if (!toast) return;
    toast.textContent = text;
    toast.className = `game-toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function declOfNum(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', init);

  global.BattleshipUI = {
    init,
    showScreen
  };

})(typeof window !== 'undefined' ? window : globalThis);
