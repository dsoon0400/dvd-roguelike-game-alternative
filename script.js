document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTS ---
    const screen = document.getElementById('screen');
    const logo = document.getElementById('logo');
    const nudgeEffect = document.getElementById('nudge-effect');
    
    const roundDisplay = document.getElementById('round-display');
    const cornersHitDisplay = document.getElementById('corners-hit-display');
    const cornersGoalDisplay = document.getElementById('corners-goal-display');
    const timerDisplay = document.getElementById('timer-display');
    const nudgeStatusDisplay = document.getElementById('nudge-status-display');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const startButton = document.getElementById('start-button');
    const upgradeSelection = document.getElementById('upgrade-selection');

    // --- GAME STATE ---
    let gameState = {};
    let lastChosenUpgradeId = null;

    function resetGameState() {
        gameState = {
            // Core Mechanics
            x: 50,
            y: 50,
            dx: 1, // Will be modified by speed
            dy: 1,
            
            // Player Stats & Progression
            round: 1,
            cornersHitThisRound: 0,
            
            // Timers & Cooldowns
            timer: 30,
            nudgeCooldown: 3.0, // seconds
            lastNudgeTime: -Infinity,
            
            // Game Loop Control
            isRunning: false,
            isGameOver: false,
            animationFrameId: null,
            timerIntervalId: null,

            // Upgrades!
            upgrades: {
                speed: 1.0,
                nudgeForce: 1.0,
                nudgeCooldown: 3.0,
                logoSize: 0.9,
                cornerMagnetism: 0,
                moreTimeUpgrades: 0, // Track how many times the upgrade was picked
            },
            lastCornerHitTime: -Infinity, // Track last corner hit time
            upgradeHistory: [], // Track chosen upgrades
        };
        updateUpgradeLog();
    }

    function updateUpgradeLog() {
        const logDiv = document.getElementById('upgrade-log');
        if (!logDiv) return;
        if (!gameState.upgradeHistory || gameState.upgradeHistory.length === 0) {
            logDiv.innerHTML = '<em>No upgrades yet</em>';
            return;
        }
        logDiv.innerHTML = '<strong>Upgrade Log</strong>';
        const ul = document.createElement('ul');
        ul.style.paddingLeft = '18px';
        ul.style.margin = '10px 0 0 0';
        gameState.upgradeHistory.forEach(upg => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${upg.title}</b><br><span style='font-size:12px;'>${upg.desc}</span>`;
            ul.appendChild(li);
        });
        logDiv.appendChild(ul);
    }


    // --- UPGRADE DEFINITIONS ---
    const allUpgrades = [
        { id: 'speed_down', title: 'Run It Back', desc: 'Logo moves 50% slower. Easier to predict.', apply: (gs) => gs.upgrades.speed *= 0.5 },
        { id: 'speed_up', title: 'BOOST!', desc: 'Logo moves 25% faster. More chances to hit corners, but harder to control.', apply: (gs) => gs.upgrades.speed *= 1.25 },
        { id: 'nudge_force_up', title: 'Stronger Nudge', desc: 'Increases Nudge force by 20%.', apply: (gs) => gs.upgrades.nudgeForce *= 1.20 },
        { id: 'nudge_cooldown_down', title: 'Faster Nudge', desc: 'Reduces Nudge cooldown by 25%.', apply: (gs) => gs.upgrades.nudgeCooldown *= 0.75 },
        { id: 'logo_size_up', title: 'Smaller Logo', desc: 'Decreases logo size by 10%. More precise.', apply: (gs) => gs.upgrades.logoSize *= 0.90 },
        { id: 'more_time', title: 'Extra Time', desc: 'Gain 5 extra seconds during the round.', apply: (gs) => { gs.upgrades.moreTimeUpgrades += 1; } },
        { id: 'corner_magnet', title: 'Corner Magnetism', desc: 'Corners now gain a slight magnetic pull.', apply: (gs) => gs.upgrades.cornerMagnetism += 0.5 },
    ];
    
    function getUpgradeChoices(count = 3) {
        // Fisher-Yates shuffle for fair randomness, excluding only the last chosen upgrade
        const arr = lastChosenUpgradeId ? allUpgrades.filter(upg => upg.id !== lastChosenUpgradeId) : [...allUpgrades];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        let choices = arr.slice(0, count);
        // If not enough upgrades left, allow repeats for the remaining slots
        if (choices.length < count) {
            const remaining = allUpgrades.filter(upg => !choices.includes(upg));
            for (let i = remaining.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
            }
            choices = choices.concat(remaining.slice(0, count - choices.length));
        }
        return choices;
    }
    
    // --- CORE GAME LOGIC ---

    function startGame() {
        resetGameState();
        setLogoColor(getRandomPastelColor());
        modalOverlay.classList.remove('visible');
        startRound();
    }

    function startRound() {
        // Reset positions and round state
        gameState.cornersHitThisRound = 0;
        gameState.x = Math.random() * (screen.clientWidth - logo.clientWidth);
        gameState.y = Math.random() * (screen.clientHeight - logo.clientHeight);
        gameState.timer = 30 + 5 * (gameState.upgrades.moreTimeUpgrades || 0); // Base time + 15s per upgrade
        
        updateUI();
        
        // Start game loops
        gameState.isRunning = true;
        if (gameState.timerIntervalId) clearInterval(gameState.timerIntervalId);
        gameState.timerIntervalId = setInterval(updateTimer, 1000);
        
        if (gameState.animationFrameId) cancelAnimationFrame(gameState.animationFrameId);
        gameLoop();
    }

    function updateTimer() {
        gameState.timer--;
        updateUI();
        if (gameState.timer <= 0) {
            gameOver("Time's Up!");
        }
    }

    function handleCornerHit() {
        // Flicker effect
        screen.classList.add('flicker');
        setTimeout(() => screen.classList.remove('flicker'), 180);
        gameState.lastCornerHitTime = performance.now();
        console.log("CORNER HIT!");
        const readyColor = getComputedStyle(document.documentElement).getPropertyValue('--ready-color');
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        screen.style.borderColor = readyColor;
        setTimeout(() => screen.style.borderColor = borderColor, 200);

        gameState.cornersHitThisRound++;
        updateUI();

        if (gameState.cornersHitThisRound >= getCornersGoal()) {
            levelComplete();
        }
    }

    function levelComplete() {
        gameState.isRunning = false;
        clearInterval(gameState.timerIntervalId);
        cancelAnimationFrame(gameState.animationFrameId);

        modalTitle.textContent = `Round ${gameState.round} Cleared!`;
        modalText.textContent = 'Choose your upgrade to continue.';
        startButton.style.display = 'none';
        upgradeSelection.style.display = 'flex';
        upgradeSelection.innerHTML = '';

        const choices = getUpgradeChoices();
        choices.forEach(upgrade => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-button';
            btn.innerHTML = `<h4>${upgrade.title}</h4><p>${upgrade.desc}</p>`;
            btn.onclick = () => {
                upgrade.apply(gameState);
                lastChosenUpgradeId = upgrade.id;
                gameState.upgradeHistory.push({ title: upgrade.title, desc: upgrade.desc });
                updateUpgradeLog();
                gameState.round++;
                modalOverlay.classList.remove('visible');
                startRound();
            };
            upgradeSelection.appendChild(btn);
        });

        modalOverlay.classList.add('visible');
    }

    function gameOver(reason) {
        gameState.isRunning = false;
        gameState.isGameOver = true;
        clearInterval(gameState.timerIntervalId);
        cancelAnimationFrame(gameState.animationFrameId);

        modalTitle.textContent = 'Game Over';
        modalText.innerHTML = `${reason}<br>You reached Round ${gameState.round}.`;
        startButton.textContent = 'Play Again';
        upgradeSelection.style.display = 'none';
        startButton.style.display = 'block';
        modalOverlay.classList.add('visible');
    }

    function handleNudge(nudgeX, nudgeY) {
        const now = performance.now();
        if ((now - gameState.lastNudgeTime) / 1000 < gameState.upgrades.nudgeCooldown) {
            return; // Nudge on cooldown
        }
        gameState.lastNudgeTime = now;
        screen.classList.add('shake');
        setTimeout(() => screen.classList.remove('shake'), 150);

        nudgeEffect.style.left = (nudgeX - 50) + 'px';
        nudgeEffect.style.top = (nudgeY - 50) + 'px';
        nudgeEffect.classList.remove('active');
        void nudgeEffect.offsetWidth; // Trigger reflow
        nudgeEffect.classList.add('active');

        // Calculate vector from nudge to logo
        const logoCenterX = gameState.x + logo.clientWidth / 2;
        const logoCenterY = gameState.y + logo.clientHeight / 2;
        let vecX = logoCenterX - nudgeX;
        let vecY = logoCenterY - nudgeY;
        
        // Normalize the vector
        const dist = Math.sqrt(vecX * vecX + vecY * vecY) || 1;
        vecX /= dist;
        vecY /= dist;

        // Apply force
        gameState.dx += vecX * gameState.upgrades.nudgeForce;
        gameState.dy += vecY * gameState.upgrades.nudgeForce;
    }


    // --- UPDATE & RENDER ---

    function updateUI() {
        roundDisplay.textContent = gameState.round;
        cornersHitDisplay.textContent = gameState.cornersHitThisRound;
        cornersGoalDisplay.textContent = getCornersGoal();
        timerDisplay.textContent = gameState.timer;
        logo.style.transform = `scale(${gameState.upgrades.logoSize})`;
        
        const cooldownRemaining = gameState.upgrades.nudgeCooldown - (performance.now() - gameState.lastNudgeTime) / 1000;
        if (cooldownRemaining > 0) {
            nudgeStatusDisplay.textContent = cooldownRemaining.toFixed(1) + 's';
            nudgeStatusDisplay.className = 'cooldown';
        } else {
            nudgeStatusDisplay.textContent = 'READY';
            nudgeStatusDisplay.className = 'ready';
        }
    }
    
    function getCornersGoal() {
        return Math.floor(0 + Math.pow(gameState.round, 1.2));
    }
    
    // Utility: Generate a random pastel color (less saturated, more like the real DVD logo)
    function getRandomPastelColor() {
        // HSL: lower saturation, higher lightness
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 60%, 65%)`;
    }

    function setLogoColor(color) {
        // Only update the logo's border and text, not the global --primary-color
        logo.style.boxShadow = `0 0 0 4px ${color}, 0 4px 24px #000a`;
        logo.style.borderColor = color;
        logo.querySelector('.dvd-main').style.color = color;
        logo.querySelector('.dvd-video').style.color = color;
    }

    function gameLoop(timestamp) {
        if (!gameState.isRunning) return;

        const screenWidth = screen.clientWidth;
        const screenHeight = screen.clientHeight;
        const logoWidth = logo.clientWidth * gameState.upgrades.logoSize;
        const logoHeight = logo.clientHeight * gameState.upgrades.logoSize;
        const speed = gameState.upgrades.speed;
        
        // --- Physics & Magnetism ---
        if (gameState.upgrades.cornerMagnetism > 0) {
            // Find the nearest corner center
            const corners = [
                { x: 0, y: 0 }, // top-left
                { x: screenWidth, y: 0 }, // top-right
                { x: 0, y: screenHeight }, // bottom-left
                { x: screenWidth, y: screenHeight } // bottom-right
            ];
            const logoCenterX = gameState.x + logoWidth / 2;
            const logoCenterY = gameState.y + logoHeight / 2;
            let minDist = Infinity;
            let nearestCorner = null;
            for (const corner of corners) {
                const dx = corner.x - logoCenterX;
                const dy = corner.y - logoCenterY;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    nearestCorner = corner;
                }
            }
            // Apply a pull toward the nearest corner center
            const pullStrength = 0.0025 * gameState.upgrades.cornerMagnetism;
            const vecX = nearestCorner.x - logoCenterX;
            const vecY = nearestCorner.y - logoCenterY;
            const dist = Math.sqrt(vecX * vecX + vecY * vecY) || 1;
            gameState.dx += (vecX / dist) * pullStrength;
            gameState.dy += (vecY / dist) * pullStrength;
        }


        // --- Movement ---
        gameState.x += gameState.dx * speed;
        gameState.y += gameState.dy * speed;

        // --- Collision Detection ---
        let hitWall = false;
        let isCorner = false;
        const cornerThreshold = 8;

        // Right wall
        if (gameState.x + logoWidth >= screenWidth) {
            gameState.dx = -Math.abs(gameState.dx);
            hitWall = true;
            if (gameState.y + logoHeight >= screenHeight - cornerThreshold || gameState.y <= cornerThreshold) isCorner = true;
        }
        // Left wall
        if (gameState.x <= 0) {
            gameState.dx = Math.abs(gameState.dx);
            hitWall = true;
            if (gameState.y + logoHeight >= screenHeight - cornerThreshold || gameState.y <= cornerThreshold) isCorner = true;
        }
        // Bottom wall
        if (gameState.y + logoHeight >= screenHeight) {
            gameState.dy = -Math.abs(gameState.dy);
            hitWall = true;
            if (gameState.x + logoWidth >= screenWidth - cornerThreshold || gameState.x <= cornerThreshold) isCorner = true;
        }
        // Top wall
        if (gameState.y <= 0) {
            gameState.dy = Math.abs(gameState.dy);
            hitWall = true;
            if (gameState.x + logoWidth >= screenWidth - cornerThreshold || gameState.x <= cornerThreshold) isCorner = true;
        }
        // Add cooldown for corner hits
        if (isCorner) {
            const now = performance.now();
            if (now - gameState.lastCornerHitTime >= 250) {
                handleCornerHit();
            }
        }
        // Change color on bounce
        if (hitWall || isCorner) {
            setLogoColor(getRandomPastelColor());
        }

        // --- Render ---
        logo.style.left = gameState.x + 'px';
        logo.style.top = gameState.y + 'px';
        
        updateUI(); // Keep cooldown timer fresh
        gameState.animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- EVENT LISTENERS ---
    startButton.addEventListener('click', startGame);
    
    // Nudge input for both mouse and keyboard
    screen.addEventListener('click', (e) => {
        if (!gameState.isRunning) return;
        const rect = screen.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleNudge(x, y);
    });
    
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameState.isRunning) {
            e.preventDefault();
            // Nudge from the center of the screen
            handleNudge(screen.clientWidth / 2, screen.clientHeight / 2);
        }
    });

});