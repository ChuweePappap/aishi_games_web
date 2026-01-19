// Game Constants
const WORLD_SIZE = 2000
const INITIAL_PLAYERS = 20
const ZONE_SHRINK_INTERVAL = 15000 // 15 seconds
const ZONE_DAMAGE = 5

// Game State
let gameState = 'menu' // menu, playing, gameover
let player = null
let enemies = []
let bullets = []
let loot = []
let particles = []
let zone = {
  x: WORLD_SIZE / 2,
  y: WORLD_SIZE / 2,
  radius: WORLD_SIZE / 2,
  targetRadius: WORLD_SIZE / 2,
  shrinking: false,
}
let camera = { x: 0, y: 0 }
let kills = 0
let damageDealt = 0
let playersAlive = INITIAL_PLAYERS

// Canvas
const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')

// Input
const keys = {}
let mouse = { x: 0, y: 0, down: false }

// Weapons
const weapons = {
  pistol: {
    name: 'Pistol',
    damage: 15,
    fireRate: 400,
    bulletSpeed: 12,
    spread: 0.05,
    color: '#888',
  },
  smg: {
    name: 'SMG',
    damage: 12,
    fireRate: 100,
    bulletSpeed: 14,
    spread: 0.15,
    color: '#4ade80',
  },
  shotgun: {
    name: 'Shotgun',
    damage: 8,
    fireRate: 800,
    bulletSpeed: 10,
    spread: 0.3,
    pellets: 6,
    color: '#f59e0b',
  },
  rifle: {
    name: 'Assault Rifle',
    damage: 20,
    fireRate: 150,
    bulletSpeed: 16,
    spread: 0.08,
    color: '#3b82f6',
  },
  sniper: {
    name: 'Sniper',
    damage: 75,
    fireRate: 1200,
    bulletSpeed: 25,
    spread: 0.01,
    color: '#8b5cf6',
  },
}

// Initialize
function init() {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Input listeners
  window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true))
  window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false))
  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  })
  canvas.addEventListener('mousedown', () => (mouse.down = true))
  canvas.addEventListener('mouseup', () => (mouse.down = false))
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  // Menu buttons
  document.getElementById('start-btn').addEventListener('click', startGame)
  document.getElementById('restart-btn').addEventListener('click', startGame)

  // Start game loop
  requestAnimationFrame(gameLoop)
}

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function startGame() {
  gameState = 'playing'

  // Hide menu, show HUD
  document.getElementById('menu-screen').style.display = 'none'
  document.getElementById('game-over').classList.add('hidden')
  document.getElementById('hud').classList.remove('hidden')

  // Reset game state
  kills = 0
  damageDealt = 0
  playersAlive = INITIAL_PLAYERS
  bullets = []
  particles = []

  // Reset zone
  zone = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    radius: WORLD_SIZE / 2,
    targetRadius: WORLD_SIZE / 2,
    shrinking: false,
  }

  // Create player
  player = createPlayer(
    Math.random() * WORLD_SIZE * 0.6 + WORLD_SIZE * 0.2,
    Math.random() * WORLD_SIZE * 0.6 + WORLD_SIZE * 0.2,
    true
  )

  // Create enemies
  enemies = []
  for (let i = 0; i < INITIAL_PLAYERS - 1; i++) {
    enemies.push(
      createPlayer(
        Math.random() * WORLD_SIZE * 0.8 + WORLD_SIZE * 0.1,
        Math.random() * WORLD_SIZE * 0.8 + WORLD_SIZE * 0.1,
        false
      )
    )
  }

  // Spawn loot
  spawnLoot()

  // Start zone shrinking
  setTimeout(startZoneShrink, ZONE_SHRINK_INTERVAL)

  updateHUD()
}

function createPlayer(x, y, isPlayer) {
  const weaponTypes = ['pistol', 'smg', 'rifle']
  return {
    x: x,
    y: y,
    radius: 20,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    speed: 4,
    angle: 0,
    weapon: isPlayer
      ? 'pistol'
      : weaponTypes[Math.floor(Math.random() * weaponTypes.length)],
    lastShot: 0,
    isPlayer: isPlayer,
    color: isPlayer ? '#4ade80' : '#f87171',
    name: isPlayer ? 'You' : `Bot ${Math.floor(Math.random() * 100)}`,
    targetX: x,
    targetY: y,
    moveTimer: 0,
  }
}

