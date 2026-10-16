// content.js - In-game HUD and real-time map calculator for Solana Bombers

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__SB_CHEST_CALC_INJECTED__) {
    // Already injected, but let it respond to messages
    return;
  }
  window.__SB_CHEST_CALC_INJECTED__ = true;

  // Default values
  const DEFAULT_VALUES = {
    woodReward: 35.625,
    metalReward: 81.25,
    goldReward: 406.25,
    diamondReward: 812.5,
    woodHp: 80,
    metalHp: 170,
    goldHp: 800,
    diamondHp: 1300,
    prisonHp: 2000,
    soundEnabled: true,
    hudVisible: true,
    compactMode: false,
    startDate: '2026-10-12T09:00',
    startingBombers: 0,
    tokenPriceUsd: 0.0005113,
    usdPhpRate: 63.08,
    investmentPhp: 0
  };

  let settings = { ...DEFAULT_VALUES };

  // Current state
  let gameState = {
    isInGame: false,
    balance: 0,
    session: 0,
    mapSeq: '-',
    chests: {
      3: 0, // Wood
      4: 0, // Metal
      5: 0, // Gold
      6: 0, // Diamond
      7: 0  // Prison
    },
    mapYield: 0,
    projectedTotal: 0,
    totalHp: 0,
    totalChests: 0,
    hasPrison: false,
    prisonAlertedThisMap: false,
    lastMapSeq: null,
    teamStats: null
  };

  let scanTimer = null;

  function isExtensionValid() {
    try {
      return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function safeSendMessage(msg) {
    if (!isExtensionValid()) return;
    try {
      chrome.runtime.sendMessage(msg).catch(() => {});
    } catch (e) {
      // Context was invalidated, gracefully ignore
    }
  }

  // --- IMMEDIATE MESSAGE LISTENER (Registered right at startup) ---
  if (isExtensionValid() && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.type === 'GET_SB_CALC_DATA') {
          scanDomDirectly();
          sendResponse({
            success: true,
            state: gameState,
            settings: settings
          });
          return false; // Synchronous response
        } else if (request.type === 'PLAY_TEST_SOUND') {
          playPrisonAlarm();
          sendResponse({ success: true });
          return false;
        } else if (request.type === 'RESET_HUD_POSITION') {
          try {
            localStorage.removeItem('sb_calc_hud_pos');
          } catch (e) {}
          setDefaultHudPosition();
          sendResponse({ success: true });
          return false;
        }
      } catch (err) {
        console.error('[SolanaBombersCalc] onMessage error:', err);
        sendResponse({ success: false, error: err.message });
        return false;
      }
    });
  }

  // --- WEB AUDIO API FOR PRISON ALARM ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playPrisonAlarm() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // 8-bit fanfare sequence: C5, E5, G5, C6, G5, C6
      const notes = [
        { freq: 523.25, start: 0.00, dur: 0.12 },
        { freq: 659.25, start: 0.12, dur: 0.12 },
        { freq: 783.99, start: 0.24, dur: 0.14 },
        { freq: 1046.50, start: 0.38, dur: 0.35 },
        { freq: 783.99, start: 0.75, dur: 0.12 },
        { freq: 1046.50, start: 0.88, dur: 0.50 }
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        gain.gain.setValueAtTime(0.18, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.05);
      });
    } catch (e) {
      console.warn('[SolanaBombersCalc] Audio error:', e);
    }
  }

  // Inject inpage.js into MAIN world (safe try/catch)
  function injectInpageScript() {
    try {
      if (document.getElementById('sb-inpage-script')) return;
      const script = document.createElement('script');
      script.id = 'sb-inpage-script';
      script.src = chrome.runtime.getURL('inpage.js');
      script.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      // Inpage injection can be blocked by CSP, but DOM scanner handles everything anyway
    }
  }

  // Load settings from storage
  function loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(DEFAULT_VALUES, items => {
          settings = { ...DEFAULT_VALUES, ...items };
          updateHudUI();
        });
      }
    } catch (e) {}
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        for (const [key, change] of Object.entries(changes)) {
          settings[key] = change.newValue;
        }
        updateHudUI();
      }
    });
  }

  // Listen for messages from inpage.js
  window.addEventListener('message', event => {
    try {
      if (event.source !== window || !event.data || event.data.type !== 'SOLANA_BOMBERS_MAP_SYNC') return;
      const data = event.data;
      if (data.balanceText) {
        gameState.balance = parseNumber(data.balanceText);
      }
      if (data.sessionText) {
        gameState.session = parseNumber(data.sessionText);
      }
      if (data.mapText) {
        const m = data.mapText.match(/\d+/);
        gameState.mapSeq = m ? m[0] : gameState.mapSeq;
      }
      if (data.chestCounts) {
        // If inpage found non-zero chests, merge them
        const hasAny = Object.values(data.chestCounts).some(v => v > 0);
        if (hasAny) {
          gameState.chests = { ...gameState.chests, ...data.chestCounts };
        }
      }
      gameState.isInGame = true;
      recalculate();
    } catch (e) {}
  });

  function parseNumber(text) {
    if (!text) return 0;
    const clean = text.replace(/,/g, '');
    const match = clean.match(/[-+]?[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  // --- COMPREHENSIVE DOM SCANNER ---
  const imageColorCache = new Map();

  function classifyImage(img) {
    if (!img) return null;
    const src = img.src || '';
    if (imageColorCache.has(src)) {
      return imageColorCache.get(src);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 16, 16);
      const imgData = ctx.getImageData(0, 0, 16, 16).data;

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        if (imgData[i + 3] > 60) {
          rSum += imgData[i];
          gSum += imgData[i + 1];
          bSum += imgData[i + 2];
          count++;
        }
      }

      if (count === 0) return null;
      const avgR = rSum / count;
      const avgG = gSum / count;
      const avgB = bSum / count;

      let blockType = null;
      // Diamond: bright cyan/blue
      if (avgB > 180 && avgG > 160 && avgR < 170) {
        blockType = 6;
      }
      // Gold: bright yellow/gold
      else if (avgR > 200 && avgG > 150 && avgB < 120) {
        blockType = 5;
      }
      // Wood: warm brown
      else if (avgR > 130 && avgG < 140 && avgB < 90 && avgR > avgG) {
        blockType = 3;
      }
      // Metal: grey/steel blue
      else if (avgR >= 130 && avgG >= 130 && avgB >= 140 && avgB >= avgR - 20) {
        blockType = 4;
      }
      // Prison: grey iron bars / dark purple
      else if (avgR < 140 && avgG < 140 && avgB < 160) {
        blockType = 7;
      }

      if (blockType) {
        imageColorCache.set(src, blockType);
      }
      return blockType;
    } catch (e) {
      return null;
    }
  }

  function scanDomDirectly() {
    if (!isExtensionValid()) {
      if (scanTimer) clearInterval(scanTimer);
      return;
    }
    try {
      // Find the HUD top bar across all possible game container variations
      const hudTop = document.querySelector('.hud-top') ||
                     document.querySelector('[data-testid="hunt-hud"] .hud-top') ||
                     document.querySelector('.hud > div.hud-top') ||
                     document.querySelector('.stage.hunting .hud-top') ||
                     document.querySelector('div.stage.hunting.heroes-open > div.hud > div.hud-top');

      if (!hudTop) {
        gameState.isInGame = false;
        updateHudUI();
        return;
      }

      gameState.isInGame = true;

      // 1. Balance: span.chip.gold.counter
      const balanceChip = hudTop.querySelector('span.chip.gold.counter') ||
                          document.querySelector('div.hud-top > span.chip.gold.counter') ||
                          hudTop.querySelector('.chip.gold');
      if (balanceChip) {
        const parsed = parseNumber(balanceChip.textContent);
        if (parsed > 0) gameState.balance = parsed;
      }

      // 2. Session & Map Sequence
      const allChips = Array.from(hudTop.querySelectorAll('span.chip, span.chip.counter'));
      allChips.forEach(c => {
        const text = (c.textContent || '').trim();
        if (text.includes('this session')) {
          gameState.session = parseNumber(text);
        } else if (text.includes('MAP ')) {
          const m = text.match(/\d+/);
          if (m) gameState.mapSeq = m[0];
        }
      });

      // 3. Extract Chest Chips
      // First, try .chip.chest-count
      let chestChips = Array.from(hudTop.querySelectorAll('.chip.chest-count'));

      // Fallback: If no .chip.chest-count, filter all non-system chips
      if (chestChips.length === 0) {
        chestChips = allChips.filter(chip => {
          const text = (chip.textContent || '').trim();
          if (chip.classList.contains('gold') || text.includes('BOMBERS')) return false;
          if (text.includes('session')) return false;
          if (text.includes('MAP')) return false;
          if (text.includes('WORKING')) return false;
          if (text.includes('BUTLER')) return false;
          // Must contain a number or img
          return /\d+/.test(text) && chip.querySelector('img');
        });
      }

      const newChests = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      let foundAny = false;

      // Check specific user-provided nth-child selectors as well
      const userSelectors = {
        3: hudTop.querySelector('span:nth-child(6)'),
        4: hudTop.querySelector('span:nth-child(7)'),
        5: hudTop.querySelector('span:nth-child(8)'),
        6: hudTop.querySelector('span:nth-child(9)'),
        7: hudTop.querySelector('span:nth-child(10)')
      };

      // Try image color classification first
      if (chestChips.length > 0) {
        chestChips.forEach((chip, index) => {
          const img = chip.querySelector('img');
          const count = parseInt((chip.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
          const type = classifyImage(img);

          if (type && newChests[type] !== undefined) {
            newChests[type] = count;
            foundAny = true;
          }
        });

        // If color classification didn't resolve all, fallback to DOM sequence [3, 4, 5, 6, 7]
        if (!foundAny) {
          const sequence = [3, 4, 5, 6, 7];
          chestChips.forEach((chip, idx) => {
            if (idx < sequence.length) {
              const blockId = sequence[idx];
              const count = parseInt((chip.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
              newChests[blockId] = count;
              foundAny = true;
            }
          });
        }
      }

      // If still nothing, check user selectors directly
      if (!foundAny) {
        for (const [id, el] of Object.entries(userSelectors)) {
          if (el) {
            const count = parseInt((el.textContent || '').replace(/[^\d]/g, ''), 10);
            if (!isNaN(count) && count >= 0) {
              newChests[id] = count;
              foundAny = true;
            }
          }
        }
      }

      if (foundAny) {
        gameState.chests = newChests;
      }

      // 4. Scan Heroes, Powers, Energies & Regen if hero drawer/list is present
      const heroRows = document.querySelectorAll('.hero-list .hero-row');
      if (heroRows && heroRows.length > 0) {
        let totalPower = 0;
        let totalCurEnergy = 0;
        let totalMaxEnergy = 0;
        let workingCount = 0;
        let sleepingCount = 0;
        let houseCount = 0;

        heroRows.forEach(row => {
          const tiny = row.querySelector('.tiny');
          if (tiny) {
            const text = (tiny.textContent || '').trim();
            const m = text.match(/(\d+)\/(\d+)\s*·\s*P(\d+)\s*S(\d+)\s*B(\d+)\s*R(\d+)\s*·\s*([a-zA-Z\s]+)/i);
            if (m) {
              const curE = parseInt(m[1], 10) || 0;
              const maxE = parseInt(m[2], 10) || 0;
              const pwr = parseInt(m[3], 10) || 0;
              const mode = (m[7] || '').trim().toLowerCase();

              totalCurEnergy += curE;
              totalMaxEnergy += maxE;
              totalPower += pwr;

              if (mode.includes('work')) workingCount++;
              else if (mode.includes('house')) houseCount++;
              else sleepingCount++;
            }
          }
        });

        gameState.teamStats = {
          heroCount: heroRows.length,
          totalPower,
          totalCurEnergy,
          totalMaxEnergy,
          workingCount,
          sleepingCount,
          houseCount,
          // Base recovery: 0.5 energy/min per resting hero; houses give 2-5 energy/min
          estRegenPerMin: (sleepingCount * 0.5) + (houseCount * 3.0)
        };
      }

      recalculate();
    } catch (err) {
      console.warn('[SolanaBombersCalc] scan error:', err);
    }
  }

  function recalculate() {
    const w = gameState.chests[3] || 0;
    const m = gameState.chests[4] || 0;
    const g = gameState.chests[5] || 0;
    const d = gameState.chests[6] || 0;
    const p = gameState.chests[7] || 0;

    const wReward = w * settings.woodReward;
    const mReward = m * settings.metalReward;
    const gReward = g * settings.goldReward;
    const dReward = d * settings.diamondReward;

    gameState.mapYield = wReward + mReward + gReward + dReward;
    gameState.projectedTotal = gameState.balance + gameState.mapYield;
    gameState.totalHp = (w * settings.woodHp) + (m * settings.metalHp) + (g * settings.goldHp) + (d * settings.diamondHp) + (p * settings.prisonHp);
    gameState.totalChests = w + m + g + d;
    gameState.hasPrison = (p > 0);

    // Map change reset for prison alert
    if (gameState.lastMapSeq !== gameState.mapSeq && gameState.mapSeq !== '-') {
      gameState.lastMapSeq = gameState.mapSeq;
      gameState.prisonAlertedThisMap = false;
    }

    // Trigger Prison Alert!
    if (gameState.hasPrison && !gameState.prisonAlertedThisMap) {
      gameState.prisonAlertedThisMap = true;
      playPrisonAlarm();

      safeSendMessage({
        type: 'PRISON_DETECTED',
        mapSeq: gameState.mapSeq,
        prisonCount: p
      });
    }

    updateHudUI();

    // Broadcast update to background & popup
    safeSendMessage({
      type: 'SB_CALC_DATA_UPDATE',
      state: gameState
    });
  }

  // --- FLOATING HUD WIDGET ---
  let hudContainer = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function formatNum(val, decimals = 2) {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function createHudWidget() {
    try {
      if (document.getElementById('sb-chest-calc-widget')) {
        hudContainer = document.getElementById('sb-chest-calc-widget');
        return;
      }

      if (!document.body) {
        setTimeout(createHudWidget, 200);
        return;
      }

      hudContainer = document.createElement('div');
      hudContainer.id = 'sb-chest-calc-widget';
      hudContainer.className = 'sb-hud-card';

      // Restore saved position
      try {
        const savedPos = localStorage.getItem('sb_calc_hud_pos');
        if (savedPos) {
          const { x, y } = JSON.parse(savedPos);
          hudContainer.style.left = `${Math.max(10, Math.min(window.innerWidth - 300, x))}px`;
          hudContainer.style.top = `${Math.max(10, Math.min(window.innerHeight - 300, y))}px`;
        } else {
          setDefaultHudPosition();
        }
      } catch (e) {
        setDefaultHudPosition();
      }

      hudContainer.innerHTML = `
        <div class="sb-hud-header" id="sb-hud-drag-handle">
          <div class="sb-hud-title">
            <span class="sb-logo-dot"></span>
            <span>BOMBERS CALC</span>
          </div>
          <div class="sb-hud-controls">
            <button class="sb-btn-icon" id="sb-hud-sound-toggle" title="Toggle Prison Alarm Sound">🔔</button>
            <button class="sb-btn-icon" id="sb-hud-compact-toggle" title="Toggle Compact Mode">🗕</button>
            <button class="sb-btn-icon sb-btn-close" id="sb-hud-close" title="Hide Widget">✕</button>
          </div>
        </div>

        <div class="sb-hud-body" id="sb-hud-full-body">
          <!-- Waiting Banner when not in map -->
          <div class="sb-waiting-msg" id="sb-waiting-msg" style="display: none;">
            <span>⚔️ Waiting for Map... (Enter Treasure Hunt)</span>
          </div>

          <!-- Prison Alert Banner -->
          <div class="sb-prison-banner sb-prison-none" id="sb-prison-banner">
            <div class="sb-prison-icon" id="sb-prison-icon">🔒</div>
            <div class="sb-prison-text">
              <div class="sb-prison-title" id="sb-prison-title">NO PRISON (0.006%)</div>
              <div class="sb-prison-sub" id="sb-prison-sub">Map - · Destroy blocks for rare spawn</div>
            </div>
          </div>

          <!-- Hero Stats Row -->
          <div class="sb-stat-hero">
            <div class="sb-stat-item">
              <span class="sb-stat-label">REMAINING FROM CHESTS</span>
              <span class="sb-stat-val sb-gold" id="sb-val-map-yield">+0.00 <span class="sb-stat-unit">BOMBERS</span></span>
            </div>
            <div class="sb-stat-item">
              <span class="sb-stat-label">PROJECTED TOTAL</span>
              <span class="sb-stat-val sb-cyan" id="sb-val-projected">0.00 <span class="sb-stat-unit">BOMBERS</span></span>
            </div>
          </div>

          <!-- Breakdown Table -->
          <div class="sb-chest-table-wrap">
            <table class="sb-chest-table">
              <thead>
                <tr>
                  <th>Chest</th>
                  <th>Count</th>
                  <th>Reward</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr class="sb-row-wood">
                  <td><span class="sb-chip-wood">🪵 Wood</span></td>
                  <td id="sb-count-wood">0</td>
                  <td>35.6</td>
                  <td id="sb-sub-wood" class="sb-sub-val">0.00</td>
                </tr>
                <tr class="sb-row-metal">
                  <td><span class="sb-chip-metal">🔩 Metal</span></td>
                  <td id="sb-count-metal">0</td>
                  <td>81.2</td>
                  <td id="sb-sub-metal" class="sb-sub-val">0.00</td>
                </tr>
                <tr class="sb-row-gold">
                  <td><span class="sb-chip-gold">🏆 Gold</span></td>
                  <td id="sb-count-gold">0</td>
                  <td>406.2</td>
                  <td id="sb-sub-gold" class="sb-sub-val">0.00</td>
                </tr>
                <tr class="sb-row-diamond">
                  <td><span class="sb-chip-diamond">💎 Diamond</span></td>
                  <td id="sb-count-diamond">0</td>
                  <td>812.5</td>
                  <td id="sb-sub-diamond" class="sb-sub-val">0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer Stats Bar -->
          <div class="sb-hud-footer">
            <div class="sb-footer-stat">
              <span class="sb-f-label">Chests:</span>
              <span class="sb-f-val" id="sb-val-chest-count">0</span>
            </div>
            <div class="sb-footer-stat">
              <span class="sb-f-label">Total HP:</span>
              <span class="sb-f-val" id="sb-val-total-hp">0 HP</span>
            </div>
            <div class="sb-footer-stat">
              <span class="sb-f-label">Current:</span>
              <span class="sb-f-val sb-gold" id="sb-val-balance">0</span>
            </div>
          </div>

          <!-- Profit & Peso Rate Bar -->
          <div class="sb-hud-profit-bar" id="sb-hud-profit-bar">
            <div class="sb-profit-item">
              <span class="sb-p-label">₱/DAY:</span>
              <span class="sb-p-val sb-cyan" id="sb-hud-daily-php">₱0.00/d</span>
            </div>
            <div class="sb-profit-item">
              <span class="sb-p-label">TOTAL:</span>
              <span class="sb-p-val sb-gold" id="sb-hud-total-php">₱0.00</span>
            </div>
          </div>
        </div>

        <!-- Compact Pill View -->
        <div class="sb-hud-compact" id="sb-hud-compact-body" style="display: none;">
          <span class="sb-compact-yield" id="sb-compact-yield">+0 BOMBERS</span>
          <span class="sb-compact-php" id="sb-compact-php">₱0/d</span>
          <span class="sb-compact-badge" id="sb-compact-prison">🔒 0</span>
        </div>
      `;

      document.body.appendChild(hudContainer);
      setupHudEvents();
      updateHudUI();
    } catch (e) {
      console.warn('[SolanaBombersCalc] createHudWidget error:', e);
    }
  }

  function setDefaultHudPosition() {
    if (!hudContainer) return;
    hudContainer.style.top = '70px';
    hudContainer.style.left = '16px';
  }

  function setupHudEvents() {
    try {
      const handle = document.getElementById('sb-hud-drag-handle');
      const soundBtn = document.getElementById('sb-hud-sound-toggle');
      const compactBtn = document.getElementById('sb-hud-compact-toggle');
      const closeBtn = document.getElementById('sb-hud-close');
      const compactBody = document.getElementById('sb-hud-compact-body');

      if (!handle) return;

      handle.addEventListener('mousedown', e => {
        // Stop drag if clicking on buttons or controls
        if (e.target.closest('button') || e.target.closest('.sb-hud-controls')) return;
        isDragging = true;
        const rect = hudContainer.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        hudContainer.classList.add('sb-is-dragging');
        e.preventDefault();
      });

      document.addEventListener('mousemove', e => {
        if (!isDragging || !hudContainer) return;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        hudContainer.style.left = `${Math.max(6, Math.min(window.innerWidth - 80, x))}px`;
        hudContainer.style.top = `${Math.max(6, Math.min(window.innerHeight - 60, y))}px`;
        hudContainer.style.right = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          if (hudContainer) hudContainer.classList.remove('sb-is-dragging');
          try {
            if (hudContainer) {
              const rect = hudContainer.getBoundingClientRect();
              localStorage.setItem('sb_calc_hud_pos', JSON.stringify({ x: rect.left, y: rect.top }));
            }
          } catch (e) {}
        }
      });

      function stopEvent(e) {
        if (e) {
          e.stopPropagation();
        }
      }

      if (soundBtn) {
        soundBtn.addEventListener('mousedown', stopEvent);
        soundBtn.addEventListener('pointerdown', stopEvent);
        soundBtn.addEventListener('click', e => {
          stopEvent(e);
          settings.soundEnabled = !settings.soundEnabled;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ soundEnabled: settings.soundEnabled }).catch(() => {});
          }
          soundBtn.textContent = settings.soundEnabled ? '🔔' : '🔕';
        });
      }

      if (compactBtn) {
        compactBtn.addEventListener('mousedown', stopEvent);
        compactBtn.addEventListener('pointerdown', stopEvent);
        compactBtn.addEventListener('click', e => {
          stopEvent(e);
          settings.compactMode = !settings.compactMode;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ compactMode: settings.compactMode }).catch(() => {});
          }
          updateCompactView();
        });
      }

      if (compactBody) {
        compactBody.addEventListener('click', e => {
          stopEvent(e);
          settings.compactMode = false;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ compactMode: false }).catch(() => {});
          }
          updateCompactView();
        });
      }

      if (closeBtn) {
        function hideHud(e) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          settings.hudVisible = false;
          if (hudContainer) {
            hudContainer.style.setProperty('display', 'none', 'important');
          }
          try {
            if (isExtensionValid() && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ hudVisible: false }).catch(() => {});
            }
          } catch (err) {}
        }

        closeBtn.addEventListener('mousedown', stopEvent);
        closeBtn.addEventListener('pointerdown', stopEvent);
        closeBtn.addEventListener('click', hideHud);
        closeBtn.addEventListener('mouseup', hideHud);
      }
    } catch (e) {}
  }

  function updateCompactView() {
    const fullBody = document.getElementById('sb-hud-full-body');
    const compactBody = document.getElementById('sb-hud-compact-body');
    const compactBtn = document.getElementById('sb-hud-compact-toggle');

    if (!fullBody || !compactBody) return;

    if (settings.compactMode) {
      fullBody.style.display = 'none';
      compactBody.style.display = 'flex';
      if (compactBtn) compactBtn.textContent = '🗖';
    } else {
      fullBody.style.display = 'block';
      compactBody.style.display = 'none';
      if (compactBtn) compactBtn.textContent = '🗕';
    }
  }

  function updateHudUI() {
    try {
      if (!settings.hudVisible) {
        if (hudContainer) {
          hudContainer.style.setProperty('display', 'none', 'important');
        }
        return;
      }

      if (!hudContainer) {
        createHudWidget();
        return;
      }

      hudContainer.style.display = 'block';
      updateCompactView();

      const soundBtn = document.getElementById('sb-hud-sound-toggle');
      if (soundBtn) {
        soundBtn.textContent = settings.soundEnabled ? '🔔' : '🔕';
      }

      const waitingMsg = document.getElementById('sb-waiting-msg');
      if (waitingMsg) {
        waitingMsg.style.display = gameState.isInGame ? 'none' : 'block';
      }

      // Values
      const mapYieldEl = document.getElementById('sb-val-map-yield');
      if (mapYieldEl) mapYieldEl.innerHTML = `+${formatNum(gameState.mapYield)} <span class="sb-stat-unit">BOMBERS</span>`;

      const projectedEl = document.getElementById('sb-val-projected');
      if (projectedEl) projectedEl.innerHTML = `${formatNum(gameState.projectedTotal)} <span class="sb-stat-unit">BOMBERS</span>`;

      const balanceEl = document.getElementById('sb-val-balance');
      if (balanceEl) balanceEl.textContent = `${formatNum(gameState.balance, 1)}`;

      const chestCountEl = document.getElementById('sb-val-chest-count');
      if (chestCountEl) chestCountEl.textContent = `${gameState.totalChests}`;

      const totalHpEl = document.getElementById('sb-val-total-hp');
      if (totalHpEl) totalHpEl.textContent = `${formatNum(gameState.totalHp, 0)} HP`;

      // Chest Breakdown
      const w = gameState.chests[3] || 0;
      const m = gameState.chests[4] || 0;
      const g = gameState.chests[5] || 0;
      const d = gameState.chests[6] || 0;

      const countW = document.getElementById('sb-count-wood');
      const subW = document.getElementById('sb-sub-wood');
      if (countW) countW.textContent = w;
      if (subW) subW.textContent = formatNum(w * settings.woodReward);

      const countM = document.getElementById('sb-count-metal');
      const subM = document.getElementById('sb-sub-metal');
      if (countM) countM.textContent = m;
      if (subM) subM.textContent = formatNum(m * settings.metalReward);

      const countG = document.getElementById('sb-count-gold');
      const subG = document.getElementById('sb-sub-gold');
      if (countG) countG.textContent = g;
      if (subG) subG.textContent = formatNum(g * settings.goldReward);

      const countD = document.getElementById('sb-count-diamond');
      const subD = document.getElementById('sb-sub-diamond');
      if (countD) countD.textContent = d;
      if (subD) subD.textContent = formatNum(d * settings.diamondReward);

      // Prison Banner
      const banner = document.getElementById('sb-prison-banner');
      const pIcon = document.getElementById('sb-prison-icon');
      const pTitle = document.getElementById('sb-prison-title');
      const pSub = document.getElementById('sb-prison-sub');

      if (banner && pTitle && pSub) {
        if (gameState.hasPrison) {
          banner.className = 'sb-prison-banner sb-prison-active';
          if (pIcon) pIcon.textContent = '🚨';
          pTitle.textContent = 'PRISON DETECTED! FREE HERO!';
          pSub.textContent = `Map ${gameState.mapSeq} · HP: 2,000 · 1 Free Hero Waiting!`;
        } else {
          banner.className = 'sb-prison-banner sb-prison-none';
          if (pIcon) pIcon.textContent = '🔒';
          pTitle.textContent = 'NO PRISON (0.006%)';
          pSub.textContent = `Map ${gameState.mapSeq} · Destroy blocks for rare spawn`;
        }
      }

      // Compact view
      const compYield = document.getElementById('sb-compact-yield');
      if (compYield) compYield.textContent = `+${formatNum(gameState.mapYield, 0)} BOMBERS`;

      const compPrison = document.getElementById('sb-compact-prison');
      if (compPrison) {
        if (gameState.hasPrison) {
          compPrison.textContent = '🚨 HERO!';
          compPrison.style.background = '#e2483d';
          compPrison.style.color = '#fff';
        } else {
          compPrison.textContent = `🔒 ${gameState.totalChests} chests`;
          compPrison.style.background = 'rgba(0,0,0,0.4)';
          compPrison.style.color = 'var(--sb-cyan)';
        }
      }

      // Profit & Daily Rates in Philippine Peso (PHP)
      try {
        const startMs = new Date(settings.startDate || '2026-10-12T09:00').getTime();
        const nowMs = Date.now();
        const elapsedHours = Math.max(0.1, (nowMs - startMs) / (1000 * 60 * 60));
        const elapsedDays = Math.max(0.01, elapsedHours / 24);

        const currentBalance = gameState.balance || 0;
        const startingBombers = parseFloat(settings.startingBombers) || 0;
        const netBombers = Math.max(0, currentBalance - startingBombers);
        const bombersPerDay = netBombers / elapsedDays;

        const tokenPriceUsd = parseFloat(settings.tokenPriceUsd) || 0.0005113;
        const usdPhpRate = parseFloat(settings.usdPhpRate) || 63.08;
        const tokenPricePhp = tokenPriceUsd * usdPhpRate;

        const dailyProfitPhp = bombersPerDay * tokenPricePhp;
        const totalProfitPhp = netBombers * tokenPricePhp;

        const dailyPhpEl = document.getElementById('sb-hud-daily-php');
        if (dailyPhpEl) dailyPhpEl.textContent = `₱${formatNum(dailyProfitPhp, 2)}/d`;

        const totalPhpEl = document.getElementById('sb-hud-total-php');
        if (totalPhpEl) totalPhpEl.textContent = `₱${formatNum(totalProfitPhp, 2)}`;

        const compPhpEl = document.getElementById('sb-compact-php');
        if (compPhpEl) compPhpEl.textContent = `₱${formatNum(dailyProfitPhp, 0)}/d`;
      } catch (err) {}
    } catch (e) {}
  }

  // --- INITIAL EXECUTION ---
  try {
    loadSettings();
    injectInpageScript();

    scanTimer = setInterval(scanDomDirectly, 400);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createHudWidget();
        scanDomDirectly();
      });
    } else {
      createHudWidget();
      scanDomDirectly();
    }
  } catch (err) {
    console.warn('[SolanaBombersCalc] init error:', err);
  }
})();
