const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

// Set canvas size
canvas.width = 800
canvas.height = 600

// Game State
let gameRunning = false
let score = 0
let animationId

// Input Handling
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!gameRunning) {
      const startScreen = document.getElementById('start-screen')
      const gameOverScreen = document.getElementById('game-over-screen')

      if (
        !startScreen.classList.contains('hidden') ||
        !gameOverScreen.classList.contains('hidden')
      ) {
        startGame()
        return
      }
    }
    keys.Space = true
  }
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true
  }
})

document.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false
  }
})

// Touch Controls
const setupTouchControl = (btnId, keyName) => {
  const btn = document.getElementById(btnId)
  if (!btn) return

  const handleStart = (e) => {
    e.preventDefault()
    keys[keyName] = true
    btn.classList.add('active')

    // Special case for Space to start game
    if (keyName === 'Space') {
      if (!gameRunning) {
        const startScreen = document.getElementById('start-screen')
        const gameOverScreen = document.getElementById('game-over-screen')

        if (
          !startScreen.classList.contains('hidden') ||
          !gameOverScreen.classList.contains('hidden')
        ) {
          startGame()
        }
      }
    }
  }

  const handleEnd = (e) => {
    e.preventDefault()
    keys[keyName] = false
    btn.classList.remove('active')
  }

  btn.addEventListener('touchstart', handleStart, { passive: false })
  btn.addEventListener('touchend', handleEnd, { passive: false })
  btn.addEventListener('mousedown', handleStart)
  btn.addEventListener('mouseup', handleEnd)
  btn.addEventListener('mouseleave', handleEnd)
}

setupTouchControl('btn-up', 'ArrowUp')
setupTouchControl('btn-down', 'ArrowDown')
setupTouchControl('btn-left', 'ArrowLeft')
setupTouchControl('btn-right', 'ArrowRight')
setupTouchControl('btn-shoot', 'Space')

// Game Objects
class Player {
  constructor() {
    this.width = 40
    this.height = 40
    this.x = canvas.width / 2 - this.width / 2
    this.y = canvas.height - this.height - 20
    this.speed = 5
    this.color = '#00ffff'
    this.lastShot = 0
    this.shootDelay = 200
  }

  draw() {
    ctx.save()
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2)

    // Draw ship body
    ctx.beginPath()
    ctx.moveTo(0, -this.height / 2)
    ctx.lineTo(this.width / 2, this.height / 2)
    ctx.lineTo(0, this.height / 2 - 10)
    ctx.lineTo(-this.width / 2, this.height / 2)
    ctx.closePath()

    ctx.fillStyle = this.color
    ctx.shadowBlur = 15
    ctx.shadowColor = this.color
    ctx.fill()

    ctx.restore()
  }

  update() {
    if (keys.ArrowLeft && this.x > 0) this.x -= this.speed
    if (keys.ArrowRight && this.x < canvas.width - this.width)
      this.x += this.speed
    if (keys.ArrowUp && this.y > 0) this.y -= this.speed
    if (keys.ArrowDown && this.y < canvas.height - this.height)
      this.y += this.speed

    if (keys.Space) {
      const now = Date.now()
      if (now - this.lastShot > this.shootDelay) {
        this.shoot()
        this.lastShot = now
      }
    }
  }

  shoot() {
    projectiles.push(new Projectile(this.x + this.width / 2, this.y))
  }
}

class Projectile {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = 4
    this.speed = 10
    this.color = '#ff00ff'
  }

  draw() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.shadowBlur = 10
    ctx.shadowColor = this.color
    ctx.fill()
    ctx.closePath()
  }

  update() {
    this.y -= this.speed
  }
}

class Enemy {
  constructor() {
    this.radius = 20
    this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius
    this.y = -this.radius
    this.speed = Math.random() * 2 + 2
    this.color = '#ff3333'
    this.health = 1
  }

