/**
 * MEOWBLOOM: SECRET OF THE GREAT GARDEN (farm_audio.js)
 * Zero-dependency Web Audio API procedural sound & ambient music engine.
 * Generates cozy adaptive background melodies for each biome and pleasant game SFX.
 */

(function (global) {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;

  let isMuted = false;
  let musicVolume = 0.35;
  let sfxVolume = 0.5;

  let currentBiome = 'farm';
  let musicInterval = null;
  let isMusicPlaying = false;

  // Scales for Biomes (MIDI note numbers)
  const SCALES = {
    farm: [60, 62, 64, 67, 69, 72],       // C Major Pentatonic (Cozy, bright)
    forest: [57, 60, 62, 65, 67, 69],     // A Minor Pentatonic (Mystical, leafy)
    lake: [55, 60, 62, 63, 67, 70],       // Calming Lydian/Dorian (Water shimmer)
    quarry: [58, 61, 65, 68, 70, 73],     // Crystal chimes
    greenhouse: [60, 64, 67, 71, 72, 76], // Dreamy major 7th (Bloom)
    altar: [53, 58, 60, 65, 67, 72]       // Celestial fifths & octaves
  };

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);

      musicGain = audioCtx.createGain();
      musicGain.gain.setValueAtTime(isMuted ? 0 : musicVolume, audioCtx.currentTime);
      musicGain.connect(masterGain);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.setValueAtTime(isMuted ? 0 : sfxVolume, audioCtx.currentTime);
      sfxGain.connect(masterGain);

      // Load saved audio settings
      const saved = localStorage.getItem('meowbloom_audio_settings');
      if (saved) {
        try {
          const cfg = JSON.parse(saved);
          if (cfg.isMuted !== undefined) isMuted = cfg.isMuted;
          if (cfg.musicVolume !== undefined) musicVolume = cfg.musicVolume;
          if (cfg.sfxVolume !== undefined) sfxVolume = cfg.sfxVolume;
          applyVolumes();
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Web Audio not available', e);
    }
  }

  function applyVolumes() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    musicGain.gain.setValueAtTime(isMuted ? 0 : musicVolume, now);
    sfxGain.gain.setValueAtTime(isMuted ? 0 : sfxVolume, now);

    try {
      localStorage.setItem('meowbloom_audio_settings', JSON.stringify({ isMuted, musicVolume, sfxVolume }));
    } catch (e) {}
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Play a soft kalimba / chime note for background ambient music
  function playMelodyNote(note, duration = 0.8, type = 'sine') {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(midiToFreq(note), now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(musicGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Background Ambient Music Generator
  function startMusicLoop() {
    if (musicInterval) clearInterval(musicInterval);
    isMusicPlaying = true;

    let step = 0;
    musicInterval = setInterval(() => {
      if (!audioCtx || isMuted) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const scale = SCALES[currentBiome] || SCALES.farm;
      // Probabilistic gentle arpeggio
      if (Math.random() < 0.75) {
        const noteIdx = Math.floor(Math.random() * scale.length);
        const octaveOffset = (step % 8 === 0) ? -12 : (Math.random() > 0.7 ? 12 : 0);
        const note = scale[noteIdx] + octaveOffset;
        playMelodyNote(note, 1.2, currentBiome === 'quarry' ? 'triangle' : 'sine');
      }

      // Occasional low bass drone note
      if (step % 8 === 0) {
        const bassNote = scale[0] - 24;
        playMelodyNote(bassNote, 2.8, 'triangle');
      }

      step++;
    }, 450);
  }

  function stopMusicLoop() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
    isMusicPlaying = false;
  }

  function setBiome(biomeId) {
    if (currentBiome !== biomeId) {
      currentBiome = biomeId;
      // Play brief ambient chime when transitioning
      playSfx('transition');
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS
  // ==========================================
  function playSfx(type) {
    initAudio();
    if (!audioCtx || isMuted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    switch (type) {
      case 'pollen': {
        // High playful bubble pop
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'harvest': {
        // Bright pleasant two-tone chime
        [72, 79].forEach((note, i) => {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(midiToFreq(note), now + i * 0.08);
          g.gain.setValueAtTime(0.001, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.4, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.36);
        });
        break;
      }

      case 'plant': {
        // Soft rustle / thud
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
        g.gain.setValueAtTime(0.35, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case 'water': {
        // Water splash trickle
        for (let i = 0; i < 3; i++) {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400 + Math.random() * 200, now + i * 0.05);
          osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 200, now + i * 0.05 + 0.07);
          g.gain.setValueAtTime(0.2, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.07);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.08);
        }
        break;
      }

      case 'chop': {
        // Woodchop thump
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      }

      case 'mine': {
        // Metallic pickaxe ping
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        g.gain.setValueAtTime(0.45, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'combo': {
        // Rising power-up pitch
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        g.gain.setValueAtTime(0.35, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.21);
        break;
      }

      case 'levelup': {
        // Fanfare chord (C - E - G - C)
        [60, 64, 67, 72].forEach((note, i) => {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(midiToFreq(note), now + i * 0.1);
          g.gain.setValueAtTime(0.001, now + i * 0.1);
          g.gain.linearRampToValueAtTime(0.5, now + i * 0.1 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.65);
        });
        break;
      }

      case 'meow': {
        // Cute cat meow slide
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.linearRampToValueAtTime(920, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.28);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.3, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'transition': {
        // Soft wind chime
        [72, 76, 79].forEach((note, i) => {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(note), now + i * 0.12);
          g.gain.setValueAtTime(0.001, now + i * 0.12);
          g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.7);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.75);
        });
        break;
      }
    }
  }

  // Toggle Mute
  function toggleMute() {
    initAudio();
    isMuted = !isMuted;
    applyVolumes();
    return isMuted;
  }

  function setMusicVolume(val) {
    initAudio();
    musicVolume = Math.max(0, Math.min(1, val));
    applyVolumes();
  }

  function setSfxVolume(val) {
    initAudio();
    sfxVolume = Math.max(0, Math.min(1, val));
    applyVolumes();
  }

  // Export API
  global.MeowBloomAudio = {
    init: initAudio,
    startMusic: startMusicLoop,
    stopMusic: stopMusicLoop,
    setBiome: setBiome,
    playSfx: playSfx,
    toggleMute: toggleMute,
    setMusicVolume: setMusicVolume,
    setSfxVolume: setSfxVolume,
    getSettings: () => ({ isMuted, musicVolume, sfxVolume })
  };

})(window);
