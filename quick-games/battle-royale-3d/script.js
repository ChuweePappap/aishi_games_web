// ==========================================
// BATTLE ROYALE 3D - Main Game Script
// ==========================================

// Game Constants
const WORLD_SIZE = 500;
const INITIAL_PLAYERS = 20;
const ZONE_SHRINK_INTERVAL = 30000; // 30 seconds
const ZONE_DAMAGE = 2;
const GRAVITY = -30;
const JUMP_FORCE = 12;

// Three.js Variables
let scene, camera, renderer;
let clock;

// Game State
let gameState = 'menu';
let player = null;
let enemies = [];
let bullets = [];
let lootItems = [];
let buildings = [];
let trees = [];
let particles = [];

// Zone
let zone = {
    x: 0,
    z: 0,
    radius: WORLD_SIZE / 2,
    targetRadius: WORLD_SIZE / 2,
    shrinking: false,
    mesh: null,
    warningMesh: null
};

// Stats
let kills = 0;
let damageDealt = 0;
let playersAlive = INITIAL_PLAYERS;
let gameStartTime = 0;

// Input
const keys = {};
let mouseMovement = { x: 0, y: 0 };
let isPointerLocked = false;
let isShooting = false;

// Weapons Configuration
const weapons = {
    pistol: {
        name: 'Pistol',
        damage: 20,
        fireRate: 400,
        bulletSpeed: 80,
        spread: 0.02,
        magSize: 12,
        reloadTime: 1500,
        color: 0x888888
    },
    smg: {
        name: 'SMG',
        damage: 15,
        fireRate: 80,
        bulletSpeed: 70,
        spread: 0.08,
        magSize: 30,
        reloadTime: 2000,
        color: 0x4ade80
    },
    shotgun: {
        name: 'Shotgun',
        damage: 12,
        fireRate: 900,
        bulletSpeed: 60,
        spread: 0.15,
        pellets: 8,
        magSize: 6,
        reloadTime: 2500,
        color: 0xf59e0b
    },
    rifle: {
        name: 'Assault Rifle',
        damage: 25,
        fireRate: 120,
        bulletSpeed: 100,
        spread: 0.03,
        magSize: 30,
        reloadTime: 2200,
        color: 0x3b82f6
    },
    sniper: {
        name: 'Sniper',
        damage: 90,
        fireRate: 1500,
        bulletSpeed: 150,
        spread: 0.005,
        magSize: 5,
        reloadTime: 3000,
        color: 0x8b5cf6
    }
};

// Minimap
let minimapCanvas, minimapCtx;

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    // Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 100, 400);
    
    clock = new THREE.Clock();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Lighting
    setupLighting();
    
    // Setup minimap
    minimapCanvas = document.getElementById('minimap-canvas');
    minimapCanvas.width = 200;
    minimapCanvas.height = 200;
    minimapCtx = minimapCanvas.getContext('2d');
    
    // Event listeners
    setupEventListeners();
    
    // Start render loop
    animate();
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(100, 150, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    scene.add(sunLight);
    
    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.4);
    scene.add(hemiLight);
}

function setupEventListeners() {
    // Keyboard - capture all key events
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        keys[e.key.toLowerCase()] = true;
        // Prevent default for game keys to avoid scrolling
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
        if (e.code === 'KeyR' && gameState === 'playing') {
            reloadWeapon();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse
    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked) {
            mouseMovement.x = e.movementX;
            mouseMovement.y = e.movementY;
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState === 'playing') {
            isShooting = true;
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isShooting = false;
        }
    });
    
    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameState === 'playing') {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('menu-btn').addEventListener('click', returnToMenu);
}

// ==========================================
// GAME START
// ==========================================

function startGame() {
    gameState = 'loading';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    
    // Reset everything
    resetGame();
    
    // Simulate loading
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('hud').classList.remove('hidden');
                gameState = 'playing';
                gameStartTime = Date.now();
                renderer.domElement.requestPointerLock();
                
                // Start zone shrinking
                setTimeout(startZoneShrink, ZONE_SHRINK_INTERVAL);
            }, 500);
        }
        document.getElementById('loading-fill').style.width = progress + '%';
        updateLoadingText(progress);
    }, 100);
    
    // Create world
    createWorld();
}

function updateLoadingText(progress) {
    const texts = [
        'Preparing the battlefield...',
        'Spawning players...',
        'Placing loot...',
        'Setting up the zone...',
        'Get ready!'
    ];
    const index = Math.min(Math.floor(progress / 25), texts.length - 1);
    document.getElementById('loading-text').textContent = texts[index];
}

