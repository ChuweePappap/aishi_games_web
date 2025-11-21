const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

// Set canvas size
canvas.width = 800
canvas.height = 600

// Game State
let gameRunning = false
let score = 0
let gameSpeed = 5
let animationId
let frameCount = 0

// Physics
const GRAVITY = 0.6
const JUMP_FORCE = -13.2
const GROUND_HEIGHT = 50

class Player {
  constructor() {
    this.x = 100
    this.dy = 0
    this.jumpTimer = 0
    this.grounded = true
    this.runAnimTimer = 0

    // Random Character Type (0-3)
    this.type = Math.floor(Math.random() * 4)

    // Set properties based on type
    if (this.type === 0) {
      // Cyber Bot
      this.color = '#00ff88'
      this.width = 40
      this.height = 60
    } else if (this.type === 1) {
      // Neon Cube
      this.color = '#ff00ff'
      this.width = 40
      this.height = 40
    } else if (this.type === 2) {
      // Speedster
      this.color = '#ffaa00'
      this.width = 50
      this.height = 30
    } else if (this.type === 3) {
      // Alien
      this.color = '#00ffff'
      this.width = 45
      this.height = 45
    }

    this.y = canvas.height - GROUND_HEIGHT - this.height
  }

  draw() {
    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = this.color
    ctx.fillStyle = this.color

    if (this.type === 0) {
      // Cyber Bot
      ctx.fillRect(this.x, this.y + 20, this.width, 40) // Body

      // Head (floating)
      let headY = this.y
      if (this.grounded) {
        headY += Math.sin(this.runAnimTimer * 0.2) * 2
      }
      ctx.fillRect(this.x + 5, headY, 30, 18)

      // Visor
      ctx.fillStyle = '#fff'
      ctx.shadowBlur = 5
      ctx.shadowColor = '#fff'
      ctx.fillRect(this.x + 20, headY + 5, 15, 8)

      // Thruster
      if (!this.grounded) {
        ctx.fillStyle = '#00ffff'
        ctx.beginPath()
        ctx.moveTo(this.x + 10, this.y + 60)
        ctx.lineTo(this.x + 20, this.y + 75 + Math.random() * 5)
        ctx.lineTo(this.x + 30, this.y + 60)
        ctx.fill()
      }
    } else if (this.type === 1) {
      // Neon Cube (Spinning)
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
      if (this.grounded) {
        ctx.rotate(this.runAnimTimer * 0.1)
      } else {
        ctx.rotate(this.runAnimTimer * 0.2) // Spin faster in air
      }
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)

      // Core
      ctx.fillStyle = '#fff'
      ctx.fillRect(-10, -10, 20, 20)
    } else if (this.type === 2) {
      // Speedster (Triangle)
      ctx.beginPath()
      ctx.moveTo(this.x, this.y + this.height)
      ctx.lineTo(this.x + this.width, this.y + this.height / 2 + 5) // Nose
      ctx.lineTo(this.x, this.y + 10)
      ctx.fill()

      // Cockpit
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(this.x + 10, this.y + 15)
      ctx.lineTo(this.x + 30, this.y + this.height / 2 + 5)
      ctx.lineTo(this.x + 10, this.y + this.height - 5)
      ctx.fill()

      // Engine flame
      if (!this.grounded || this.runAnimTimer % 4 < 2) {
        ctx.fillStyle = '#ff4400'
        ctx.beginPath()
        ctx.moveTo(this.x, this.y + 15)
        ctx.lineTo(
          this.x - 20 - Math.random() * 10,
          this.y + this.height / 2 + 5
        )
        ctx.lineTo(this.x, this.y + this.height - 5)
        ctx.fill()
      }
    } else if (this.type === 3) {
      // Alien Blob (Squash and stretch)
      let stretchX = 0
      let stretchY = 0

      if (this.grounded) {
        stretchY = Math.sin(this.runAnimTimer * 0.3) * 5
        stretchX = -stretchY
      } else {
        stretchY = -5
        stretchX = 5
      }

      ctx.beginPath()
      ctx.ellipse(
        this.x + this.width / 2,
        this.y + this.height / 2 + stretchY / 2,
        Math.max(1, this.width / 2 + stretchX),
        Math.max(1, this.height / 2 - stretchY),
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()

      // Eyes
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(
        this.x + this.width / 2 - 10,
        this.y + this.height / 2 - 5 + stretchY / 2,
        4,
        0,
        Math.PI * 2
      )
      ctx.arc(
        this.x + this.width / 2 + 10,
        this.y + this.height / 2 - 5 + stretchY / 2,
        4,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.restore()
  }

  update() {
    // Jump Logic
    if (keys.Space || keys.Jump) {
      this.jump()
    }

    this.y += this.dy

    // Gravity
    if (this.y + this.height < canvas.height - GROUND_HEIGHT) {
      this.dy += GRAVITY
      this.grounded = false
    } else {
      this.dy = 0
      this.grounded = true
      this.y = canvas.height - GROUND_HEIGHT - this.height
    }

    this.runAnimTimer++
  }

  jump() {
    if (this.grounded) {
      this.dy = JUMP_FORCE
      this.grounded = false
    }
  }
}

class Obstacle {
  constructor() {
    this.width = 30 + Math.random() * 30
    this.height = 40 + Math.random() * 40
    this.x = canvas.width + this.width
    this.y = canvas.height - GROUND_HEIGHT - this.height
    this.color = '#ff0055'
    this.markedForDeletion = false
  }

  draw() {
    ctx.fillStyle = this.color
    ctx.shadowBlur = 10
    ctx.shadowColor = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)
  }

  update() {
    this.x -= gameSpeed
    if (this.x + this.width < 0) {
      this.markedForDeletion = true
      score++
      document.getElementById('score').innerText = 'Score: ' + score

      // Progressive Speed Increase
      // Increase speed by 0.1 for every point scored
      gameSpeed += 0.1
    }
  }
}

class Background {
  constructor() {
    this.particles = []
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1,
      })
    }
  }

  draw() {
    // Draw Ground
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT)
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, canvas.height - GROUND_HEIGHT)
    ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT)
    ctx.stroke()

    // Draw Stars/Particles
    ctx.fillStyle = '#ffffff'
    this.particles.forEach((p) => {
      ctx.globalAlpha = 0.5
      ctx.fillRect(p.x, p.y, p.size, p.size)
      ctx.globalAlpha = 1.0
    })
  }

  update() {
    this.particles.forEach((p) => {
      p.x -= p.speed * (gameSpeed * 0.1)
      if (p.x < 0) {
        p.x = canvas.width
        p.y = Math.random() * (canvas.height - GROUND_HEIGHT)
      }
    })
  }
}

