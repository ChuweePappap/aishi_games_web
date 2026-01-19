// Game Constants
const BLOCK_SIZE = 32
const WORLD_WIDTH = 200
const WORLD_HEIGHT = 80
const GROUND_LEVEL = 50
const GRAVITY = 0.5
const JUMP_FORCE = -12
const PLAYER_SPEED = 5

// Block Types
const BLOCKS = {
  AIR: {
    id: 0,
    name: 'Air',
    color: 'transparent',
    solid: false,
    breakable: false,
  },
  GRASS: {
    id: 1,
    name: 'Grass',
    color: '#4a8f3c',
    topColor: '#5cb34d',
    solid: true,
    breakable: true,
    hardness: 1,
    drops: 'DIRT',
  },
  DIRT: {
    id: 2,
    name: 'Dirt',
    color: '#8b6914',
    solid: true,
    breakable: true,
    hardness: 1,
  },
  STONE: {
    id: 3,
    name: 'Stone',
    color: '#808080',
    solid: true,
    breakable: true,
    hardness: 3,
    drops: 'COBBLESTONE',
  },
  COBBLESTONE: {
    id: 4,
    name: 'Cobblestone',
    color: '#6b6b6b',
    solid: true,
    breakable: true,
    hardness: 3,
  },
  WOOD: {
    id: 5,
    name: 'Wood',
    color: '#8B4513',
    solid: true,
    breakable: true,
    hardness: 2,
  },
  LEAVES: {
    id: 6,
    name: 'Leaves',
    color: '#228B22',
    solid: true,
    breakable: true,
    hardness: 0.5,
  },
  SAND: {
    id: 7,
    name: 'Sand',
    color: '#f4d03f',
    solid: true,
    breakable: true,
    hardness: 1,
  },
  WATER: {
    id: 8,
    name: 'Water',
    color: '#3498db',
    solid: false,
    breakable: false,
    transparent: true,
  },
  BEDROCK: {
    id: 9,
    name: 'Bedrock',
    color: '#1a1a1a',
    solid: true,
    breakable: false,
  },
  COAL_ORE: {
    id: 10,
    name: 'Coal Ore',
    color: '#4a4a4a',
    solid: true,
    breakable: true,
    hardness: 4,
    pattern: 'coal',
  },
  IRON_ORE: {
    id: 11,
    name: 'Iron Ore',
    color: '#a0785a',
    solid: true,
    breakable: true,
    hardness: 5,
    pattern: 'iron',
  },
  GOLD_ORE: {
    id: 12,
    name: 'Gold Ore',
    color: '#ffd700',
    solid: true,
    breakable: true,
    hardness: 5,
    pattern: 'gold',
  },
  DIAMOND_ORE: {
    id: 13,
    name: 'Diamond Ore',
    color: '#00ffff',
    solid: true,
    breakable: true,
    hardness: 6,
    pattern: 'diamond',
  },
  PLANKS: {
    id: 14,
    name: 'Planks',
    color: '#deb887',
    solid: true,
    breakable: true,
    hardness: 2,
  },
  BRICK: {
    id: 15,
    name: 'Brick',
    color: '#b22222',
    solid: true,
    breakable: true,
    hardness: 3,
  },
  GLASS: {
    id: 16,
    name: 'Glass',
    color: 'rgba(200, 230, 255, 0.4)',
    solid: true,
    breakable: true,
    hardness: 0.5,
    transparent: true,
  },
  SNOW: {
    id: 17,
    name: 'Snow',
    color: '#fffafa',
    solid: true,
    breakable: true,
    hardness: 0.5,
  },
  ICE: {
    id: 18,
    name: 'Ice',
    color: '#a5f2f3',
    solid: true,
    breakable: true,
    hardness: 1,
    transparent: true,
  },
}

// Game State
let gameState = 'menu'
let world = []
let player = null
let camera = { x: 0, y: 0 }
let inventory = []
let selectedSlot = 0
let dayTime = 0
let dayCount = 1
let score = 0

// Mining
let miningBlock = null
let miningProgress = 0

// Input
const keys = {}
let mouse = { x: 0, y: 0, left: false, right: false }

// Canvas
const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')