function resetGame() {
    // Clear scene objects
    [...enemies, ...bullets, ...lootItems, ...buildings, ...trees, ...particles].forEach(obj => {
        if (obj.mesh) scene.remove(obj.mesh);
        if (obj.group) scene.remove(obj.group);
    });
    
    if (player && player.mesh) scene.remove(player.mesh);
    if (zone.mesh) scene.remove(zone.mesh);
    if (zone.warningMesh) scene.remove(zone.warningMesh);
    
    // Reset arrays
    enemies = [];
    bullets = [];
    lootItems = [];
    buildings = [];
    trees = [];
    particles = [];
    player = null;
    
    // Reset stats
    kills = 0;
    damageDealt = 0;
    playersAlive = INITIAL_PLAYERS;
    
    // Reset zone
    zone = {
        x: 0,
        z: 0,
        radius: WORLD_SIZE / 2,
        targetRadius: WORLD_SIZE / 2,
        shrinking: false,
        mesh: null,
        warningMesh: null
    };
}

// ==========================================
// WORLD CREATION
// ==========================================

function createWorld() {
    // Ground
    createGround();
    
    // Buildings
    createBuildings();
    
    // Trees
    createTrees();
    
    // Zone visualization
    createZoneVisualization();
    
    // Spawn loot
    spawnLoot();
    
    // Create player
    createPlayer();
    
    // Create enemies
    createEnemies();
}

function createGround() {
    // Main ground
    const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3d5c3d,
        roughness: 0.8
    });
    
    // Add some height variation
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 1 - 0.5;
    }
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Water around the edges (out of bounds)
    const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4);
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e90ff,
        transparent: true,
        opacity: 0.7
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2;
    scene.add(water);
}

function createBuildings() {
    const buildingPositions = [];
    
    // Create random building clusters
    for (let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        
        // Check distance from other buildings
        let tooClose = false;
        for (const pos of buildingPositions) {
            const dist = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
            if (dist < 30) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            buildingPositions.push({ x, z });
            createBuilding(x, z);
        }
    }
}

function createBuilding(x, z) {
    const width = 10 + Math.random() * 15;
    const depth = 10 + Math.random() * 15;
    const height = 8 + Math.random() * 20;
    
    const buildingGroup = new THREE.Group();
    
    // Main structure
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.3, 0.5),
        roughness: 0.9
    });
    const building = new THREE.Mesh(geometry, material);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);
    
    // Roof
    const roofGeometry = new THREE.BoxGeometry(width + 1, 1, depth + 1);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height + 0.5;
    roof.castShadow = true;
    buildingGroup.add(roof);
    
    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb,
        emissive: 0x222222
    });
    
    for (let floor = 0; floor < Math.floor(height / 4); floor++) {
        for (let side = 0; side < 4; side++) {
            const windowGeometry = new THREE.BoxGeometry(2, 2, 0.2);
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            
            const yPos = 3 + floor * 4;
            
            if (side === 0) {
                window.position.set(0, yPos, depth / 2 + 0.1);
            } else if (side === 1) {
                window.position.set(0, yPos, -depth / 2 - 0.1);
            } else if (side === 2) {
                window.rotation.y = Math.PI / 2;
                window.position.set(width / 2 + 0.1, yPos, 0);
            } else {
                window.rotation.y = Math.PI / 2;
                window.position.set(-width / 2 - 0.1, yPos, 0);
            }
            
            buildingGroup.add(window);
        }
    }
    
    buildingGroup.position.set(x, 0, z);
    scene.add(buildingGroup);
    
    buildings.push({
        group: buildingGroup,
        x: x,
        z: z,
        width: width,
        depth: depth,
        height: height
    });
}

function createTrees() {
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.95;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.95;
        
        // Don't spawn too close to buildings
        let tooClose = false;
        for (const building of buildings) {
            const dist = Math.sqrt((x - building.x) ** 2 + (z - building.z) ** 2);
            if (dist < 25) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            createTree(x, z);
        }
    }
}

function createTree(x, z) {
    const treeGroup = new THREE.Group();
    
    const trunkHeight = 4 + Math.random() * 3;
    const leavesSize = 3 + Math.random() * 2;
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Leaves
    const leavesGeometry = new THREE.SphereGeometry(leavesSize, 8, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.6, 0.3 + Math.random() * 0.2)
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = trunkHeight + leavesSize * 0.5;
    leaves.castShadow = true;
    treeGroup.add(leaves);
    
    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
    
    trees.push({
        group: treeGroup,
        x: x,
        z: z,
        radius: 1
    });
}

function createZoneVisualization() {
    // Zone boundary (cylinder)
    const zoneGeometry = new THREE.CylinderGeometry(zone.radius, zone.radius, 100, 64, 1, true);
    const zoneMaterial = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    zone.mesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
    zone.mesh.position.set(zone.x, 50, zone.z);
    scene.add(zone.mesh);
    
    // Warning zone (where it's shrinking to)
    const warningGeometry = new THREE.CylinderGeometry(zone.targetRadius, zone.targetRadius, 100, 64, 1, true);
    const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    zone.warningMesh = new THREE.Mesh(warningGeometry, warningMaterial);
    zone.warningMesh.position.set(zone.x, 50, zone.z);
    scene.add(zone.warningMesh);
}

// ==========================================
// PLAYER
// ==========================================