  draw() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.shadowBlur = 10
    ctx.shadowColor = this.color
    ctx.fill()
    ctx.closePath()
  }

  update() {
    this.y += this.speed
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.radius = Math.random() * 3
    this.speedX = (Math.random() - 0.5) * 4
    this.speedY = (Math.random() - 0.5) * 4
    this.color = color
    this.alpha = 1
  }

  draw() {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.restore()
  }

  update() {
    this.x += this.speedX
    this.y += this.speedY
    this.alpha -= 0.02
  }
}

class Star {
  constructor() {
    this.x = Math.random() * canvas.width
    this.y = Math.random() * canvas.height
    this.size = Math.random() * 2
    this.speed = Math.random() * 0.5 + 0.1
  }

  draw() {
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (Math.random() * 0.5 + 0.5) + ')'
    ctx.fillRect(this.x, this.y, this.size, this.size)
  }

  update() {
    this.y += this.speed
    if (this.y > canvas.height) {
      this.y = 0
      this.x = Math.random() * canvas.width
    }
  }
}

// Game Variables
let player
let projectiles = []
let enemies = []
let particles = []
let stars = []
let enemySpawnTimer = 0
let enemySpawnInterval = 60

function init() {
  player = new Player()
  projectiles = []
  enemies = []
  particles = []
  stars = []
  score = 0
  enemySpawnInterval = 60

  // Create stars background
  for (let i = 0; i < 100; i++) {
    stars.push(new Star())
  }

  document.getElementById('score').innerText = 'Score: ' + score
}

function spawnEnemy() {
  if (enemySpawnTimer > enemySpawnInterval) {
    enemies.push(new Enemy())
    enemySpawnTimer = 0
    // Increase difficulty
    if (enemySpawnInterval > 20) enemySpawnInterval -= 0.1
  } else {
    enemySpawnTimer++
  }
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x, y, color))
  }
}

function checkCollisions() {
  // Projectiles hitting Enemies
  projectiles.forEach((projectile, pIndex) => {
    enemies.forEach((enemy, eIndex) => {
      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)
      if (dist - enemy.radius - projectile.radius < 1) {
        createExplosion(enemy.x, enemy.y, enemy.color)
        setTimeout(() => {
          enemies.splice(eIndex, 1)
          projectiles.splice(pIndex, 1)
        }, 0)
        score += 100
        document.getElementById('score').innerText = 'Score: ' + score
      }
    })
  })

  // Enemies hitting Player
  enemies.forEach((enemy) => {
    const dist = Math.hypot(
      player.x + player.width / 2 - enemy.x,
      player.y + player.height / 2 - enemy.y
    )
    if (dist - enemy.radius - player.width / 2 < 1) {
      gameOver()
    }
  })
}

function gameOver() {
  gameRunning = false
  cancelAnimationFrame(animationId)
  document.getElementById('game-over-screen').classList.remove('hidden')
  document.getElementById('final-score').innerText = 'Score: ' + score
}

function startGame() {
  document.getElementById('start-screen').classList.add('hidden')
  document.getElementById('game-over-screen').classList.add('hidden')
  init()
  gameRunning = true
  animate()
}

function animate() {
  if (!gameRunning) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw Background
  stars.forEach((star) => {
    star.update()
    star.draw()
  })

  // Player
  player.update()
  player.draw()

  // Projectiles
  projectiles.forEach((projectile, index) => {
    projectile.update()
    projectile.draw()
    if (projectile.y < 0) {
      setTimeout(() => projectiles.splice(index, 1), 0)
    }
  })

  // Enemies
  spawnEnemy()
  enemies.forEach((enemy, index) => {
    enemy.update()
    enemy.draw()
    if (enemy.y > canvas.height + enemy.radius) {
      setTimeout(() => enemies.splice(index, 1), 0)
    }
  })

  // Particles
  particles.forEach((particle, index) => {
    particle.update()
    particle.draw()
    if (particle.alpha <= 0) {
      setTimeout(() => particles.splice(index, 1), 0)
    }
  })

  checkCollisions()

  animationId = requestAnimationFrame(animate)
}

// Initial render for background
ctx.fillStyle = '#000'
ctx.fillRect(0, 0, canvas.width, canvas.height)
