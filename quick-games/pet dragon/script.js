const gameState = {
  hunger: 100,
  happiness: 100,
  energy: 100,
  age: 0, // in days (game days)
  stage: 'egg',
  lastLogin: Date.now(),
  isSleeping: false,
  birthTime: Date.now(),
  nextAgeUpdate: Date.now() + 60000, // Will be overwritten by config.dayLength if loaded
}

const config = {
    decayRate: 2000, // ms to decrease stats
    dayLength: 60000, // ms for a game day (1 minute = 1 day for fast progression demo)
    stages: {
        egg: { img: 'dragon centered/01_v1_egg.png', nextStageAt: 60 }, // 1 hour
        baby: { img: 'dragon centered/02_v1_baby.png', nextStageAt: 540 }, // +8 hours (9h total)
        toddler: { img: 'dragon centered/03_v1_toddler.png', nextStageAt: 1500 }, // +16 hours (25h total)
        child: { img: 'dragon centered/04_v1_child.png', nextStageAt: 2940 }, // +24 hours (49h total)
        teen: { img: 'dragon centered/05_v1_teen.png', nextStageAt: 5820 }, // +48 hours (97h total)
        adult: { img: 'dragon centered/06a_v1_good_adult.png', nextStageAt: 10140 }, // +72 hours (169h total)
        elder: { img: 'dragon centered/07a_v1_good_elder.png', nextStageAt: 20000 } // End game or just stay old
    }
};

// DOM Elements
const dragonImg = document.getElementById('dragon-img')
const ageDisplay = document.getElementById('age')
const countdownDisplay = document.getElementById('evolution-countdown')
const hungerBar = document.getElementById('hunger-bar')
const happinessBar = document.getElementById('happiness-bar')
const energyBar = document.getElementById('energy-bar')
const btnFeed = document.getElementById('btn-feed')
const btnPlay = document.getElementById('btn-play')
const btnSleep = document.getElementById('btn-sleep')
const btnReset = document.getElementById('btn-reset')
const statusEmoji = document.getElementById('status-emoji')
const dragonStage = document.querySelector('.dragon-stage')

// Initialize Game
function init() {
  loadGame()

  // Ensure nextAgeUpdate exists (for old saves)
  if (!gameState.nextAgeUpdate) {
    gameState.nextAgeUpdate = Date.now() + config.dayLength
  }

  calculateOfflineProgress()
  updateUI()
  startGameLoop()
}

// Save/Load System
function saveGame() {
  gameState.lastLogin = Date.now()
  localStorage.setItem('dragonPetSave', JSON.stringify(gameState))
}

function loadGame() {
  const saved = localStorage.getItem('dragonPetSave')
  if (saved) {
    const parsed = JSON.parse(saved)
    Object.assign(gameState, parsed)
  }
}

function resetGame() {
  if (
    confirm(
      'Are you sure you want to reset your dragon? This cannot be undone.'
    )
  ) {
    localStorage.removeItem('dragonPetSave')
    location.reload()
  }
}

// Game Logic
function calculateOfflineProgress() {
  const now = Date.now()
  const timeDiff = now - gameState.lastLogin

  // Calculate how many decay cycles passed
  const cycles = Math.floor(timeDiff / config.decayRate)

  if (cycles > 0 && !gameState.isSleeping) {
    decreaseStats(cycles)
    // Cap stats at 0
    gameState.hunger = Math.max(0, gameState.hunger)
    gameState.happiness = Math.max(0, gameState.happiness)
    gameState.energy = Math.max(0, gameState.energy)
  } else if (gameState.isSleeping) {
    // Recover energy while sleeping offline
    const energyGain = cycles * 5
    gameState.energy = Math.min(100, gameState.energy + energyGain)
    // Wake up if fully rested
    if (gameState.energy >= 100) {
      gameState.isSleeping = false
    }
  }

  // Age progression offline
  if (now >= gameState.nextAgeUpdate) {
    const timePassedSinceNextUpdate = now - gameState.nextAgeUpdate
    const daysPassed =
      1 + Math.floor(timePassedSinceNextUpdate / config.dayLength)

    gameState.age += daysPassed

    // Update nextAgeUpdate to be in the future
    const timeIntoNextDay = timePassedSinceNextUpdate % config.dayLength
    gameState.nextAgeUpdate = now + (config.dayLength - timeIntoNextDay)

    checkEvolution()
  }
}

