import React, { useState, useEffect } from "react";
import { Terminal, Shield, Cpu, Activity, Play, RefreshCw, Volume2, VolumeX, AlertTriangle, ChevronRight, CornerDownRight } from "lucide-react";
import { GameStats, Rule } from "../types";
import { playPatchApplied, playGlitch } from "./SoundEffects";
import { motion } from "motion/react";

interface TerminalOverlayProps {
  stats: GameStats;
  round: number;
  activeRules: Rule[];
  onApplyPatch: (newRule: Rule) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function TerminalOverlay({
  stats,
  round,
  activeRules,
  onApplyPatch,
  soundEnabled,
  onToggleSound,
}: TerminalOverlayProps) {
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatch, setSelectedPatch] = useState<Rule | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [progress, setProgress] = useState(0);

  // Analyze stats and generate the specific patch/rule and reason
  useEffect(() => {
    playGlitch();

    // Determine accuracy text
    const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
    
    // AI decision logic
    let ruleId = "ENEMY_SPEED_UP";
    let ruleName = "Enemy Speed +20%";
    let ruleReason = "Player avoids damage too easily.";
    let ruleDesc = "Enemies move faster to pressure player positions.";
    let icon = "Zap";

    // Check conditions to give a dynamic flavor rule
    const usedDashExcessively = stats.dashCount >= 5 && !activeRules.some(r => r.id === "NO_DASH");
    const flawlessVictory = stats.damageTaken === 0;
    const lowAccuracy = accuracy < 40 && stats.shotsFired > 5;
    const highAccuracy = accuracy >= 80 && stats.shotsFired >= 5;
    const highDamageTaken = stats.damageTaken >= 3;

    // Filter existing rules so we don't apply duplicates of certain unique rules
    const hasNoDash = activeRules.some(r => r.id === "NO_DASH");
    const hasFog = activeRules.some(r => r.id === "FOG_OF_WAR");
    const hasLaser = activeRules.some(r => r.id === "LASER_SIGHT");
    const hasBouncing = activeRules.some(r => r.id === "BOUNCING_BULLETS");
    const hasShield = activeRules.some(r => r.id === "SHIELDED_PLAYER");
    const hasBurst = activeRules.some(r => r.id === "BURST_FIRE");
    const hasShooters = activeRules.some(r => r.id === "FAST_SHOOTING_ENEMIES");

    if (usedDashExcessively) {
      ruleId = "NO_DASH";
      ruleName = "No Dash [RESTRICTED]";
      ruleDesc = "Dashing capabilities are temporarily locked by administrator request.";
      ruleReason = `Player exploited movement dash protocols (${stats.dashCount} activations). Dash disabled.`;
      icon = "ShieldAlert";
    } else if (highDamageTaken && !hasShield && Math.random() > 0.4) {
      ruleId = "SHIELDED_PLAYER";
      ruleName = "Player Shield Protocol";
      ruleDesc = "Player receives a recharging shield that absorbs one incoming attack.";
      ruleReason = "Player structural durability is critically low. Deployed defensive shield to maintain play duration.";
      icon = "Shield";
    } else if (flawlessVictory && !hasShooters && round >= 2 && Math.random() > 0.3) {
      ruleId = "FAST_SHOOTING_ENEMIES";
      ruleName = "Enemies: Shoot Energy Orbs";
      ruleDesc = "Enemies now periodically fire slow-moving energy balls towards the player.";
      ruleReason = "Zero damage registered on target subject. Deploying projectile weapons to increase player heart rate.";
      icon = "Zap";
    } else if (highAccuracy && !activeRules.some(r => r.id === "ENEMY_HP_UP")) {
      ruleId = "ENEMY_HP_UP";
      ruleName = "Enemy Health +50%";
      ruleDesc = "Increases all enemies' hitpoints by 50%.";
      ruleReason = `Player weapon accuracy is exceptionally high (${accuracy}%). Increasing opponent resilience.`;
      icon = "HeartPulse";
    } else if (lowAccuracy && !hasLaser && Math.random() > 0.5) {
      ruleId = "LASER_SIGHT";
      ruleName = "Player Laser Sight";
      ruleDesc = "Renders a visible high-accuracy targeting laser sight to the crosshair.";
      ruleReason = `Subject target tracking is suboptimal (${accuracy}% accuracy). Calibration aid dispatched.`;
      icon = "Target";
    } else if (stats.timeElapsed > 25 && !activeRules.some(r => r.id === "DOUBLE_ENEMY")) {
      ruleId = "DOUBLE_ENEMY";
      ruleName = "Double Enemy Wave Spawn";
      ruleDesc = "Doubles the amount of enemies spawned in waves.";
      ruleReason = "Round duration exceeded benchmark. Standard pacing is insufficient. Raising swarm volume.";
      icon = "Users";
    } else if (Math.random() > 0.7 && !hasFog) {
      ruleId = "FOG_OF_WAR";
      ruleName = "Fog of War Enabled";
      ruleDesc = "Screen visibility around player is heavily reduced by heavy server fog.";
      ruleReason = "Subject utilizes visual information too efficiently. Restricting optical range.";
      icon = "EyeOff";
    } else if (Math.random() > 0.5 && !hasBouncing) {
      ruleId = "BOUNCING_BULLETS";
      ruleName = "Player Bullets: Bounce x1";
      ruleDesc = "Your projectiles bounce once off the battlefield boundaries.";
      ruleReason = "Weapon fire deflection protocols engaged. Simulating elastic collisions.";
      icon = "Compass";
    } else if (Math.random() > 0.6 && !hasBurst) {
      ruleId = "BURST_FIRE";
      ruleName = "Player Gun: 3-Round Burst";
      ruleDesc = "Fires 3 bullets rapidly in succession instead of single shots, with a slight delay.";
      ruleReason = "Enhancing subject firepower to measure trigger finger reflex speeds.";
      icon = "Zap";
    } else {
      // Pick randomly between speed increases or hp changes
      const choices = [
        {
          id: "ENEMY_SPEED_UP",
          name: "Enemy Speed +20%",
          desc: "Enemies move faster to swarm the player.",
          reason: "Subject displays exceptional kinetic evasion. Enhancing hunter vectors.",
          icon: "Activity",
        },
        {
          id: "PLAYER_SPEED_UP",
          name: "Player Speed +25%",
          desc: "Player base kinetic movement velocity boosted.",
          reason: "Subject pacing is slightly slow. Overclocking player locomotors for research purposes.",
          icon: "Zap",
        },
        {
          id: "PROJECTILE_SPEED_UP",
          name: "Bullet Speed +30%",
          desc: "All projectiles travel 30% faster.",
          reason: "Bullet trajectories were deemed too sluggish. Overclocking weapon pressure gauges.",
          icon: "Flame",
        },
        {
          id: "KNOCKBACK_UP",
          name: "Knockback Force +100%",
          desc: "Bullets and contact push elements twice as far.",
          reason: "Testing collision momentum transfer. Amplifying repulsion field generators.",
          icon: "RefreshCw",
        },
        {
          id: "BULLET_SPREAD",
          name: "Bullet Fire Spread",
          desc: "Adds minor random dispersion angles to shot projectiles.",
          reason: "Subject trajectory predictor has reached 100% confidence. Introducing kinetic turbulence.",
          icon: "Compass",
        },
        {
          id: "PLAYER_HP_DOWN",
          name: "Player Max HP -1",
          desc: "Decreases player's maximum health pool by 1 (Minimum of 1).",
          reason: "Player safety margin exceeds system tolerance. Adjusting stakes.",
          icon: "HeartCrack",
        },
      ];

      // Exclude player hp down if player is already low
      let validChoices = choices;
      if (stats.damageTaken > 1) {
        validChoices = choices.filter(c => c.id !== "PLAYER_HP_DOWN");
      }

      const randomChoice = validChoices[Math.floor(Math.random() * validChoices.length)];
      ruleId = randomChoice.id;
      ruleName = randomChoice.name;
      ruleDesc = randomChoice.desc;
      ruleReason = randomChoice.reason;
      icon = randomChoice.icon;
    }

    const newPatch: Rule = {
      id: ruleId,
      name: ruleName,
      description: ruleDesc,
      reason: ruleReason,
      iconName: icon,
    };

    setSelectedPatch(newPatch);

    // Terminal typing lines sequence
    const accuracyVal = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
    const lines = [
      `Initializing telemetry feed scan... [OK]`,
      `=================== ROUND ${round} METRICS ===================`,
      `Player Accuracy  :  ${accuracyVal}%  (${stats.shotsHit}/${stats.shotsFired} targets hit)`,
      `Damage Delivered :  ${stats.damageDealt} pts`,
      `Damage Suffered  :  ${stats.damageTaken} pts`,
      `Dash Engagements :  ${stats.dashCount} activations`,
      `Time Survived    :  ${stats.timeElapsed.toFixed(1)} seconds`,
      `======================================================`,
      `STATUS: ANALYSIS COMPLETE.`,
      `LOG: "${ruleReason}"`,
      `COMPILING SOLUTION... DEPLOYING PATCH.EXE [v0.${round + 1}]`,
    ];

    let lineIndex = 0;
    setTypedLines([]);
    setCurrentStep(0);
    setShowButton(false);
    setProgress(0);

    const interval = setInterval(() => {
      if (lineIndex < lines.length) {
        const lineToPush = lines[lineIndex];
        setTypedLines(prev => [...prev, lineToPush]);
        lineIndex++;
        setCurrentStep(lineIndex);
      } else {
        clearInterval(interval);
        
        // Start patch application loading progress bar
        let prog = 0;
        const progInterval = setInterval(() => {
          prog += 4;
          setProgress(Math.min(prog, 100));
          if (prog >= 100) {
            clearInterval(progInterval);
            setShowButton(true);
            playPatchApplied();
          }
        }, 30);
      }
    }, 450);

    return () => {
      clearInterval(interval);
    };
  }, [round, stats]);

