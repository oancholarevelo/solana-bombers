// popup.js - Controller for extension popup interface

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State
  let activeTabId = null;
  let isConnected = false;
  let hasAttemptedInject = false;
  let latestGameBalance = 0;

  let currentSettings = {
    woodReward: 35.625,
    metalReward: 81.25,
    goldReward: 406.25,
    diamondReward: 812.5,
    soundEnabled: true,
    hudVisible: true,
    compactMode: false,
    notificationsEnabled: true
  };

  let profitSettings = {
    startDate: '2026-10-12T09:00', // Default: Monday 9:00 AM as requested by user
    profitBombers: 0,
    startingBombers: 0,
    investmentPhp: 0,
    tokenPriceUsd: 0.0005113,
    usdPhpRate: 63.08,
    autoFetchPrice: true,
    lastPriceFetchTime: 0
  };

  // DOM Elements - Status
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // DOM Elements - Live Map tab
  const mapYieldEl = document.getElementById('val-map-yield');
  const mapSeqEl = document.getElementById('val-map-seq');
  const currentBalanceEl = document.getElementById('val-current-balance');
  const calcRewardEl = document.getElementById('val-calc-reward');
  const projectedTotalEl = document.getElementById('val-projected-total');
  const sessionEl = document.getElementById('val-session');
  const chestTotalEl = document.getElementById('val-chest-total');
  const hpTotalEl = document.getElementById('val-hp-total');

  const prisonBanner = document.getElementById('prison-banner');
  const prisonIcon = document.getElementById('prison-icon');
  const prisonHeadline = document.getElementById('prison-headline');
  const prisonDetail = document.getElementById('prison-detail');
  const btnTestSound = document.getElementById('btn-test-sound');

  const cCount3 = document.getElementById('c-count-3');
  const cSub3 = document.getElementById('c-sub-3');
  const cCount4 = document.getElementById('c-count-4');
  const cSub4 = document.getElementById('c-sub-4');
  const cCount5 = document.getElementById('c-count-5');
  const cSub5 = document.getElementById('c-sub-5');
  const cCount6 = document.getElementById('c-count-6');
  const cSub6 = document.getElementById('c-sub-6');

  // DOM Elements - Profit tab
  const valPriceUsd = document.getElementById('val-price-usd');
  const valPricePhp = document.getElementById('val-price-php');
  const valUsdPhp = document.getElementById('val-usd-php');
  const btnRefreshPrice = document.getElementById('btn-refresh-price');

  // ROI Elements
  const setInvestmentPhp = document.getElementById('set-investment-php');
  const roiBadge = document.getElementById('roi-badge');
  const roiProgressBar = document.getElementById('roi-progress-bar');
  const roiRemainingPhp = document.getElementById('roi-remaining-php');
  const roiBombersNeeded = document.getElementById('roi-bombers-needed');
  const roiDaysNeeded = document.getElementById('roi-days-needed');

  const valProfitDays = document.getElementById('val-profit-days');
  const valDailyPhp = document.getElementById('val-daily-php');
  const valDailyBombers = document.getElementById('val-daily-bombers');
  const valTotalPhp = document.getElementById('val-total-php');
  const valTotalUsd = document.getElementById('val-total-usd');
  const valPlaytimeHours = document.getElementById('val-playtime-hours');

  const valRateHourly = document.getElementById('val-rate-hourly');
  const valRateWeekly = document.getElementById('val-rate-weekly');
  const valRateMonthly = document.getElementById('val-rate-monthly');

  // Hero Elements
  const heroTeamPower = document.getElementById('hero-team-power');
  const heroTeamEnergy = document.getElementById('hero-team-energy');
  const heroActiveCount = document.getElementById('hero-active-count');
  const heroRegenRate = document.getElementById('hero-regen-rate');

  const setStartDate = document.getElementById('set-start-date');
  const setProfitBombers = document.getElementById('set-profit-bombers');
  const btnSyncGameBalance = document.getElementById('btn-sync-game-balance');
  const setStartingBombers = document.getElementById('set-starting-bombers');
  const setCustomTokenPrice = document.getElementById('set-custom-token-price');
  const setCustomUsdPhp = document.getElementById('set-custom-usd-php');
  const setAutoFetchPrice = document.getElementById('set-auto-fetch-price');
  const btnSaveProfitSettings = document.getElementById('btn-save-profit-settings');
  const btnResetProfitSettings = document.getElementById('btn-reset-profit-settings');

  // DOM Elements - Settings tab
  const setHudVisible = document.getElementById('set-hud-visible');
  const setSoundEnabled = document.getElementById('set-sound-enabled');
  const setNotificationsEnabled = document.getElementById('set-notifications-enabled');
  const setCompactMode = document.getElementById('set-compact-mode');
  const btnResetPos = document.getElementById('btn-reset-pos');

  const setRewardWood = document.getElementById('set-reward-wood');
  const setRewardMetal = document.getElementById('set-reward-metal');
  const setRewardGold = document.getElementById('set-reward-gold');
  const setRewardDiamond = document.getElementById('set-reward-diamond');
  const btnSaveRewards = document.getElementById('btn-save-rewards');
  const btnResetRewards = document.getElementById('btn-reset-rewards');

  // Format Helper
  function formatNum(val, decimals = 2) {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // --- TAB NAVIGATION ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) targetEl.classList.add('active');

      if (targetTab === 'profit') {
        updateProfitUI();
        if (profitSettings.autoFetchPrice) {
          fetchLiveMarketPrice(false);
        }
      }
    });
  });

  // --- SOUND TEST ---
  function playSynthSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
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
        gain.gain.setValueAtTime(0.2, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio test error:', e);
    }
  }

  if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
      playSynthSound();
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { type: 'PLAY_TEST_SOUND' }).catch(() => {});
      }
    });
  }

  // --- LIVE MARKET PRICE FETCHER (DEXSCREENER & OPEN EXCHANGE RATES) ---
  async function fetchLiveMarketPrice(force = false) {
    const now = Date.now();
    if (!force && now - (profitSettings.lastPriceFetchTime || 0) < 60000) {
      updateProfitUI();
      return;
    }

    if (btnRefreshPrice) {
      btnRefreshPrice.textContent = '⏳ Fetching...';
    }

    try {
      // 1. Fetch live token price from DexScreener for BOMBERS token
      const tokenPromise = fetch('https://api.dexscreener.com/latest/dex/tokens/CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump')
        .then(res => res.json())
        .then(data => {
          if (data && data.pairs && data.pairs.length > 0) {
            const p = parseFloat(data.pairs[0].priceUsd);
            if (!isNaN(p) && p > 0) return p;
          }
          return null;
        }).catch(() => null);

      // 2. Fetch USD to PHP exchange rate
      const fxPromise = fetch('https://open.er-api.com/v6/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates.PHP) {
            const fx = parseFloat(data.rates.PHP);
            if (!isNaN(fx) && fx > 0) return fx;
          }
          return null;
        }).catch(() => null);

      const [livePriceUsd, liveUsdPhp] = await Promise.all([tokenPromise, fxPromise]);

      if (livePriceUsd !== null && livePriceUsd > 0) {
        profitSettings.tokenPriceUsd = livePriceUsd;
      }
      if (liveUsdPhp !== null && liveUsdPhp > 0) {
        profitSettings.usdPhpRate = liveUsdPhp;
      }
      profitSettings.lastPriceFetchTime = now;

      chrome.storage.local.set({
        tokenPriceUsd: profitSettings.tokenPriceUsd,
        usdPhpRate: profitSettings.usdPhpRate,
        lastPriceFetchTime: now
      });

      if (btnRefreshPrice) {
        btnRefreshPrice.textContent = '✓ Updated!';
        setTimeout(() => {
          btnRefreshPrice.textContent = '🔄 Refresh';
        }, 1500);
      }
    } catch (e) {
      console.warn('Failed to fetch live market price:', e);
      if (btnRefreshPrice) {
        btnRefreshPrice.textContent = '🔄 Refresh';
      }
    }

    updateProfitUI();
  }

  if (btnRefreshPrice) {
    btnRefreshPrice.addEventListener('click', () => {
      fetchLiveMarketPrice(true);
    });
  }

  // --- PROFIT CALCULATION & UI ---
  function updateProfitUI() {
    const startMs = new Date(profitSettings.startDate || '2026-10-12T09:00').getTime();
    const nowMs = Date.now();
    const elapsedMs = Math.max(nowMs - startMs, 60000); // minimum 1 minute
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const elapsedDays = elapsedHours / 24;

    // Determine total bombers: manual input takes precedence if > 0, else fallback to game balance
    let totalBombers = parseFloat(profitSettings.profitBombers);
    if ((isNaN(totalBombers) || totalBombers <= 0) && latestGameBalance > 0) {
      totalBombers = latestGameBalance;
    }
    if (isNaN(totalBombers)) totalBombers = 0;

    const startingBombers = parseFloat(profitSettings.startingBombers) || 0;
    const netBombers = Math.max(0, totalBombers - startingBombers);

    const bombersPerDay = netBombers / elapsedDays;
    const bombersPerHour = netBombers / elapsedHours;

    const priceUsd = parseFloat(profitSettings.tokenPriceUsd) || 0.0005113;
    const usdPhp = parseFloat(profitSettings.usdPhpRate) || 63.08;
    const pricePhp = priceUsd * usdPhp;

    const dailyProfitPhp = bombersPerDay * pricePhp;
    const dailyProfitUsd = bombersPerDay * priceUsd;
    const totalProfitPhp = netBombers * pricePhp;
    const totalProfitUsd = netBombers * priceUsd;

    const hourlyPhp = bombersPerHour * pricePhp;
    const weeklyPhp = dailyProfitPhp * 7;
    const monthlyPhp = dailyProfitPhp * 30;

    // ROI Calculations
    const investmentPhp = parseFloat(profitSettings.investmentPhp) || 0;
    if (investmentPhp > 0) {
      const roiPct = (totalProfitPhp / investmentPhp) * 100;
      if (totalProfitPhp >= investmentPhp) {
        const profitBeyond = totalProfitPhp - investmentPhp;
        if (roiBadge) {
          roiBadge.textContent = '🎉 100%+ ROI! (PROFIT)';
          roiBadge.className = 'roi-badge roi-done';
        }
        if (roiProgressBar) {
          roiProgressBar.style.width = '100%';
          roiProgressBar.className = 'roi-progress-bar roi-full';
        }
        if (roiRemainingPhp) roiRemainingPhp.textContent = '+₱' + formatNum(profitBeyond, 2);
        if (roiBombersNeeded) roiBombersNeeded.textContent = '0 (ROI Hit!)';
        if (roiDaysNeeded) roiDaysNeeded.textContent = 'PROFITING';
      } else {
        const remainingPhp = investmentPhp - totalProfitPhp;
        const bombersNeeded = pricePhp > 0 ? (remainingPhp / pricePhp) : 0;
        const daysNeeded = bombersPerDay > 0 ? (bombersNeeded / bombersPerDay) : null;

        if (roiBadge) {
          roiBadge.textContent = `${roiPct.toFixed(1)}% ROI`;
          roiBadge.className = 'roi-badge';
        }
        if (roiProgressBar) {
          roiProgressBar.style.width = `${Math.min(100, Math.max(0, roiPct))}%`;
          roiProgressBar.className = 'roi-progress-bar';
        }
        if (roiRemainingPhp) roiRemainingPhp.textContent = `₱${formatNum(remainingPhp, 2)}`;
        if (roiBombersNeeded) roiBombersNeeded.textContent = `${formatNum(bombersNeeded, 1)}`;
        if (roiDaysNeeded) {
          roiDaysNeeded.textContent = daysNeeded !== null && isFinite(daysNeeded) ? `${daysNeeded.toFixed(1)} days` : '--';
        }
      }
    } else {
      if (roiBadge) {
        roiBadge.textContent = 'ENTER ₱ INV';
        roiBadge.className = 'roi-badge';
      }
      if (roiProgressBar) {
        roiProgressBar.style.width = '0%';
        roiProgressBar.className = 'roi-progress-bar';
      }
      if (roiRemainingPhp) roiRemainingPhp.textContent = '₱0.00';
      if (roiBombersNeeded) roiBombersNeeded.textContent = '--';
      if (roiDaysNeeded) roiDaysNeeded.textContent = '--';
    }

    // Update Ticker
    if (valPriceUsd) valPriceUsd.textContent = `$${priceUsd.toFixed(6)}`;
    if (valPricePhp) valPricePhp.textContent = `₱${pricePhp.toFixed(4)}`;
    if (valUsdPhp) valUsdPhp.textContent = `₱${usdPhp.toFixed(2)}`;

    // Update Hero Card
    if (valProfitDays) valProfitDays.textContent = `${elapsedDays.toFixed(1)} DAYS`;
    if (valDailyPhp) valDailyPhp.textContent = `₱${formatNum(dailyProfitPhp, 2)} / DAY`;
    if (valDailyBombers) valDailyBombers.textContent = `+${formatNum(bombersPerDay, 1)} BOMBERS / DAY`;
    if (valTotalPhp) valTotalPhp.textContent = `₱${formatNum(totalProfitPhp, 2)}`;
    if (valTotalUsd) valTotalUsd.textContent = `$${formatNum(totalProfitUsd, 2)}`;

    const wholeHours = Math.floor(elapsedHours);
    const wholeMins = Math.floor((elapsedHours % 1) * 60);
    if (valPlaytimeHours) valPlaytimeHours.textContent = `${wholeHours}h ${wholeMins}m`;

    // Projections
    if (valRateHourly) valRateHourly.textContent = `₱${formatNum(hourlyPhp, 2)}/h`;
    if (valRateWeekly) valRateWeekly.textContent = `₱${formatNum(weeklyPhp, 0)}`;
    if (valRateMonthly) valRateMonthly.textContent = `₱${formatNum(monthlyPhp, 0)}`;

    // Sync input fields if user is not actively editing them
    if (setStartDate && setStartDate !== document.activeElement && !setStartDate.value) {
      setStartDate.value = profitSettings.startDate || '2026-10-12T09:00';
    }
    if (setProfitBombers && setProfitBombers !== document.activeElement && !setProfitBombers.value) {
      setProfitBombers.value = totalBombers > 0 ? totalBombers.toFixed(1) : '';
    }
    if (setStartingBombers && setStartingBombers !== document.activeElement && !setStartingBombers.value) {
      setStartingBombers.value = startingBombers;
    }
    if (setInvestmentPhp && setInvestmentPhp !== document.activeElement && !setInvestmentPhp.value && profitSettings.investmentPhp > 0) {
      setInvestmentPhp.value = profitSettings.investmentPhp;
    }
    if (setCustomTokenPrice && setCustomTokenPrice !== document.activeElement && !setCustomTokenPrice.value) {
      setCustomTokenPrice.value = priceUsd;
    }
    if (setCustomUsdPhp && setCustomUsdPhp !== document.activeElement && !setCustomUsdPhp.value) {
      setCustomUsdPhp.value = usdPhp;
    }
    if (setAutoFetchPrice) {
      setAutoFetchPrice.checked = profitSettings.autoFetchPrice !== false;
    }
  }

  // Live input on investment field for instant recalculation
  if (setInvestmentPhp) {
    setInvestmentPhp.addEventListener('input', () => {
      profitSettings.investmentPhp = parseFloat(setInvestmentPhp.value) || 0;
      chrome.storage.local.set({ investmentPhp: profitSettings.investmentPhp });
      updateProfitUI();
    });
  }

  // Quick Sync Button
  if (btnSyncGameBalance) {
    btnSyncGameBalance.addEventListener('click', () => {
      if (latestGameBalance > 0) {
        if (setProfitBombers) setProfitBombers.value = latestGameBalance.toFixed(1);
        profitSettings.profitBombers = latestGameBalance;
        chrome.storage.local.set({ profitBombers: latestGameBalance });
        updateProfitUI();
        btnSyncGameBalance.textContent = '✓ Synced!';
        setTimeout(() => {
          btnSyncGameBalance.textContent = '⚡ Sync';
        }, 1500);
      } else {
        btnSyncGameBalance.textContent = 'No Balance';
        setTimeout(() => {
          btnSyncGameBalance.textContent = '⚡ Sync';
        }, 1500);
      }
    });
  }

  // Save Profit Settings
  if (btnSaveProfitSettings) {
    btnSaveProfitSettings.addEventListener('click', () => {
      profitSettings.startDate = setStartDate.value || '2026-10-12T09:00';
      profitSettings.profitBombers = parseFloat(setProfitBombers.value) || 0;
      profitSettings.startingBombers = parseFloat(setStartingBombers.value) || 0;
      profitSettings.investmentPhp = parseFloat(setInvestmentPhp ? setInvestmentPhp.value : 0) || 0;
      profitSettings.tokenPriceUsd = parseFloat(setCustomTokenPrice.value) || profitSettings.tokenPriceUsd;
      profitSettings.usdPhpRate = parseFloat(setCustomUsdPhp.value) || profitSettings.usdPhpRate;
      profitSettings.autoFetchPrice = setAutoFetchPrice.checked;

      chrome.storage.local.set(profitSettings, () => {
        btnSaveProfitSettings.textContent = '✓ Saved!';
        setTimeout(() => {
          btnSaveProfitSettings.textContent = 'Save & Calculate';
        }, 1500);
        updateProfitUI();
      });
    });
  }

  // Reset Profit Settings
  if (btnResetProfitSettings) {
    btnResetProfitSettings.addEventListener('click', () => {
      const defaults = {
        startDate: '2026-10-12T09:00',
        profitBombers: 0,
        startingBombers: 0,
        investmentPhp: 0,
        tokenPriceUsd: 0.0005113,
        usdPhpRate: 63.08,
        autoFetchPrice: true
      };
      profitSettings = { ...profitSettings, ...defaults };
      if (setStartDate) setStartDate.value = defaults.startDate;
      if (setProfitBombers) setProfitBombers.value = '';
      if (setStartingBombers) setStartingBombers.value = '0';
      if (setInvestmentPhp) setInvestmentPhp.value = '';
      if (setCustomTokenPrice) setCustomTokenPrice.value = defaults.tokenPriceUsd;
      if (setCustomUsdPhp) setCustomUsdPhp.value = defaults.usdPhpRate;
      if (setAutoFetchPrice) setAutoFetchPrice.checked = true;

      chrome.storage.local.set(defaults, () => {
        btnResetProfitSettings.textContent = '✓ Reset!';
        setTimeout(() => {
          btnResetProfitSettings.textContent = 'Reset Defaults';
        }, 1500);
        fetchLiveMarketPrice(true);
      });
    });
  }

  // --- SETTINGS MANAGEMENT ---
  function loadStoredSettings() {
    chrome.storage.local.get({ ...currentSettings, ...profitSettings }, items => {
      currentSettings = { ...currentSettings, ...items };
      profitSettings = { ...profitSettings, ...items };

      if (setHudVisible) setHudVisible.checked = !!currentSettings.hudVisible;
      if (setSoundEnabled) setSoundEnabled.checked = !!currentSettings.soundEnabled;
      if (setNotificationsEnabled) setNotificationsEnabled.checked = !!currentSettings.notificationsEnabled;
      if (setCompactMode) setCompactMode.checked = !!currentSettings.compactMode;

      if (setRewardWood) setRewardWood.value = currentSettings.woodReward;
      if (setRewardMetal) setRewardMetal.value = currentSettings.metalReward;
      if (setRewardGold) setRewardGold.value = currentSettings.goldReward;
      if (setRewardDiamond) setRewardDiamond.value = currentSettings.diamondReward;

      // Populate profit inputs
      if (setStartDate) setStartDate.value = profitSettings.startDate || '2026-10-12T09:00';
      if (setProfitBombers && profitSettings.profitBombers > 0) {
        setProfitBombers.value = profitSettings.profitBombers;
      }
      if (setStartingBombers) setStartingBombers.value = profitSettings.startingBombers || 0;
      if (setInvestmentPhp && profitSettings.investmentPhp > 0) {
        setInvestmentPhp.value = profitSettings.investmentPhp;
      }
      if (setCustomTokenPrice) setCustomTokenPrice.value = profitSettings.tokenPriceUsd || 0.0005113;
      if (setCustomUsdPhp) setCustomUsdPhp.value = profitSettings.usdPhpRate || 63.08;
      if (setAutoFetchPrice) setAutoFetchPrice.checked = profitSettings.autoFetchPrice !== false;

      updateProfitUI();
      if (profitSettings.autoFetchPrice) {
        fetchLiveMarketPrice(false);
      }
    });
  }

  if (setHudVisible) {
    setHudVisible.addEventListener('change', () => {
      chrome.storage.local.set({ hudVisible: setHudVisible.checked });
    });
  }

  if (setSoundEnabled) {
    setSoundEnabled.addEventListener('change', () => {
      chrome.storage.local.set({ soundEnabled: setSoundEnabled.checked });
    });
  }

  if (setNotificationsEnabled) {
    setNotificationsEnabled.addEventListener('change', () => {
      chrome.storage.local.set({ notificationsEnabled: setNotificationsEnabled.checked });
    });
  }

  if (setCompactMode) {
    setCompactMode.addEventListener('change', () => {
      chrome.storage.local.set({ compactMode: setCompactMode.checked });
    });
  }

  if (btnResetPos) {
    btnResetPos.addEventListener('click', () => {
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { type: 'RESET_HUD_POSITION' }).catch(() => {});
      }
      btnResetPos.textContent = '✓ Position Reset';
      setTimeout(() => {
        btnResetPos.textContent = 'Reset HUD Position';
      }, 1500);
    });
  }

  if (btnSaveRewards) {
    btnSaveRewards.addEventListener('click', () => {
      const newRewards = {
        woodReward: parseFloat(setRewardWood.value) || 35.625,
        metalReward: parseFloat(setRewardMetal.value) || 81.25,
        goldReward: parseFloat(setRewardGold.value) || 406.25,
        diamondReward: parseFloat(setRewardDiamond.value) || 812.5
      };
      chrome.storage.local.set(newRewards, () => {
        currentSettings = { ...currentSettings, ...newRewards };
        btnSaveRewards.textContent = '✓ Saved!';
        setTimeout(() => {
          btnSaveRewards.textContent = 'Save Rewards';
        }, 1500);
        pollActiveTab();
      });
    });
  }

  if (btnResetRewards) {
    btnResetRewards.addEventListener('click', () => {
      const defaults = {
        woodReward: 35.625,
        metalReward: 81.25,
        goldReward: 406.25,
        diamondReward: 812.5
      };
      chrome.storage.local.set(defaults, () => {
        currentSettings = { ...currentSettings, ...defaults };
        if (setRewardWood) setRewardWood.value = defaults.woodReward;
        if (setRewardMetal) setRewardMetal.value = defaults.metalReward;
        if (setRewardGold) setRewardGold.value = defaults.goldReward;
        if (setRewardDiamond) setRewardDiamond.value = defaults.diamondReward;
        btnResetRewards.textContent = '✓ Reset!';
        setTimeout(() => {
          btnResetRewards.textContent = 'Reset Defaults';
        }, 1500);
        pollActiveTab();
      });
    });
  }

  // --- LIVE SYNC WITH GAME TAB ---
  function updateUIWithState(state, settings) {
    if (!state) return;

    if (state.balance !== undefined && state.balance > 0) {
      latestGameBalance = state.balance;
      updateProfitUI();
    }

    const s = settings || currentSettings;
    const w = state.chests?.[3] || 0;
    const m = state.chests?.[4] || 0;
    const g = state.chests?.[5] || 0;
    const d = state.chests?.[6] || 0;

    const wReward = w * s.woodReward;
    const mReward = m * s.metalReward;
    const gReward = g * s.goldReward;
    const dReward = d * s.diamondReward;
    const totalYield = wReward + mReward + gReward + dReward;
    const projected = (state.balance || 0) + totalYield;

    if (mapYieldEl) mapYieldEl.textContent = `+${formatNum(totalYield)} BOMBERS`;
    if (mapSeqEl) mapSeqEl.textContent = `MAP ${state.mapSeq || '-'}`;
    if (currentBalanceEl) currentBalanceEl.textContent = formatNum(state.balance);
    if (calcRewardEl) calcRewardEl.textContent = `+${formatNum(totalYield)}`;
    if (projectedTotalEl) projectedTotalEl.textContent = formatNum(projected);

    if (sessionEl) sessionEl.textContent = `+${formatNum(state.session)}`;
    if (chestTotalEl) chestTotalEl.textContent = `${state.totalChests || (w + m + g + d)}`;
    if (hpTotalEl) hpTotalEl.textContent = `${formatNum(state.totalHp || 0, 0)} HP`;

    // Chest Breakdown
    if (cCount3) cCount3.textContent = w;
    if (cSub3) cSub3.textContent = formatNum(wReward);
    if (cCount4) cCount4.textContent = m;
    if (cSub4) cSub4.textContent = formatNum(mReward);
    if (cCount5) cCount5.textContent = g;
    if (cSub5) cSub5.textContent = formatNum(gReward);
    if (cCount6) cCount6.textContent = d;
    if (cSub6) cSub6.textContent = formatNum(dReward);

    // Prison Banner
    if (prisonBanner) {
      if (state.hasPrison) {
        prisonBanner.className = 'prison-banner banner-active';
        if (prisonIcon) prisonIcon.textContent = '🚨';
        if (prisonHeadline) prisonHeadline.textContent = 'PRISON ON MAP! FREE HERO!';
        if (prisonDetail) prisonDetail.textContent = `Map ${state.mapSeq} · HP: 2,000 · 1 Free Hero Waiting!`;
      } else {
        prisonBanner.className = 'prison-banner banner-none';
        if (prisonIcon) prisonIcon.textContent = '🔒';
        if (prisonHeadline) prisonHeadline.textContent = 'NO PRISON (0.006%)';
        if (prisonDetail) prisonDetail.textContent = `Map ${state.mapSeq} · Free hero chance per map spawn`;
      }
    }

    // Hero Powers & Energy Regen Card
    if (state.teamStats) {
      const ts = state.teamStats;
      if (heroTeamPower) heroTeamPower.textContent = `${ts.totalPower || 0} DMG`;
      if (heroTeamEnergy) {
        const cur = ts.totalCurEnergy || 0;
        const max = ts.totalMaxEnergy || 0;
        heroTeamEnergy.textContent = `${cur} / ${max}`;
      }
      if (heroActiveCount) {
        const working = ts.workingCount || 0;
        const total = ts.heroCount || 0;
        heroActiveCount.textContent = `${working} work / ${total}`;
      }
      if (heroRegenRate) {
        const regen = ts.estRegenPerMin !== undefined ? ts.estRegenPerMin : 0.5;
        heroRegenRate.textContent = `+${regen.toFixed(1)} / min`;
      }
    } else if (state.isInGame) {
      if (heroTeamPower && heroTeamPower.textContent === '--') heroTeamPower.textContent = 'Open Heroes';
      if (heroTeamEnergy && heroTeamEnergy.textContent === '--') heroTeamEnergy.textContent = 'Open Heroes';
      if (heroActiveCount && heroActiveCount.textContent === '--') heroActiveCount.textContent = 'Active In Hunt';
      if (heroRegenRate && heroRegenRate.textContent === '--') heroRegenRate.textContent = '0.5 / min (base)';
    }
  }

  // Refresh tab button on status click
  if (statusText) {
    statusText.addEventListener('click', () => {
      if (activeTabId && !isConnected) {
        chrome.tabs.reload(activeTabId);
        statusText.textContent = 'Refreshing tab...';
      }
    });
  }

  function pollActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      let targetTab = null;
      if (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.includes('solanabombers.fun')) {
        targetTab = tabs[0];
      }

      if (!targetTab) {
        chrome.tabs.query({ url: '*://*.solanabombers.fun/*' }, sbTabs => {
          if (sbTabs && sbTabs.length > 0) {
            connectToTab(sbTabs[0]);
          } else {
            if (statusDot) statusDot.className = 'status-dot dot-inactive';
            if (statusText) {
              statusText.textContent = 'Solana Bombers Not Open';
              statusText.style.cursor = 'default';
            }
            checkBackgroundCache();
          }
        });
      } else {
        connectToTab(targetTab);
      }
    });
  }

  function connectToTab(tab) {
    activeTabId = tab.id;
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SB_CALC_DATA' }, response => {
      if (chrome.runtime.lastError || !response || !response.success) {
        if (!hasAttemptedInject && chrome.scripting) {
          hasAttemptedInject = true;
          chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          }).catch(() => {});

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).then(() => {
            setTimeout(pollActiveTab, 300);
          }).catch(() => {
            showRefreshPrompt();
          });
        } else {
          showRefreshPrompt();
        }
        checkBackgroundCache();
      } else {
        isConnected = true;
        if (statusText) statusText.style.cursor = 'default';
        if (response.state?.isInGame) {
          if (statusDot) statusDot.className = 'status-dot dot-active';
          if (statusText) statusText.textContent = `In-Game (Map ${response.state.mapSeq || '-'})`;
        } else {
          if (statusDot) statusDot.className = 'status-dot dot-waiting';
          if (statusText) statusText.textContent = 'In Menu (Enter Hunt)';
        }
        updateUIWithState(response.state, response.settings);
      }
    });
  }

  function showRefreshPrompt() {
    if (statusDot) statusDot.className = 'status-dot dot-inactive';
    if (statusText) {
      statusText.innerHTML = '🔄 <u>Click to refresh page</u>';
      statusText.style.cursor = 'pointer';
      statusText.title = 'Content script needs page refresh to hook into game';
    }
  }

  function checkBackgroundCache() {
    chrome.runtime.sendMessage({ type: 'GET_CACHED_STATE' }, response => {
      if (response && response.state) {
        updateUIWithState(response.state, currentSettings);
        if (!isConnected && response.state.mapSeq && statusText) {
          statusText.textContent = `Cached (Map ${response.state.mapSeq})`;
        }
      }
    });
  }

  // Live storage sync (e.g. background worker updates market prices or exchange rate)
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        let needsProfitUpdate = false;
        for (const [key, change] of Object.entries(changes)) {
          if (key in profitSettings) {
            profitSettings[key] = change.newValue;
            needsProfitUpdate = true;
          }
        }
        if (needsProfitUpdate) {
          updateProfitUI();
        }
      }
    });
  }

  // --- DONATION COPY HANDLER ---
  const donationBox = document.getElementById('btn-copy-donation');
  const copyBtn = document.getElementById('btn-copy-addr');
  const copyBtnText = document.getElementById('copy-btn-text');
  const donationAddress = 'gfohRh3zTEkouem1EBVetipcNBKwrXqTDbj3EUwLZMh';

  function copyDonationAddress(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(donationAddress).then(() => {
        showCopySuccess();
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    try {
      const input = document.createElement('input');
      input.value = donationAddress;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showCopySuccess();
    } catch (e) {}
  }

  function showCopySuccess() {
    if (copyBtnText) copyBtnText.textContent = '✓ Copied!';
    if (copyBtn) copyBtn.classList.add('copied');
    if (donationBox) donationBox.classList.add('copied');

    setTimeout(() => {
      if (copyBtnText) copyBtnText.textContent = '📋 Copy';
      if (copyBtn) copyBtn.classList.remove('copied');
      if (donationBox) donationBox.classList.remove('copied');
    }, 2000);
  }

  if (donationBox) donationBox.addEventListener('click', copyDonationAddress);
  if (copyBtn) copyBtn.addEventListener('click', copyDonationAddress);

  // Initial load
  loadStoredSettings();
  pollActiveTab();

  // Periodic refresh
  setInterval(pollActiveTab, 800);
});
