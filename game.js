const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scoreEl = document.getElementById("score");
const gameOverPanel = document.getElementById("game-over");
const btnRestart = document.getElementById("btn-restart");

// Stats UI
const upgSpeedLvl = document.getElementById("lvl-speed");
const upgFireLvl = document.getElementById("lvl-fire");
const upgDmgLvl = document.getElementById("lvl-dmg");

// Game State
let frame = 0;
let score = 0;
let round = 1;
let inBossFight = false;
let isGameOver = false;

// Entities
let player;
let bullets = [];
let enemies = [];
let droppedCoins = [];
let droppedPowerUps = [];
let particles = [];
let floatingTexts = [];
let bossBars = [];

// Image Assets
const imgPlayer = new Image();
imgPlayer.src = "player.png";

const imgJet = new Image();
imgJet.src = "jet.png";

const imgHeli = new Image();
imgHeli.src = "heli.png";

const imgBoss = new Image();
imgBoss.src = "boss.png";

// Input
const keys = {};
let isTouching = false;
let touchX = 0;
let touchY = 0;

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === "shoot") {
    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "enemy_shoot") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "hit") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === "explosion") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === "coin") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.05);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "powerup") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.2);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === "boss_spawn") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(50, now + 1.0);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.0);
  } else if (type === "player_death") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// Mobile Touch Controls
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    isTouching = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = touch.clientX - rect.left;
    touchY = touch.clientY - rect.top;
  },
  { passive: false },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = touch.clientX - rect.left;
    touchY = touch.clientY - rect.top;
  },
  { passive: false },
);

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  isTouching = false;
});

// Upgrades Configuration
const UPGRADES = {
  speed: {
    level: 1,
    baseVal: 2,
    increment: 0.5,
  },
  fireRate: {
    level: 1,
    baseVal: 30,
    increment: -5,
  }, // Cooldown frames
  damage: {
    level: 1,
    baseVal: 1,
    increment: 1,
  },
};

btnRestart.addEventListener("click", () => {
  initGame();
});

btnRestart.addEventListener("touchstart", (e) => {
  e.preventDefault(); // Prevent double-firing on some touch devices
  initGame();
});

function updateUI() {
  scoreEl.innerText = `Score: ${score} | Round: ${round}`;
  upgSpeedLvl.innerText = UPGRADES.speed.level;
  upgFireLvl.innerText = UPGRADES.fireRate.level;
  upgDmgLvl.innerText = UPGRADES.damage.level;
}

// Classes
class Player {
  constructor() {
    this.w = 32;
    this.h = 32;
    this.x = canvas.width / 2 - this.w / 2;
    this.y = canvas.height - this.h - 20;
    this.color = "#0ff";
    this.shootCooldown = 0;
  }

  update() {
    const totalUpgrades = Math.max(
      0,
      UPGRADES.speed.level +
        UPGRADES.fireRate.level +
        UPGRADES.damage.level -
        3,
    );
    const scale = 1 + totalUpgrades * 0.05; // Grows by 5% per upgrade level
    this.w = 32 * scale;
    this.h = 32 * scale;

    const speed =
      UPGRADES.speed.baseVal +
      (UPGRADES.speed.level - 1) * UPGRADES.speed.increment;

    if (keys["ArrowLeft"] || keys["KeyA"]) this.x -= speed;
    if (keys["ArrowRight"] || keys["KeyD"]) this.x += speed;
    if (keys["ArrowUp"] || keys["KeyW"]) this.y -= speed;
    if (keys["ArrowDown"] || keys["KeyS"]) this.y += speed;

    // Touch movement (snap to finger with offset so finger doesn't block ship)
    if (isTouching) {
      // Approach finger position
      const targetX = touchX - this.w / 2;
      const targetY = touchY - this.h * 2; // Keep ship above finger

      this.x += (targetX - this.x) * 0.2; // Smooth snapping
      this.y += (targetY - this.y) * 0.2;
    }

    // Bounds
    this.x = Math.max(0, Math.min(canvas.width - this.w, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.h, this.y));

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (keys["Space"] || isTouching) {
      this.shoot();
    }
  }