function spawnLoot() {
  loot = []
  const lootTypes = ['health', 'shield', 'smg', 'shotgun', 'rifle', 'sniper']

  for (let i = 0; i < 50; i++) {
    const type = lootTypes[Math.floor(Math.random() * lootTypes.length)]
    loot.push({
      x: Math.random() * WORLD_SIZE * 0.9 + WORLD_SIZE * 0.05,
      y: Math.random() * WORLD_SIZE * 0.9 + WORLD_SIZE * 0.05,
      type: type,
      radius: 15,
    })
  }
}

function startZoneShrink() {
  if (gameState !== 'playing') return

  zone.targetRadius = Math.max(100, zone.radius * 0.6)
  zone.targetX = zone.x + (Math.random() - 0.5) * zone.radius * 0.3
  zone.targetY = zone.y + (Math.random() - 0.5) * zone.radius * 0.3
  zone.shrinking = true

  setTimeout(startZoneShrink, ZONE_SHRINK_INTERVAL)
}

function gameLoop(timestamp) {
  if (gameState === 'playing') {
    update(timestamp)
  }
  render()
  requestAnimationFrame(gameLoop)
}

function update(timestamp) {
  // Update player
  updatePlayer(timestamp)

  // Update enemies
  enemies.forEach((enemy) => updateEnemy(enemy, timestamp))

  // Update bullets
  updateBullets()

  // Update zone
  updateZone()

  // Update particles
  updateParticles()

  // Check loot pickup
  checkLootPickup()

  // Update camera
  camera.x = player.x - canvas.width / 2
  camera.y = player.y - canvas.height / 2

  // Update HUD
  updateHUD()

  // Check game over
  if (player.health <= 0) {
    endGame(false)
  } else if (enemies.length === 0) {
    endGame(true)
  }
}

function updatePlayer(timestamp) {
  // Movement
  let dx = 0,
    dy = 0
  if (keys['w'] || keys['arrowup']) dy -= 1
  if (keys['s'] || keys['arrowdown']) dy += 1
  if (keys['a'] || keys['arrowleft']) dx -= 1
  if (keys['d'] || keys['arrowright']) dx += 1

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy)
    dx /= len
    dy /= len
    player.x += dx * player.speed
    player.y += dy * player.speed
  }

  // Keep in bounds
  player.x = Math.max(
    player.radius,
    Math.min(WORLD_SIZE - player.radius, player.x)
  )
  player.y = Math.max(
    player.radius,
    Math.min(WORLD_SIZE - player.radius, player.y)
  )

  // Aim angle
  const worldMouseX = mouse.x + camera.x
  const worldMouseY = mouse.y + camera.y
  player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x)

  // Shooting
  if (mouse.down) {
    shoot(player, timestamp)
  }

  // Zone damage
  const distToZoneCenter = Math.sqrt(
    Math.pow(player.x - zone.x, 2) + Math.pow(player.y - zone.y, 2)
  )
  if (distToZoneCenter > zone.radius) {
    player.health -= ZONE_DAMAGE * 0.016
    document.getElementById('zone-warning').classList.remove('hidden')
  } else {
    document.getElementById('zone-warning').classList.add('hidden')
  }
}

