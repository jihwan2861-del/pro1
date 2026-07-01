export interface GameStats {
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  damageTaken: number;
  dashCount: number;
  timeElapsed: number; // in seconds
  enemiesKilled: number;
  rangedHits: number;
  chargerHits: number;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  reason: string;
  iconName: string;
  aiType: "PATCH" | "GLITCH";
  dialogue: string;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  dashCooldown: number;
  dashDuration: number;
  dashTimer: number; // counting down if dashing
  dashCooldownTimer: number; // counting down to 0
  isDashing: boolean;
  angle: number;
  shieldActive: boolean;
  shieldCooldownTimer: number; // recharge cooldown
}

export type EnemyType = "walker" | "charger" | "shooter" | "scout" | "boss" | "gatekeeper";

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: EnemyType;
  color: string;
  flashTimer: number; // frames to flash red when hit
  shootTimer: number; // for shooting enemies
  knockbackX: number;
  knockbackY: number;
}

export interface ProjectileState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isEnemy: boolean;
  bounceCount: number;
  scale: number;
  color: string;
  homing?: boolean;
}

export interface ParticleState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  text: string;
  type: "info" | "patch" | "warning" | "alert" | "success";
}
