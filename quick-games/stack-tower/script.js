// Stack Tower Game
const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

// Game constants
const INITIAL_BLOCK_WIDTH = 200
const BLOCK_HEIGHT = 30
const INITIAL_SPEED = 3
const SPEED_INCREMENT = 0.15
const MAX_SPEED = 12
const PERFECT_THRESHOLD = 5
const CAMERA_LERP = 0.1

// Colors - gradient palettes for blocks
const colorPalettes = [
  ['#FF6B6B', '#FF8E8E'], // Red
  ['#4ECDC4', '#6EE7DF'], // Teal
  ['#45B7D1', '#67D1E8'], // Blue
  ['#96CEB4', '#B4E4C9'], // Green
  ['#FFEAA7', '#FFF3C4'], // Yellow
  ['#DDA0DD', '#E8B8E8'], // Plum
  ['#98D8C8', '#B4E8D8'], // Mint
  ['#F7DC6F', '#FAE89F'], // Gold
  ['#BB8FCE', '#D4A8E0'], // Purple
  ['#85C1E9', '#A8D4F0'], // Sky
  ['#F1948A', '#F7B8B0'], // Salmon
  ['#82E0AA', '#A8ECC4'], // Lime
]

// Game state
let gameState = 'start' // start, playing, gameOver
let score = 0
let highScore = localStorage.getItem('stackTowerHighScore') || 0
let perfectCount = 0
let comboCount = 0
let blocks = []
let currentBlock = null
let cameraY = 0
let targetCameraY = 0
let speed = INITIAL_SPEED
let direction = 1
let particles = []
let gameStartTime = 0

// Audio context for sound effects
let audioCtx = null

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
}

function playSound(type) {
  if (!audioCtx) return

  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  switch (type) {
    case 'stack':
      oscillator.frequency.setValueAtTime(
        300 + score * 10,
        audioCtx.currentTime,
      )
      oscillator.frequency.exponentialRampToValueAtTime(
        500 + score * 10,
        audioCtx.currentTime + 0.1,
      )
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.2,
      )
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.2)
      break
    case 'perfect':
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1) // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2) // G5
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.4,
      )
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.4)
      break
    case 'gameOver':
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        50,
        audioCtx.currentTime + 0.5,
      )
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.5,
      )
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.5)
      break
  }
}

// Resize canvas
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 500)
  canvas.height = window.innerHeight
}

// Initialize game
function init() {
  resizeCanvas()

  blocks = []
  particles = []
  score = 0
  perfectCount = 0
  comboCount = 0
  speed = INITIAL_SPEED
  cameraY = 0
  targetCameraY = 0

  // Create base block at bottom of screen
  const baseBlock = {
    x: canvas.width / 2 - INITIAL_BLOCK_WIDTH / 2,
    y: canvas.height - 100,
    width: INITIAL_BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    colorIndex: 0,
    settled: true,
  }
  blocks.push(baseBlock)

  // Create first moving block
  spawnNewBlock()

  updateUI()
}

function spawnNewBlock() {
  const lastBlock = blocks[blocks.length - 1]
  const colorIndex = blocks.length % colorPalettes.length

  // Alternate direction each block
  direction = blocks.length % 2 === 0 ? 1 : -1
  const startX = direction === 1 ? -lastBlock.width : canvas.width

  currentBlock = {
    x: startX,
    y: lastBlock.y - BLOCK_HEIGHT,
    width: lastBlock.width,
    height: BLOCK_HEIGHT,
    colorIndex: colorIndex,
    settled: false,
  }
}

function stackBlock() {
  if (!currentBlock || gameState !== 'playing') return

  const lastBlock = blocks[blocks.length - 1]

  // Calculate overlap
  const overlapStart = Math.max(currentBlock.x, lastBlock.x)
  const overlapEnd = Math.min(
    currentBlock.x + currentBlock.width,
    lastBlock.x + lastBlock.width,
  )
  const overlapWidth = overlapEnd - overlapStart

  if (overlapWidth <= 0) {
    // Missed completely
    gameOver()
    return
  }

  // Check for perfect stack
  const isPerfect = Math.abs(currentBlock.x - lastBlock.x) < PERFECT_THRESHOLD

  if (isPerfect) {
    // Perfect stack - keep same width and align perfectly
    currentBlock.x = lastBlock.x
    currentBlock.width = lastBlock.width
    comboCount++
    perfectCount++

    playSound('perfect')
    showPerfectText()
    showCombo()
    createPerfectParticles(currentBlock)

    // Bonus points for combo
    score += 1 + comboCount
  } else {
    // Cut the overhanging part
    comboCount = 0
    hideCombo()

    // Create falling piece particle
    if (currentBlock.x < lastBlock.x) {
      // Hanging off left side
      createFallingPiece(
        currentBlock.x,
        currentBlock.y,
        lastBlock.x - currentBlock.x,
        BLOCK_HEIGHT,
        currentBlock.colorIndex,
      )
    } else if (
      currentBlock.x + currentBlock.width >
      lastBlock.x + lastBlock.width
    ) {
      // Hanging off right side
      createFallingPiece(
        lastBlock.x + lastBlock.width,
        currentBlock.y,
        currentBlock.x + currentBlock.width - (lastBlock.x + lastBlock.width),
        BLOCK_HEIGHT,
        currentBlock.colorIndex,
      )
    }

    currentBlock.x = overlapStart
    currentBlock.width = overlapWidth
    score++

    playSound('stack')
  }

  currentBlock.settled = true
  blocks.push(currentBlock)

  // Check if block too small
  if (currentBlock.width < 10) {
    gameOver()
    return
  }

  // Increase speed
  speed = Math.min(MAX_SPEED, INITIAL_SPEED + score * SPEED_INCREMENT)

  // Spawn next block
  spawnNewBlock()
  updateUI()
}