// Initialize
function init() {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Input listeners
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true

    // Hotbar selection
    if (e.key >= '1' && e.key <= '9') {
      selectedSlot = parseInt(e.key) - 1
      updateHotbar()
    }
  })
  window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false))

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  })

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault()
    if (e.button === 0) mouse.left = true
    if (e.button === 2) mouse.right = true
  })

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      mouse.left = false
      miningBlock = null
      miningProgress = 0
    }
    if (e.button === 2) mouse.right = false
  })

  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  // Menu buttons
  document.getElementById('start-btn').addEventListener('click', startGame)
  document.getElementById('respawn-btn').addEventListener('click', startGame)

  // Start game loop
  requestAnimationFrame(gameLoop)
}

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function startGame() {
  gameState = 'playing'

  document.getElementById('menu-screen').style.display = 'none'
  document.getElementById('game-over').classList.add('hidden')
  document.getElementById('hud').classList.remove('hidden')
  document.getElementById('crosshair').classList.add('visible')

  // Generate world
  generateWorld()

  // Create player
  player = {
    x: (WORLD_WIDTH * BLOCK_SIZE) / 2,
    y: 0,
    width: 24,
    height: 48,
    vx: 0,
    vy: 0,
    onGround: false,
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
  }

  // Find spawn point
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const blockX = Math.floor(player.x / BLOCK_SIZE)
    if (world[y] && world[y][blockX] && world[y][blockX].solid) {
      player.y = (y - 2) * BLOCK_SIZE
      break
    }
  }

  // Initialize inventory
  inventory = [
    { type: 'DIRT', count: 64 },
    { type: 'STONE', count: 64 },
    { type: 'WOOD', count: 32 },
    { type: 'PLANKS', count: 32 },
    { type: 'GLASS', count: 16 },
    { type: 'BRICK', count: 16 },
    null,
    null,
    null,
  ]

  selectedSlot = 0
  dayTime = 0
  dayCount = 1
  score = 0

  updateHUD()
  updateHotbar()
}

function generateWorld() {
  world = []

  // Generate terrain using simple noise
  const heights = []
  let height = GROUND_LEVEL

  for (let x = 0; x < WORLD_WIDTH; x++) {
    // Simple terrain variation
    height += Math.floor(Math.random() * 3) - 1
    height = Math.max(GROUND_LEVEL - 10, Math.min(GROUND_LEVEL + 15, height))
    heights[x] = height
  }

  // Smooth the terrain
  for (let i = 0; i < 3; i++) {
    for (let x = 1; x < WORLD_WIDTH - 1; x++) {
      heights[x] = Math.floor(
        (heights[x - 1] + heights[x] + heights[x + 1]) / 3
      )
    }
  }

  // Fill world
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    world[y] = []
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const surfaceHeight = heights[x]

      if (y >= WORLD_HEIGHT - 1) {
        world[y][x] = BLOCKS.BEDROCK
      } else if (y > surfaceHeight + 20) {
        // Deep underground - more stone and ores
        const rand = Math.random()
        if (rand < 0.01) world[y][x] = BLOCKS.DIAMOND_ORE
        else if (rand < 0.03) world[y][x] = BLOCKS.GOLD_ORE
        else if (rand < 0.08) world[y][x] = BLOCKS.IRON_ORE
        else if (rand < 0.15) world[y][x] = BLOCKS.COAL_ORE
        else world[y][x] = BLOCKS.STONE
      } else if (y > surfaceHeight + 5) {
        // Underground - mostly stone
        const rand = Math.random()
        if (rand < 0.05) world[y][x] = BLOCKS.COAL_ORE
        else if (rand < 0.08) world[y][x] = BLOCKS.IRON_ORE
        else world[y][x] = BLOCKS.STONE
      } else if (y > surfaceHeight) {
        // Below surface - dirt and stone
        world[y][x] = Math.random() < 0.3 ? BLOCKS.STONE : BLOCKS.DIRT
      } else if (y === surfaceHeight) {
        // Surface
        world[y][x] = BLOCKS.GRASS
      } else {
        // Air
        world[y][x] = BLOCKS.AIR
      }
    }
  }

  // Generate trees
  for (let x = 5; x < WORLD_WIDTH - 5; x++) {
    if (Math.random() < 0.05) {
      const treeX = x
      const treeY = heights[x] - 1
      generateTree(treeX, treeY)
      x += 4 // Space between trees
    }
  }

  // Generate caves
  for (let i = 0; i < 20; i++) {
    const caveX = Math.floor(Math.random() * WORLD_WIDTH)
    const caveY = GROUND_LEVEL + 10 + Math.floor(Math.random() * 30)
    generateCave(caveX, caveY)
  }
}