function findSafeSpawnPoint() {
    // Try to find a spawn point not inside any building
    for (let attempts = 0; attempts < 50; attempts++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
        
        let safe = true;
        for (const building of buildings) {
            if (x > building.x - building.width / 2 - 3 &&
                x < building.x + building.width / 2 + 3 &&
                z > building.z - building.depth / 2 - 3 &&
                z < building.z + building.depth / 2 + 3) {
                safe = false;
                break;
            }
        }
        
        if (safe) {
            return { x, z };
        }
    }
    // Fallback to center if no safe spot found
    return { x: 0, z: 0 };
}

// Create a humanoid character mesh
function createHumanoid(skinColor, shirtColor, pantsColor) {
    const group = new THREE.Group();
    
    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2314 });
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.65;
    head.castShadow = true;
    group.add(head);
    
    // Hair
    const hairGeo = new THREE.SphereGeometry(0.27, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.7;
    group.add(hair);
    
    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);
    
    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.35, 1.1, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.35, 1.1, 0);
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
    
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.12, 0.55, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.12, 0.55, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    // Feet
    const footGeo = new THREE.BoxGeometry(0.18, 0.1, 0.28);
    
    const leftFoot = new THREE.Mesh(footGeo, shoeMat);
    leftFoot.position.set(-0.12, 0.05, 0.05);
    leftFoot.castShadow = true;
    group.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeo, shoeMat);
    rightFoot.position.set(0.12, 0.05, 0.05);
    rightFoot.castShadow = true;
    group.add(rightFoot);
    
    return group;
}

function createPlayer() {
    // Find safe spawn position
    const spawn = findSafeSpawnPoint();
    const spawnX = spawn.x;
    const spawnZ = spawn.z;
    
    // Player mesh (for third person reference, not visible in first person)
    const mesh = createHumanoid(0xffdbac, 0x4ade80, 0x2563eb);
    mesh.position.set(spawnX, 0, spawnZ);
    mesh.visible = false; // First person
    scene.add(mesh);
    
    player = {
        mesh: mesh,
        x: spawnX,
        y: 1.5,
        z: spawnZ,
        velocityY: 0,
        yaw: 0,
        pitch: 0,
        health: 100,
        maxHealth: 100,
        shield: 0,
        maxShield: 100,
        weapon: 'rifle',
        ammo: weapons.rifle.magSize,
        reserveAmmo: 90,
        lastShot: 0,
        isReloading: false,
        reloadStartTime: 0,
        speed: 15,
        sprintMultiplier: 1.5,
        isGrounded: true,
        name: 'You'
    };
    
    // Position camera
    camera.position.set(player.x, player.y + 0.8, player.z);
}

function updatePlayer(delta) {
    if (!player || gameState !== 'playing') return;
    
    // Mouse look
    if (isPointerLocked) {
        player.yaw -= mouseMovement.x * 0.002;
        player.pitch -= mouseMovement.y * 0.002;
        player.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, player.pitch));
        mouseMovement.x = 0;
        mouseMovement.y = 0;
    }
    
    // Movement - check multiple key formats
    let forwardBack = 0;
    let leftRight = 0;
    
    if (keys['KeyW'] || keys['ArrowUp'] || keys['w']) forwardBack = 1;
    if (keys['KeyS'] || keys['ArrowDown'] || keys['s']) forwardBack = -1;
    if (keys['KeyA'] || keys['ArrowLeft'] || keys['a']) leftRight = -1;
    if (keys['KeyD'] || keys['ArrowRight'] || keys['d']) leftRight = 1;
    
    // Normalize diagonal movement
    let moveLength = Math.sqrt(forwardBack * forwardBack + leftRight * leftRight);
    if (moveLength > 0) {
        forwardBack /= moveLength;
        leftRight /= moveLength;
    }
    
    // Apply sprint
    let speed = player.speed;
    if (keys['ShiftLeft'] || keys['ShiftRight'] || keys['shift']) {
        speed *= player.sprintMultiplier;
    }
    
    // Calculate movement direction based on camera yaw
    // Forward is the direction the camera is facing
    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);
    
    const dx = (forwardX * forwardBack + rightX * leftRight) * speed * delta;
    const dz = (forwardZ * forwardBack + rightZ * leftRight) * speed * delta;
    
    const moveX = forwardBack !== 0 || leftRight !== 0 ? 1 : 0;
    const moveZ = moveX;
    
    // Always apply movement if there's any input
    if (moveX !== 0 || moveZ !== 0) {
        const newX = player.x + dx;
        const newZ = player.z + dz;
        
        // Try full movement first
        if (!checkCollision(newX, newZ, 0.5)) {
            player.x = newX;
            player.z = newZ;
        } else {
            // Try X movement only (slide along Z wall)
            if (!checkCollision(newX, player.z, 0.5)) {
                player.x = newX;
            }
            // Try Z movement only (slide along X wall)
            if (!checkCollision(player.x, newZ, 0.5)) {
                player.z = newZ;
            }
        }
    }
    
    // Jump
    if ((keys['Space'] || keys[' ']) && player.isGrounded) {
        player.velocityY = JUMP_FORCE;
        player.isGrounded = false;
    }
    
    // Apply gravity
    player.velocityY += GRAVITY * delta;
    player.y += player.velocityY * delta;
    
    // Ground collision
    if (player.y <= 1.5) {
        player.y = 1.5;
        player.velocityY = 0;
        player.isGrounded = true;
    }
    
    // Keep in bounds
    player.x = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, player.x));
    player.z = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, player.z));
    
    // Update camera
    camera.position.set(player.x, player.y + 0.8, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    
    // Update player mesh position (humanoid at ground level)
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.yaw;
    
    // Shooting
    if (isShooting && !player.isReloading) {
        shoot();
    }
    
    // Reloading
    if (player.isReloading) {
        const weapon = weapons[player.weapon];
        if (Date.now() - player.reloadStartTime >= weapon.reloadTime) {
            const ammoNeeded = weapon.magSize - player.ammo;
            const ammoToAdd = Math.min(ammoNeeded, player.reserveAmmo);
            player.ammo += ammoToAdd;
            player.reserveAmmo -= ammoToAdd;
            player.isReloading = false;
        }
    }
    
    // Check zone damage
    const distFromZoneCenter = Math.sqrt((player.x - zone.x) ** 2 + (player.z - zone.z) ** 2);
    if (distFromZoneCenter > zone.radius) {
        player.health -= ZONE_DAMAGE * delta;
        document.getElementById('zone-warning').classList.remove('hidden');
        showDamageOverlay();
        
        if (player.health <= 0) {
            playerDied();
        }
    } else {
        document.getElementById('zone-warning').classList.add('hidden');
    }
    
    // Pick up loot
    checkLootPickup();
    
    // Update HUD
    updateHUD();
}