  const handleNext = () => {
    if (selectedPatch) {
      onApplyPatch(selectedPatch);
    }
  };

  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  return (
    <div className="absolute inset-0 bg-cyber-dark/95 z-50 flex flex-col items-center justify-center p-6 font-mono crt-screen scanline">
      {/* Sound toggle at top right */}
      <button
        onClick={onToggleSound}
        className="absolute top-6 right-6 p-2 rounded-none border border-cyber-green/30 hover:border-cyber-green bg-black text-cyber-green transition-colors cursor-pointer"
        title={soundEnabled ? "Mute audio" : "Unmute audio"}
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-3xl flex flex-col bg-black border border-cyber-green/30 rounded-none shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#0a0a0d] border-b border-cyber-green/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyber-green animate-pulse" />
            <span className="text-xs font-bold text-cyber-green tracking-wider">PATCH.EXE CORE COMPILER</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-cyber-red"></span>
            <span className="w-2.5 h-2.5 bg-cyber-yellow"></span>
            <span className="w-2.5 h-2.5 bg-cyber-green"></span>
          </div>
        </div>

        {/* Terminal Content Screen */}
        <div className="p-6 flex-1 min-h-[360px] max-h-[460px] overflow-y-auto bg-black text-gray-300 text-sm leading-relaxed border-b border-cyber-green/20 selection:bg-cyber-green/20">
          <div className="space-y-2">
            {typedLines.map((line, idx) => {
              if (!line) return null;
              const isWarning = line.includes("WARNING") || line.includes("LOG:");
              const isHeader = line.includes("====");
              const isStatus = line.includes("STATUS:") || line.includes("COMPILING");
              const isValue = line.includes("Accuracy") || line.includes("Damage") || line.includes("Survived");

              let textColor = "text-gray-400";
              if (isWarning) textColor = "text-cyber-yellow glow-yellow";
              else if (isHeader) textColor = "text-cyber-green/30";
              else if (isStatus) textColor = "text-cyber-green font-bold glow-green";
              else if (isValue) textColor = "text-white font-medium";

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2"
                >
                  <ChevronRight className="w-4 h-4 text-cyber-green/30 shrink-0 mt-0.5" />
                  <span className={textColor}>{line}</span>
                </motion.div>
              );
            })}

