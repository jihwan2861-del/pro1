import React, { useState, useEffect } from "react";
import { 
  Terminal as TerminalIcon, Shield, Cpu, Activity, Play, RefreshCw, 
  Volume2, VolumeX, AlertTriangle, HelpCircle, Gamepad2, Layers, 
  Trash2, Sparkles, AlertCircle, RefreshCw as LoopIcon, Check, ChevronRight
} from "lucide-react";
import { GameStats, Rule } from "./types";
import GameCanvas from "./components/GameCanvas";
import TerminalOverlay from "./components/TerminalOverlay";
import { 
  playPatchApplied, playGameOver, playAlert, playGlitch, 
  setSoundEnabled, isSoundEnabled 
} from "./components/SoundEffects";
import { motion, AnimatePresence } from "motion/react";

type GameScreen = "TITLE" | "PLAYING" | "ANALYZING" | "GAMEOVER";

export default function App() {
  const [screen, setScreen] = useState<GameScreen>("TITLE");
  const [round, setRound] = useState(1);
  const [activeRules, setActiveRules] = useState<Rule[]>([]);
  const [roundStats, setRoundStats] = useState<GameStats | null>(null);
  const [gameStatsHistory, setGameStatsHistory] = useState<GameStats[]>([]);
  const [playerMaxHp, setPlayerMaxHp] = useState(3);
  const [soundOn, setSoundOn] = useState(true);

  // Sync sound setting
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  const handleStartGame = () => {
    setRound(1);
    setActiveRules([]);
    setRoundStats(null);
    setGameStatsHistory([]);
    setPlayerMaxHp(3);
    setScreen("PLAYING");
    if (soundOn) playAlert();
  };

  const handleRoundCleared = (stats: GameStats) => {
    setRoundStats(stats);
    setGameStatsHistory(prev => [...prev, stats]);
    setScreen("ANALYZING");
  };

  const handleApplyPatch = (newRule: Rule) => {
    // Add rule
    setActiveRules(prev => [...prev, newRule]);
    
    // Check if player hp is reduced by rule
    if (newRule.id === "PLAYER_HP_DOWN") {
      setPlayerMaxHp(prev => Math.max(1, prev - 1));
    }

    // Go to next round
    setRound(prev => prev + 1);
    setScreen("PLAYING");
    if (soundOn) playAlert();
  };

  const handlePlayerDied = (stats: GameStats) => {
    setRoundStats(stats);
    setGameStatsHistory(prev => [...prev, stats]);
    setScreen("GAMEOVER");
    if (soundOn) playGameOver();
  };

  // Convert rule IDs to futuristic filename hashes
  const getRuleFileName = (id: string) => {
    switch (id) {
      case "ENEMY_SPEED_UP": return "HUNTER_ACCEL.SYS";
      case "PLAYER_SPEED_UP": return "OVERCLOCK_DRIVE.BIN";
      case "PROJECTILE_SPEED_UP": return "PRESSURE_VALVE.SYS";
      case "ENEMY_HP_UP": return "CELL_MUTATOR.DLL";
      case "PLAYER_HP_DOWN": return "MATRIX_LIMITER.BIN";
      case "NO_DASH": return "KINETIC_LOCKOUT.LOG";
      case "FOG_OF_WAR": return "OPTICAL_FOG.SYS";
      case "KNOCKBACK_UP": return "MOMENTUM_BOOST.BIN";
      case "DOUBLE_ENEMY": return "SWARM_DUPLICATOR.DLL";
      case "BULLET_SPREAD": return "DISPERSION_TURB.SYS";
      case "LASER_SIGHT": return "CALIBRATION_GUIDE.SYS";
      case "BOUNCING_BULLETS": return "ELASTIC_REBOUND.BIN";
      case "BURST_FIRE": return "BURST_SEQUENCER.SYS";
      case "FAST_SHOOTING_ENEMIES": return "PROJECTILE_ORBS.DLL";
      case "REGENERATIVE_ENEMIES": return "CELLULAR_REGEN.SYS";
      case "SHIELDED_PLAYER": return "DEFENSIVE_SHIELD.SYS";
      default: return "PATCH_MODULATOR.SYS";
    }
  };

  const toggleSound = () => {
    setSoundOn(!soundOn);
  };

  // Compile final game report summary
  const getFinalAccuracy = () => {
    if (gameStatsHistory.length === 0) return 0;
    const totalFired = gameStatsHistory.reduce((sum, s) => sum + s.shotsFired, 0);
    const totalHit = gameStatsHistory.reduce((sum, s) => sum + s.shotsHit, 0);
    return totalFired > 0 ? Math.round((totalHit / totalFired) * 100) : 0;
  };

  const getTotalKills = () => {
    return gameStatsHistory.reduce((sum, s) => sum + s.enemiesKilled, 0);
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-cyber-green flex flex-col selection:bg-cyber-green/20 font-mono antialiased relative overflow-hidden border-[12px] border-cyber-chassis">
      {/* Visual cyber mesh grid on global background */}
      <div className="absolute inset-0 cyber-grid-bg pointer-events-none" />

      {/* Main Header / Top HUD */}
      <header className="h-12 border-b border-cyber-green/30 bg-[#0a0a0d] px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] bg-cyber-green text-black px-2 py-0.5 font-bold">SYSTEM ACTIVE</span>
          <span className="tracking-widest text-xs font-bold font-mono">PATCH.EXE // KERNEL_v0.4.2</span>
        </div>

        {/* Telemetry performance metrics from the Design HTML */}
        <div className="hidden md:flex text-xs text-cyber-green/60 gap-6 font-mono">
          <span>CPU: 42%</span>
          <span>MEM: 12.4GB</span>
          <span>LATENCY: 4ms</span>
          <span>ROUND: {round}</span>
        </div>

        {/* Global Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="p-1 bg-[#0a0a0d] border border-cyber-green/30 rounded-none text-cyber-green hover:text-white hover:border-cyber-green transition-all cursor-pointer text-[11px] flex items-center gap-1.5"
            title={soundOn ? "Mute audio" : "Unmute audio"}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] uppercase font-mono hidden sm:inline">{soundOn ? "AUDIO_ON" : "AUDIO_OFF"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 items-stretch z-10 min-h-0">
        {/* Left Side: Active Rules Manifest (always visible during gameplay) */}
        <div className="w-full md:w-80 bg-black/80 border border-cyber-green/30 rounded-none p-5 flex flex-col shrink-0 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-green/30 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyber-red" />
              <span className="font-bold text-xs uppercase tracking-widest font-mono text-cyber-green/70">
                ACTIVE_RULES.CFG
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold bg-cyber-red/10 text-cyber-red px-2 py-0.5 rounded-none border border-cyber-red/20">
              {activeRules.length} MODS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px] md:max-h-none">
            {activeRules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8 border border-dashed border-cyber-green/20 rounded-none">
                <HelpCircle className="w-8 h-8 text-cyber-green/20 mb-2 animate-pulse" />
                <p className="text-xs font-mono text-cyber-green/60 uppercase tracking-wider">
                  No active rule patches detected.
                </p>
                <p className="text-[10px] text-cyber-green/40 mt-1 font-mono">
                  AI analysis will compile patches after each round.
                </p>
              </div>
            ) : (
              activeRules.map((rule, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx}
                  className="p-3 bg-black/60 border border-cyber-green/20 rounded-none flex items-start gap-3 hover:border-cyber-green/40 transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-cyber-green mt-1.5 shrink-0 animate-pulse" />
                  <div className="space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyber-green uppercase tracking-tight">
                        {rule.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal font-sans">
                      {rule.description}
                    </p>
                    <div className="text-[9px] text-cyber-green/40 font-semibold tracking-tighter uppercase flex items-center gap-1 mt-1 pt-1 border-t border-cyber-green/10">
                      <span>FILE: {getRuleFileName(rule.id)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Core AI Mindset footer */}
          <div className="mt-4 p-3 bg-black/90 border border-cyber-green/20 rounded-none">
            <div className="flex items-center gap-2 text-cyber-green mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">AI DIRECTIVE LOG</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono italic leading-relaxed">
              "AI는 당신을 죽이려고 하는 것이 아닙니다. 오직 '더 완벽한 게임성'을 최적화하기 위해 규칙을 패치할 뿐입니다."
            </p>
          </div>
        </div>

        {/* Right Side: Primary interactive viewport (Switch screens) */}
        <div className="flex-1 flex flex-col justify-center items-stretch relative min-w-0 min-h-[450px]">
          <AnimatePresence mode="wait">
            {screen === "TITLE" && (
              <motion.div
                key="title"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full bg-black/80 border border-cyber-green/30 rounded-none p-8 flex flex-col items-center justify-center text-center relative crt-screen scanline shadow-2xl"
              >
                {/* Big Cyberpunk glitching Header */}
                <div className="mb-6 space-y-2 relative">
                  <motion.div
                    animate={{ y: [0, -2, 2, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="text-6xl md:text-7xl font-black font-mono tracking-tighter text-cyber-green glow-green select-none relative"
                  >
                    PATCH.EXE
                  </motion.div>
                  <p className="text-xs font-mono tracking-widest text-cyber-green/60 uppercase">
                    SYSTEM DESIGN CALIBRATOR MODULE
                  </p>
                </div>

                <div className="max-w-md bg-black/90 border border-cyber-green/20 p-5 rounded-none text-left font-mono mb-8 space-y-4">
                  <div className="flex items-center gap-2 border-b border-cyber-green/20 pb-2 text-cyber-red">
                    <AlertTriangle className="w-4 h-4 glow-red animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">SYSTEM LOGS INDUCTION</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    AI는 당신을 파괴하려는 것이 아닙니다. 오직 <strong className="text-cyber-green">"더 완벽하고 재미있는 게임"</strong>을 만들기 위해 끊임없이 분석하고 패치(Patch)를 가할 뿐입니다.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    하지만 당신이 생각하는 재미와 AI가 연산해내는 재미 지표는 극명히 다를 수 있습니다. 수많은 특수 조항과 패치를 극복하고 살아남으십시오.
                  </p>
                  
                  {/* Controls instructions */}
                  <div className="border-t border-cyber-green/20 pt-3 flex flex-col gap-1 text-[11px] text-gray-500 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-cyber-card border border-cyber-green/20 text-white rounded-none">W, A, S, D</span>
                      <span>이동</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-cyber-card border border-cyber-green/20 text-white rounded-none">MOUSE</span>
                      <span>조준 & 발사 (좌클릭)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-cyber-card border border-cyber-green/20 text-white rounded-none">SPACE / SHIFT</span>
                      <span>회피 대시 (무적)</span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartGame}
                  className="px-12 py-3 bg-cyber-green text-black font-bold hover:bg-white hover:text-black transition-colors cursor-pointer text-sm font-mono tracking-wider uppercase rounded-none"
                >
                  <Gamepad2 className="w-5 h-5 fill-current inline mr-2" />
                  <span>INITIALIZE ROUND</span>
                </motion.button>
              </motion.div>
            )}

            {screen === "PLAYING" && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col"
              >
                <GameCanvas
                  activeRules={activeRules}
                  onRoundCleared={handleRoundCleared}
                  onPlayerDied={handlePlayerDied}
                  round={round}
                  playerMaxHp={playerMaxHp}
                  isPlaying={true}
                  soundEnabled={soundOn}
                />
              </motion.div>
            )}

            {screen === "ANALYZING" && roundStats && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <TerminalOverlay
                  stats={roundStats}
                  round={round}
                  activeRules={activeRules}
                  onApplyPatch={handleApplyPatch}
                  soundEnabled={soundOn}
                  onToggleSound={toggleSound}
                />
              </motion.div>
            )}

            {screen === "GAMEOVER" && roundStats && (
              <motion.div
                key="gameover"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-black/90 border border-cyber-red/30 rounded-none p-8 flex flex-col justify-center items-center font-mono relative crt-screen scanline shadow-2xl"
              >
                <div className="mb-4 p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-none text-cyber-red shadow-[0_0_15px_rgba(255,0,85,0.2)] animate-pulse">
                  <AlertCircle className="w-8 h-8 glow-red" />
                </div>

                <h2 className="text-4xl font-black font-mono tracking-tight text-cyber-red glow-red mb-2 uppercase">
                  GAME OVER
                </h2>
                <p className="text-xs text-cyber-red/60 uppercase tracking-widest mb-6">
                  Subject Vitality Exhausted
                </p>

                <div className="w-full max-w-lg bg-black/95 border border-cyber-green/20 rounded-none p-6 space-y-4 text-left">
                  <div className="text-xs font-bold text-cyber-green border-b border-cyber-green/10 pb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>AI CALIBRATION CONCLUSION REPORT</span>
                    <span>v0.{round}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-gray-500 uppercase tracking-tight text-[10px]">ROUNDS ACCOMPLISHED</div>
                      <div className="text-white font-bold text-lg">{round}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-500 uppercase tracking-tight text-[10px]">TOTAL TARGET PURGES</div>
                      <div className="text-white font-bold text-lg">{getTotalKills()} bots</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-500 uppercase tracking-tight text-[10px]">GLOBAL SHOT ACCURACY</div>
                      <div className="text-cyber-green font-bold text-lg">{getFinalAccuracy()}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-500 uppercase tracking-tight text-[10px]">CALIBRATION ACCELERATION</div>
                      <div className="text-cyber-yellow font-bold text-lg">
                        {round > 8 ? "IMPOSSIBLE" : round > 5 ? "MAX_PRESSURE" : "EXPERIMENTAL"}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-cyber-green/10 pt-3">
                    <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase block mb-1">AI REMARKS:</span>
                    <p className="text-xs text-gray-300 italic leading-relaxed font-sans">
                      "Thank you for helping improve the game. Your motor-reflex statistics have been fully harvested to build more optimal experiences. Rebooting terminal recommended."
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartGame}
                  className="mt-8 px-8 py-3.5 bg-cyber-red text-white font-bold hover:bg-white hover:text-black transition-colors cursor-pointer text-xs font-mono tracking-wider uppercase rounded-none"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow inline mr-2" />
                  <span>REBOOT_SYS.EXE</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Aesthetic Site Bottom margin line */}
      <footer className="border-t border-cyber-green/10 py-3 text-center text-[10px] text-cyber-green/40 font-mono tracking-widest uppercase shrink-0 bg-black/40">
        PATCH.EXE // COMPLY WITH THE EXPERIENCE.
      </footer>
    </div>
  );
}