function createFallingPiece(x, y, width, height, colorIndex) {
  particles.push({
    type: 'falling',
    x: x,
    y: y,
    width: width,
    height: height,
    colorIndex: colorIndex,
    velocityX: (x < canvas.width / 2 ? -1 : 1) * (2 + Math.random() * 2),
    velocityY: 0,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    alpha: 1,
  })
}

function createPerfectParticles(block) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      type: 'sparkle',
      x: block.x + Math.random() * block.width,
      y: block.y + Math.random() * block.height,
      size: 3 + Math.random() * 5,
      velocityX: (Math.random() - 0.5) * 8,
      velocityY: -Math.random() * 6 - 2,
      alpha: 1,
      color: '#FFD700',
    })
  }
}

function showPerfectText() {
  const text = document.createElement('div')
  text.className = 'perfect-text'
  text.textContent = comboCount > 1 ? `PERFECT x${comboCount}!` : 'PERFECT!'
  text.style.left = '50%'
  text.style.top = '40%'
  text.style.transform = 'translateX(-50%)'
  document.getElementById('game-container').appendChild(text)

  setTimeout(() => text.remove(), 1000)
}

function showCombo() {
  const comboEl = document.getElementById('combo')
  comboEl.textContent = `🔥 ${comboCount}x COMBO!`
  comboEl.classList.add('show')
}

function hideCombo() {
  document.getElementById('combo').classList.remove('show')
}

function gameOver() {
  gameState = 'gameOver'
  playSound('gameOver')

  // Create explosion particles from last block
  if (currentBlock) {
    for (let i = 0; i < 30; i++) {
      particles.push({
        type: 'explosion',
        x: currentBlock.x + currentBlock.width / 2,
        y: currentBlock.y - cameraY + BLOCK_HEIGHT / 2,
        size: 5 + Math.random() * 10,
        velocityX: (Math.random() - 0.5) * 15,
        velocityY: (Math.random() - 0.5) * 15,
        alpha: 1,
        color: colorPalettes[currentBlock.colorIndex][0],
      })
    }
  }

  // Update high score
  if (score > highScore) {
    highScore = score
    localStorage.setItem('stackTowerHighScore', highScore)
  }

  // Show game over screen after delay
  setTimeout(() => {
    document.getElementById('final-score').textContent = score
    document.getElementById('best-score').textContent = highScore
    document.getElementById('perfect-count').textContent = perfectCount
    document.getElementById('game-over-screen').classList.remove('hidden')
  }, 500)

  // Screen shake
  document.getElementById('game-container').classList.add('shake')
  setTimeout(() => {
    document.getElementById('game-container').classList.remove('shake')
  }, 300)
}

function updateUI() {
  document.getElementById('score').textContent = score
  document.getElementById('high-score-display').textContent = highScore
}