function updateEnemy(enemy, timestamp) {
  // AI behavior
  enemy.moveTimer -= 16

  if (enemy.moveTimer <= 0) {
    // Find new target position
    const distToZone = Math.sqrt(
      Math.pow(enemy.x - zone.x, 2) + Math.pow(enemy.y - zone.y, 2)
    )

    if (distToZone > zone.radius * 0.7) {
      // Move towards zone center
      const angle = Math.atan2(zone.y - enemy.y, zone.x - enemy.x)
      enemy.targetX = enemy.x + Math.cos(angle) * 200
      enemy.targetY = enemy.y + Math.sin(angle) * 200
    } else {
      // Random movement or chase player
      const distToPlayer = Math.sqrt(
        Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
      )

      if (distToPlayer < 400) {
        // Chase player
        enemy.targetX = player.x + (Math.random() - 0.5) * 100
        enemy.targetY = player.y + (Math.random() - 0.5) * 100
      } else {
        // Random wander
        enemy.targetX = enemy.x + (Math.random() - 0.5) * 300
        enemy.targetY = enemy.y + (Math.random() - 0.5) * 300
      }
    }

    enemy.moveTimer = 1000 + Math.random() * 2000
  }

  // Move towards target
  const dx = enemy.targetX - enemy.x
  const dy = enemy.targetY - enemy.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 10) {
    enemy.x += (dx / dist) * enemy.speed * 0.7
    enemy.y += (dy / dist) * enemy.speed * 0.7
  }

  // Keep in bounds
  enemy.x = Math.max(enemy.radius, Math.min(WORLD_SIZE - enemy.radius, enemy.x))
  enemy.y = Math.max(enemy.radius, Math.min(WORLD_SIZE - enemy.radius, enemy.y))

  // Aim at player if close
  const distToPlayer = Math.sqrt(
    Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
  )

  if (distToPlayer < 350) {
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)

    // Shoot at player
    if (Math.random() < 0.03) {
      shoot(enemy, timestamp)
    }
  } else {
    enemy.angle = Math.atan2(dy, dx)
  }

  // Zone damage
  const distToZoneCenter = Math.sqrt(
    Math.pow(enemy.x - zone.x, 2) + Math.pow(enemy.y - zone.y, 2)
  )
  if (distToZoneCenter > zone.radius) {
    enemy.health -= ZONE_DAMAGE * 0.016
    if (enemy.health <= 0) {
      killEnemy(enemy, null)
    }
  }

  // Pick up loot
  loot.forEach((item, index) => {
    const lootDist = Math.sqrt(
      Math.pow(enemy.x - item.x, 2) + Math.pow(enemy.y - item.y, 2)
    )
    if (lootDist < enemy.radius + item.radius) {
      applyLoot(enemy, item, index)
    }
  })
}

function shoot(shooter, timestamp) {
  const weapon = weapons[shooter.weapon]

  if (timestamp - shooter.lastShot < weapon.fireRate) return
  shooter.lastShot = timestamp

  const pellets = weapon.pellets || 1

  for (let i = 0; i < pellets; i++) {
    const spread = (Math.random() - 0.5) * weapon.spread
    const angle = shooter.angle + spread

    bullets.push({
      x: shooter.x + Math.cos(shooter.angle) * shooter.radius,
      y: shooter.y + Math.sin(shooter.angle) * shooter.radius,
      vx: Math.cos(angle) * weapon.bulletSpeed,
      vy: Math.sin(angle) * weapon.bulletSpeed,
      damage: weapon.damage,
      owner: shooter,
      color: weapon.color,
    })
  }

  // Muzzle flash particle
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: shooter.x + Math.cos(shooter.angle) * shooter.radius,
      y: shooter.y + Math.sin(shooter.angle) * shooter.radius,
      vx: Math.cos(shooter.angle + (Math.random() - 0.5)) * 3,
      vy: Math.sin(shooter.angle + (Math.random() - 0.5)) * 3,
      life: 10,
      color: '#ffaa00',
      radius: 3,
    })
  }
}

function updateBullets() {
  bullets = bullets.filter((bullet) => {
    bullet.x += bullet.vx
    bullet.y += bullet.vy

    // Check bounds
    if (
      bullet.x < 0 ||
      bullet.x > WORLD_SIZE ||
      bullet.y < 0 ||
      bullet.y > WORLD_SIZE
    ) {
      return false
    }

    // Check collision with player
    if (bullet.owner !== player) {
      const dist = Math.sqrt(
        Math.pow(bullet.x - player.x, 2) + Math.pow(bullet.y - player.y, 2)
      )
      if (dist < player.radius) {
        dealDamage(player, bullet.damage, bullet.owner)
        spawnHitParticles(bullet.x, bullet.y, '#ff0000')
        return false
      }
    }

    // Check collision with enemies
    if (bullet.owner === player) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]
        const dist = Math.sqrt(
          Math.pow(bullet.x - enemy.x, 2) + Math.pow(bullet.y - enemy.y, 2)
        )
        if (dist < enemy.radius) {
          dealDamage(enemy, bullet.damage, player)
          damageDealt += bullet.damage
          spawnHitParticles(bullet.x, bullet.y, '#ff0000')

          if (enemy.health <= 0) {
            killEnemy(enemy, player)
          }
          return false
        }
      }
    }

    return true
  })
}

function dealDamage(target, damage, attacker) {
  if (target.shield > 0) {
    const shieldDamage = Math.min(target.shield, damage)
    target.shield -= shieldDamage
    damage -= shieldDamage
  }
  target.health -= damage
}

