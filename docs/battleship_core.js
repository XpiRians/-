/**
 * INFINITE GALLERY: BATTLESHIP (battleship_core.js)
 * Core Game Engine:
 * - 10x10 Coordinate system (Cols 0-9 [А-К], Rows 0-9 [1-10])
 * - Russian/European Standard Fleet:
 *     1x Battleship (4 cells)
 *     2x Cruisers (3 cells)
 *     3x Destroyers (2 cells)
 *     4x Torpedo Boats (1 cell)
 * - Strict Naval Placement Rules:
 *     Ships cannot overlap, extend out of bounds, or TOUCH even diagonally!
 * - Fast, robust Random Fleet Placement Generator (0% infinite loops)
 * - Shooting resolution: Hit, Miss, Sunk
 * - Automatic "Halo" (ореол) generation around sunk ships
 */

(function (global) {
  'use strict';

  const GRID_SIZE = 10;
  const COL_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];

  // Classic fleet definition: size and count
  const FLEET_SPEC = [
    { type: 'battleship', name: 'Линкор', size: 4, count: 1, icon: '🚢' },
    { type: 'cruiser', name: 'Крейсер', size: 3, count: 2, icon: '🛥️' },
    { type: 'destroyer', name: 'Эсминец', size: 2, count: 3, icon: '⛵' },
    { type: 'boat', name: 'Катер', size: 1, count: 4, icon: '🚤' }
  ];

  const CELL_STATE = {
    EMPTY: 0,
    SHIP: 1,
    MISS: 2,
    HIT: 3,
    HALO: 4 // Empty cell marked automatically around a sunk ship
  };

  /**
   * Represents a single Ship instance
   */
  class Ship {
    constructor(id, type, size, x, y, horizontal = true) {
      this.id = id;
      this.type = type;
      this.size = size;
      this.x = x;
      this.y = y;
      this.horizontal = horizontal;
      this.hits = 0;
      this.sunk = false;

      // Always populate Russian naval name and icon
      const spec = FLEET_SPEC.find(s => s.type === type || s.size === size);
      this.name = spec ? spec.name : 'Корабль';
      this.icon = spec ? spec.icon : '🚢';
    }

    getCoordinates() {
      const coords = [];
      for (let i = 0; i < this.size; i++) {
        const cx = this.horizontal ? this.x + i : this.x;
        const cy = this.horizontal ? this.y : this.y + i;
        coords.push({ x: cx, y: cy });
      }
      return coords;
    }

    occupies(x, y) {
      return this.getCoordinates().some(c => c.x === x && c.y === y);
    }
  }

  /**
   * Represents a Player's 10x10 Board
   */
  class Board {
    constructor() {
      this.size = GRID_SIZE;
      this.ships = [];
      // 10x10 matrix for cells: CELL_STATE
      this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(CELL_STATE.EMPTY));
    }

    clear() {
      this.ships = [];
      this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(CELL_STATE.EMPTY));
    }

    /**
     * Checks if a ship can legally be placed at (x, y) with orientation horizontal
     * Strict rule: cannot touch any other ship, even diagonally (8 neighbors check)
     */
    canPlaceShip(size, x, y, horizontal, ignoreShipId = null) {
      if (x < 0 || y < 0) return false;
      const endX = horizontal ? x + size - 1 : x;
      const endY = horizontal ? y : y + size - 1;

      if (endX >= this.size || endY >= this.size) return false;

      // Check all cells of the prospective ship AND a 1-cell border in all 8 directions
      const minX = Math.max(0, x - 1);
      const maxX = Math.min(this.size - 1, endX + 1);
      const minY = Math.max(0, y - 1);
      const maxY = Math.min(this.size - 1, endY + 1);

      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          for (let s of this.ships) {
            if (ignoreShipId && s.id === ignoreShipId) continue;
            if (s.occupies(cx, cy)) {
              return false; // Cell or diagonal neighbor occupied!
            }
          }
        }
      }
      return true;
    }

    /**
     * Place a ship on the board
     */
    placeShip(id, type, size, x, y, horizontal) {
      if (!this.canPlaceShip(size, x, y, horizontal, id)) {
        return false;
      }
      // Remove previous version of this ship if re-positioning
      this.removeShip(id);

      const ship = new Ship(id, type, size, x, y, horizontal);
      this.ships.push(ship);
      this._syncGridShipCells();
      return ship;
    }

    removeShip(id) {
      this.ships = this.ships.filter(s => s.id !== id);
      this._syncGridShipCells();
    }

    _syncGridShipCells() {
      // Re-populate SHIP cells without overwriting shots
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c] === CELL_STATE.SHIP) {
            this.grid[r][c] = CELL_STATE.EMPTY;
          }
        }
      }
      for (let s of this.ships) {
        for (let coord of s.getCoordinates()) {
          if (this.grid[coord.y][coord.x] === CELL_STATE.EMPTY) {
            this.grid[coord.y][coord.x] = CELL_STATE.SHIP;
          }
        }
      }
    }

    isFleetComplete() {
      if (this.ships.length !== 10) return false;
      const countBySize = { 4: 0, 3: 0, 2: 0, 1: 0 };
      for (let s of this.ships) {
        if (countBySize[s.size] !== undefined) {
          countBySize[s.size]++;
        }
      }
      return countBySize[4] === 1 && countBySize[3] === 2 && countBySize[2] === 3 && countBySize[1] === 4;
    }

    /**
     * Generates a completely legal random fleet layout
     */
    generateRandomFleet() {
      this.clear();
      let shipIdSeq = 1;

      // Place from largest (4) down to smallest (1)
      const listToPlace = [];
      FLEET_SPEC.forEach(spec => {
        for (let i = 0; i < spec.count; i++) {
          listToPlace.push({ type: spec.type, size: spec.size });
        }
      });

      for (let item of listToPlace) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 500) {
          attempts++;
          const horizontal = Math.random() < 0.5;
          const maxX = horizontal ? this.size - item.size : this.size - 1;
          const maxY = horizontal ? this.size - 1 : this.size - item.size;
          const x = Math.floor(Math.random() * (maxX + 1));
          const y = Math.floor(Math.random() * (maxY + 1));

          if (this.canPlaceShip(item.size, x, y, horizontal)) {
            this.placeShip(`ship_${shipIdSeq++}`, item.type, item.size, x, y, horizontal);
            placed = true;
          }
        }
        if (!placed) {
          // Retry entire fleet if stuck (very rare)
          return this.generateRandomFleet();
        }
      }
      return true;
    }

    /**
     * Process an incoming shot at (x, y)
     * Returns: { result: 'hit'|'miss'|'sunk'|'invalid', ship: Ship|null, halo: Array<{x,y}> }
     */
    receiveShot(x, y) {
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
        return { result: 'invalid', message: 'Координаты вне поля' };
      }

      const current = this.grid[y][x];
      if (current === CELL_STATE.MISS || current === CELL_STATE.HIT || current === CELL_STATE.HALO) {
        return { result: 'invalid', message: 'Клетка уже исследована' };
      }

      // Check if any ship is hit
      const hitShip = this.ships.find(s => s.occupies(x, y));
      if (!hitShip) {
        this.grid[y][x] = CELL_STATE.MISS;
        return { result: 'miss', x, y, ship: null, halo: [] };
      }

      // Hit ship
      this.grid[y][x] = CELL_STATE.HIT;
      hitShip.hits++;

      if (hitShip.hits >= hitShip.size) {
        hitShip.sunk = true;
        // Calculate surrounding halo
        const halo = this._markHaloAroundShip(hitShip);
        return {
          result: 'sunk',
          x,
          y,
          ship: hitShip,
          halo: halo,
          allSunk: this.areAllShipsSunk()
        };
      }

      return {
        result: 'hit',
        x,
        y,
        ship: hitShip,
        halo: []
      };
    }

    /**
     * Marks all empty adjacent cells around a sunken ship with CELL_STATE.HALO
     */
    _markHaloAroundShip(ship) {
      const halo = [];
      const coords = ship.getCoordinates();
      for (let c of coords) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = c.x + dx;
            const ny = c.y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
              if (this.grid[ny][nx] === CELL_STATE.EMPTY) {
                this.grid[ny][nx] = CELL_STATE.HALO;
                halo.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
      return halo;
    }

    areAllShipsSunk() {
      return this.ships.length > 0 && this.ships.every(s => s.sunk);
    }

    getRemainingShipsCount() {
      const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
      for (let s of this.ships) {
        if (!s.sunk) {
          counts[s.size] = (counts[s.size] || 0) + 1;
        }
      }
      return counts;
    }

    serializeFleet() {
      return this.ships.map(s => ({
        id: s.id,
        type: s.type,
        size: s.size,
        x: s.x,
        y: s.y,
        horizontal: s.horizontal
      }));
    }

    deserializeFleet(shipsData) {
      this.clear();
      if (!Array.isArray(shipsData)) return false;
      for (let s of shipsData) {
        this.placeShip(s.id, s.type, s.size, s.x, s.y, s.horizontal);
      }
      return this.isFleetComplete();
    }
  }

  global.BattleshipCore = {
    GRID_SIZE,
    COL_LETTERS,
    FLEET_SPEC,
    CELL_STATE,
    Ship,
    Board,
    formatCoordinate: (x, y) => `${COL_LETTERS[x]}${y + 1}`
  };

})(typeof window !== 'undefined' ? window : globalThis);
