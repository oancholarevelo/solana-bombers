// background.js - Service worker for Solana Bombers Calculator

// Store latest state received from active tabs
let cachedState = null;

const DEFAULT_SETTINGS = {
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
  notificationsEnabled: true,
  // Profit & ROI defaults
  startDate: '2026-10-12T09:00',
  profitBombers: 0,
  startingBombers: 0,
  investmentPhp: 0,
  tokenPriceUsd: 0.0005113,
  usdPhpRate: 63.08,
  tokenPricePhp: 0.03225,
  autoFetchPrice: true,
  lastPriceFetchTime: 0
};

// Background live price fetcher from DexScreener & open.er-api
async function fetchAndCacheMarketPrices() {
  try {
    const tokenPromise = fetch('https://api.dexscreener.com/latest/dex/tokens/CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump')
      .then(res => res.json())
      .then(data => {
        if (data && data.pairs && data.pairs.length > 0) {
          const p = parseFloat(data.pairs[0].priceUsd);
          if (!isNaN(p) && p > 0) return p;
        }
        return null;
      }).catch(() => null);

    const fxPromise = fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.PHP) {
          const fx = parseFloat(data.rates.PHP);
          if (!isNaN(fx) && fx > 0) return fx;
        }
        return null;
      }).catch(() => null);

    const [priceUsd, usdPhp] = await Promise.all([tokenPromise, fxPromise]);

    const updates = { lastPriceFetchTime: Date.now() };
    if (priceUsd !== null && priceUsd > 0) updates.tokenPriceUsd = priceUsd;
    if (usdPhp !== null && usdPhp > 0) updates.usdPhpRate = usdPhp;
    if (updates.tokenPriceUsd && updates.usdPhpRate) {
      updates.tokenPricePhp = updates.tokenPriceUsd * updates.usdPhpRate;
    }

    chrome.storage.local.set(updates);
    return updates;
  } catch (err) {
    console.warn('[SB Background] Price fetch error:', err);
    return null;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.get(DEFAULT_SETTINGS, items => {
    chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...items });
  });

  // Set up periodic price alarm (every 1 minute)
  if (chrome.alarms) {
    chrome.alarms.create('fetchMarketPrices', { periodInMinutes: 1.0 });
  }
  fetchAndCacheMarketPrices();

  // Automatically inject into any already-opened Solana Bombers tabs!
  if (chrome.scripting && chrome.tabs) {
    chrome.tabs.query({ url: ['*://*.solanabombers.fun/*', '*://solanabombers.fun/*'] }, tabs => {
      if (!tabs) return;
      for (const tab of tabs) {
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        }).catch(() => {});

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      }
    });
  }
});

// Periodic alarm handler
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'fetchMarketPrices') {
      fetchAndCacheMarketPrices();
    }
  });
}

// Initial fetch on service worker startup
fetchAndCacheMarketPrices();

// Handle incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRISON_DETECTED') {
    handlePrisonDetected(message);
    sendResponse({ received: true });
  } else if (message.type === 'SB_CALC_DATA_UPDATE') {
    cachedState = message.state;
    updateBadge(message.state);
    sendResponse({ received: true });
  } else if (message.type === 'GET_CACHED_STATE') {
    sendResponse({ state: cachedState });
  } else if (message.type === 'FETCH_LIVE_MARKET_DATA') {
    fetchAndCacheMarketPrices().then(data => {
      sendResponse({ success: true, data });
    });
    return true; // async response
  }
  return true;
});

function handlePrisonDetected(data) {
  // Set badge
  chrome.action.setBadgeText({ text: 'HERO' });
  chrome.action.setBadgeBackgroundColor({ color: '#E2483D' });

  // Create desktop notification if enabled
  chrome.storage.local.get({ notificationsEnabled: true }, res => {
    if (res.notificationsEnabled && chrome.notifications) {
      chrome.notifications.create('sb-prison-alert-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🚨 SOLANA BOMBERS: PRISON DETECTED! 🚨',
        message: `Rare Prison block (Free Hero!) spawned on Map ${data.mapSeq || 'active'}! Break it to rescue your free hero!`,
        priority: 2,
        requireInteraction: true
      });
    }
  });
}

function updateBadge(state) {
  if (!state) return;
  if (state.hasPrison) {
    chrome.action.setBadgeText({ text: 'HERO' });
    chrome.action.setBadgeBackgroundColor({ color: '#E2483D' });
  } else if (state.totalChests > 0) {
    chrome.action.setBadgeText({ text: String(state.totalChests) });
    chrome.action.setBadgeBackgroundColor({ color: '#26105A' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}