function generateTree(x, baseY) {
  if (baseY < 5) return

  const trunkHeight = 4 + Math.floor(Math.random() * 3)

  // Trunk
  for (let y = 0; y < trunkHeight; y++) {
    if (baseY - y >= 0) {
      world[baseY - y][x] = BLOCKS.WOOD
    }
  }

  // Leaves
  const leafStart = baseY - trunkHeight
  for (let ly = -1; ly <= 2; ly++) {
    for (let lx = -2; lx <= 2; lx++) {
      const leafY = leafStart - ly
      const leafX = x + lx
      if (leafY >= 0 && leafX >= 0 && leafX < WORLD_WIDTH) {
        if (
          Math.abs(lx) + Math.abs(ly) < 4 &&
          world[leafY][leafX] === BLOCKS.AIR
        ) {
          world[leafY][leafX] = BLOCKS.LEAVES
        }
      }
    }
  }
}

function generateCave(startX, startY) {
  let x = startX
  let y = startY
  const length = 10 + Math.floor(Math.random() * 30)

  for (let i = 0; i < length; i++) {
    const radius = 2 + Math.floor(Math.random() * 2)

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const cx = x + dx
          const cy = y + dy
          if (cy >= 0 && cy < WORLD_HEIGHT - 1 && cx >= 0 && cx < WORLD_WIDTH) {
            if (world[cy][cx] !== BLOCKS.BEDROCK) {
              world[cy][cx] = BLOCKS.AIR
            }
          }
        }
      }
    }

    x += Math.floor(Math.random() * 3) - 1
    y += Math.floor(Math.random() * 3) - 1
    x = Math.max(0, Math.min(WORLD_WIDTH - 1, x))
    y = Math.max(0, Math.min(WORLD_HEIGHT - 2, y))
  }
}

function gameLoop(timestamp) {
  if (gameState === 'playing') {
    update()
  }
  render()
  requestAnimationFrame(gameLoop)
}

function update() {
  // Player movement
  player.vx = 0
  if (keys['a'] || keys['arrowleft']) player.vx = -PLAYER_SPEED
  if (keys['d'] || keys['arrowright']) player.vx = PLAYER_SPEED

  // Jumping
  if ((keys[' '] || keys['w'] || keys['arrowup']) && player.onGround) {
    player.vy = JUMP_FORCE
    player.onGround = false
  }

  // Apply gravity
  player.vy += GRAVITY
  player.vy = Math.min(player.vy, 15)

  // Move player
  movePlayer()

  // Update camera
  camera.x = player.x - canvas.width / 2
  camera.y = player.y - canvas.height / 2

  // Clamp camera
  camera.x = Math.max(
    0,
    Math.min(WORLD_WIDTH * BLOCK_SIZE - canvas.width, camera.x)
  )
  camera.y = Math.max(
    0,
    Math.min(WORLD_HEIGHT * BLOCK_SIZE - canvas.height, camera.y)
  )

  // Mining
  if (mouse.left) {
    handleMining()
  }

  // Placing blocks
  if (mouse.right) {
    handlePlacing()
    mouse.right = false // One block per click
  }

  // Day/night cycle
  dayTime += 0.001
  if (dayTime >= 1) {
    dayTime = 0
    dayCount++
  }

  // Hunger drain
  if (Math.random() < 0.001) {
    player.hunger = Math.max(0, player.hunger - 0.5)
  }

  // Health regen when full hunger
  if (player.hunger >= 18 && player.health < player.maxHealth) {
    if (Math.random() < 0.01) {
      player.health = Math.min(player.maxHealth, player.health + 1)
    }
  }

  // Hunger damage
  if (player.hunger <= 0) {
    if (Math.random() < 0.01) {
      player.health--
    }
  }

  // Check death
  if (player.health <= 0 || player.y > WORLD_HEIGHT * BLOCK_SIZE) {
    gameOver()
  }

  // Update HUD
  updateHUD()
}