function startGameLoop() {
  // Stat decay loop
  setInterval(() => {
    if (!gameState.isSleeping) {
      decreaseStats(1)
    } else {
      gameState.energy = Math.min(100, gameState.energy + 5)
      if (gameState.energy >= 100) {
        wakeUp()
      }
    }
    updateUI()
    saveGame()
  }, config.decayRate)

  // Aging and Countdown loop (1 second tick)
  setInterval(() => {
    const now = Date.now()
    if (now >= gameState.nextAgeUpdate) {
      gameState.age++
      gameState.nextAgeUpdate += config.dayLength
      checkEvolution()
      updateUI()
    }
    updateCountdown()
  }, 1000)

  // Initial countdown update
  updateCountdown()
}

function updateCountdown() {
  const currentStageConfig = config.stages[gameState.stage]
  if (!currentStageConfig) {
    countdownDisplay.textContent = 'Max Level'
    return
  }

  const targetAge = currentStageConfig.nextStageAt
  const daysLeft = targetAge - gameState.age

  if (daysLeft <= 0) {
    // Should be evolving soon or already evolved
    countdownDisplay.textContent = 'Evolving...'
    return
  }

  // Time until next age increment
  const msUntilNextDay = Math.max(0, gameState.nextAgeUpdate - Date.now())

  // Total time remaining
  // (daysLeft - 1) full days + time remaining in current day
  const totalMs = (daysLeft - 1) * config.dayLength + msUntilNextDay

  if (totalMs < 0) {
    countdownDisplay.textContent = 'Evolving...'
    return
  }

  // Format time
  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
  countdownDisplay.textContent = `Next: ${formattedTime}`
}

function decreaseStats(multiplier) {
  // Decay amounts
  const hungerDecay = 2 * multiplier
  const happinessDecay = 1 * multiplier
  const energyDecay = 1 * multiplier

  gameState.hunger = Math.max(0, gameState.hunger - hungerDecay)
  gameState.happiness = Math.max(0, gameState.happiness - happinessDecay)
  gameState.energy = Math.max(0, gameState.energy - energyDecay)
}

function checkEvolution() {
  const currentStageConfig = config.stages[gameState.stage]
  if (currentStageConfig && gameState.age >= currentStageConfig.nextStageAt) {
    // Find next stage
    const stages = Object.keys(config.stages)
    const currentIndex = stages.indexOf(gameState.stage)
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1]
      evolve(nextStage)
    }
  }
}

function evolve(newStage) {
  gameState.stage = newStage
  showNotification(`Your dragon evolved into a ${newStage}!`)
  playSound('evolve') // Placeholder
  animateDragon('bounce')
}

// Actions
function pet() {
  if (gameState.isSleeping) return

  gameState.happiness = Math.min(100, gameState.happiness + 5)
  animateDragon('bounce')
  showEmoji('❤️')
  showFloatingText(dragonImg, '+5 Happy', '#FF6584')
  updateUI()
}

function feed() {
  if (gameState.isSleeping) return
  if (gameState.hunger >= 100) {
    showNotification("I'm full!")
    return
  }

  gameState.hunger = Math.min(100, gameState.hunger + 20)
  gameState.energy = Math.max(0, gameState.energy - 5) // Digestion takes energy
  animateDragon('bounce')
  showEmoji('😋')
  showFloatingText(hungerBar, '+20 Hunger', '#43D9AD')
  updateUI()
}

function play() {
  if (gameState.isSleeping) return
  if (gameState.energy < 20) {
    showNotification("I'm too tired...")
    return
  }

  gameState.happiness = Math.min(100, gameState.happiness + 15)
  gameState.hunger = Math.max(0, gameState.hunger - 10)
  gameState.energy = Math.max(0, gameState.energy - 15)
  animateDragon('shake')
  showEmoji('😂')
  showFloatingText(happinessBar, '+15 Happy', '#FF6584')
  showFloatingText(energyBar, '-15 Energy', '#6C63FF')
  updateUI()
}

function toggleSleep() {
  if (gameState.isSleeping) {
    wakeUp()
  } else {
    goToSleep()
  }
  updateUI()
}