function checkCollision(x, z, radius) {
    // Check building collision
    for (const building of buildings) {
        const halfW = building.width / 2 + radius;
        const halfD = building.depth / 2 + radius;
        if (x > building.x - halfW &&
            x < building.x + halfW &&
            z > building.z - halfD &&
            z < building.z + halfD) {
            return true;
        }
    }
    
    // Skip tree collision for smoother movement
    // Trees are thin enough to walk through
    
    return false;
}

function shoot() {
    const weapon = weapons[player.weapon];
    const now = Date.now();
    
    if (now - player.lastShot < weapon.fireRate) return;
    if (player.ammo <= 0) {
        reloadWeapon();
        return;
    }
    
    player.lastShot = now;
    player.ammo--;
    
    // Calculate bullet direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const pellets = weapon.pellets || 1;
    
    for (let i = 0; i < pellets; i++) {
        // Add spread
        const spreadX = (Math.random() - 0.5) * weapon.spread;
        const spreadY = (Math.random() - 0.5) * weapon.spread;
        
        const bulletDir = direction.clone();
        bulletDir.x += spreadX;
        bulletDir.y += spreadY;
        bulletDir.normalize();
        
        createBullet(
            player.x,
            player.y + 0.8,
            player.z,
            bulletDir,
            weapon.bulletSpeed,
            weapon.damage,
            true,
            weapon.color
        );
    }
    
    updateHUD();
}

function reloadWeapon() {
    if (player.isReloading) return;
    if (player.reserveAmmo <= 0) return;
    if (player.ammo >= weapons[player.weapon].magSize) return;
    
    player.isReloading = true;
    player.reloadStartTime = Date.now();
}

// ==========================================
// ENEMIES (AI)
// ==========================================

function createEnemies() {
    // Different skin tones
    const skinTones = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
    // Different shirt colors
    const shirtColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf39c12, 0x1abc9c, 0xe91e63, 0x00bcd4];
    // Different pants colors  
    const pantsColors = [0x2c3e50, 0x34495e, 0x7f8c8d, 0x27ae60, 0x8e44ad];
    
    for (let i = 0; i < INITIAL_PLAYERS - 1; i++) {
        const spawnX = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
        const spawnZ = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
        
        // Create humanoid mesh with random colors
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
        const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
        const pantsColor = pantsColors[Math.floor(Math.random() * pantsColors.length)];
        
        const mesh = createHumanoid(skinColor, shirtColor, pantsColor);
        mesh.position.set(spawnX, 0, spawnZ);
        scene.add(mesh);
        
        const weaponTypes = ['pistol', 'smg', 'rifle', 'shotgun'];
        const weapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        
        enemies.push({
            mesh: mesh,
            x: spawnX,
            y: 1.5,
            z: spawnZ,
            health: 100,
            maxHealth: 100,
            shield: Math.random() > 0.7 ? 50 : 0,
            maxShield: 100,
            weapon: weapon,
            lastShot: 0,
            speed: 8 + Math.random() * 4,
            name: `Bot ${i + 1}`,
            // AI state
            state: 'wander',
            targetX: spawnX,
            targetZ: spawnZ,
            stateTimer: 0,
            viewRange: 60 + Math.random() * 40,
            attackRange: 40,
            accuracy: 0.3 + Math.random() * 0.4
        });
    }
}