function killEnemy(enemy, killer) {
  const index = enemies.indexOf(enemy)
  if (index > -1) {
    enemies.splice(index, 1)
    playersAlive--

    if (killer === player) {
      kills++
      addKillFeed('You', enemy.name)
    } else if (killer) {
      addKillFeed(killer.name, enemy.name)
    } else {
      addKillFeed('The Zone', enemy.name)
    }

    // Drop loot
    const lootTypes = ['health', 'shield', enemy.weapon]
    lootTypes.forEach((type) => {
      if (Math.random() < 0.5) {
        loot.push({
          x: enemy.x + (Math.random() - 0.5) * 30,
          y: enemy.y + (Math.random() - 0.5) * 30,
          type: type,
          radius: 15,
        })
      }
    })

    // Death particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        color: enemy.color,
        radius: 4,
      })
    }
  }
}

function addKillFeed(killer, victim) {
  const feed = document.getElementById('kill-feed')
  const message = document.createElement('div')
  message.className = 'kill-message'
  message.innerHTML = `<span class="killer">${killer}</span> eliminated <span class="victim">${victim}</span>`
  feed.appendChild(message)

  setTimeout(() => message.remove(), 5000)
}

function updateZone() {
  if (zone.shrinking) {
    const shrinkSpeed = 0.5

    if (zone.radius > zone.targetRadius) {
      zone.radius -= shrinkSpeed
    }

    // Move zone center
    const dx = zone.targetX - zone.x
    const dy = zone.targetY - zone.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 1) {
      zone.x += (dx / dist) * shrinkSpeed * 0.3
      zone.y += (dy / dist) * shrinkSpeed * 0.3
    }

    if (zone.radius <= zone.targetRadius) {
      zone.shrinking = false
    }
  }
}

function updateParticles() {
  particles = particles.filter((p) => {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.95
    p.vy *= 0.95
    p.life--
    return p.life > 0
  })
}

function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 15,
      color: color,
      radius: 3,
    })
  }
}

function checkLootPickup() {
  loot = loot.filter((item, index) => {
    const dist = Math.sqrt(
      Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2)
    )
    if (dist < player.radius + item.radius) {
      applyLoot(player, item, index)
      return false
    }
    return true
  })
}

function applyLoot(target, item, index) {
  switch (item.type) {
    case 'health':
      target.health = Math.min(target.maxHealth, target.health + 25)
      break
    case 'shield':
      target.shield = Math.min(target.maxShield, target.shield + 25)
      break
    default:
      if (weapons[item.type]) {
        target.weapon = item.type
      }
      break
  }
}

function updateHUD() {
  document.getElementById('health-fill').style.width = `${
    (player.health / player.maxHealth) * 100
  }%`
  document.getElementById('health-text').textContent = Math.max(
    0,
    Math.floor(player.health)
  )
  document.getElementById('shield-fill').style.width = `${
    (player.shield / player.maxShield) * 100
  }%`
  document.getElementById('shield-text').textContent = Math.floor(player.shield)
  document.getElementById('weapon-name').textContent =
    weapons[player.weapon].name
  document.getElementById('alive-count').textContent = playersAlive
  document.getElementById('kills').textContent = kills
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (gameState !== 'playing') return

  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  // Draw grass background
  drawBackground()

  // Draw zone
  drawZone()

  // Draw loot
  loot.forEach(drawLoot)

  // Draw enemies
  enemies.forEach(drawPlayer)

  // Draw player
  drawPlayer(player)

  // Draw bullets
  bullets.forEach(drawBullet)

  // Draw particles
  particles.forEach(drawParticle)

  ctx.restore()

  // Draw minimap
  drawMinimap()
}

