// inpage.js - Executes in the MAIN page world of solanabombers.fun
// Has direct access to React Fiber nodes, window objects, and game components.

(function () {
  'use strict';

  let lastSentData = null;

  function getFiber(domNode) {
    if (!domNode) return null;
    const key = Object.keys(domNode).find(k => k.startsWith('__reactFiber$'));
    return key ? domNode[key] : null;
  }

  function getFiberKey(domNode) {
    const fiber = getFiber(domNode);
    if (!fiber) return null;
    const key = fiber.key;
    if (key !== undefined && key !== null) {
      const parsed = parseInt(key, 10);
      return isNaN(parsed) ? key : parsed;
    }
    return null;
  }

  // Scan HUD elements and extract block counts with React Fiber verification
  function scanGame() {
    try {
      const hudTop = document.querySelector('.hud-top, [data-testid="hunt-hud"] .hud-top');
      if (!hudTop) return;

      // 1. Balance chip: span.chip.gold.counter
      const balanceChip = hudTop.querySelector('span.chip.gold.counter');
      let balanceText = '';
      if (balanceChip) {
        balanceText = balanceChip.textContent || '';
      }

      // 2. Session chip: span.chip.counter with "this session"
      let sessionText = '';
      const chips = hudTop.querySelectorAll('span.chip.counter');
      chips.forEach(c => {
        const text = c.textContent || '';
        if (text.includes('this session')) {
          sessionText = text;
        }
      });

      // 3. Map number
      let mapText = '';
      chips.forEach(c => {
        const text = c.textContent || '';
        if (text.includes('MAP ')) {
          mapText = text;
        }
      });

      // 4. Chest and Prison chips
      const chestChips = hudTop.querySelectorAll('.chip.chest-count');
      const chestData = {
        3: 0, // Wooden
        4: 0, // Metal
        5: 0, // Gold
        6: 0, // Diamond
        7: 0  // Prison
      };

      // Also try to read O directly from fiber tree
      let foundOInFiber = false;
      const hudFiber = getFiber(hudTop);
      if (hudFiber) {
        let curr = hudFiber;
        let depth = 0;
        while (curr && depth < 20) {
          // Check memoizedProps or memoizedState
          if (curr.memoizedProps) {
            // Check if blocks or O exists
            if (curr.memoizedProps.blocks && Array.isArray(curr.memoizedProps.blocks)) {
              for (const b of curr.memoizedProps.blocks) {
                if (chestData[b] !== undefined) {
                  chestData[b]++;
                }
              }
              foundOInFiber = true;
              break;
            }
          }
          curr = curr.return;
          depth++;
        }
      }

      // Read each chest chip individually
      chestChips.forEach(chip => {
        const key = getFiberKey(chip);
        const text = (chip.textContent || '').trim();
        const count = parseInt(text.replace(/[^\d]/g, ''), 10) || 0;

        if (key && chestData[key] !== undefined) {
          chestData[key] = count;
        }
      });

      const payload = {
        type: 'SOLANA_BOMBERS_MAP_SYNC',
        timestamp: Date.now(),
        balanceText,
        sessionText,
        mapText,
        chestCounts: chestData,
        chipCount: chestChips.length,
        hasPrison: (chestData[7] > 0)
      };

      // Only send if data changed
      const serialized = JSON.stringify(payload);
      if (serialized !== lastSentData) {
        lastSentData = serialized;
        window.postMessage(payload, '*');
      }
    } catch (e) {
      // Quiet fail to avoid disrupting game
      // console.error('[SolanaBombersCalc] inpage scan error:', e);
    }
  }

  // Periodic polling
  setInterval(scanGame, 300);

  // MutationObserver for instant updates
  const observer = new MutationObserver(() => {
    scanGame();
  });

  function initObserver() {
    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
      scanGame();
    } else {
      setTimeout(initObserver, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