// Variables
let player
let obstacles = []
let background
let obstacleTimer = 0
let obstacleInterval = 100 // Frames between obstacles
let randomInterval = Math.random() * 50 + 50

// Input
const keys = {
  Space: false,
  Jump: false,
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
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
})

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    keys.Space = false
  }
})

// Touch Controls
const handleJumpStart = (e) => {
  e.preventDefault()
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
  keys.Jump = true
}

const handleJumpEnd = (e) => {
  e.preventDefault()
  keys.Jump = false
}

const gameContainer = document.getElementById('game-container')

gameContainer.addEventListener('touchstart', handleJumpStart, {
  passive: false,
})
gameContainer.addEventListener('touchend', handleJumpEnd, { passive: false })
gameContainer.addEventListener('mousedown', handleJumpStart)
gameContainer.addEventListener('mouseup', handleJumpEnd)
gameContainer.addEventListener('mouseleave', handleJumpEnd)

function init() {
  player = new Player()
  background = new Background()
  obstacles = []
  score = 0
  gameSpeed = 5
  frameCount = 0
  obstacleTimer = 0
  document.getElementById('score').innerText = 'Score: ' + score
}

function spawnObstacle() {
  if (obstacleTimer > randomInterval) {
    obstacles.push(new Obstacle())
    obstacleTimer = 0
    randomInterval = Math.random() * 60 + 60 // Randomize gap
  } else {
    obstacleTimer++
  }
}

function checkCollisions() {
  for (let i = 0; i < obstacles.length; i++) {
    let obs = obstacles[i]

    // AABB Collision
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      gameOver()
      return true
    }
  }
  return false
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

  background.update()
  background.draw()

  player.update()
  player.draw()

  spawnObstacle()

  obstacles.forEach((obs) => {
    obs.update()
    obs.draw()
  })

  obstacles = obstacles.filter((obs) => !obs.markedForDeletion)

  if (!checkCollisions()) {
    animationId = requestAnimationFrame(animate)
  }
}

// Initial render
ctx.fillStyle = '#0f0c29'
ctx.fillRect(0, 0, canvas.width, canvas.height)