function movePlayer() {
  // Horizontal movement
  const newX = player.x + player.vx
  if (!checkCollision(newX, player.y, player.width, player.height)) {
    player.x = newX
  }

  // Vertical movement
  const newY = player.y + player.vy
  if (!checkCollision(player.x, newY, player.width, player.height)) {
    player.y = newY
    player.onGround = false
  } else {
    if (player.vy > 0) {
      player.onGround = true
      // Snap to ground
      player.y =
        Math.floor((player.y + player.height) / BLOCK_SIZE) * BLOCK_SIZE -
        player.height
    }
    player.vy = 0
  }

  // Keep in bounds
  player.x = Math.max(
    0,
    Math.min(WORLD_WIDTH * BLOCK_SIZE - player.width, player.x)
  )
}

function checkCollision(x, y, width, height) {
  const left = Math.floor(x / BLOCK_SIZE)
  const right = Math.floor((x + width - 1) / BLOCK_SIZE)
  const top = Math.floor(y / BLOCK_SIZE)
  const bottom = Math.floor((y + height - 1) / BLOCK_SIZE)

  for (let by = top; by <= bottom; by++) {
    for (let bx = left; bx <= right; bx++) {
      if (by >= 0 && by < WORLD_HEIGHT && bx >= 0 && bx < WORLD_WIDTH) {
        if (world[by][bx] && world[by][bx].solid) {
          return true
        }
      }
    }
  }
  return false
}

function handleMining() {
  const worldX = mouse.x + camera.x
  const worldY = mouse.y + camera.y
  const blockX = Math.floor(worldX / BLOCK_SIZE)
  const blockY = Math.floor(worldY / BLOCK_SIZE)

  // Check range
  const playerCenterX = player.x + player.width / 2
  const playerCenterY = player.y + player.height / 2
  const dist = Math.sqrt(
    Math.pow((blockX + 0.5) * BLOCK_SIZE - playerCenterX, 2) +
      Math.pow((blockY + 0.5) * BLOCK_SIZE - playerCenterY, 2)
  )

  if (dist > BLOCK_SIZE * 5) return

  if (
    blockY >= 0 &&
    blockY < WORLD_HEIGHT &&
    blockX >= 0 &&
    blockX < WORLD_WIDTH
  ) {
    const block = world[blockY][blockX]

    if (block && block.breakable) {
      const currentKey = `${blockX},${blockY}`

      if (miningBlock !== currentKey) {
        miningBlock = currentKey
        miningProgress = 0
      }

      miningProgress += 1 / (block.hardness * 30)

      if (miningProgress >= 1) {
        // Break block
        const dropType =
          block.drops || Object.keys(BLOCKS).find((k) => BLOCKS[k] === block)
        addToInventory(dropType)
        world[blockY][blockX] = BLOCKS.AIR
        score += 10
        miningBlock = null
        miningProgress = 0
      }
    }
  }
}

function handlePlacing() {
  if (!inventory[selectedSlot]) return

  const worldX = mouse.x + camera.x
  const worldY = mouse.y + camera.y
  const blockX = Math.floor(worldX / BLOCK_SIZE)
  const blockY = Math.floor(worldY / BLOCK_SIZE)

  // Check range
  const playerCenterX = player.x + player.width / 2
  const playerCenterY = player.y + player.height / 2
  const dist = Math.sqrt(
    Math.pow((blockX + 0.5) * BLOCK_SIZE - playerCenterX, 2) +
      Math.pow((blockY + 0.5) * BLOCK_SIZE - playerCenterY, 2)
  )

  if (dist > BLOCK_SIZE * 5) return

  if (
    blockY >= 0 &&
    blockY < WORLD_HEIGHT &&
    blockX >= 0 &&
    blockX < WORLD_WIDTH
  ) {
    const currentBlock = world[blockY][blockX]

    if (!currentBlock || !currentBlock.solid) {
      // Check if not placing inside player
      const blockLeft = blockX * BLOCK_SIZE
      const blockTop = blockY * BLOCK_SIZE
      const blockRight = blockLeft + BLOCK_SIZE
      const blockBottom = blockTop + BLOCK_SIZE

      const playerRight = player.x + player.width
      const playerBottom = player.y + player.height

      if (
        !(
          blockRight > player.x &&
          blockLeft < playerRight &&
          blockBottom > player.y &&
          blockTop < playerBottom
        )
      ) {
        const blockType = inventory[selectedSlot].type
        world[blockY][blockX] = BLOCKS[blockType]
        inventory[selectedSlot].count--

        if (inventory[selectedSlot].count <= 0) {
          inventory[selectedSlot] = null
        }

        updateHotbar()
      }
    }
  }
}