function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Update state timer
        enemy.stateTimer -= delta;
        
        // Distance to player
        const distToPlayer = Math.sqrt(
            (enemy.x - player.x) ** 2 + (enemy.z - player.z) ** 2
        );
        
        // State machine
        if (distToPlayer < enemy.viewRange && player.health > 0) {
            // Can see player
            if (distToPlayer < enemy.attackRange) {
                enemy.state = 'attack';
            } else {
                enemy.state = 'chase';
            }
        } else if (enemy.stateTimer <= 0) {
            enemy.state = 'wander';
            enemy.targetX = enemy.x + (Math.random() - 0.5) * 50;
            enemy.targetZ = enemy.z + (Math.random() - 0.5) * 50;
            enemy.stateTimer = 3 + Math.random() * 3;
        }
        
        // Zone awareness - move towards zone center if outside
        const distFromZone = Math.sqrt((enemy.x - zone.x) ** 2 + (enemy.z - zone.z) ** 2);
        if (distFromZone > zone.radius * 0.8) {
            enemy.state = 'flee-zone';
            enemy.targetX = zone.x + (Math.random() - 0.5) * zone.radius * 0.5;
            enemy.targetZ = zone.z + (Math.random() - 0.5) * zone.radius * 0.5;
        }
        
        // Execute state behavior
        switch (enemy.state) {
            case 'wander':
            case 'flee-zone':
                moveTowardsTarget(enemy, enemy.targetX, enemy.targetZ, delta);
                break;
                
            case 'chase':
                moveTowardsTarget(enemy, player.x, player.z, delta);
                break;
                
            case 'attack':
                // Face player
                const angleToPlayer = Math.atan2(player.x - enemy.x, player.z - enemy.z);
                enemy.mesh.rotation.y = angleToPlayer;
                
                // Shoot at player
                enemyShoot(enemy, distToPlayer);
                
                // Strafe while attacking
                if (Math.random() < 0.3) {
                    const strafeDir = Math.random() < 0.5 ? -1 : 1;
                    const perpX = Math.cos(angleToPlayer) * strafeDir;
                    const perpZ = -Math.sin(angleToPlayer) * strafeDir;
                    
                    const newX = enemy.x + perpX * enemy.speed * 0.5 * delta;
                    const newZ = enemy.z + perpZ * enemy.speed * 0.5 * delta;
                    
                    if (!checkCollision(newX, newZ, 0.8)) {
                        enemy.x = newX;
                        enemy.z = newZ;
                    }
                }
                break;
        }
        
        // Keep in world bounds
        enemy.x = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, enemy.x));
        enemy.z = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, enemy.z));
        
        // Update mesh position (humanoid is at ground level)
        enemy.mesh.position.set(enemy.x, 0, enemy.z);
        
        // Zone damage
        if (distFromZone > zone.radius) {
            enemy.health -= ZONE_DAMAGE * delta;
            if (enemy.health <= 0) {
                killEnemy(i, null);
            }
        }
    }
    
    // AI vs AI combat
    updateAICombat(delta);
}

function moveTowardsTarget(enemy, targetX, targetZ, delta) {
    const dx = targetX - enemy.x;
    const dz = targetZ - enemy.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist > 2) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        
        const newX = enemy.x + dirX * enemy.speed * delta;
        const newZ = enemy.z + dirZ * enemy.speed * delta;
        
        if (!checkCollision(newX, newZ, 0.8)) {
            enemy.x = newX;
            enemy.z = newZ;
        }
        
        // Face movement direction
        enemy.mesh.rotation.y = Math.atan2(dx, dz);
    }
}

function enemyShoot(enemy, distToTarget) {
    const weapon = weapons[enemy.weapon];
    const now = Date.now();
    
    if (now - enemy.lastShot < weapon.fireRate * 1.5) return;
    
    // Random chance to shoot based on accuracy
    if (Math.random() > enemy.accuracy) return;
    
    enemy.lastShot = now;
    
    // Direction to player with inaccuracy
    const dirX = player.x - enemy.x;
    const dirY = (player.y + 0.8) - (enemy.y + 0.8);
    const dirZ = player.z - enemy.z;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    
    const inaccuracy = (1 - enemy.accuracy) * 0.3;
    const direction = new THREE.Vector3(
        dirX / dist + (Math.random() - 0.5) * inaccuracy,
        dirY / dist + (Math.random() - 0.5) * inaccuracy,
        dirZ / dist + (Math.random() - 0.5) * inaccuracy
    ).normalize();
    
    const pellets = weapon.pellets || 1;
    
    for (let i = 0; i < pellets; i++) {
        const bulletDir = direction.clone();
        bulletDir.x += (Math.random() - 0.5) * weapon.spread;
        bulletDir.y += (Math.random() - 0.5) * weapon.spread;
        bulletDir.normalize();
        
        createBullet(
            enemy.x,
            enemy.y + 0.8,
            enemy.z,
            bulletDir,
            weapon.bulletSpeed,
            weapon.damage,
            false,
            weapon.color,
            enemy
        );
    }
}