  shoot() {
    if (this.shootCooldown <= 0) {
      playSound("shoot");
      const fireCooldown = Math.max(
        4,
        UPGRADES.fireRate.baseVal +
          (UPGRADES.fireRate.level - 1) * UPGRADES.fireRate.increment,
      );
      this.shootCooldown = fireCooldown;

      const damage =
        UPGRADES.damage.baseVal +
        (UPGRADES.damage.level - 1) * UPGRADES.damage.increment;
      const dLvl = UPGRADES.damage.level;

      const cx = this.x + this.w / 2;
      const bw = 3 + dLvl;
      const bh = 10 + dLvl;
      const spd = 6 + UPGRADES.speed.level;

      if (dLvl === 1) {
        bullets.push(
          new Bullet(cx - bw / 2, this.y, damage, bw, bh, "#ff0", spd),
        );
      } else if (dLvl === 2) {
        bullets.push(
          new Bullet(
            cx - bw / 2 - 6,
            this.y + this.h / 4,
            damage,
            bw,
            bh,
            "#0f0",
            spd,
          ),
        );
        bullets.push(
          new Bullet(
            cx - bw / 2 + 6,
            this.y + this.h / 4,
            damage,
            bw,
            bh,
            "#0f0",
            spd,
          ),
        );
      } else if (dLvl === 3) {
        bullets.push(
          new Bullet(cx - bw / 2, this.y, damage, bw, bh, "#0ff", spd),
        );
        bullets.push(
          new Bullet(
            cx - bw / 2 - 10,
            this.y + this.h / 3,
            damage,
            bw,
            bh,
            "#0ff",
            spd,
          ),
        );
        bullets.push(
          new Bullet(
            cx + 10 - bw / 2,
            this.y + this.h / 3,
            damage,
            bw,
            bh,
            "#0ff",
            spd,
          ),
        );
      } else if (dLvl === 4) {
        bullets.push(
          new Bullet(cx - bw / 2 - 4, this.y, damage, bw, bh, "#f0f", spd),
        );
        bullets.push(
          new Bullet(cx - bw / 2 + 4, this.y, damage, bw, bh, "#f0f", spd),
        );
        bullets.push(
          new Bullet(
            cx - bw / 2 - 14,
            this.y + this.h / 2,
            damage,
            bw,
            bh,
            "#f0f",
            spd,
          ),
        );
        bullets.push(
          new Bullet(
            cx - bw / 2 + 14,
            this.y + this.h / 2,
            damage,
            bw,
            bh,
            "#f0f",
            spd,
          ),
        );
      } else {
        const numBullets = Math.min(10, 1 + Math.floor(dLvl / 2));
        const spread = this.w * 0.9;
        for (let i = 0; i < numBullets; i++) {
          const t = numBullets > 1 ? i / (numBullets - 1) - 0.5 : 0;
          const bx = cx + t * spread;
          const by = this.y + Math.abs(t) * this.h;
          bullets.push(
            new Bullet(bx - bw / 2, by, damage, bw, bh, "#fff", spd, t * 4),
          );
        }
      }
    }
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    ctx.drawImage(imgPlayer, -this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, damage, w = 4, h = 10, color = "#ff0", speed = 6, vx = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.speed = speed;
    this.vx = vx;
    this.damage = damage;
    this.color = color;
    this.markedForDeletion = false;
  }

  update() {
    this.x += this.vx;
    this.y -= this.speed;
    if (this.y < 0 || this.x < 0 || this.x > canvas.width)
      this.markedForDeletion = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.w, this.h, this.w / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Enemy {
  constructor() {
    this.w = 28;
    this.h = 28;
    this.x = Math.random() * (canvas.width - this.w);
    this.y = -this.h;
    this.speed = 1 + Math.random();
    this.hp = 1 + Math.floor(score / 100); // Scale health with score
    this.color = "#f0f";
    this.markedForDeletion = false;
  }

  update() {
    this.y += this.speed;
    if (this.y > canvas.height) this.markedForDeletion = true;
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff00ff";

    // Rotate the image to point down
    ctx.rotate(Math.PI);
    ctx.drawImage(imgJet, -this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }

  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) {
      playSound("explosion");
      this.markedForDeletion = true;
      score += 10;
      spawnExplosion(this.x + this.w / 2, this.y + this.h / 2, this.color);

      const dropChance = Math.random();
      if (dropChance < 0.2) {
        const types = ["speed", "fireRate", "damage"];
        const type = types[Math.floor(Math.random() * types.length)];
        droppedPowerUps.push(
          new PowerUp(this.x + this.w / 2, this.y + this.h / 2, type),
        );
      } else if (dropChance < 0.5) {
        droppedCoins.push(new Coin(this.x + this.w / 2, this.y + this.h / 2));
      }
    } else {
      playSound("hit");
    }
  }
}

class JetEnemy extends Enemy {
  constructor() {
    super();
    this.w = 32;
    this.h = 36;
    this.color = "#FF4500";
    this.speed = 2 + Math.random() * 1.5;

    // Ramming logic
    this.targetSet = false;
    this.vx = 0;
    this.vy = this.speed;
  }

  update() {
    this.y += this.vy;
    this.x += this.vx;

    // S-curve diving or direct ramming
    if (!this.targetSet && this.y > canvas.height * 0.2) {
      this.targetSet = true;
      // Dive towards player occasionally
      if (Math.random() < 0.6) {
        const dx = player.x + player.w / 2 - (this.x + this.w / 2);
        this.vx = dx * 0.02; // Steer towards player
        this.vy += 1; // Speed up descent
      }
    }

    if (this.y > canvas.height) this.markedForDeletion = true;
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 5;
    ctx.shadowColor = "#FF4500";

    // Re-use Jet sprite
    ctx.rotate(Math.PI);
    ctx.drawImage(imgJet, -this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }
}

class HelicopterEnemy extends Enemy {
  constructor() {
    super();
    this.w = 40;
    this.h = 40;
    this.speed = 1.0 + Math.random() * 0.5;
    this.hp = 3 + Math.floor(score / 100);
    this.color = "#2E8B57"; // SeaGreen
    this.rot = 0;
    this.shootTimer = 60 + Math.random() * 60;
  }

  update() {
    this.y += this.speed;
    this.rot += 0.3; // Rotor spin

    // Hover and track player horizontally
    if (this.y > canvas.height * 0.15 && this.y < canvas.height * 0.5) {
      if (player.x + player.w / 2 > this.x + this.w / 2) {
        this.x += 0.8;
      } else {
        this.x -= 0.8;
      }
    }

    // Shooting
    if (this.y > 0) {
      this.shootTimer--;
      if (this.shootTimer <= 0) {
        playSound("enemy_shoot");
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h;
        let b = new Bullet(cx - 2, cy, 1, 4, 8, "#f0f", -3, 0); // Firing downwards
        b.isEnemyBullet = true;
        bullets.push(b);
        this.shootTimer = 80;
      }
    }

    if (this.y > canvas.height) this.markedForDeletion = true;
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 8;
    ctx.shadowColor = "#111";

    ctx.rotate(Math.PI);
    ctx.drawImage(imgHeli, -this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }
}

class Boss {
  constructor(tier) {
    this.w = 80 + tier * 20;
    this.h = 60 + tier * 10;
    this.x = canvas.width / 2 - this.w / 2;
    this.y = -this.h;
    this.maxHp = 500 * tier * tier;
    this.hp = this.maxHp;
    this.tier = tier;
    this.state = "enter"; // enter, attack
    this.markedForDeletion = false;
    this.shootCooldown = 0;
    this.moveTimer = 0;
    this.targetX = this.x;
  }
  update() {
    if (this.state === "enter") {
      this.y += 1;
      if (this.y >= 20) {
        this.state = "attack";
      }
    } else {
      // Move around randomly at top
      if (this.moveTimer <= 0) {
        this.targetX = Math.random() * (canvas.width - this.w);
        this.moveTimer = 60 + Math.random() * 60;
      }
      this.moveTimer--;
      this.x += (this.targetX - this.x) * 0.02;

      // Shoot spread
      if (this.shootCooldown <= 0) {
        this.shoot();
        this.shootCooldown = 80 - Math.min(60, this.tier * 5);
      }
      this.shootCooldown--;
    }
  }

  shoot() {
    playSound("enemy_shoot");
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h;
    const bulletsToShoot = 3 + this.tier * 2;
    for (let i = 0; i < bulletsToShoot; i++) {
      const spread = 0.5; // radians
      const angle =
        (i / (bulletsToShoot - 1)) * spread - spread / 2 + Math.PI / 2;
      const vx = Math.cos(angle) * 3;
      const vy = Math.sin(angle) * 3;
      // Alien bullets move in vx, vy (Enemy bullets don't exist yet, we will repurpose Bullet with negative speed)
      let b = new Bullet(cx, cy, 1, 6, 6, "#f00", -vy, vx);
      b.isEnemyBullet = true;
      bullets.push(b);
    }
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);

    // Boss Image
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f00";

    ctx.rotate(Math.PI);
    ctx.drawImage(imgBoss, -this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();

    // Boss hp bar visually requested
    ctx.fillStyle = "#333";
    ctx.fillRect(this.x, this.y - 10, this.w, 4);
    ctx.fillStyle = "#f00";
    ctx.fillRect(this.x, this.y - 10, this.w * (this.hp / this.maxHp), 4);
  }

  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) {
      this.markedForDeletion = true;
      score += 1000 * this.tier;
      for (let i = 0; i < 30; i++)
        spawnExplosion(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          "#f00",
        );

      // Drop tons of loot
      for (let i = 0; i < 10; i++)
        droppedCoins.push(
          new Coin(
            this.x + Math.random() * this.w,
            this.y + Math.random() * this.h,
          ),
        );
      for (let i = 0; i < 3; i++) {
        const types = ["speed", "fireRate", "damage"];
        droppedPowerUps.push(
          new PowerUp(
            this.x + Math.random() * this.w,
            this.y + Math.random() * this.h,
            types[i],
          ),
        );
      }

      inBossFight = false;
      round++;
      updateUI();
    } else {
      playSound("hit");
    }
  }
}

class Coin {
  constructor(x, y) {
    this.w = 6;
    this.h = 6;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.speed = 0.5;
    this.markedForDeletion = false;
    this.frame = 0;
  }

  update() {
    this.y += this.speed;
    this.frame++;
    if (this.y > canvas.height) this.markedForDeletion = true;
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = this.w / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle =
      Math.floor(this.frame / 10) % 2 === 0 ? "#FFD700" : "#FFFACD";
    ctx.shadowBlur = 5;
    ctx.shadowColor = "#FFD700";

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.w = 12;
    this.h = 12;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.speed = 0.8;
    this.type = type;
    this.markedForDeletion = false;
    this.frame = 0;
    this.color =
      type === "speed" ? "#0af" : type === "fireRate" ? "#0f0" : "#f00";
  }

  update() {
    this.y += this.speed;
    this.frame++;
    if (this.y > canvas.height) this.markedForDeletion = true;
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = this.w / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;

    ctx.fillStyle = Math.floor(this.frame / 10) % 2 === 0 ? this.color : "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.font = 'bold 8px "Press Start 2P"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.type === "fireRate" ? "F" : this.type[0].toUpperCase(),
      0,
      1,
    );

    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 60;
    this.markedForDeletion = false;
  }
  update() {
    this.y -= 0.5;
    this.life--;
    if (this.life <= 0) this.markedForDeletion = true;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life / 60;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1.0;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 20 + Math.random() * 20;
    this.color = color;
    this.w = 2;
    this.h = 2;
    this.markedForDeletion = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.markedForDeletion = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life / 40);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// Collision detection (AABB)
function checkCollision(r1, r2) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

function initGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  droppedCoins = [];
  droppedPowerUps = [];
  particles = [];
  floatingTexts = [];
  score = 0;
  round = 1;
  frame = 0;
  inBossFight = false;
  isGameOver = false;

  gameOverPanel.classList.add("hidden");

  updateUI();
  gameLoop();
}

function update() {
  if (isGameOver) return;

  frame++;
  player.update();

  // Progress logic
  if (score > round * 1500 && !inBossFight) {
    playSound("boss_spawn");
    inBossFight = true;
    enemies = []; // Clear current mobs
    enemies.push(new Boss(round));
    floatingTexts.push(
      new FloatingText(
        canvas.width / 2 - 40,
        canvas.height / 2,
        "WARNING: BOSS",
        "#f00",
      ),
    );
  }

  // Enemy Spawning
  if (!inBossFight) {
    const spawnRate = Math.max(15, 60 - Math.floor(score / 50) - round * 5);
    if (frame % spawnRate === 0) {
      const type = Math.random();
      if (type < 0.3 && round > 1) {
        enemies.push(new JetEnemy());
      } else if (type < 0.5 && round > 2) {
        enemies.push(new HelicopterEnemy());
      } else {
        enemies.push(new Enemy());
      }
    }
  }

  bullets.forEach((b) => b.update());
  enemies.forEach((e) => e.update());
  droppedCoins.forEach((c) => c.update());
  droppedPowerUps.forEach((p) => p.update());
  particles.forEach((p) => p.update());
  floatingTexts.forEach((t) => t.update());

  // Collisions
  bullets.forEach((bullet) => {
    if (!bullet.isEnemyBullet) {
      enemies.forEach((enemy) => {
        if (
          !bullet.markedForDeletion &&
          !enemy.markedForDeletion &&
          checkCollision(bullet, enemy)
        ) {
          bullet.markedForDeletion = true;
          enemy.takeDamage(bullet.damage);
          if (!(enemy instanceof Boss)) {
            spawnExplosion(bullet.x, bullet.y, "#ff0");
          }
        }
      });
    } else {
      // Check enemy bullet against player
      if (!bullet.markedForDeletion && checkCollision(bullet, player)) {
        playSound("player_death");
        bullet.markedForDeletion = true;
        spawnExplosion(
          player.x + player.w / 2,
          player.y + player.h / 2,
          player.color,
        );
        isGameOver = true;
        gameOverPanel.classList.remove("hidden");
      }
    }
  });

  enemies.forEach((enemy) => {
    if (!enemy.markedForDeletion && checkCollision(player, enemy)) {
      // Player hit!
      playSound("player_death");
      spawnExplosion(
        player.x + player.w / 2,
        player.y + player.h / 2,
        player.color,
      );
      isGameOver = true;
      gameOverPanel.classList.remove("hidden");
    }
  });

  droppedCoins.forEach((coin) => {
    if (!coin.markedForDeletion && checkCollision(player, coin)) {
      playSound("coin");
      coin.markedForDeletion = true;
      score += 5; // Coins just give score now
      updateUI();
    }
  });

  droppedPowerUps.forEach((pu) => {
    if (!pu.markedForDeletion && checkCollision(player, pu)) {
      playSound("powerup");
      pu.markedForDeletion = true;
      UPGRADES[pu.type].level++;
      floatingTexts.push(
        new FloatingText(
          pu.x,
          pu.y,
          pu.type.substring(0, 4).toUpperCase() + " UP",
          "#ff0",
        ),
      );
      updateUI();
    }
  });

  // Cleanup
  bullets = bullets.filter((b) => !b.markedForDeletion);
  enemies = enemies.filter((e) => !e.markedForDeletion);
  droppedCoins = droppedCoins.filter((c) => !c.markedForDeletion);
  droppedPowerUps = droppedPowerUps.filter((p) => !p.markedForDeletion);
  particles = particles.filter((p) => !p.markedForDeletion);
  floatingTexts = floatingTexts.filter((t) => !t.markedForDeletion);
}

function draw() {
  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw simple stars in background based on frame
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 20; i++) {
    let sy = (frame * (1 + i * 0.1) + i * 100) % canvas.height;
    let sx = (i * 123) % canvas.width;
    let r = 0.5 + (i % 3) * 0.5;
    ctx.globalAlpha = 0.2 + (i % 5) * 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  if (!isGameOver) {
    player.draw();
  }

  bullets.forEach((b) => b.draw());
  enemies.forEach((e) => e.draw());
  droppedCoins.forEach((c) => c.draw());
  droppedPowerUps.forEach((p) => p.draw());
  particles.forEach((p) => p.draw());
  floatingTexts.forEach((t) => t.draw());
}

function gameLoop() {
  update();
  draw();
  if (!isGameOver) {
    requestAnimationFrame(gameLoop);
  }
}

// Start
initGame();
