import React, { useRef, useEffect, useState } from "react";
import { 
  GameStats, Rule, PlayerState, EnemyState, EnemyType, 
  ProjectileState, ParticleState, LogMessage 
} from "../types";
import { 
  playShoot, playHit, playPlayerHit, playDash, 
  playShieldBreak, playEnemyShoot 
} from "./SoundEffects";
import { Shield, Zap, Target, Flame, Eye, Volume2, VolumeX, EyeOff, Sparkles } from "lucide-react";

interface GameCanvasProps {
  activeRules: Rule[];
  onRoundCleared: (stats: GameStats) => void;
  onPlayerDied: (stats: GameStats) => void;
  round: number;
  playerMaxHp: number;
  isPlaying: boolean;
  soundEnabled: boolean;
}

export default function GameCanvas({
  activeRules,
  onRoundCleared,
  onPlayerDied,
  round,
  playerMaxHp,
  isPlaying,
  soundEnabled,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Mouse states
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseDown = useRef(false);

  // Game Engine Entities (using Refs to avoid react re-render bottlenecks on fast game loop)
  const player = useRef<PlayerState>({
    x: 500,
    y: 350,
    vx: 0,
    vy: 0,
    radius: 18,
    hp: playerMaxHp,
    maxHp: playerMaxHp,
    speed: 4.5,
    dashCooldown: 60, // frames
    dashDuration: 12, // frames
    dashTimer: 0,
    dashCooldownTimer: 0,
    isDashing: false,
    angle: 0,
    shieldActive: false,
    shieldCooldownTimer: 0,
  });

  const enemies = useRef<EnemyState[]>([]);
  const projectiles = useRef<ProjectileState[]>([]);
  const particles = useRef<ParticleState[]>([]);
  
  // Game state controls
  const roundActive = useRef(false);
  const roundTime = useRef(0);
  const enemiesKilledInRound = useRef(0);
  const totalEnemiesToSpawn = useRef(0);
  const enemiesSpawnedCount = useRef(0);
  const spawnTimer = useRef(0);
  const isRoundClearTriggered = useRef(false);

  // Stats trackers
  const statsShotsFired = useRef(0);
  const statsShotsHit = useRef(0);
  const statsDamageDealt = useRef(0);
  const statsDamageTaken = useRef(0);
  const statsDashCount = useRef(0);

  // HUD visual feedback state (React mirroring for instant overlay feedback)
  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [dashCdRatio, setDashCdRatio] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [enemyCountRemaining, setEnemyCountRemaining] = useState(0);

  // Logical design width/height (Scaled to match viewport/container dynamically)
  const logicalWidth = 1000;
  const logicalHeight = 650;

  // Burst fire shooter timing helper
  const burstTimer = useRef(0);
  const burstShotsLeft = useRef(0);
  const lastShotTime = useRef(0);

  // Reset/Initialize Player for a Round or Game
  const initPlayer = () => {
    player.current.maxHp = playerMaxHp;
    player.current.hp = Math.min(player.current.hp, playerMaxHp);
    if (player.current.hp <= 0) {
      player.current.hp = playerMaxHp;
    }
    
    // Check if player shield rule is active
    const hasShieldRule = activeRules.some(r => r.id === "SHIELDED_PLAYER");
    player.current.shieldActive = hasShieldRule;
    player.current.shieldCooldownTimer = 0;

    // Reset location
    player.current.x = logicalWidth / 2;
    player.current.y = logicalHeight / 2;
    player.current.vx = 0;
    player.current.vy = 0;
    player.current.dashTimer = 0;
    player.current.dashCooldownTimer = 0;
    player.current.isDashing = false;

    // React state update
    setPlayerHp(player.current.hp);
    setShieldActive(player.current.shieldActive);
  };

  // Determine Wave Enemies Count
  const getWaveConfig = (r: number) => {
    let baseCount = 4 + r * 2;
    // Rule: Double Enemy Wave Spawn
    if (activeRules.some(rule => rule.id === "DOUBLE_ENEMY")) {
      baseCount *= 2;
    }
    return baseCount;
  };

  // Handle Level spawning
  const spawnEnemy = () => {
    // Determine enemy specifications based on current round and rules
    const hasHpUpRule = activeRules.some(rule => rule.id === "ENEMY_HP_UP");
    const hasSpeedUpRule = activeRules.some(rule => rule.id === "ENEMY_SPEED_UP");
    const hasShooters = activeRules.some(rule => rule.id === "FAST_SHOOTING_ENEMIES");

    let hpMultiplier = hasHpUpRule ? 1.5 : 1.0;
    let speedMultiplier = hasSpeedUpRule ? 1.25 : 1.0;

    // Types of enemies: "walker" | "charger" | "shooter" | "scout"
    // Walker: base follower, standard hp
    // Charger: fast but low hp, rushes
    // Shooter: stands back and shoots slow energy ball
    // Scout: tiny, moves erratically, low damage

    let type: EnemyType = "walker";
    let hp = 15 + round * 4;
    let speed = 1.6 + Math.min(round * 0.15, 1.2);
    let damage = 1;
    let radius = 16;
    let color = "#00ff66"; // Neon Green walker

    const rand = Math.random();
    if (hasShooters && rand < 0.35) {
      type = "shooter";
      hp = 12 + round * 3;
      speed = 1.2 + Math.min(round * 0.1, 0.8);
      radius = 18;
      color = "#00ccff"; // Neon Blue shooter
    } else if (rand > 0.75) {
      type = "charger";
      hp = 10 + round * 2;
      speed = 2.6 + Math.min(round * 0.2, 1.5);
      radius = 14;
      color = "#ff3366"; // Neon Pink/Red charger
    } else if (rand > 0.6) {
      type = "scout";
      hp = 8 + round * 1;
      speed = 2.2 + Math.min(round * 0.25, 1.4);
      radius = 12;
      color = "#ffcc00"; // Neon Yellow scout
    }

    // Spawn at screen edges
    let x = 0;
    let y = 0;
    if (Math.random() > 0.5) {
      x = Math.random() > 0.5 ? -40 : logicalWidth + 40;
      y = Math.random() * logicalHeight;
    } else {
      x = Math.random() * logicalWidth;
      y = Math.random() > 0.5 ? -40 : logicalHeight + 40;
    }

    const newEnemy: EnemyState = {
      id: Math.random().toString(),
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp: Math.round(hp * hpMultiplier),
      maxHp: Math.round(hp * hpMultiplier),
      speed: speed * speedMultiplier,
      damage,
      type,
      color,
      flashTimer: 0,
      shootTimer: Math.random() * 120 + 60, // random start offset for shooters
      knockbackX: 0,
      knockbackY: 0,
    };

    enemies.current.push(newEnemy);
    enemiesSpawnedCount.current++;
    setEnemyCountRemaining(enemies.current.length + (totalEnemiesToSpawn.current - enemiesSpawnedCount.current));
  };

  // Trigger round initialization
  const startRound = () => {
    isRoundClearTriggered.current = false;
    enemies.current = [];
    projectiles.current = [];
    particles.current = [];
    
    roundTime.current = 0;
    enemiesKilledInRound.current = 0;
    enemiesSpawnedCount.current = 0;
    totalEnemiesToSpawn.current = getWaveConfig(round);
    spawnTimer.current = 0;

    statsShotsFired.current = 0;
    statsShotsHit.current = 0;
    statsDamageDealt.current = 0;
    statsDamageTaken.current = 0;
    statsDashCount.current = 0;

    initPlayer();

    roundActive.current = true;
    setEnemyCountRemaining(totalEnemiesToSpawn.current);
  };

  // Handle Bullet creation from Player
  const fireBullet = () => {
    if (!isPlaying || !roundActive.current || player.current.hp <= 0) return;

    // Check custom projectile speeds
    const hasFastProjectiles = activeRules.some(rule => rule.id === "PROJECTILE_SPEED_UP");
    const hasSpread = activeRules.some(rule => rule.id === "BULLET_SPREAD");
    const hasBouncing = activeRules.some(rule => rule.id === "BOUNCING_BULLETS");

    let baseSpeed = 8.5;
    if (hasFastProjectiles) baseSpeed *= 1.3;

    // Angle towards mouse
    const dx = mousePos.current.x - player.current.x;
    const dy = mousePos.current.y - player.current.y;
    let angle = Math.atan2(dy, dx);

    // Apply random dispersion angle if spread rule is active
    if (hasSpread) {
      angle += (Math.random() - 0.5) * 0.35; // ~20 deg spread
    }

    const vx = Math.cos(angle) * baseSpeed;
    const vy = Math.sin(angle) * baseSpeed;

    const newBullet: ProjectileState = {
      id: Math.random().toString(),
      x: player.current.x + Math.cos(angle) * player.current.radius,
      y: player.current.y + Math.sin(angle) * player.current.radius,
      vx,
      vy,
      radius: 5,
      damage: 5,
      isEnemy: false,
      bounceCount: hasBouncing ? 1 : 0,
      scale: 1.0,
      color: "#00ff66", // bright green player laser tracer
    };

    projectiles.current.push(newBullet);
    statsShotsFired.current++;

    if (soundEnabled) playShoot();

    // Create small shooting muzzle flash particles
    for (let i = 0; i < 3; i++) {
      createParticle(
        newBullet.x,
        newBullet.y,
        (Math.cos(angle) * 3) + (Math.random() - 0.5) * 2,
        (Math.sin(angle) * 3) + (Math.random() - 0.5) * 2,
        3,
        "#00ff66",
        0.8,
        15
      );
    }
  };

  // Helper to create juice particles
  const createParticle = (
    x: number, y: number, 
    vx: number, vy: number, 
    radius: number, color: string, 
    alpha: number, life: number
  ) => {
    particles.current.push({
      id: Math.random().toString(),
      x, y, vx, vy, radius, color, alpha, life, maxLife: life
    });
  };

  // Spark burst for hits
  const createExplosion = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      createParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 3 + 1.5,
        color,
        1.0,
        Math.random() * 20 + 15
      );
    }
  };

  // Floating text indicators on canvas
  const floatingTexts = useRef<{ x: number, y: number, text: string, color: string, alpha: number, vx: number, vy: number }[]>([]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTexts.current.push({
      x, y, text, color, alpha: 1.0, vx: (Math.random() - 0.5) * 1.5, vy: -1.5 - Math.random() * 1.5
    });
  };

  // Handles DASH execution
  const executeDash = () => {
    const hasNoDashRule = activeRules.some(rule => rule.id === "NO_DASH");
    if (hasNoDashRule) return; // Locked!

    if (player.current.dashCooldownTimer <= 0 && !player.current.isDashing) {
      player.current.isDashing = true;
      player.current.dashTimer = player.current.dashDuration;
      player.current.dashCooldownTimer = player.current.dashCooldown;
      statsDashCount.current++;
      if (soundEnabled) playDash();

      // Spawn neat trailing particle ring
      createExplosion(player.current.x, player.current.y, "#00ff66", 12);
    }
  };

  // Main Canvas Setup, keyboard listeners, resize handlers and high rate loop
  useEffect(() => {
    // Add Event Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      if (e.key === " " || key === "shift") {
        executeDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      // Translate raw client mouse coordinates back to the logical coordinate space!
      const scaleX = logicalWidth / rect.width;
      const scaleY = logicalHeight / rect.height;
      mousePos.current.x = (e.clientX - rect.left) * scaleX;
      mousePos.current.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = () => {
      isMouseDown.current = true;
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    startRound();

    // Canvas rendering loop
    let animFrameId: number;
    
    const updateGame = () => {
      if (!isPlaying) return;

      const hasShieldRule = activeRules.some(r => r.id === "SHIELDED_PLAYER");
      const hasRegenerativeEnemies = activeRules.some(r => r.id === "REGENERATIVE_ENEMIES");

      // 1. Spawning system logic
      if (roundActive.current) {
        roundTime.current += 1 / 60;

        if (enemiesSpawnedCount.current < totalEnemiesToSpawn.current) {
          spawnTimer.current++;
          // Spawn rate increases slightly with round count
          const spawnDelay = Math.max(90 - round * 6, 40);
          if (spawnTimer.current >= spawnDelay) {
            spawnEnemy();
            spawnTimer.current = 0;
          }
        }

        // Check level clear
        if (
          enemiesSpawnedCount.current >= totalEnemiesToSpawn.current &&
          enemies.current.length === 0 &&
          !isRoundClearTriggered.current
        ) {
          isRoundClearTriggered.current = true;
          roundActive.current = false;

          // Provide small visual victory flare
          createExplosion(player.current.x, player.current.y, "#00ff66", 25);
          
          setTimeout(() => {
            const calculatedStats: GameStats = {
              shotsFired: statsShotsFired.current,
              shotsHit: statsShotsHit.current,
              damageDealt: statsDamageDealt.current,
              damageTaken: statsDamageTaken.current,
              dashCount: statsDashCount.current,
              timeElapsed: roundTime.current,
              enemiesKilled: enemiesKilledInRound.current,
            };
            onRoundCleared(calculatedStats);
          }, 1500);
        }
      }

      // 2. Player shield system cooldown
      if (hasShieldRule && !player.current.shieldActive && player.current.hp > 0) {
        player.current.shieldCooldownTimer--;
        if (player.current.shieldCooldownTimer <= 0) {
          player.current.shieldActive = true;
          setShieldActive(true);
          createExplosion(player.current.x, player.current.y, "#00ccff", 8);
        }
      }

      // 3. Movement input resolution for Player
      let moveX = 0;
      let moveY = 0;
      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) moveY -= 1;
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) moveY += 1;
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) moveX -= 1;
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) moveX += 1;

      // Diagonal normalisation
      let length = Math.sqrt(moveX * moveX + moveY * moveY);
      if (length > 0) {
        moveX /= length;
        moveY /= length;
      }

      // Player Speed evaluation (Dash speed or standard speed)
      const hasPlayerSpeedUp = activeRules.some(r => r.id === "PLAYER_SPEED_UP");
      let baseSpeed = player.current.speed;
      if (hasPlayerSpeedUp) baseSpeed *= 1.25;

      if (player.current.isDashing) {
        player.current.dashTimer--;
        // Multiply speed by 3x during dash burst
        player.current.vx = (moveX === 0 && moveY === 0 ? Math.cos(player.current.angle) : moveX) * (baseSpeed * 2.8);
        player.current.vy = (moveX === 0 && moveY === 0 ? Math.sin(player.current.angle) : moveY) * (baseSpeed * 2.8);

        // Generate visual trailing ghost circles during dashes
        if (player.current.dashTimer % 2 === 0) {
          createParticle(player.current.x, player.current.y, 0, 0, player.current.radius, "rgba(0, 255, 102, 0.45)", 0.6, 12);
        }

        if (player.current.dashTimer <= 0) {
          player.current.isDashing = false;
        }
      } else {
        // Standard kinetic drag decay
        player.current.vx = moveX * baseSpeed;
        player.current.vy = moveY * baseSpeed;
      }

      // Apply movement positions
      player.current.x += player.current.vx;
      player.current.y += player.current.vy;

      // Keep player inside boundary arena walls (radius margin)
      const margin = 20;
      player.current.x = Math.max(margin + player.current.radius, Math.min(logicalWidth - margin - player.current.radius, player.current.x));
      player.current.y = Math.max(margin + player.current.radius, Math.min(logicalHeight - margin - player.current.radius, player.current.y));

      // Calculate aiming face angle
      const dx = mousePos.current.x - player.current.x;
      const dy = mousePos.current.y - player.current.y;
      player.current.angle = Math.atan2(dy, dx);

      // Dash Cooldown frame counting
      if (player.current.dashCooldownTimer > 0) {
        player.current.dashCooldownTimer--;
        setDashCdRatio(player.current.dashCooldownTimer / player.current.dashCooldown);
      } else {
        setDashCdRatio(0);
      }

      // 4. Shoots trigger logic with optional Burst fire rule
      const hasBurstFire = activeRules.some(r => r.id === "BURST_FIRE");
      const currentTime = Date.now();
      const firingInterval = 250; // ms standard ref cooldown

      if (isMouseDown.current) {
        if (hasBurstFire) {
          // Burst fire state handling
          if (currentTime - lastShotTime.current >= 500 && burstShotsLeft.current === 0) {
            burstShotsLeft.current = 3;
            burstTimer.current = 0;
            lastShotTime.current = currentTime;
          }
        } else {
          // Standard rate shooting
          if (currentTime - lastShotTime.current >= firingInterval) {
            fireBullet();
            lastShotTime.current = currentTime;
          }
        }
      }

      // Burst bullet sequencing trigger
      if (hasBurstFire && burstShotsLeft.current > 0) {
        burstTimer.current++;
        if (burstTimer.current >= 6) { // 6 frames delay between burst bullets (~100ms)
          fireBullet();
          burstShotsLeft.current--;
          burstTimer.current = 0;
        }
      }

      // 5. Enemies update loop
      const activeEnemies = enemies.current;
      for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const enemy = activeEnemies[i];

        // Enemy flashing tick
        if (enemy.flashTimer > 0) {
          enemy.flashTimer--;
        }

        // Regenerative enemies passive heal
        if (hasRegenerativeEnemies && roundTime.current % 1 < 0.016 && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + 1);
        }

        // AI tracking pathfinding
        const edx = player.current.x - enemy.x;
        const edy = player.current.y - enemy.y;
        const dist = Math.sqrt(edx * edx + edy * edy);

        let trackingVx = 0;
        let trackingVy = 0;

        if (dist > 0) {
          // Stand back slightly if shooter enemy
          if (enemy.type === "shooter" && dist < 240) {
            // Shooters try to retreat slightly or circle around the player
            trackingVx = (-edx / dist) * enemy.speed * 0.6;
            trackingVy = (-edy / dist) * enemy.speed * 0.6;
          } else {
            trackingVx = (edx / dist) * enemy.speed;
            trackingVy = (edy / dist) * enemy.speed;
          }
        }

        // Apply knockback decay smoothly
        enemy.knockbackX *= 0.85;
        enemy.knockbackY *= 0.85;

        // Apply totals
        enemy.vx = trackingVx + enemy.knockbackX;
        enemy.vy = trackingVy + enemy.knockbackY;

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Wall limits bounds for enemies
        enemy.x = Math.max(margin + enemy.radius, Math.min(logicalWidth - margin - enemy.radius, enemy.x));
        enemy.y = Math.max(margin + enemy.radius, Math.min(logicalHeight - margin - enemy.radius, enemy.y));

        // Shooters fire orbs logic
        if (enemy.type === "shooter" && player.current.hp > 0) {
          enemy.shootTimer--;
          if (enemy.shootTimer <= 0) {
            enemy.shootTimer = 110 + Math.random() * 50; // reset
            // Shoot slow projectile
            const sAngle = Math.atan2(edy, edx);
            const bulletSpeed = 2.8;
            projectiles.current.push({
              id: Math.random().toString(),
              x: enemy.x + Math.cos(sAngle) * enemy.radius,
              y: enemy.y + Math.sin(sAngle) * enemy.radius,
              vx: Math.cos(sAngle) * bulletSpeed,
              vy: Math.sin(sAngle) * bulletSpeed,
              radius: 6.5,
              damage: 1,
              isEnemy: true,
              bounceCount: 0,
              scale: 1.0,
              color: "#00ccff", // cyan blue glowing enemy tracking ball
            });
            if (soundEnabled) playEnemyShoot();

            // Muzzle flash for enemy
            for (let k = 0; k < 2; k++) {
              createParticle(enemy.x, enemy.y, Math.cos(sAngle)*2 + (Math.random()-0.5), Math.sin(sAngle)*2 + (Math.random()-0.5), 2.5, "#00ccff", 0.8, 12);
            }
          }
        }

        // Vector pushing so enemies do not stack perfectly on top of each other
        for (let j = i - 1; j >= 0; j--) {
          const other = activeEnemies[j];
          const odx = other.x - enemy.x;
          const ody = other.y - enemy.y;
          const odist = Math.sqrt(odx * odx + ody * ody);
          const minDist = enemy.radius + other.radius;
          if (odist < minDist && odist > 0) {
            const overlap = minDist - odist;
            const pushX = (odx / odist) * overlap * 0.25;
            const pushY = (ody / odist) * overlap * 0.25;
            other.x += pushX;
            other.y += pushY;
            enemy.x -= pushX;
            enemy.y -= pushY;
          }
        }

        // Contact damage trigger (Player vs Enemy)
        const pDist = Math.sqrt((enemy.x - player.current.x) ** 2 + (enemy.y - player.current.y) ** 2);
        if (pDist < enemy.radius + player.current.radius && player.current.hp > 0) {
          // If player is actively dashing, they gain frame invincibility!
          if (!player.current.isDashing) {
            let dmg = enemy.damage;

            // Resolve contact knockback
            const pushAngle = Math.atan2(player.current.y - enemy.y, player.current.x - enemy.x);
            
            if (player.current.shieldActive) {
              // Shield absorbs the complete hit!
              player.current.shieldActive = false;
              setShieldActive(false);
              player.current.shieldCooldownTimer = 480; // 8 seconds recharge at 60 FPS
              if (soundEnabled) playShieldBreak();
              
              addFloatingText(player.current.x, player.current.y - 15, "SHIELD BLOCK", "#00ccff");
              createExplosion(player.current.x, player.current.y, "#00ccff", 15);
            } else {
              // Deduct health
              player.current.hp = Math.max(0, player.current.hp - dmg);
              setPlayerHp(player.current.hp);
              statsDamageTaken.current += dmg;
              if (soundEnabled) playPlayerHit();

              addFloatingText(player.current.x, player.current.y - 15, `-${dmg} HP`, "#ff3366");
              createExplosion(player.current.x, player.current.y, "#ff3366", 12);

              // Push back slightly
              player.current.x += Math.cos(pushAngle) * 20;
              player.current.y += Math.sin(pushAngle) * 20;
            }

            // Push enemy back too
            enemy.knockbackX = -Math.cos(pushAngle) * 6;
            enemy.knockbackY = -Math.sin(pushAngle) * 6;

            // Player Game Over Check
            if (player.current.hp <= 0) {
              roundActive.current = false;
              createExplosion(player.current.x, player.current.y, "#ff3366", 40);
              
              setTimeout(() => {
                const finalStats: GameStats = {
                  shotsFired: statsShotsFired.current,
                  shotsHit: statsShotsHit.current,
                  damageDealt: statsDamageDealt.current,
                  damageTaken: statsDamageTaken.current,
                  dashCount: statsDashCount.current,
                  timeElapsed: roundTime.current,
                  enemiesKilled: enemiesKilledInRound.current,
                };
                onPlayerDied(finalStats);
              }, 1200);
            }
          }
        }
      }

      // 6. Projectiles and lasers physics loop
      const activeProjectiles = projectiles.current;
      const hasKnockbackUpRule = activeRules.some(r => r.id === "KNOCKBACK_UP");

      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const bullet = activeProjectiles[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Map borders interaction (bouncing or removal)
        const hitWallX = bullet.x < margin || bullet.x > logicalWidth - margin;
        const hitWallY = bullet.y < margin || bullet.y > logicalHeight - margin;

        if (hitWallX || hitWallY) {
          if (bullet.bounceCount > 0) {
            bullet.bounceCount--;
            if (hitWallX) {
              bullet.vx = -bullet.vx;
              bullet.x = bullet.x < margin ? margin + 2 : logicalWidth - margin - 2;
            }
            if (hitWallY) {
              bullet.vy = -bullet.vy;
              bullet.y = bullet.y < margin ? margin + 2 : logicalHeight - margin - 2;
            }
            // Spark splash on bounce
            createExplosion(bullet.x, bullet.y, bullet.color, 4);
          } else {
            // Delete projectile
            activeProjectiles.splice(i, 1);
            continue;
          }
        }

        // Collision logic
        if (bullet.isEnemy) {
          // Enemy projectile vs Player
          const pDist = Math.sqrt((bullet.x - player.current.x) ** 2 + (bullet.y - player.current.y) ** 2);
          if (pDist < bullet.radius + player.current.radius && player.current.hp > 0) {
            activeProjectiles.splice(i, 1); // delete

            if (!player.current.isDashing) {
              if (player.current.shieldActive) {
                player.current.shieldActive = false;
                setShieldActive(false);
                player.current.shieldCooldownTimer = 480;
                if (soundEnabled) playShieldBreak();
                addFloatingText(player.current.x, player.current.y - 15, "SHIELD BLOCK", "#00ccff");
                createExplosion(player.current.x, player.current.y, "#00ccff", 15);
              } else {
                player.current.hp = Math.max(0, player.current.hp - bullet.damage);
                setPlayerHp(player.current.hp);
                statsDamageTaken.current += bullet.damage;
                if (soundEnabled) playPlayerHit();

                addFloatingText(player.current.x, player.current.y - 15, `-${bullet.damage} HP`, "#ff3366");
                createExplosion(player.current.x, player.current.y, "#ff3366", 12);
              }

              if (player.current.hp <= 0) {
                roundActive.current = false;
                createExplosion(player.current.x, player.current.y, "#ff3366", 40);
                setTimeout(() => {
                  onPlayerDied({
                    shotsFired: statsShotsFired.current,
                    shotsHit: statsShotsHit.current,
                    damageDealt: statsDamageDealt.current,
                    damageTaken: statsDamageTaken.current,
                    dashCount: statsDashCount.current,
                    timeElapsed: roundTime.current,
                    enemiesKilled: enemiesKilledInRound.current,
                  });
                }, 1200);
              }
            }
          }
        } else {
          // Player projectile vs Enemies
          let hitMade = false;
          for (let j = activeEnemies.length - 1; j >= 0; j--) {
            const enemy = activeEnemies[j];
            const bDist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
            if (bDist < bullet.radius + enemy.radius) {
              hitMade = true;
              enemy.hp -= bullet.damage;
              enemy.flashTimer = 8; // Flash red for 8 frames
              statsShotsHit.current++;
              statsDamageDealt.current += bullet.damage;

              addFloatingText(enemy.x, enemy.y - 12, `${bullet.damage}`, "#00ff66");

              // Sound feedback
              if (soundEnabled) playHit();

              // Kinetic push knockback
              let pushAmount = hasKnockbackUpRule ? 9 : 4.5;
              const angle = Math.atan2(enemy.y - bullet.y, enemy.x - bullet.x);
              enemy.knockbackX += Math.cos(angle) * pushAmount;
              enemy.knockbackY += Math.sin(angle) * pushAmount;

              // Hit particles
              createExplosion(bullet.x, bullet.y, "#00ff66", 6);

              // Kill reward checking
              if (enemy.hp <= 0) {
                createExplosion(enemy.x, enemy.y, enemy.color, 16);
                activeEnemies.splice(j, 1);
                enemiesKilledInRound.current++;
                setEnemyCountRemaining(enemies.current.length + (totalEnemiesToSpawn.current - enemiesSpawnedCount.current));
              }

              break;
            }
          }

          if (hitMade) {
            activeProjectiles.splice(i, 1);
          }
        }
      }

      // 7. Tick particle frames
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // Tick floating text frames
      for (let i = floatingTexts.current.length - 1; i >= 0; i--) {
        const t = floatingTexts.current[i];
        t.x += t.vx;
        t.y += t.vy;
        t.alpha -= 0.02;
        if (t.alpha <= 0) {
          floatingTexts.current.splice(i, 1);
        }
      }

      // 8. Visual canvas drawing logic
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        // Clear screen with custom charcoal dark tone
        ctx.fillStyle = "#0a0e14";
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);

        // Draw ambient glowing grid lines (Cyberpunk scan arena)
        ctx.strokeStyle = "rgba(0, 255, 102, 0.04)";
        ctx.lineWidth = 1;
        const gridGap = 40;
        for (let x = margin; x < logicalWidth - margin; x += gridGap) {
          ctx.beginPath();
          ctx.moveTo(x, margin);
          ctx.lineTo(x, logicalHeight - margin);
          ctx.stroke();
        }
        for (let y = margin; y < logicalHeight - margin; y += gridGap) {
          ctx.beginPath();
          ctx.moveTo(margin, y);
          ctx.lineTo(logicalWidth - margin, y);
          ctx.stroke();
        }

        // Draw boundaries arena border
        ctx.strokeStyle = "rgba(30, 41, 59, 1)";
        ctx.lineWidth = 4;
        ctx.strokeRect(margin, margin, logicalWidth - margin * 2, logicalHeight - margin * 2);

        // Draw secondary glowing aesthetic lines around corners
        ctx.strokeStyle = "rgba(0, 255, 102, 0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(margin - 4, margin - 4, logicalWidth - margin * 2 + 8, logicalHeight - margin * 2 + 8);

        // Laser Sight rule visualization
        const hasLaserSight = activeRules.some(r => r.id === "LASER_SIGHT");
        if (hasLaserSight && player.current.hp > 0) {
          ctx.strokeStyle = "rgba(255, 51, 102, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(player.current.x, player.current.y);
          ctx.lineTo(mousePos.current.x, mousePos.current.y);
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // Draw small reticle laser bead
          ctx.fillStyle = "#ff3366";
          ctx.beginPath();
          ctx.arc(mousePos.current.x, mousePos.current.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Particles
        for (const p of particles.current) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw Projectiles (bullets)
        for (const b of projectiles.current) {
          ctx.save();
          ctx.fillStyle = b.color;
          // Add neon outer blur glow
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw Enemies
        for (const enemy of enemies.current) {
          ctx.save();
          
          // Flash white/red if hit recently
          if (enemy.flashTimer > 0) {
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#ff3366";
            ctx.shadowColor = "#ffffff";
          } else {
            ctx.fillStyle = enemy.color;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
            ctx.shadowColor = enemy.color;
          }

          ctx.shadowBlur = 4;
          
          // Draw geometric robotic insect shape instead of simple circles to represent SD enemies
          ctx.beginPath();
          if (enemy.type === "charger") {
            // Triangular speedy bot
            const frontX = enemy.x + Math.cos(Math.atan2(enemy.vy, enemy.vx)) * enemy.radius * 1.3;
            const frontY = enemy.y + Math.sin(Math.atan2(enemy.vy, enemy.vx)) * enemy.radius * 1.3;
            const leftX = enemy.x + Math.cos(Math.atan2(enemy.vy, enemy.vx) + Math.PI * 0.8) * enemy.radius;
            const leftY = enemy.y + Math.sin(Math.atan2(enemy.vy, enemy.vx) + Math.PI * 0.8) * enemy.radius;
            const rightX = enemy.x + Math.cos(Math.atan2(enemy.vy, enemy.vx) - Math.PI * 0.8) * enemy.radius;
            const rightY = enemy.y + Math.sin(Math.atan2(enemy.vy, enemy.vx) - Math.PI * 0.8) * enemy.radius;
            ctx.moveTo(frontX, frontY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (enemy.type === "shooter") {
            // Hexagonal turret-style bot
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw a shooting barrel pointing towards the player
            const sAngle = Math.atan2(player.current.y - enemy.y, player.current.x - enemy.x);
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + Math.cos(sAngle) * (enemy.radius + 6), enemy.y + Math.sin(sAngle) * (enemy.radius + 6));
            ctx.stroke();
          } else if (enemy.type === "scout") {
            // Small diamond drone
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y - enemy.radius);
            ctx.lineTo(enemy.x + enemy.radius, enemy.y);
            ctx.lineTo(enemy.x, enemy.y + enemy.radius);
            ctx.lineTo(enemy.x - enemy.radius, enemy.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Standard walker: multi-ring cyber sphere
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw a tiny rotating core lens inside
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x + Math.cos(roundTime.current * 4) * (enemy.radius * 0.2), enemy.y + Math.sin(roundTime.current * 4) * (enemy.radius * 0.2), 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render health bar floating above the enemy if damaged
          if (enemy.hp < enemy.maxHp) {
            const barW = enemy.radius * 1.8;
            const barH = 3;
            const barY = enemy.y - enemy.radius - 8;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(enemy.x - barW / 2, barY, barW, barH);
            
            ctx.fillStyle = "#ff3366";
            const currentW = barW * (enemy.hp / enemy.maxHp);
            ctx.fillRect(enemy.x - barW / 2, barY, currentW, barH);
          }

          ctx.restore();
        }

        // Draw Player
        if (player.current.hp > 0) {
          ctx.save();
          
          // Outer digital engine shield if player shield is active
          if (player.current.shieldActive) {
            ctx.strokeStyle = "rgba(0, 204, 255, 0.7)";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#00ccff";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(player.current.x, player.current.y, player.current.radius + 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
          }

          // Player base body drawing: Cyber SD Hero
          ctx.fillStyle = "#00ff66"; // Core terminal green
          ctx.strokeStyle = "#0a0e14";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#00ff66";
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          ctx.arc(player.current.x, player.current.y, player.current.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Cute glasses / Cyber goggles face detail facing mouse cursor
          const pAngle = player.current.angle;
          const gDist = player.current.radius * 0.4;
          const gX = player.current.x + Math.cos(pAngle) * gDist;
          const gY = player.current.y + Math.sin(pAngle) * gDist;
          
          // Draw goggles visor bar
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(gX - Math.sin(pAngle) * 8, gY + Math.cos(pAngle) * 8);
          ctx.lineTo(gX + Math.sin(pAngle) * 8, gY - Math.cos(pAngle) * 8);
          ctx.stroke();

          // Small glow visor lens line
          ctx.strokeStyle = "#ff3366"; // red sleek lens glow
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gX - Math.sin(pAngle) * 6, gY + Math.cos(pAngle) * 6);
          ctx.lineTo(gX + Math.sin(pAngle) * 6, gY - Math.cos(pAngle) * 6);
          ctx.stroke();

          // Draw weapon gun barrel point
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(player.current.x, player.current.y);
          ctx.lineTo(player.current.x + Math.cos(pAngle) * (player.current.radius + 8), player.current.y + Math.sin(pAngle) * (player.current.radius + 8));
          ctx.stroke();

          ctx.restore();
        }

        // Draw Floating texts
        for (const t of floatingTexts.current) {
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = t.color;
          ctx.font = "bold 12px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(t.text, t.x, t.y);
          ctx.restore();
        }

        // Rule FOG OF WAR shading: heavy server fog vignette restricts sight
        const hasFogOfWar = activeRules.some(r => r.id === "FOG_OF_WAR");
        if (hasFogOfWar && player.current.hp > 0) {
          // Draw fog vignette by drawing black mask everywhere except a clear circle around the player
          ctx.save();
          
          // Create temporary off-screen buffer or composite masking trick
          // Simply render radial gradient mask over canvas!
          const sightRadius = 140;
          const gradient = ctx.createRadialGradient(
            player.current.x, player.current.y, sightRadius * 0.4,
            player.current.x, player.current.y, sightRadius
          );
          gradient.addColorStop(0, "rgba(10, 14, 20, 0)");
          gradient.addColorStop(1, "rgba(10, 14, 20, 0.98)");

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, logicalWidth, logicalHeight);
          
          ctx.restore();
        }
      }

      animFrameId = requestAnimationFrame(updateGame);
    };

    animFrameId = requestAnimationFrame(updateGame);

    return () => {
      // Cleanup events and canvas loops
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying, activeRules, round, playerMaxHp, soundEnabled]);

  // Restart trigger when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      startRound();
    }
  }, [isPlaying]);

  const hasNoDashRule = activeRules.some(rule => rule.id === "NO_DASH");
  const hasShieldRule = activeRules.some(rule => rule.id === "SHIELDED_PLAYER");

  return (
    <div ref={containerRef} className="w-full relative bg-[#0a0e14] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top HUD overlay Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none select-none">
        {/* Left Stats: Health, Shield */}
        <div className="flex items-center gap-3 bg-[#121820]/90 border border-[#1e293b]/70 px-4 py-2 rounded-lg backdrop-blur-md">
          {/* HP Blocks */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">INTEGRITY MATRIX</span>
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: playerMaxHp }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-4 h-6 rounded-sm border transition-all ${
                    idx < playerHp
                      ? "bg-[#00ff66] border-[#00ff66] shadow-[0_0_6px_rgba(0,255,102,0.4)]"
                      : "bg-[#ff3366]/10 border-[#ff3366]/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Shield status */}
          {hasShieldRule && (
            <div className="flex flex-col items-center pl-3 border-l border-[#1e293b] gap-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">SHIELD</span>
              <div className={`p-1 rounded ${shieldActive ? "text-[#00ccff] bg-[#00ccff]/10 border border-[#00ccff]/30 animate-pulse" : "text-gray-600 bg-[#121820]"}`}>
                <Shield className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Right Stats: Round Progress and Enemies Remaining */}
        <div className="flex items-center gap-4 bg-[#121820]/90 border border-[#1e293b]/70 px-4 py-2 rounded-lg backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase font-mono">OBJECTIVE STATUS</div>
            <div className="text-[#00ff66] font-bold text-sm glow-green font-mono">
              ROUND {round} — PURGE ENEMY.BOTS
            </div>
          </div>
          <div className="h-8 w-px bg-[#1e293b]"></div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase font-mono">REMAINING</div>
            <div className="text-white font-bold text-lg font-mono">
              {enemyCountRemaining}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom overlay: Cool-down visual wheels */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none select-none">
        <div className="flex items-center gap-3 bg-[#121820]/90 border border-[#1e293b]/70 px-4 py-2.5 rounded-lg backdrop-blur-md font-mono">
          <div className="relative flex items-center justify-center">
            {/* Dash icon with overlay cooldown */}
            <div className={`p-2 rounded-lg border flex items-center justify-center ${
              hasNoDashRule 
                ? "bg-[#ff3366]/10 border-[#ff3366]/30 text-[#ff3366]" 
                : dashCdRatio > 0 
                  ? "bg-[#121820] border-[#1e293b] text-gray-600" 
                  : "bg-[#00ff66]/10 border-[#00ff66]/30 text-[#00ff66] animate-pulse"
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            {dashCdRatio > 0 && !hasNoDashRule && (
              <div className="absolute inset-0 bg-[#0a0e14]/70 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#ffcc00]">
                {Math.ceil(dashCdRatio * 100)}%
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">KINETIC DASH (SPACE)</span>
            <span className={`text-xs font-bold ${hasNoDashRule ? "text-[#ff3366]" : dashCdRatio > 0 ? "text-gray-400" : "text-[#00ff66]"}`}>
              {hasNoDashRule ? "SYS_BLOCKED" : dashCdRatio > 0 ? "RECHARGING..." : "READY"}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas view area wrapper with scanline/flicker matching index.css */}
      <div className="flex-1 w-full flex items-center justify-center bg-[#0a0e14] p-2">
        <canvas
          ref={canvasRef}
          width={logicalWidth}
          height={logicalHeight}
          className="w-full h-auto aspect-[1000/650] max-w-full rounded bg-[#0a0e14] block cursor-crosshair selection:bg-transparent"
        />
      </div>
    </div>
  );
}