function updateAICombat(delta) {
    // Make AIs fight each other occasionally
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const e1 = enemies[i];
            const e2 = enemies[j];
            
            const dist = Math.sqrt((e1.x - e2.x) ** 2 + (e1.z - e2.z) ** 2);
            
            // If close and random chance, they fight
            if (dist < 40 && Math.random() < 0.001) {
                // e1 shoots at e2
                const now = Date.now();
                if (now - e1.lastShot > weapons[e1.weapon].fireRate * 2) {
                    e1.lastShot = now;
                    const dir = new THREE.Vector3(
                        e2.x - e1.x,
                        0,
                        e2.z - e1.z
                    ).normalize();
                    
                    createBullet(e1.x, e1.y + 0.8, e1.z, dir, 
                        weapons[e1.weapon].bulletSpeed,
                        weapons[e1.weapon].damage,
                        false, weapons[e1.weapon].color, e1, e2);
                }
            }
        }
    }
}

// ==========================================
// BULLETS
// ==========================================

function createBullet(x, y, z, direction, speed, damage, isPlayerBullet, color, shooter = null, target = null) {
    const geometry = new THREE.SphereGeometry(0.1, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    bullets.push({
        mesh: mesh,
        x: x,
        y: y,
        z: z,
        direction: direction,
        speed: speed,
        damage: damage,
        isPlayerBullet: isPlayerBullet,
        shooter: shooter,
        specificTarget: target,
        lifetime: 3
    });
}

function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.x += bullet.direction.x * bullet.speed * delta;
        bullet.y += bullet.direction.y * bullet.speed * delta;
        bullet.z += bullet.direction.z * bullet.speed * delta;
        bullet.mesh.position.set(bullet.x, bullet.y, bullet.z);
        
        // Decrease lifetime
        bullet.lifetime -= delta;
        
        // Check if out of bounds or expired
        if (bullet.lifetime <= 0 ||
            bullet.y < 0 ||
            Math.abs(bullet.x) > WORLD_SIZE ||
            Math.abs(bullet.z) > WORLD_SIZE) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check building collision
        let hitBuilding = false;
        for (const building of buildings) {
            if (bullet.x > building.x - building.width / 2 &&
                bullet.x < building.x + building.width / 2 &&
                bullet.y < building.height &&
                bullet.z > building.z - building.depth / 2 &&
                bullet.z < building.z + building.depth / 2) {
                hitBuilding = true;
                break;
            }
        }
        
        if (hitBuilding) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            createImpactParticles(bullet.x, bullet.y, bullet.z, 0x888888);
            continue;
        }
        
        // Check player hit
        if (!bullet.isPlayerBullet && player && player.health > 0) {
            const distToPlayer = Math.sqrt(
                (bullet.x - player.x) ** 2 +
                (bullet.y - (player.y + 0.5)) ** 2 +
                (bullet.z - player.z) ** 2
            );
            
            if (distToPlayer < 1) {
                // Hit player
                let damage = bullet.damage;
                
                if (player.shield > 0) {
                    const shieldDamage = Math.min(player.shield, damage);
                    player.shield -= shieldDamage;
                    damage -= shieldDamage;
                }
                
                player.health -= damage;
                showDamageOverlay();
                
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
                
                if (player.health <= 0) {
                    playerDied(bullet.shooter);
                }
                continue;
            }
        }
        
        // Check enemy hit
        if (bullet.isPlayerBullet || bullet.specificTarget) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                // If bullet has specific target, only hit that target
                if (bullet.specificTarget && bullet.specificTarget !== enemy) continue;
                
                const distToEnemy = Math.sqrt(
                    (bullet.x - enemy.x) ** 2 +
                    (bullet.y - (enemy.y + 0.5)) ** 2 +
                    (bullet.z - enemy.z) ** 2
                );
                
                if (distToEnemy < 1) {
                    // Hit enemy
                    let damage = bullet.damage;
                    
                    if (enemy.shield > 0) {
                        const shieldDamage = Math.min(enemy.shield, damage);
                        enemy.shield -= shieldDamage;
                        damage -= shieldDamage;
                    }
                    
                    enemy.health -= damage;
                    
                    if (bullet.isPlayerBullet) {
                        damageDealt += bullet.damage;
                        showHitMarker();
                    }
                    
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    
                    createImpactParticles(bullet.x, bullet.y, bullet.z, 0xff0000);
                    
                    if (enemy.health <= 0) {
                        killEnemy(j, bullet.isPlayerBullet ? player : bullet.shooter);
                    }
                    break;
                }
            }
        }
    }
}

// ==========================================
// LOOT
// ==========================================

function spawnLoot() {
    const lootTypes = ['health', 'shield', 'smg', 'shotgun', 'rifle', 'sniper', 'ammo'];
    
    for (let i = 0; i < 80; i++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        const type = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        
        createLootItem(x, z, type);
    }
}