function drawBackground() {
  // Ground
  ctx.fillStyle = '#2d5a27'
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE)

  // Grid pattern
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.lineWidth = 1

  const gridSize = 100
  const startX = Math.floor(camera.x / gridSize) * gridSize
  const startY = Math.floor(camera.y / gridSize) * gridSize

  for (let x = startX; x < camera.x + canvas.width + gridSize; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, camera.y)
    ctx.lineTo(x, camera.y + canvas.height)
    ctx.stroke()
  }

  for (let y = startY; y < camera.y + canvas.height + gridSize; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(camera.x, y)
    ctx.lineTo(camera.x + canvas.width, y)
    ctx.stroke()
  }

  // Draw some decorative elements (trees, rocks)
  ctx.fillStyle = '#1e4620'
  for (let i = 0; i < 100; i++) {
    const x = (i * 137) % WORLD_SIZE
    const y = (i * 251) % WORLD_SIZE
    ctx.beginPath()
    ctx.arc(x, y, 15 + (i % 10), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawZone() {
  // Draw danger zone (outside safe zone)
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.rect(0, 0, WORLD_SIZE, WORLD_SIZE)
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2, true)
  ctx.fill()

  // Draw zone border
  ctx.strokeStyle = '#00aaff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
  ctx.stroke()

  // Draw shrinking indicator
  if (zone.shrinking) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.arc(zone.targetX, zone.targetY, zone.targetRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawPlayer(p) {
  // Body
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  ctx.fill()

  // Outline
  ctx.strokeStyle = p.isPlayer ? '#fff' : '#000'
  ctx.lineWidth = 3
  ctx.stroke()

  // Gun
  ctx.fillStyle = weapons[p.weapon].color
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.fillRect(15, -4, 20, 8)
  ctx.restore()

  // Health bar (for enemies)
  if (!p.isPlayer) {
    const barWidth = 40
    const barHeight = 6
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(p.x - barWidth / 2, p.y - p.radius - 15, barWidth, barHeight)
    ctx.fillStyle = '#ff4444'
    ctx.fillRect(
      p.x - barWidth / 2,
      p.y - p.radius - 15,
      barWidth * (p.health / p.maxHealth),
      barHeight
    )
  }
}

function drawBullet(b) {
  ctx.fillStyle = b.color
  ctx.beginPath()
  ctx.arc(b.x, b.y, 4, 0, Math.PI * 2)
  ctx.fill()

  // Trail
  ctx.strokeStyle = b.color
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(b.x, b.y)
  ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawLoot(item) {
  let color, symbol
  switch (item.type) {
    case 'health':
      color = '#ff4444'
      symbol = '+'
      break
    case 'shield':
      color = '#4488ff'
      symbol = '🛡'
      break
    default:
      color = weapons[item.type]?.color || '#ffd700'
      symbol = '🔫'
      break
  }

  // Glow effect
  ctx.shadowColor = color
  ctx.shadowBlur = 10

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0

  // Symbol
  ctx.fillStyle = '#fff'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(symbol, item.x, item.y)
}

function drawParticle(p) {
  ctx.globalAlpha = p.life / 30
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawMinimap() {
  const mapSize = 150
  const mapX = canvas.width - mapSize - 15
  const mapY = canvas.height - mapSize - 15
  const scale = mapSize / WORLD_SIZE

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(mapX, mapY, mapSize, mapSize)

  // Zone on minimap
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
  ctx.fillRect(mapX, mapY, mapSize, mapSize)

  ctx.fillStyle = 'rgba(45, 90, 39, 0.8)'
  ctx.beginPath()
  ctx.arc(
    mapX + zone.x * scale,
    mapY + zone.y * scale,
    zone.radius * scale,
    0,
    Math.PI * 2
  )
  ctx.fill()

  // Zone border
  ctx.strokeStyle = '#00aaff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Enemies on minimap
  ctx.fillStyle = '#f87171'
  enemies.forEach((e) => {
    ctx.beginPath()
    ctx.arc(mapX + e.x * scale, mapY + e.y * scale, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // Player on minimap
  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.arc(mapX + player.x * scale, mapY + player.y * scale, 5, 0, Math.PI * 2)
  ctx.fill()

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 2
  ctx.strokeRect(mapX, mapY, mapSize, mapSize)
}

function endGame(victory) {
  gameState = 'gameover'

  document.getElementById('hud').classList.add('hidden')
  document.getElementById('game-over').classList.remove('hidden')

  const title = document.getElementById('result-title')
  if (victory) {
    title.textContent = '🏆 VICTORY ROYALE! 🏆'
    title.className = 'victory'
  } else {
    title.textContent = 'ELIMINATED'
    title.className = 'defeat'
  }

  document.getElementById('final-position').textContent = victory
    ? 1
    : playersAlive
  document.getElementById('final-kills').textContent = kills
  document.getElementById('final-damage').textContent = Math.floor(damageDealt)
}

// Start the game
init()