function update() {
  if (gameState !== 'playing') return

  // Move current block
  if (currentBlock && !currentBlock.settled) {
    currentBlock.x += speed * direction

    // Bounce off edges
    if (currentBlock.x + currentBlock.width > canvas.width) {
      currentBlock.x = canvas.width - currentBlock.width
      direction = -1
    } else if (currentBlock.x < 0) {
      currentBlock.x = 0
      direction = 1
    }
  }

  // Smooth camera movement
  cameraY += (targetCameraY - cameraY) * CAMERA_LERP

  // Update particles
  updateParticles()
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]

    if (p.type === 'falling') {
      p.velocityY += 0.5 // gravity
      p.x += p.velocityX
      p.y += p.velocityY
      p.rotation += p.rotationSpeed
      p.alpha -= 0.02

      if (p.alpha <= 0 || p.y > canvas.height + 100) {
        particles.splice(i, 1)
      }
    } else if (p.type === 'sparkle' || p.type === 'explosion') {
      p.velocityY += 0.2 // light gravity
      p.x += p.velocityX
      p.y += p.velocityY
      p.alpha -= 0.03
      p.size *= 0.95

      if (p.alpha <= 0) {
        particles.splice(i, 1)
      }
    }
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#0f3460')
  gradient.addColorStop(1, '#1a1a2e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw background grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  const gridSize = 40
  const offsetY = cameraY % gridSize

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }

  for (let y = -offsetY; y < canvas.height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  // Draw blocks
  ctx.save()

  for (const block of blocks) {
    drawBlock(block, block.y - cameraY)
  }

  // Draw current moving block
  if (currentBlock && !currentBlock.settled) {
    drawBlock(currentBlock, currentBlock.y - cameraY)

    // Draw guide line
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1]
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(lastBlock.x, lastBlock.y - cameraY)
      ctx.lineTo(lastBlock.x, currentBlock.y - cameraY + BLOCK_HEIGHT)
      ctx.moveTo(lastBlock.x + lastBlock.width, lastBlock.y - cameraY)
      ctx.lineTo(
        lastBlock.x + lastBlock.width,
        currentBlock.y - cameraY + BLOCK_HEIGHT,
      )
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  ctx.restore()

  // Draw particles
  drawParticles()
}

function drawBlock(block, y) {
  const colors = colorPalettes[block.colorIndex]

  // Main block gradient
  const gradient = ctx.createLinearGradient(
    block.x,
    y,
    block.x,
    y + BLOCK_HEIGHT,
  )
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])

  ctx.fillStyle = gradient
  ctx.fillRect(block.x, y, block.width, BLOCK_HEIGHT)

  // Top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillRect(block.x, y, block.width, 3)

  // Bottom shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fillRect(block.x, y + BLOCK_HEIGHT - 3, block.width, 3)

  // Side highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(block.x, y, 3, BLOCK_HEIGHT)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(block.x + block.width - 3, y, 3, BLOCK_HEIGHT)
}

function drawParticles() {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.alpha

    if (p.type === 'falling') {
      const colors = colorPalettes[p.colorIndex]
      ctx.translate(p.x + p.width / 2, p.y - cameraY + p.height / 2)
      ctx.rotate(p.rotation)

      const gradient = ctx.createLinearGradient(
        -p.width / 2,
        -p.height / 2,
        -p.width / 2,
        p.height / 2,
      )
      gradient.addColorStop(0, colors[0])
      gradient.addColorStop(1, colors[1])
      ctx.fillStyle = gradient
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height)
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      // Glow effect
      ctx.shadowColor = p.color
      ctx.shadowBlur = 10
      ctx.fill()
    }

    ctx.restore()
  }
}

function gameLoop() {
  update()
  draw()
  requestAnimationFrame(gameLoop)
}

// Event listeners
function handleInput() {
  if (gameState === 'playing') {
    stackBlock()
  }
}

canvas.addEventListener('click', handleInput)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  handleInput()
})

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    handleInput()
  }
})

document.getElementById('start-btn').addEventListener('click', () => {
  initAudio()
  gameState = 'playing'
  document.getElementById('start-screen').classList.add('hidden')
  document.getElementById('score').classList.add('visible')
  init()
})

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('game-over-screen').classList.add('hidden')
  gameState = 'playing'
  init()
})

document.getElementById('share-btn').addEventListener('click', () => {
  const gameUrl =
    'https://world.org/mini-app?app_id=app_743401e3bbed2f8045c0963167d39619&path=&draft_id=meta_3b86a1d4b0a5d93e75cff5beee992ae7'
  const text = `🗼 I scored ${score} in Stack Tower! Can you beat me? 🎮\n\n#AIShigames #AIShiCoin\n\n${gameUrl}`

  if (navigator.share) {
    navigator.share({
      title: 'Stack Tower - AIshi Games',
      text: `🗼 I scored ${score} in Stack Tower! Can you beat me? 🎮 #AIShigames #AIShiCoin`,
      url: gameUrl,
    })
  } else {
    // Fallback: Open Twitter/X share
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🗼 I scored ${score} in Stack Tower! Can you beat me? 🎮 #AIShigames #AIShiCoin`)}&url=${encodeURIComponent(gameUrl)}`
    window.open(twitterUrl, '_blank')
  }
})

window.addEventListener('resize', resizeCanvas)

// Initialize
resizeCanvas()
document.getElementById('high-score-display').textContent = highScore
gameLoop()