function addToInventory(blockType) {
  // Try to stack
  for (let i = 0; i < inventory.length; i++) {
    if (
      inventory[i] &&
      inventory[i].type === blockType &&
      inventory[i].count < 64
    ) {
      inventory[i].count++
      updateHotbar()
      return
    }
  }

  // Find empty slot
  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]) {
      inventory[i] = { type: blockType, count: 1 }
      updateHotbar()
      return
    }
  }
}

function render() {
  // Clear canvas
  const skyColor = getSkyColor()
  ctx.fillStyle = skyColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (gameState !== 'playing') return

  // Draw stars at night
  if (dayTime > 0.3 && dayTime < 0.7) {
    drawStars()
  }

  // Draw sun/moon
  drawCelestialBody()

  // Draw clouds
  drawClouds()

  // Draw blocks
  const startX = Math.max(0, Math.floor(camera.x / BLOCK_SIZE))
  const endX = Math.min(
    WORLD_WIDTH,
    Math.ceil((camera.x + canvas.width) / BLOCK_SIZE) + 1
  )
  const startY = Math.max(0, Math.floor(camera.y / BLOCK_SIZE))
  const endY = Math.min(
    WORLD_HEIGHT,
    Math.ceil((camera.y + canvas.height) / BLOCK_SIZE) + 1
  )

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const block = world[y][x]
      if (block && block !== BLOCKS.AIR) {
        drawBlock(x, y, block)
      }
    }
  }

  // Draw player
  drawPlayer()

  // Draw mining progress
  if (miningBlock && miningProgress > 0) {
    drawMiningProgress()
  }

  // Draw block highlight
  drawBlockHighlight()
}

function getSkyColor() {
  const noon = '#87CEEB'
  const sunset = '#FF7F50'
  const night = '#1a1a3e'
  const sunrise = '#FFB6C1'

  if (dayTime < 0.2) {
    // Morning
    return lerpColor(sunrise, noon, dayTime / 0.2)
  } else if (dayTime < 0.3) {
    // Day
    return noon
  } else if (dayTime < 0.4) {
    // Evening
    return lerpColor(noon, sunset, (dayTime - 0.3) / 0.1)
  } else if (dayTime < 0.5) {
    // Dusk
    return lerpColor(sunset, night, (dayTime - 0.4) / 0.1)
  } else if (dayTime < 0.8) {
    // Night
    return night
  } else if (dayTime < 0.9) {
    // Dawn
    return lerpColor(night, sunrise, (dayTime - 0.8) / 0.1)
  } else {
    return lerpColor(sunrise, noon, (dayTime - 0.9) / 0.1)
  }
}

function lerpColor(color1, color2, t) {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

function drawStars() {
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 100; i++) {
    const x = (i * 137 + Math.sin(i) * 100) % canvas.width
    const y = (i * 251 + Math.cos(i) * 50) % (canvas.height * 0.6)
    const size = 1 + (i % 3)
    const alpha = 0.3 + Math.sin(Date.now() / 1000 + i) * 0.2
    ctx.globalAlpha = alpha
    ctx.fillRect(x, y, size, size)
  }
  ctx.globalAlpha = 1
}

