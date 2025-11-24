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

let isResetting = false
let gameLoopInterval
let ageLoopInterval
let animationInterval = null
let currentAnimAction = null

const config = {
  decayRate: 5000, // 5 seconds
  decayAmount: {
    hunger: 0.14, // Lasts ~1 hour (100 / 0.14 * 5s = 3571s)
    happiness: 0.07, // Lasts ~2 hours
    energy: 0.07, // Lasts ~2 hours
  },
  dayLength: 60000, // ms for a game day (1 minute = 1 day for fast progression demo)
  stages: {
    egg: { img: 'dragon centered/01_v1_egg.png', nextStageAt: 60 }, // 1 hour
    baby: {
      img: 'dragon centered/02_v1_baby.png',
      // spriteSheet: 'dragon centered/baby_sprite.png', // Deprecated
      animations: {
        idle: { folder: 'dragon centered/baby/baby idle', frames: 6 },
        play: { folder: 'dragon centered/baby/baby play', frames: 6 },
        eat: { folder: 'dragon centered/baby/baby eat', frames: 6 },
        sleep: { folder: 'dragon centered/baby/baby sleep', frames: 6 },
      },
      nextStageAt: 540,
    }, // +8 hours (9h total)
    toddler: { img: 'dragon centered/03_v1_toddler.png', nextStageAt: 1500 }, // +16 hours (25h total)
    child: { img: 'dragon centered/04_v1_child.png', nextStageAt: 2940 }, // +24 hours (49h total)
    teen: { img: 'dragon centered/05_v1_teen.png', nextStageAt: 5820 }, // +48 hours (97h total)
    adult: { img: 'dragon centered/06a_v1_good_adult.png', nextStageAt: 10140 }, // +72 hours (169h total)
    adult_grumpy: {
      img: 'dragon centered/06b_v1_grumpy_adult.png',
      nextStageAt: 10140,
    }, // Variant
    elder: { img: 'dragon centered/07a_v1_good_elder.png', nextStageAt: 14460 }, // +72 hours (241h total) - Max 3 days per stage
    elder_grumpy: {
      img: 'dragon centered/07b_v1_grumpy_elder.png',
      nextStageAt: 14460,
    }, // Variant
  },
}

// Check for DEV mode from env.js
if (typeof window.ENV !== 'undefined' && window.ENV.DEV) {
  console.log('🔧 DEV MODE ENABLED: Fast Evolution (1 min per stage)')

  // Map stages to their sequential order (1 min, 2 mins, 3 mins...)
  const stageOrder = {
    egg: 1,
    baby: 2,
    toddler: 3,
    child: 4,
    teen: 5,
    adult: 6,
    adult_grumpy: 6,
    elder: 7,
    elder_grumpy: 7,
  }

  for (const [stage, order] of Object.entries(stageOrder)) {
    if (config.stages[stage]) {
      config.stages[stage].nextStageAt = order
    }
  }
}

// DOM Elements
const dragonImg = document.getElementById('dragon-img')
const dragonSprite = document.getElementById('dragon-sprite')
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
const btnInfo = document.getElementById('info-btn')
const infoModal = document.getElementById('info-modal')
const btnCloseInfo = document.getElementById('close-info')
const evolutionList = document.getElementById('evolution-list')
const btnEvolve = document.getElementById('btn-evolve')

// Initialize Game
function init() {
  loadGame()

  // Ensure nextAgeUpdate exists (for old saves)
  if (!gameState.nextAgeUpdate) {
    gameState.nextAgeUpdate = Date.now() + config.dayLength
  }

  // If age is 0 (new game), ensure stage is egg
  if (gameState.age === 0) {
    gameState.stage = 'egg'
  }

  syncStageWithAge() // Fix for old saves with new config
  calculateOfflineProgress()
  checkEvolution() // Check if we are ready to evolve immediately after loading/offline progress
  populateInfoModal()
  updateUI()
  startGameLoop()
}

function syncStageWithAge() {
  const stages = Object.keys(config.stages)
  let correctStage = 'egg'

  for (let i = 0; i < stages.length; i++) {
    const stageName = stages[i]
    const stageConfig = config.stages[stageName]

    // If we have passed this stage's threshold, check the next one
    // But wait, nextStageAt is when we LEAVE this stage.
    // So if age < nextStageAt, we are IN this stage.
    if (gameState.age < stageConfig.nextStageAt) {
      correctStage = stageName
      break
    }
    // If we are at the last stage, stay there
    if (i === stages.length - 1) {
      correctStage = stageName
    }
  }

  // Only correct if the current stage is invalid (not in config)
  // We do NOT want to auto-upgrade (evolve) here, as that should be manual.
  if (!config.stages[gameState.stage]) {
    console.log(
      `Invalid stage ${gameState.stage}, resetting to ${correctStage}`
    )
    gameState.stage = correctStage
  }
}