            {/* Current processing pointer or loading bar */}
            {currentStep >= 11 && progress < 100 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-cyber-green font-mono">
                  <span>RE-CONFIGURING RULES AND GENERATING MUTATION STACK</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-[#0a0a0d] h-2 rounded-none overflow-hidden border border-cyber-green/20">
                  <div
                    className="bg-cyber-green h-full shadow-[0_0_8px_rgba(0,255,65,0.6)] transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Applied Rule / Decision card */}
        {showButton && selectedPatch && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-[#0a0a0d] border-t border-cyber-green/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded-none shadow-inner animate-pulse">
                <AlertTriangle className="w-6 h-6 glow-red" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">PROPOSED PATCH PROTOCOL</div>
                <h3 className="text-lg font-bold text-cyber-red glow-red font-mono tracking-tight flex items-center gap-2">
                  PATCH v0.{round + 1}: {selectedPatch.name}
                </h3>
                <p className="text-sm text-gray-400 font-sans">{selectedPatch.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-cyber-yellow font-semibold pt-1">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>AI Objective: "Optimizing entertainment coefficients"</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full md:w-auto px-8 py-3 bg-cyber-green text-black font-bold hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-2 font-mono uppercase tracking-wide shrink-0 rounded-none text-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>APPLY & COMPLY</span>
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