function drawCelestialBody() {
  const angle = dayTime * Math.PI * 2 - Math.PI / 2
  const radius = Math.min(canvas.width, canvas.height) * 0.4
  const centerX = canvas.width / 2
  const centerY = canvas.height + 100

  const x = centerX + Math.cos(angle) * radius
  const y = centerY + Math.sin(angle) * radius

  if (dayTime < 0.4 || dayTime > 0.9) {
    // Sun
    ctx.fillStyle = '#FFD700'
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 30
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  } else {
    // Moon
    ctx.fillStyle = '#E8E8E8'
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(x, y, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  const cloudOffset = (Date.now() / 100) % (canvas.width + 200)

  for (let i = 0; i < 5; i++) {
    const x = ((i * 300 + cloudOffset) % (canvas.width + 200)) - 100
    const y = 50 + (i % 3) * 40

    ctx.beginPath()
    ctx.arc(x, y, 30, 0, Math.PI * 2)
    ctx.arc(x + 30, y - 10, 25, 0, Math.PI * 2)
    ctx.arc(x + 50, y, 30, 0, Math.PI * 2)
    ctx.arc(x + 25, y + 10, 20, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBlock(x, y, block) {
  const screenX = x * BLOCK_SIZE - camera.x
  const screenY = y * BLOCK_SIZE - camera.y

  // Main block color
  ctx.fillStyle = block.color
  ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE)

  // Top highlight for grass
  if (block.topColor) {
    ctx.fillStyle = block.topColor
    ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE / 4)
  }

  // Ore patterns
  if (block.pattern) {
    drawOrePattern(screenX, screenY, block.pattern)
  }

  // Block border (darker)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.lineWidth = 1
  ctx.strokeRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE)

  // 3D effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(screenX, screenY, BLOCK_SIZE, 2)
  ctx.fillRect(screenX, screenY, 2, BLOCK_SIZE)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fillRect(screenX + BLOCK_SIZE - 2, screenY, 2, BLOCK_SIZE)
  ctx.fillRect(screenX, screenY + BLOCK_SIZE - 2, BLOCK_SIZE, 2)
}

function drawOrePattern(x, y, pattern) {
  let color
  switch (pattern) {
    case 'coal':
      color = '#1a1a1a'
      break
    case 'iron':
      color = '#d4a574'
      break
    case 'gold':
      color = '#ffd700'
      break
    case 'diamond':
      color = '#00ffff'
      break
  }

  ctx.fillStyle = color
  // Random ore spots
  ctx.fillRect(x + 5, y + 5, 6, 6)
  ctx.fillRect(x + 18, y + 12, 8, 8)
  ctx.fillRect(x + 8, y + 20, 5, 5)
  ctx.fillRect(x + 22, y + 3, 4, 4)
}

function drawPlayer() {
  const screenX = player.x - camera.x
  const screenY = player.y - camera.y

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(screenX - 2, screenY + player.height - 4, player.width + 4, 6)

  // Legs
  ctx.fillStyle = '#1a4a8a'
  ctx.fillRect(screenX, screenY + 30, 10, 18)
  ctx.fillRect(screenX + 14, screenY + 30, 10, 18)

  // Body
  ctx.fillStyle = '#2d8a4e'
  ctx.fillRect(screenX - 2, screenY + 12, 28, 20)

  // Arms
  ctx.fillStyle = '#d4a574'
  ctx.fillRect(screenX - 6, screenY + 12, 6, 16)
  ctx.fillRect(screenX + 24, screenY + 12, 6, 16)

  // Head
  ctx.fillStyle = '#d4a574'
  ctx.fillRect(screenX + 2, screenY, 20, 14)

  // Hair
  ctx.fillStyle = '#4a3728'
  ctx.fillRect(screenX + 2, screenY, 20, 5)

  // Eyes
  ctx.fillStyle = '#fff'
  ctx.fillRect(screenX + 5, screenY + 5, 5, 4)
  ctx.fillRect(screenX + 14, screenY + 5, 5, 4)

  ctx.fillStyle = '#000'
  ctx.fillRect(screenX + 7, screenY + 6, 2, 2)
  ctx.fillRect(screenX + 16, screenY + 6, 2, 2)

  // Mouth
  ctx.fillStyle = '#8b5a5a'
  ctx.fillRect(screenX + 9, screenY + 10, 6, 2)
}

function drawMiningProgress() {
  const [bx, by] = miningBlock.split(',').map(Number)
  const screenX = bx * BLOCK_SIZE - camera.x
  const screenY = by * BLOCK_SIZE - camera.y

  // Crack overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${miningProgress * 0.5})`
  ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE)

  // Draw cracks
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2
  const cracks = Math.floor(miningProgress * 5)
  for (let i = 0; i < cracks; i++) {
    ctx.beginPath()
    ctx.moveTo(screenX + BLOCK_SIZE / 2, screenY + BLOCK_SIZE / 2)
    const angle = (i / 5) * Math.PI * 2 + Math.random()
    ctx.lineTo(
      screenX + BLOCK_SIZE / 2 + (Math.cos(angle) * BLOCK_SIZE) / 2,
      screenY + BLOCK_SIZE / 2 + (Math.sin(angle) * BLOCK_SIZE) / 2
    )
    ctx.stroke()
  }
}

function drawBlockHighlight() {
  const worldX = mouse.x + camera.x
  const worldY = mouse.y + camera.y
  const blockX = Math.floor(worldX / BLOCK_SIZE)
  const blockY = Math.floor(worldY / BLOCK_SIZE)

  const screenX = blockX * BLOCK_SIZE - camera.x
  const screenY = blockY * BLOCK_SIZE - camera.y

  // Check range
  const playerCenterX = player.x + player.width / 2
  const playerCenterY = player.y + player.height / 2
  const dist = Math.sqrt(
    Math.pow((blockX + 0.5) * BLOCK_SIZE - playerCenterX, 2) +
      Math.pow((blockY + 0.5) * BLOCK_SIZE - playerCenterY, 2)
  )

  if (dist <= BLOCK_SIZE * 5) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE)
  }
}