// Save/Load System
function saveGame() {
  if (isResetting) return
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
    isResetting = true
    clearInterval(gameLoopInterval)
    clearInterval(ageLoopInterval)
    localStorage.removeItem('dragonPetSave')
    console.log('Game reset. Reloading...')
    // Force reload from server to avoid cache issues
    location.reload(true)
  }
}

// Game Logic
function calculateOfflineProgress() {
  const now = Date.now()
  const timeDiff = now - gameState.lastLogin

  // Calculate how many decay cycles passed
  const cycles = Math.floor(timeDiff / config.decayRate)

  // Calculate effective growth time (stops when hunger hits 0)
  // Hunger decays by config.decayAmount.hunger per cycle
  // Cycles until starvation = currentHunger / decayAmount
  const cyclesToStarve = Math.ceil(gameState.hunger / config.decayAmount.hunger)
  const timeToStarve = cyclesToStarve * config.decayRate

  // If we were sleeping, we don't starve, so we grow full time
  // If not sleeping, we grow only until we starve
  let effectiveGrowthTime = timeDiff
  if (!gameState.isSleeping) {
    effectiveGrowthTime = Math.min(timeDiff, timeToStarve)
  }

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
  // Only advance age if we had effective growth time
  if (effectiveGrowthTime > 0) {
    // We need to advance nextAgeUpdate based on effectiveGrowthTime
    // But nextAgeUpdate is a timestamp in the future.
    // If we missed it, we age up.

    // Simpler approach:
    // Calculate how many minutes passed during effective growth
    const minutesPassed = Math.floor(effectiveGrowthTime / config.dayLength)

    if (minutesPassed > 0) {
      const currentStageConfig = config.stages[gameState.stage]
      // Check if we would pass the evolution point
      if (
        currentStageConfig &&
        gameState.age + minutesPassed >= currentStageConfig.nextStageAt
      ) {
        // Cap age at evolution point
        gameState.age = currentStageConfig.nextStageAt
      } else {
        gameState.age += minutesPassed
      }

      // Adjust nextAgeUpdate
      // It should be: now + (time remaining for next minute)
      // But we need to account for the fact that we might have stopped growing halfway

      // Let's just reset nextAgeUpdate to be consistent with current time + remainder
      // This is a bit of a hack but works for "pausing" logic
      const timeIntoNextDay = effectiveGrowthTime % config.dayLength
      gameState.nextAgeUpdate = now + (config.dayLength - timeIntoNextDay)

      checkEvolution()
    } else {
      // If we didn't pass a full minute, we still need to shift nextAgeUpdate
      // if we were starving part of the time.
      // Actually, if we starved, we just push nextAgeUpdate forward by the starved time.
      const starvedTime = Math.max(0, timeDiff - effectiveGrowthTime)
      gameState.nextAgeUpdate += starvedTime
    }
  } else {
    // We were starving the whole time (or hunger was 0)
    // Push nextAgeUpdate forward by the entire duration to "pause" it
    gameState.nextAgeUpdate += timeDiff
  }
}