function createLootItem(x, z, type) {
    let color, geometry;
    
    switch (type) {
        case 'health':
            color = 0xff4444;
            geometry = new THREE.BoxGeometry(1, 0.5, 1);
            break;
        case 'shield':
            color = 0x4444ff;
            geometry = new THREE.BoxGeometry(1, 0.5, 1);
            break;
        case 'ammo':
            color = 0xffaa00;
            geometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);
            break;
        default: // weapons
            color = weapons[type]?.color || 0x888888;
            geometry = new THREE.BoxGeometry(1.5, 0.3, 0.5);
            break;
    }
    
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.5, z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    lootItems.push({
        mesh: mesh,
        x: x,
        z: z,
        type: type,
        bobOffset: Math.random() * Math.PI * 2
    });
}

function updateLoot(delta) {
    const time = Date.now() * 0.003;
    
    for (const loot of lootItems) {
        // Bobbing animation
        loot.mesh.position.y = 0.5 + Math.sin(time + loot.bobOffset) * 0.2;
        loot.mesh.rotation.y += delta * 2;
    }
}

function checkLootPickup() {
    for (let i = lootItems.length - 1; i >= 0; i--) {
        const loot = lootItems[i];
        const dist = Math.sqrt((player.x - loot.x) ** 2 + (player.z - loot.z) ** 2);
        
        if (dist < 2) {
            // Pick up loot
            switch (loot.type) {
                case 'health':
                    player.health = Math.min(player.maxHealth, player.health + 25);
                    break;
                case 'shield':
                    player.shield = Math.min(player.maxShield, player.shield + 25);
                    break;
                case 'ammo':
                    player.reserveAmmo += 30;
                    break;
                default: // weapons
                    if (weapons[loot.type]) {
                        player.weapon = loot.type;
                        player.ammo = weapons[loot.type].magSize;
                        player.reserveAmmo = weapons[loot.type].magSize * 3;
                        player.isReloading = false;
                    }
                    break;
            }
            
            scene.remove(loot.mesh);
            lootItems.splice(i, 1);
        }
    }
}

// ==========================================
// ZONE
// ==========================================

function startZoneShrink() {
    if (gameState !== 'playing') return;
    
    // Calculate new zone
    zone.targetRadius = zone.radius * 0.6;
    
    // Move center slightly
    zone.x += (Math.random() - 0.5) * zone.radius * 0.3;
    zone.z += (Math.random() - 0.5) * zone.radius * 0.3;
    
    // Keep zone in bounds
    const maxOffset = WORLD_SIZE / 2 - zone.targetRadius;
    zone.x = Math.max(-maxOffset, Math.min(maxOffset, zone.x));
    zone.z = Math.max(-maxOffset, Math.min(maxOffset, zone.z));
    
    zone.shrinking = true;
    
    // Update warning mesh
    zone.warningMesh.geometry.dispose();
    zone.warningMesh.geometry = new THREE.CylinderGeometry(
        zone.targetRadius, zone.targetRadius, 100, 64, 1, true
    );
    zone.warningMesh.position.set(zone.x, 50, zone.z);
    
    // Schedule next shrink
    setTimeout(startZoneShrink, ZONE_SHRINK_INTERVAL);
}

function updateZone(delta) {
    if (zone.shrinking) {
        // Shrink zone
        const shrinkSpeed = 10;
        zone.radius -= shrinkSpeed * delta;
        
        if (zone.radius <= zone.targetRadius) {
            zone.radius = zone.targetRadius;
            zone.shrinking = false;
        }
        
        // Update zone mesh
        zone.mesh.geometry.dispose();
        zone.mesh.geometry = new THREE.CylinderGeometry(
            zone.radius, zone.radius, 100, 64, 1, true
        );
        zone.mesh.position.set(zone.x, 50, zone.z);
    }
}

// ==========================================
// PARTICLES
// ==========================================

function createImpactParticles(x, y, z, color) {
    for (let i = 0; i < 5; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        
        particles.push({
            mesh: mesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            ),
            lifetime: 0.5
        });
    }
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.velocity.y -= 20 * delta;
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
        particle.lifetime -= delta;
        
        if (particle.lifetime <= 0) {
            scene.remove(particle.mesh);
            particles.splice(i, 1);
        }
    }
}

// ==========================================
// GAME EVENTS
// ==========================================

function killEnemy(index, killer) {
    const enemy = enemies[index];
    
    if (killer === player) {
        kills++;
        addKillFeedMessage(player.name, enemy.name);
    } else if (killer) {
        addKillFeedMessage(killer.name, enemy.name);
    } else {
        addKillFeedMessage('Zone', enemy.name);
    }
    
    // Create death particles
    createImpactParticles(enemy.x, enemy.y, enemy.z, 0xff0000);
    
    // Remove enemy
    scene.remove(enemy.mesh);
    enemies.splice(index, 1);
    
    playersAlive--;
    
    // Drop loot
    if (Math.random() > 0.3) {
        const lootTypes = ['health', 'shield', 'ammo'];
        const type = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        createLootItem(enemy.x, enemy.z, type);
    }
    
    // Check win condition
    if (enemies.length === 0) {
        victory();
    }
}

