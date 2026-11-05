/**
 * INFINITE GALLERY: BATTLESHIP (battleship_ai.js)
 * High-performance, intelligent Naval AI: "Адмирал Мяу" (Admiral Meow)
 * - Two-phase strategy:
 *     1. Hunt Mode (Parity checkerboard scanning optimized for largest remaining ships)
 *     2. Target Mode (Cardinal direction probing, orientation discovery, line-fire pursuit)
 * - Zero cheating: AI never peeks at player's board, only uses past shot history and halo rules!
 */

(function (global) {
  'use strict';

  class NavalAI {
    constructor(difficulty = 'normal') {
      this.difficulty = difficulty;
      this.gridSize = 10;
      this.reset();
    }

    reset() {
      // Set of tried coordinates: key 'x,y'
      this.shots = new Set();
      // List of hits on currently unsunk ship(s)
      this.currentHits = [];
      // Potential candidate targets queue [{x, y}]
      this.targetQueue = [];
    }

    /**
     * Notify AI of shot result on opponent board
     */
    registerShotResult(x, y, result, sunkShip = null, halo = []) {
      this.shots.add(`${x},${y}`);

      // Add all halo cells around a sunk ship to known shots so AI never wastes shots on them
      if (halo && Array.isArray(halo)) {
        for (let h of halo) {
          this.shots.add(`${h.x},${h.y}`);
        }
      }

      if (result === 'hit') {
        this.currentHits.push({ x, y });
        this._updateTargetQueue();
      } else if (result === 'sunk') {
        // Ship is sunk! Remove all hits belonging to this sunk ship
        if (sunkShip && sunkShip.getCoordinates) {
          const sunkCoords = sunkShip.getCoordinates();
          this.currentHits = this.currentHits.filter(
            h => !sunkCoords.some(sc => sc.x === h.x && sc.y === h.y)
          );
        } else {
          this.currentHits = [];
        }
        // Recalculate target queue in case there are hits on another overlapping ship
        this._updateTargetQueue();
      }
    }

    /**
     * Generate the next shot coordinates {x, y}
     */
    chooseNextShot(remainingShips = { 4: 1, 3: 2, 2: 3, 1: 4 }) {
      // 1. Target Mode: if we have hit an unsunk ship, pursue it!
      while (this.targetQueue.length > 0) {
        const candidate = this.targetQueue.shift();
        const key = `${candidate.x},${candidate.y}`;
        if (!this.shots.has(key) && this._isValidCoord(candidate.x, candidate.y)) {
          return candidate;
        }
      }

      // 2. Hunt Mode: pick cell using parity and probability
      // Determine largest unsunk ship size to optimize parity step
      let largestSize = 1;
      if (remainingShips[4] > 0) largestSize = 4;
      else if (remainingShips[3] > 0) largestSize = 3;
      else if (remainingShips[2] > 0) largestSize = 2;

      // Collect all legal unshot coordinates
      const unshotCells = [];
      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (!this.shots.has(`${x},${y}`)) {
            unshotCells.push({ x, y });
          }
        }
      }

      if (unshotCells.length === 0) return { x: -1, y: -1 };

      // Priority 1: Check parity cells based on largest remaining ship size
      const parityMod = largestSize >= 3 ? 2 : 1;
      const parityCells = unshotCells.filter(c => (c.x + c.y) % parityMod === 0);

      const candidatePool = parityCells.length > 0 ? parityCells : unshotCells;

      // Select random cell from the preferred candidate pool
      const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)];
      return pick;
    }

    _updateTargetQueue() {
      this.targetQueue = [];
      if (!this.currentHits || this.currentHits.length === 0) return;

      const addCandidate = (cx, cy) => {
        const key = `${cx},${cy}`;
        if (this._isValidCoord(cx, cy) && !this.shots.has(key) && !this.targetQueue.some(t => t.x === cx && t.y === cy)) {
          this.targetQueue.push({ x: cx, y: cy });
        }
      };

      if (this.currentHits.length === 1) {
        // Only 1 hit so far: test all 4 adjacent cardinal directions
        const h = this.currentHits[0];
        const deltas = [
          { x: 0, y: -1 }, // North
          { x: 1, y: 0 },  // East
          { x: 0, y: 1 },  // South
          { x: -1, y: 0 }  // West
        ];
        // Shuffle deltas to avoid predictable shooting patterns
        deltas.sort(() => Math.random() - 0.5);

        for (let d of deltas) {
          addCandidate(h.x + d.x, h.y + d.y);
        }
      } else {
        // 2 or more hits: check collinearity
        const isHorizontal = this.currentHits.every(h => h.y === this.currentHits[0].y);
        const isVertical = this.currentHits.every(h => h.x === this.currentHits[0].x);

        if (isHorizontal) {
          const y = this.currentHits[0].y;
          const xs = this.currentHits.map(h => h.x).sort((a, b) => a - b);
          const minX = xs[0];
          const maxX = xs[xs.length - 1];

          // Check left and right ends
          addCandidate(minX - 1, y);
          addCandidate(maxX + 1, y);
        } else if (isVertical) {
          const x = this.currentHits[0].x;
          const ys = this.currentHits.map(h => h.y).sort((a, b) => a - b);
          const minY = ys[0];
          const maxY = ys[ys.length - 1];

          // Check top and bottom ends
          addCandidate(x, minY - 1);
          addCandidate(x, maxY + 1);
        } else {
          // Hits span multiple wounded ships: probe around each hit
          for (let h of this.currentHits) {
            const deltas = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
            for (let d of deltas) {
              addCandidate(h.x + d.x, h.y + d.y);
            }
          }
        }
      }
    }

    _isValidCoord(x, y) {
      return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
    }
  }

  global.BattleshipAI = {
    NavalAI
  };

})(typeof window !== 'undefined' ? window : globalThis);