function startGameLoop() {
  // Stat decay loop
  gameLoopInterval = setInterval(() => {
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
  ageLoopInterval = setInterval(() => {
    const now = Date.now()

    // Only age if not starving (hunger > 0)
    if (gameState.hunger > 0) {
      if (now >= gameState.nextAgeUpdate) {
        const currentStageConfig = config.stages[gameState.stage]
        // Check if we are at the cap (ready to evolve)
        if (
          currentStageConfig &&
          gameState.age >= currentStageConfig.nextStageAt
        ) {
          // Cap reached, do not age further.
          // Reset nextAgeUpdate to prevent backlog accumulation (skipping stages)
          gameState.nextAgeUpdate = Date.now() + config.dayLength
          checkEvolution() // Ensure button is shown
        } else {
          gameState.age++
          gameState.nextAgeUpdate += config.dayLength
          checkEvolution()
          updateUI()
        }
      }
    } else {
      // If starving, push the next update time forward so it doesn't get closer
      // Effectively pausing the countdown
      gameState.nextAgeUpdate += 1000
    }

    updateCountdown()
  }, 1000)

  // Initial countdown update
  updateCountdown()
}

function updateCountdown() {
  const stages = Object.keys(config.stages)
  const currentIndex = stages.indexOf(gameState.stage)

  // If it's the last stage or invalid
  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    countdownDisplay.textContent = 'Max Level'
    return
  }

  const currentStageConfig = config.stages[gameState.stage]
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

  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const formattedTime = `${days} days ${hours
    .toString()
    .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
  countdownDisplay.textContent = `Next: ${formattedTime}`
}

function decreaseStats(multiplier) {
  // Decay amounts
  const hungerDecay = config.decayAmount.hunger * multiplier
  const happinessDecay = config.decayAmount.happiness * multiplier
  const energyDecay = config.decayAmount.energy * multiplier

  gameState.hunger = Math.max(0, gameState.hunger - hungerDecay)
  gameState.happiness = Math.max(0, gameState.happiness - happinessDecay)
  gameState.energy = Math.max(0, gameState.energy - energyDecay)
}

function checkEvolution() {
  const currentStageConfig = config.stages[gameState.stage]
  if (currentStageConfig && gameState.age >= currentStageConfig.nextStageAt) {
    // Branching Logic
    let nextStage = null

    if (gameState.stage === 'teen') {
      // Teen -> Adult (Good or Grumpy)
      if (gameState.happiness < 50) {
        nextStage = 'adult_grumpy'
      } else {
        nextStage = 'adult'
      }
    } else if (
      gameState.stage === 'adult' ||
      gameState.stage === 'adult_grumpy'
    ) {
      // Adult -> Elder (Good or Grumpy)
      if (gameState.happiness < 50) {
        nextStage = 'elder_grumpy'
      } else {
        nextStage = 'elder'
      }
    } else {
      // Linear progression for others
      const linearMap = {
        egg: 'baby',
        baby: 'toddler',
        toddler: 'child',
        child: 'teen',
      }

      nextStage = linearMap[gameState.stage]
    }

    if (nextStage) {
      // Instead of evolving immediately, show the button
      showEvolutionReady(nextStage)
    }
  }
}

function showEvolutionReady(nextStage) {
  btnEvolve.classList.remove('hidden')
  btnEvolve.dataset.nextStage = nextStage
  countdownDisplay.textContent = 'Evolution Ready!'
}

function triggerEvolution() {
  const nextStage = btnEvolve.dataset.nextStage
  if (nextStage) {
    evolve(nextStage)
    btnEvolve.classList.add('hidden')
  }
}

function evolve(newStage) {
  const oldStage = gameState.stage
  gameState.stage = newStage
  showNotification(`Your dragon evolved into a ${newStage}!`)

  // Play specific evolution effect
  playEvolutionEffect(oldStage, newStage)

  // Force animation reset for new stage
  currentAnimAction = null
  if (animationInterval) clearInterval(animationInterval)
  
  updateUI()
}

// Actions
function pet() {
  if (gameState.isSleeping) return

  gameState.happiness = Math.min(100, gameState.happiness + 5)

  // Animation
  if (
    config.stages[gameState.stage].spriteSheet ||
    config.stages[gameState.stage].animations
  ) {
    setSpriteAnimation('play', 3, () => {
      if (!gameState.isSleeping) setSpriteAnimation('idle')
    })
  } else {
    animateDragon('bounce')
  }

  showEmoji('❤️')
  showFloatingText(dragonImg, '+5 Happy', '#FF6584')
  playSound('pet')
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

  // Animation
  if (
    config.stages[gameState.stage].spriteSheet ||
    config.stages[gameState.stage].animations
  ) {
    setSpriteAnimation('eat', 3, () => {
      if (!gameState.isSleeping) setSpriteAnimation('idle')
    })
  } else {
    animateDragon('bounce')
  }

  showEmoji('😋')
  showFloatingText(hungerBar, '+20 Hunger', '#43D9AD')
  playSound('feed')
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

  // Animation
  if (
    config.stages[gameState.stage].spriteSheet ||
    config.stages[gameState.stage].animations
  ) {
    setSpriteAnimation('play', 3, () => {
      if (!gameState.isSleeping) setSpriteAnimation('idle')
    })
  } else {
    animateDragon('shake')
  }

  showEmoji('😂')
  showFloatingText(happinessBar, '+15 Happy', '#FF6584')
  showFloatingText(energyBar, '-15 Energy', '#6C63FF')
  playSound('play')
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
  playSound('sleep')
}

function wakeUp() {
  gameState.isSleeping = false
  showEmoji('😊')
  dragonImg.classList.remove('sleeping')
  btnSleep.innerHTML = '<span class="icon">💤</span> Sleep'
  playSound('wake')
}

// Info Modal Logic
function toggleInfoModal() {
  if (infoModal.classList.contains('hidden')) {
    populateEvolutionList()
    infoModal.classList.remove('hidden')
    playSound('click')
  } else {
    infoModal.classList.add('hidden')
    playSound('click')
  }
}

function populateEvolutionList() {
  evolutionList.innerHTML = ''
  const stages = Object.keys(config.stages)

  stages.forEach((stage, index) => {
    const stageConfig = config.stages[stage]
    const li = document.createElement('li')

    const nameSpan = document.createElement('span')
    nameSpan.className = 'stage-name'
    nameSpan.textContent = stage

    const timeSpan = document.createElement('span')
    timeSpan.className = 'stage-time'

    if (index === 0) {
      timeSpan.textContent = 'Start'
    } else {
      // Calculate duration from previous stage
      const prevStageConfig = config.stages[stages[index - 1]]
      // Actually nextStageAt is cumulative age.
      // So the time to reach this stage is the previous stage's nextStageAt

      // Wait, config.stages[stage].nextStageAt is when you LEAVE this stage.
      // So you ENTER this stage when you leave the previous one.

      // Let's show "Unlocks at: X time"
      const unlockTime =
        index === 0 ? 0 : config.stages[stages[index - 1]].nextStageAt
      timeSpan.textContent = formatAge(unlockTime)
    }

    // Highlight current stage
    if (stage === gameState.stage) {
      li.style.backgroundColor = '#f1f3f5'
      li.style.borderRadius = '5px'
      li.style.padding = '8px 10px'
      nameSpan.textContent += ' (Current)'
      nameSpan.style.color = 'var(--primary-color)'
    }

    li.appendChild(nameSpan)
    li.appendChild(timeSpan)
    evolutionList.appendChild(li)
  })
}

function populateInfoModal() {
  evolutionList.innerHTML = ''
  const stages = config.stages

  for (const key in stages) {
    if (key.includes('grumpy')) continue // Skip variants in the main list to keep it clean

    const stageData = stages[key]
    const li = document.createElement('li')

    const nameSpan = document.createElement('span')
    nameSpan.className = 'stage-name'
    nameSpan.textContent = key.charAt(0).toUpperCase() + key.slice(1)

    const timeSpan = document.createElement('span')
    timeSpan.className = 'stage-time'

    // Format time
    const minutes = stageData.nextStageAt
    if (key === 'elder') {
      timeSpan.textContent = 'Max Level'
    } else {
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      if (days > 0) {
        const remHours = hours % 24
        timeSpan.textContent = `Next: ${days}d ${remHours}h`
      } else {
        timeSpan.textContent = `Next: ${hours}h`
      }
    }

    li.appendChild(nameSpan)
    li.appendChild(timeSpan)
    evolutionList.appendChild(li)
  }
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

  // Update Image or Sprite
  const stageConfig = config.stages[gameState.stage]

  if (stageConfig.animations) {
    // Use JS Animation System
    let action = 'idle'
    if (gameState.isSleeping) action = 'sleep'

    if (!currentAnimAction) {
      setSpriteAnimation(action)
    } else if (gameState.isSleeping && currentAnimAction !== 'sleep') {
      setSpriteAnimation('sleep')
    } else if (!gameState.isSleeping && currentAnimAction === 'sleep') {
      setSpriteAnimation('idle')
    }
  } else if (stageConfig.spriteSheet) {
    // Use Sprite Animation
    dragonImg.classList.add('hidden')
    dragonSprite.classList.remove('hidden')
    dragonSprite.style.backgroundImage = `url('${stageConfig.spriteSheet}')`
    dragonSprite.style.backgroundSize = ''
    dragonSprite.style.backgroundPosition = ''

    // Default to idle if no other animation class is present
    if (!dragonSprite.className.includes('anim-')) {
      setSpriteAnimation('idle')
    }

    // Handle Sleep State for Sprite
    if (gameState.isSleeping) {
      setSpriteAnimation('sleep')
    } else if (dragonSprite.classList.contains('anim-sleep')) {
      setSpriteAnimation('idle')
    }
  } else {
    // Use Static Image
    dragonSprite.classList.add('hidden')
    dragonImg.classList.remove('hidden')

    if (dragonImg.getAttribute('src') !== stageConfig.img) {
      dragonImg.src = stageConfig.img
    }
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

function setSpriteAnimation(action, loopCount = 0, onComplete = null) {
  const stageConfig = config.stages[gameState.stage]

  // New JS Animation System
  if (stageConfig.animations) {
    // Fallback to idle if requested animation is missing
    if (!stageConfig.animations[action]) {
      if (action !== 'idle' && stageConfig.animations['idle']) {
        action = 'idle'
      } else {
        return // No animation to play
      }
    }

    // If we are forcing a loop (like eating/playing), we allow re-setting the same animation
    if (currentAnimAction === action && loopCount === 0) return // Already playing infinite loop

    currentAnimAction = action
    const animData = stageConfig.animations[action]

    // Clear existing interval
    if (animationInterval) clearInterval(animationInterval)

    dragonImg.classList.add('hidden')
    dragonSprite.classList.remove('hidden')

    // Reset CSS styles that might interfere
    dragonSprite.className = 'dragon-sprite'
    dragonSprite.style.backgroundImage = ''

    let frame = 1
    let loops = 0
    
    const playFrame = () => {
      dragonSprite.style.backgroundImage = `url('${animData.folder}/${frame}.png')`
      dragonSprite.style.backgroundSize = 'contain'
      dragonSprite.style.backgroundPosition = 'center'
      frame++
      
      if (frame > animData.frames) {
        frame = 1
        loops++
        
        if (loopCount > 0 && loops >= loopCount) {
          clearInterval(animationInterval)
          if (onComplete) onComplete()
        }
      }
    }

    playFrame()
    animationInterval = setInterval(playFrame, 200) // 5 FPS
    return
  }

  // Old CSS Sprite System
  // Remove all animation classes
  dragonSprite.classList.remove(
    'anim-idle',
    'anim-play',
    'anim-eat',
    'anim-sleep'
  )

  // Add the requested class
  dragonSprite.classList.add(`anim-${action}`)
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

// Sound System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }

  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  osc.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  const now = audioCtx.currentTime

  switch (type) {
    case 'feed':
      // Happy ascending chirp
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.linearRampToValueAtTime(600, now + 0.1)
      osc.frequency.linearRampToValueAtTime(1000, now + 0.2)
      gainNode.gain.setValueAtTime(0.1, now)
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
      break

    case 'play':
      // Playful bounce
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.linearRampToValueAtTime(500, now + 0.1)
      osc.frequency.linearRampToValueAtTime(300, now + 0.2)
      osc.frequency.linearRampToValueAtTime(500, now + 0.3)
      gainNode.gain.setValueAtTime(0.1, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.4)
      break

    case 'sleep':
      // Lullaby drop
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 1)
      gainNode.gain.setValueAtTime(0.1, now)
      gainNode.gain.linearRampToValueAtTime(0, now + 1)
      osc.start(now)
      osc.stop(now + 1)
      break

    case 'wake':
      // Gentle rise
      osc.type = 'sine'
      osc.frequency.setValueAtTime(100, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.5)
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.2)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
      break

    case 'pet':
      // Purr-like low trill
      osc.type = 'square'
      osc.frequency.setValueAtTime(100, now)
      // Create a wobble effect
      const lfo = audioCtx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 20
      const lfoGain = audioCtx.createGain()
      lfoGain.gain.value = 50
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start(now)
      lfo.stop(now + 0.5)

      gainNode.gain.setValueAtTime(0.05, now)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
      break

    case 'evolve':
      // Fanfare
      const frequencies = [440, 554, 659, 880] // A major
      frequencies.forEach((freq, i) => {
        const osc2 = audioCtx.createOscillator()
        const gain2 = audioCtx.createGain()
        osc2.connect(gain2)
        gain2.connect(audioCtx.destination)

        osc2.type = 'triangle'
        osc2.frequency.value = freq

        const startTime = now + i * 0.1
        gain2.gain.setValueAtTime(0, startTime)
        gain2.gain.linearRampToValueAtTime(0.1, startTime + 0.05)
        gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 1)

        osc2.start(startTime)
        osc2.stop(startTime + 1)
      })
      break

    case 'click':
    default:
      // Simple blip
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1)
      gainNode.gain.setValueAtTime(0.05, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      osc.start(now)
      osc.stop(now + 0.1)
      break
  }
}

// Event Listeners
btnFeed.addEventListener('click', feed)
btnPlay.addEventListener('click', play)
btnSleep.addEventListener('click', toggleSleep)
btnReset.addEventListener('click', resetGame)
dragonImg.addEventListener('click', pet)
btnInfo.addEventListener('click', toggleInfoModal)
btnCloseInfo.addEventListener('click', toggleInfoModal)
// Close modal when clicking outside
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    toggleInfoModal()
  }
})

btnEvolve.addEventListener('click', triggerEvolution)

// Start
init()
