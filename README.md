# 💣 Solana Bombers - Chest & Profit Calculator (Chrome Extension)

> **The ultimate real-time companion for [solanabombers.fun](https://solanabombers.fun)**  
> Live chest rewards tracking, automatic $BOMBERS and USD/PHP prices, investment & ROI calculator, hero energy regen analyzer, and ultra-rare 0.006% Prison alarms!

---

## 💖 Support the Developer (Donations Appreciated!)

If this extension helps you earn more $BOMBERS, calculate your ROI, or find rare free heroes, donations are greatly appreciated! 🙏

- **Solana (SOL) Address**:
  ```text
  gfohRh3zTEkouem1EBVetipcNBKwrXqTDbj3EUwLZMh
  ```
*(You can also 1-click copy this address directly inside the extension popup!)*

---

## ⚡ Quick Installation Guide (Step-by-Step)

Installing this Chrome Extension takes less than 1 minute:

### Step 1: Download or Clone this Repository
- **Option A (GitHub Download)**: Click the green **Code** button on GitHub -> **Download ZIP**, then extract it to a folder on your computer.
- **Option B (Git Clone)**:
  ```bash
  git clone https://github.com/oancholarevelo/solana-bombers.git
  ```

### Step 2: Load into Google Chrome
1. Open **Google Chrome** (also works on **Brave**, **Edge**, or any Chromium browser).
2. In your address bar, type:
   ```text
   chrome://extensions
   ```
   and press **Enter**.
3. In the top-right corner, turn **ON** the switch for **Developer mode**.
4. In the top-left corner, click the **Load unpacked** button.
5. Select the `solana-bombers` folder you downloaded or cloned.

### Step 3: Play & Calculate!
1. Navigate to **[solanabombers.fun](https://solanabombers.fun)** and enter the **Treasure Hunt**.
2. The **floating in-game HUD widget** will automatically appear on your screen and track everything in real-time!
3. Click the extension icon in your Chrome toolbar anytime to view detailed ROI and daily profit analytics.

---

## 🌟 Key Features

### 1. 🔄 Fully Automated Market Prices & Exchange Rate (Zero Manual Typing!)
- **Live $BOMBERS Price**: Automatically pulled from DexScreener (`CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump`).
- **Live USD / PHP Rate**: Continuously fetched in the background from real-time exchange rate feeds.
- **Background Auto-Sync**: The extension automatically keeps your token prices and PHP rates up-to-date every minute without you having to lift a finger!

### 2. 💰 Investment & ROI Calculator (Philippine Peso ₱)
- Simply type in your **Total Investment (₱ PHP)**.
- Instantly calculates:
  - **% ROI Progress**: Visual dynamic progress bar towards breaking even.
  - **Remaining to ROI**: Exact Peso amount needed to hit 100% break-even.
  - **Bombers Needed**: Exact number of $BOMBERS required to recover your capital.
  - **Estimated Days to ROI**: Real-time forecast based on your actual daily clearing pace.
  - **Pure Profit Mode**: Once 100% ROI is hit, the badge celebrates with **`🎉 100%+ ROI! (PROFIT)`** and tracks pure net profit earned!

### 3. ⚔️ Hero Powers, Energies & Energy Regen Analyzer
- Detects and summarizes your active hero roster:
  - **Team Power**: Combined damage dealt per bomb.
  - **Team Energy**: Current vs. maximum stamina (`stamina * 50 = max energy`).
  - **Hero Counts**: Working vs. resting vs. housed heroes.
  - **Energy Regen Rate**: Displays combined energy recovery speed per minute:
    - **Resting Outside**: `0.5 energy / min` (1 energy every 2 minutes = 30 / hour).
    - **Fast Charge Skill**: `+0.5 energy / min` (1.0 energy / min total = 60 / hour).
    - **Houses**: Tiny (`+2/m`), Mini (`+5/m`), Luxury (`+8/m`), Penthouse (`+11/m`), Villa (`+14/m`), Super Villa (`+17/m`).

### 4. 🚨 0.006% Rare Prison & Free Hero Detector
- Detects the ultra-rare **Prison** (Block ID `7`, 2,000 HP) the instant a map spawns!
- **Sound Fanfare**: Synthesizes a celebratory 8-bit victory chime via Web Audio API.
- **Desktop Notification**: Sends a Windows alert even if you're AFK.
- **Reminder**: Break the prison, then head to **Heroes → Rescues** in-game to claim your free hero!

### 5. 🎮 Floating In-Game HUD Widget
- Cyberpunk pixel art floating HUD directly over your game canvas.
- **Draggable**: Position it anywhere on your screen; position is automatically saved.
- **Compact Mode**: Click `🗕` to minimize into a sleek pill badge.
- **Close Button**: Click `✕` to hide the widget anytime (can be re-enabled from popup settings).

---

## 📊 In-Game Chests & Rewards Reference

| Block | HP | Reward | Spawn Chance | Description |
| :--- | :---: | :---: | :---: | :--- |
| 🧱 **Brick** | 1 | — | 70.35% | Common destructible wall block |
| 🪵 **Wooden Chest** | 80 | **35.625 BOMBERS** | 19.09% | Basic chest reward |
| 🔩 **Metal Chest** | 170 | **81.25 BOMBERS** | 7.04% | Mid-tier reinforced chest |
| 🏆 **Gold Chest** | 800 | **406.25 BOMBERS** | 2.51% | High-value gold chest |
| 💎 **Diamond Chest** | 1,300 | **812.50 BOMBERS** | 1.01% | Premium diamond jackpot chest |
| 🚨 **Prison** | 2,000 | **FREE HERO!** | **0.006%** | Ultra-rare drop (~1 in 50 maps) |

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3**: Built for Chrome's modern extensions standard.
- **Vanilla JavaScript & CSS**: Zero bloated frameworks, blazing fast load times (<10ms).
- **Web Audio API**: Built-in 8-bit synthesizer for chimes without external audio assets.
- **DexScreener API & Open Exchange Rates API**: Real-time market telemetry.

---

## ☕ Donations & Contact

If you enjoy using this tool and want to support continued updates, donations are warmly welcomed:

- **Solana (SOL) Address**:
  ```text
  gfohRh3zTEkouem1EBVetipcNBKwrXqTDbj3EUwLZMh
  ```

*Created with ❤️ for the Solana Bombers community.*