function goToSleep() {
  gameState.isSleeping = true
  showEmoji('💤')
  dragonImg.classList.add('sleeping')
  btnSleep.innerHTML = '<span class="icon">☀️</span> Wake'
}

function wakeUp() {
  gameState.isSleeping = false
  showEmoji('😊')
  dragonImg.classList.remove('sleeping')
  btnSleep.innerHTML = '<span class="icon">💤</span> Sleep'
}

// UI Updates
function updateUI() {
  // Update Stats Bars
  hungerBar.style.width = `${gameState.hunger}%`
  happinessBar.style.width = `${gameState.happiness}%`
  energyBar.style.width = `${gameState.energy}%`

  // Color changes based on levels
  updateBarColor(hungerBar, gameState.hunger)
  updateBarColor(happinessBar, gameState.happiness)
  updateBarColor(energyBar, gameState.energy)

  // Update Age
  ageDisplay.textContent = formatAge(gameState.age)

  // Update Image
  const stageConfig = config.stages[gameState.stage]
  if (dragonImg.getAttribute('src') !== stageConfig.img) {
    dragonImg.src = stageConfig.img
  }

  // Button states
  btnFeed.disabled = gameState.isSleeping
  btnPlay.disabled = gameState.isSleeping

  // Night Mode
  if (gameState.isSleeping) {
    dragonStage.classList.add('night-mode')
  } else {
    dragonStage.classList.remove('night-mode')
  }

  // Low Stat Indicators (only if not already showing an action emoji)
  if (!gameState.isSleeping && statusEmoji.textContent === '') {
    if (gameState.hunger < 30) statusEmoji.textContent = '🍖'
    else if (gameState.energy < 30) statusEmoji.textContent = '😫'
    else if (gameState.happiness < 30) statusEmoji.textContent = '😢'
  }
}

function showFloatingText(element, text, color) {
  const rect = element.getBoundingClientRect()
  const floatEl = document.createElement('div')
  floatEl.className = 'floating-text'
  floatEl.textContent = text
  floatEl.style.color = color
  // Position relative to viewport since we append to body
  floatEl.style.left = `${rect.left + rect.width / 2 - 20}px`
  floatEl.style.top = `${rect.top}px`

  document.body.appendChild(floatEl)

  setTimeout(() => {
    floatEl.remove()
  }, 1000)
}

function formatAge(minutes) {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) {
    return `${hours}h ${mins}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

function updateBarColor(element, value) {
  if (value < 30) {
    element.style.backgroundColor = '#ff6b6b' // Red warning
  } else if (value < 60) {
    element.style.backgroundColor = '#fcc419' // Yellow warning
  } else {
    // Reset to original colors (handled by CSS classes usually, but here inline for simplicity or reset)
    // Actually, let's just remove the inline override if it's healthy
    element.style.backgroundColor = ''
  }
}

function animateDragon(animationClass) {
  dragonImg.classList.remove(animationClass)
  void dragonImg.offsetWidth // Trigger reflow
  dragonImg.classList.add(animationClass)
  setTimeout(() => {
    dragonImg.classList.remove(animationClass)
  }, 500)
}

function showEmoji(emoji) {
  statusEmoji.textContent = emoji
  setTimeout(() => {
    statusEmoji.textContent = ''
  }, 2000)
}

function showNotification(msg) {
  // Simple alert for now, could be a toast
  // alert(msg);
  // Better: use the emoji area or a small toast
  const toast = document.createElement('div')
  toast.style.position = 'absolute'
  toast.style.bottom = '80px'
  toast.style.left = '50%'
  toast.style.transform = 'translateX(-50%)'
  toast.style.background = 'rgba(0,0,0,0.7)'
  toast.style.color = 'white'
  toast.style.padding = '5px 10px'
  toast.style.borderRadius = '10px'
  toast.style.fontSize = '0.8rem'
  toast.textContent = msg
  document.querySelector('.game-container').appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

// Event Listeners
btnFeed.addEventListener('click', feed)
btnPlay.addEventListener('click', play)
btnSleep.addEventListener('click', toggleSleep)
btnReset.addEventListener('click', resetGame)
dragonImg.addEventListener('click', pet)

// Start
init()