function playerDied(killer) {
    gameState = 'gameover';
    document.exitPointerLock();
    
    if (killer) {
        addKillFeedMessage(killer.name, player.name);
    } else {
        addKillFeedMessage('Zone', player.name);
    }
    
    showGameOver(false);
}

function victory() {
    gameState = 'gameover';
    document.exitPointerLock();
    showGameOver(true);
}

function showGameOver(isVictory) {
    const gameOverScreen = document.getElementById('game-over');
    const resultTitle = document.getElementById('result-title');
    
    if (isVictory) {
        resultTitle.textContent = '🏆 VICTORY ROYALE! 🏆';
        gameOverScreen.classList.remove('defeat');
        gameOverScreen.classList.add('victory');
    } else {
        resultTitle.textContent = 'GAME OVER';
        gameOverScreen.classList.remove('victory');
        gameOverScreen.classList.add('defeat');
    }
    
    document.getElementById('final-position').textContent = playersAlive;
    document.getElementById('final-kills').textContent = kills;
    document.getElementById('final-damage').textContent = Math.floor(damageDealt);
    
    const survivalTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(survivalTime / 60);
    const seconds = survivalTime % 60;
    document.getElementById('survival-time').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('hud').classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function returnToMenu() {
    gameState = 'menu';
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('menu-screen').style.display = 'flex';
}

// ==========================================
// UI HELPERS
// ==========================================

function updateHUD() {
    if (!player) return;
    
    // Health
    document.getElementById('health-fill').style.width = 
        (player.health / player.maxHealth * 100) + '%';
    document.getElementById('health-text').textContent = Math.max(0, Math.floor(player.health));
    
    // Shield
    document.getElementById('shield-fill').style.width = 
        (player.shield / player.maxShield * 100) + '%';
    document.getElementById('shield-text').textContent = Math.floor(player.shield);
    
    // Weapon
    const weapon = weapons[player.weapon];
    document.getElementById('weapon-name').textContent = weapon.name;
    
    let ammoText = `${player.ammo} / ${player.reserveAmmo}`;
    if (player.isReloading) {
        ammoText = 'Reloading...';
    }
    document.getElementById('ammo-count').textContent = ammoText;
    
    // Players alive
    document.getElementById('alive-count').textContent = playersAlive;
    document.getElementById('kills').textContent = kills;
    
    // Update minimap
    updateMinimap();
}

function updateMinimap() {
    minimapCtx.fillStyle = '#1a1a2e';
    minimapCtx.fillRect(0, 0, 200, 200);
    
    const scale = 200 / WORLD_SIZE;
    const centerX = 100;
    const centerY = 100;
    
    // Draw zone
    minimapCtx.strokeStyle = '#3b82f6';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.arc(
        centerX + zone.x * scale,
        centerY + zone.z * scale,
        zone.radius * scale,
        0,
        Math.PI * 2
    );
    minimapCtx.stroke();
    
    // Draw buildings
    minimapCtx.fillStyle = '#666';
    for (const building of buildings) {
        const x = centerX + building.x * scale - building.width * scale / 2;
        const y = centerY + building.z * scale - building.depth * scale / 2;
        minimapCtx.fillRect(x, y, building.width * scale, building.depth * scale);
    }
    
    // Draw enemies
    minimapCtx.fillStyle = '#f87171';
    for (const enemy of enemies) {
        const x = centerX + enemy.x * scale;
        const y = centerY + enemy.z * scale;
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
    
    // Draw player
    if (player) {
        minimapCtx.fillStyle = '#4ade80';
        const x = centerX + player.x * scale;
        const y = centerY + player.z * scale;
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, 4, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Draw player direction
        minimapCtx.strokeStyle = '#4ade80';
        minimapCtx.lineWidth = 2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(x, y);
        minimapCtx.lineTo(
            x + Math.sin(player.yaw) * 10,
            y + Math.cos(player.yaw) * 10
        );
        minimapCtx.stroke();
    }
}

function addKillFeedMessage(killer, victim) {
    const feed = document.getElementById('kill-feed');
    const message = document.createElement('div');
    message.className = 'kill-message';
    message.innerHTML = `<span class="killer">${killer}</span> eliminated <span class="victim">${victim}</span>`;
    feed.appendChild(message);
    
    // Remove after 5 seconds
    setTimeout(() => {
        message.remove();
    }, 5000);
}

function showDamageOverlay() {
    let overlay = document.querySelector('.damage-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'damage-overlay';
        document.getElementById('game-container').appendChild(overlay);
    }
    
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 200);
}

function showHitMarker() {
    let marker = document.querySelector('.hit-marker');
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'hit-marker';
        document.getElementById('hud').appendChild(marker);
    }
    
    marker.style.display = 'block';
    setTimeout(() => marker.style.display = 'none', 100);
}

// ==========================================
// MAIN GAME LOOP
// ==========================================

function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    if (gameState === 'playing') {
        updatePlayer(delta);
        updateEnemies(delta);
        updateBullets(delta);
        updateLoot(delta);
        updateZone(delta);
        updateParticles(delta);
    }
    
    renderer.render(scene, camera);
}

// Start the game
init();
