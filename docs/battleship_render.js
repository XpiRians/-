/**
 * INFINITE GALLERY: BATTLESHIP (battleship_render.js)
 * High-performance 2D Canvas & Particle Animation Engine:
 * - Ballistic artillery shell flight arcs with smoke trails
 * - Fiery explosions on hits with expanding blast waves & burning embers
 * - Water splashes with droplet physics and spreading ripple rings
 * - Burning flame animations on damaged ship tiles
 * - Floating tactical damage banners ("ПОПАДАНИЕ!", "ПРОМАХ", "ПОТОПЛЕН!")
 */

(function (global) {
  'use strict';

  class BattleFX {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.projectiles = [];
      this.floatingTexts = [];
      this.animId = null;
      this.lastTime = performance.now();
    }

    init(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this._startLoop();
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth || document.documentElement.clientWidth || 800;
      this.canvas.height = window.innerHeight || document.documentElement.clientHeight || 600;
    }

    _startLoop() {
      const loop = (time) => {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        this.update(dt);
        this.render();
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }

    update(dt) {
      // 1. Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.progress += dt / p.duration;

        // Spawn smoke trail particles
        if (Math.random() < 0.6) {
          const currentPos = this._getArcPos(p.fromX, p.fromY, p.toX, p.toY, p.progress, p.arcHeight);
          this.particles.push({
            x: currentPos.x + (Math.random() - 0.5) * 4,
            y: currentPos.y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 15,
            vy: -Math.random() * 20,
            radius: Math.random() * 3 + 2,
            color: 'rgba(203, 213, 225, 0.4)',
            life: 1.0,
            decay: 2.5
          });
        }

        if (p.progress >= 1.0) {
          // Impact reached! Remove projectile first, then trigger callback safely
          const callback = p.onImpact;
          this.projectiles.splice(i, 1);
          if (callback) {
            try {
              callback();
            } catch (err) {
              console.error('Projectile onImpact callback error:', err);
            }
          }
        }
      }

      // 2. Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.gravity) pt.vy += pt.gravity * dt;
        pt.life -= pt.decay * dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // 3. Update Floating Texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 25 * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    render() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 1. Draw Projectiles
      for (let p of this.projectiles) {
        const pos = this._getArcPos(p.fromX, p.fromY, p.toX, p.toY, p.progress, p.arcHeight);
        this.ctx.save();
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // 2. Draw Particles
      for (let pt of this.particles) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, pt.life);
        this.ctx.fillStyle = pt.color;
        if (pt.glow) {
          this.ctx.shadowColor = pt.glow;
          this.ctx.shadowBlur = 10;
        }
        if (pt.type === 'ring') {
          this.ctx.strokeStyle = pt.color;
          this.ctx.lineWidth = 2.5;
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          this.ctx.stroke();
        } else {
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      }

      // 3. Draw Floating Texts
      for (let ft of this.floatingTexts) {
        this.ctx.save();
        this.ctx.font = 'bold 18px "Inter", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        this.ctx.shadowColor = ft.glow || '#000000';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = ft.color;
        this.ctx.fillText(ft.text, ft.x, ft.y);
        this.ctx.restore();
      }
    }

    _getArcPos(x0, y0, x1, y1, t, arcH) {
      const curT = Math.max(0, Math.min(1, t));
      const curX = x0 + (x1 - x0) * curT;
      const linearY = y0 + (y1 - y0) * curT;
      // Parabolic arc displacement
      const arcOffset = 4 * arcH * curT * (1 - curT);
      return { x: curX, y: linearY - arcOffset };
    }

    /**
     * Launch an artillery shell from (fromX, fromY) to (toX, toY)
     */
    launchShell(fromX, fromY, toX, toY, onImpact) {
      const validFromX = isFinite(fromX) ? fromX : 100;
      const validFromY = isFinite(fromY) ? fromY : 100;
      const validToX = isFinite(toX) ? toX : 200;
      const validToY = isFinite(toY) ? toY : 200;

      const dist = Math.hypot(validToX - validFromX, validToY - validFromY) || 100;
      const duration = Math.max(0.35, Math.min(0.75, dist / 650));
      const arcHeight = Math.min(180, Math.max(50, dist * 0.22));

      let executed = false;
      const safeImpact = () => {
        if (executed) return;
        executed = true;
        if (onImpact) {
          try {
            onImpact();
          } catch (err) {
            console.error('Impact execution error:', err);
          }
        }
      };

      const proj = {
        fromX: validFromX,
        fromY: validFromY,
        toX: validToX,
        toY: validToY,
        progress: 0,
        duration,
        arcHeight,
        onImpact: safeImpact
      };

      this.projectiles.push(proj);

      // Watchdog fallback in case browser throttles requestAnimationFrame or tab is blurred
      setTimeout(() => {
        if (!executed) {
          const idx = this.projectiles.indexOf(proj);
          if (idx !== -1) this.projectiles.splice(idx, 1);
          safeImpact();
        }
      }, Math.round(duration * 1000) + 200);
    }

    /**
     * Spawn water splash effect on miss
     */
    spawnWaterSplash(x, y) {
      // 1. Spreading shockwave rings
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          type: 'ring',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 6,
          color: 'rgba(56, 189, 248, 0.75)',
          life: 0.6 + i * 0.2,
          decay: 1.6,
          glow: '#0284c7'
        });
      }

      // 2. Upward water droplets
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 70 + 40;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd * 0.6,
          vy: -Math.abs(Math.sin(ang)) * spd - 30,
          gravity: 280,
          radius: Math.random() * 2.5 + 1.5,
          color: '#bae6fd',
          life: 1.0,
          decay: 2.0
        });
      }

      this.spawnFloatingText(x, y - 10, 'ПРОМАХ', '#7dd3fc', '#0369a1');
    }

    /**
     * Spawn fire & smoke explosion on hit
     */
    spawnExplosion(x, y, isSunk = false) {
      const count = isSunk ? 45 : 28;
      // 1. Fiery explosion sparks & embers
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * (isSunk ? 140 : 90) + 30;
        const isEmber = Math.random() > 0.4;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (isEmber ? 20 : 0),
          gravity: isEmber ? 120 : 0,
          radius: Math.random() * (isSunk ? 4.5 : 3.5) + 1.5,
          color: isEmber ? (Math.random() > 0.5 ? '#ef4444' : '#f97316') : '#fde047',
          glow: '#ef4444',
          life: 1.0,
          decay: Math.random() * 1.5 + 1.2
        });
      }

      // 2. Black smoke puff
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 16,
          y: y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 20,
          vy: -Math.random() * 35 - 15,
          radius: Math.random() * 8 + 6,
          color: 'rgba(30, 41, 59, 0.7)',
          life: 1.0,
          decay: 1.4
        });
      }

      if (isSunk) {
        this.spawnFloatingText(x, y - 14, '💥 КОРАБЛЬ ПОТОПЛЕН!', '#f87171', '#991b1b', 2.0);
      } else {
        this.spawnFloatingText(x, y - 10, '🔥 ПОПАДАНИЕ!', '#facc15', '#b45309');
      }
    }

    spawnFloatingText(x, y, text, color = '#ffffff', glow = '#000000', duration = 1.4) {
      this.floatingTexts.push({
        x,
        y,
        text,
        color,
        glow,
        life: duration,
        maxLife: duration
      });
    }

    clear() {
      this.particles = [];
      this.projectiles = [];
      this.floatingTexts = [];
    }
  }

  global.BattleshipRender = {
    BattleFX
  };

})(typeof window !== 'undefined' ? window : globalThis);