function updateHUD() {
  // Health hearts
  const heartsContainer = document.getElementById('health-hearts')
  heartsContainer.innerHTML = ''
  for (let i = 0; i < player.maxHealth / 2; i++) {
    const heart = document.createElement('span')
    heart.className = 'heart'
    if (i < Math.floor(player.health / 2)) {
      heart.textContent = '❤️'
    } else if (i < Math.ceil(player.health / 2)) {
      heart.textContent = '💔'
    } else {
      heart.textContent = '🖤'
    }
    heartsContainer.appendChild(heart)
  }

  // Hunger
  const hungerContainer = document.getElementById('hunger-icons')
  hungerContainer.innerHTML = ''
  for (let i = 0; i < player.maxHunger / 2; i++) {
    const hunger = document.createElement('span')
    hunger.className = 'hunger'
    if (i < Math.floor(player.hunger / 2)) {
      hunger.textContent = '🍖'
    } else {
      hunger.textContent = '🦴'
    }
    hungerContainer.appendChild(hunger)
  }

  // Coordinates
  document.getElementById('coord-x').textContent = Math.floor(
    player.x / BLOCK_SIZE
  )
  document.getElementById('coord-y').textContent = Math.floor(
    player.y / BLOCK_SIZE
  )

  // Day/night
  const icon = document.getElementById('day-night-icon')
  icon.textContent = dayTime > 0.4 && dayTime < 0.9 ? '🌙' : '☀️'
  document.getElementById('day-count').textContent = `Day ${dayCount}`
}

function updateHotbar() {
  const hotbar = document.getElementById('hotbar')
  hotbar.innerHTML = ''

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div')
    slot.className = 'hotbar-slot' + (i === selectedSlot ? ' selected' : '')

    const slotNum = document.createElement('span')
    slotNum.className = 'slot-number'
    slotNum.textContent = i + 1
    slot.appendChild(slotNum)

    if (inventory[i]) {
      const blockIcon = document.createElement('div')
      blockIcon.className = 'block-icon'
      blockIcon.style.backgroundColor = BLOCKS[inventory[i].type].color
      slot.appendChild(blockIcon)

      const count = document.createElement('span')
      count.className = 'count'
      count.textContent = inventory[i].count
      slot.appendChild(count)
    }

    hotbar.appendChild(slot)
  }
}

function gameOver() {
  gameState = 'gameover'
  document.getElementById('hud').classList.add('hidden')
  document.getElementById('crosshair').classList.remove('visible')
  document.getElementById('game-over').classList.remove('hidden')
  document.getElementById('final-score').textContent = score
}

// Start
init()
