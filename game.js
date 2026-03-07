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

// Input
const keys = {};
let isTouching = false;
let touchX = 0;
let touchY = 0;

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

function updateUI() {
  scoreEl.innerText = `Score: ${score} | Round: ${round}`;
  upgSpeedLvl.innerText = UPGRADES.speed.level;
  upgFireLvl.innerText = UPGRADES.fireRate.level;
  upgDmgLvl.innerText = UPGRADES.damage.level;
}

// Classes
class Player {
  constructor() {
    this.w = 18;
    this.h = 20;
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
    this.w = 18 * scale;
    this.h = 20 * scale;

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
    const w = this.w;
    const h = this.h;

    ctx.save();
    ctx.translate(cx, cy);

    // Flame
    ctx.fillStyle = Math.random() > 0.5 ? "#ff4500" : "#ff8c00";
    ctx.beginPath();
    ctx.moveTo(-w / 6, h / 2 - h / 8);
    ctx.lineTo(0, h / 2 + Math.random() * (h / 2));
    ctx.lineTo(w / 6, h / 2 - h / 8);
    ctx.fill();

    // Wings
    ctx.fillStyle = "#2a0845";
    ctx.beginPath();
    ctx.moveTo(0, -h / 6);
    ctx.lineTo(-w / 2, h / 3);
    ctx.lineTo(-w / 3, h / 2);
    ctx.lineTo(0, h / 4);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo(w / 2, h / 3);
    ctx.fill();

    // Main Body
    const grad = ctx.createLinearGradient(-w / 4, -h / 2, w / 4, h / 2);
    grad.addColorStop(0, "#f5f7fa");
    grad.addColorStop(1, "#c3cfe2");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.quadraticCurveTo(w / 3, 0, w / 3, h / 2.5);
    ctx.lineTo(-w / 3, h / 2.5);
    ctx.quadraticCurveTo(-w / 3, 0, 0, -h / 2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#00FFFF";
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 6, h / 5, 0, 0, Math.PI * 2);
    ctx.fill();

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
    this.w = 14;
    this.h = 14;
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
    const w = this.w;
    const h = this.h;

    ctx.save();
    ctx.translate(cx, cy);

    // Alien glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff00ff";

    // Engine
    ctx.fillStyle = Math.random() > 0.5 ? "#FF4500" : "#8B0000";
    ctx.beginPath();
    ctx.moveTo(-w / 6, -h / 2);
    ctx.lineTo(0, -h / 2 - Math.random() * (h / 2));
    ctx.lineTo(w / 6, -h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, "#8B008B");
    grad.addColorStop(1, "#FF00FF");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, h / 2); // Nose pointing down
    ctx.lineTo(w / 2, 0); // Right point
    ctx.lineTo(w / 3, -h / 2); // Right top
    ctx.lineTo(-w / 3, -h / 2); // Left top
    ctx.lineTo(-w / 2, 0); // Left point
    ctx.closePath();
    ctx.fill();

    // Core
    ctx.fillStyle = "#32CD32";
    ctx.beginPath();
    ctx.arc(0, 0, w / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) {
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
    }
  }
}

class JetEnemy extends Enemy {
  constructor() {
    super();
    this.w = 20;
    this.h = 24;
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
    const w = this.w;
    const h = this.h;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 5;
    ctx.shadowColor = "#FF4500";

    // Thruster
    ctx.fillStyle = Math.random() > 0.5 ? "#FFD700" : "#FF8C00";
    ctx.beginPath();
    ctx.moveTo(-w / 6, -h / 2);
    ctx.lineTo(0, -h / 2 - (Math.random() * h) / 2);
    ctx.lineTo(w / 6, -h / 2);
    ctx.fill();

    // Jet Body
    ctx.fillStyle = "#8B0000"; // Dark red jet
    ctx.beginPath();
    ctx.moveTo(0, h / 2); // Nose pointing down
    ctx.lineTo(w / 6, h / 4);
    ctx.lineTo(w / 2, -h / 6); // Wing tip right
    ctx.lineTo(w / 4, -h / 4);
    ctx.lineTo(w / 6, -h / 2); // Right exhaust
    ctx.lineTo(-w / 6, -h / 2); // Left exhaust
    ctx.lineTo(-w / 4, -h / 4);
    ctx.lineTo(-w / 2, -h / 6); // Wing tip left
    ctx.lineTo(-w / 6, h / 4);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#00BFFF";
    ctx.beginPath();
    ctx.ellipse(0, h / 6, w / 6, h / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class HelicopterEnemy extends Enemy {
  constructor() {
    super();
    this.w = 28;
    this.h = 28;
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
    const w = this.w;
    const h = this.h;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 8;
    ctx.shadowColor = "#556B2F";

    // Tail boom
    ctx.fillStyle = "#556B2F"; // Dark Olive Green
    ctx.fillRect(-w / 8, -h / 2, w / 4, h / 2);

    // Main hull
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, h / 6, w / 3, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit glass
    ctx.fillStyle = "#00FFFF";
    ctx.beginPath();
    ctx.ellipse(0, h / 3, w / 5, h / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotor blades
    ctx.save();
    ctx.translate(0, 0); // Center of rotor
    ctx.rotate(this.rot);
    ctx.fillStyle = "rgba(200, 200, 200, 0.7)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 1.2, h / 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111"; // Rotor hub
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    // Boss Core
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f00";
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f00";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Eye
    ctx.fillStyle = "#f00";
    ctx.beginPath();
    ctx.arc(0, 0, this.w / 6, 0, Math.PI * 2);
    ctx.fill();

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
      coin.markedForDeletion = true;
      score += 5; // Coins just give score now
      updateUI();
    }
  });

  droppedPowerUps.forEach((pu) => {
    if (!pu.markedForDeletion && checkCollision(player, pu)) {
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
