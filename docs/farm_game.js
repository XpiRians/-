/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (farm_game.js)
 * Master Bootstrap Controller:
 * Orchestrates Audio, Data, Engine, Renderer and UI into a cohesive 60fps experience.
 */

(function () {
  'use strict';

  let canvas = null;
  let lastTime = performance.now();

  function start() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // 1. Initialize Audio Engine
    if (window.MeowBloomAudio) {
      window.MeowBloomAudio.init();
      // Start ambient music loop on first user interaction
      const enableAudio = () => {
        window.MeowBloomAudio.startMusic();
        window.removeEventListener('click', enableAudio);
        window.removeEventListener('keydown', enableAudio);
      };
      window.addEventListener('click', enableAudio, { once: true });
      window.addEventListener('keydown', enableAudio, { once: true });
    }

    // 2. Initialize Core Simulation Engine
    if (window.MeowBloomEngine) {
      window.MeowBloomEngine.init();
    }

    // 3. Initialize Canvas Renderer
    if (window.MeowBloomRender) {
      window.MeowBloomRender.init(canvas);
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    // 4. Initialize User Interface & Input Controllers
    if (window.MeowBloomUI) {
      window.MeowBloomUI.init();
    }

    // 5. Start Master Game Loop
    requestAnimationFrame(mainLoop);
  }

  function handleResize() {
    if (!canvas) return;
    const container = document.getElementById('gameViewportContainer');
    if (!container) return;
    const w = container.clientWidth || 960;
    const h = container.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
    if (window.MeowBloomRender) {
      window.MeowBloomRender.resize(w, h);
    }
  }

  function mainLoop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // 1. Update Simulation
    if (window.MeowBloomEngine && window.MeowBloomUI) {
      const keys = window.MeowBloomUI.getKeys ? window.MeowBloomUI.getKeys() : {};
      const touch = window.MeowBloomUI.getTouch ? window.MeowBloomUI.getTouch() : {};
      window.MeowBloomEngine.update(dt, keys, touch);
    }

    // 2. Render Frame
    if (window.MeowBloomRender) {
      window.MeowBloomRender.render(dt);
    }

    // 3. Sync Top HUD
    if (window.MeowBloomUI) {
      window.MeowBloomUI.updateHUD();
    }

    requestAnimationFrame(mainLoop);
  }

  window.addEventListener('DOMContentLoaded', start);

})();
