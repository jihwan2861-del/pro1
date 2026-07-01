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
  onRemovePatch: (ruleId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  retryCount: number;
}

const RULES_DATA = [
  // --- Buffs (PATCH) ---
  {
    id: "URGENT_HEAL",
    name: "긴급 보호 프로토콜 (Emergency Protect)",
    description: "체력 50% 미만이 되면 1회 체력 30% 즉시 회복",
    reason: "Player health reached critical depletion. Activating backup restore cycle.",
    iconName: "HeartPulse",
    aiType: "PATCH" as const,
    dialogue: "시스템 한계 도달 직전! 위급 상황 시 즉각 회복하는 백업 라이프 모듈을 주입할게요!",
    minStage: 1,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.damageTaken >= 4
  },
  {
    id: "ARMOR_REGEN",
    name: "장갑 강화 프로토콜 (Armor Hardening)",
    description: "5초 동안 피해를 입지 않으면 피해를 막는 보호막 충전 (최대 3중첩)",
    reason: "High defense vulnerability detected. Deploying regenerative shield.",
    iconName: "Shield",
    aiType: "PATCH" as const,
    dialogue: "침착하게 버텨내시면 자가 충전되는 강력한 다중 장갑막을 활성화해 드릴게요!",
    minStage: 1,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.damageTaken >= 4
  },
  {
    id: "DASH_COOLDOWN_DOWN",
    name: "회피 보조 프로토콜 (Evasion Support)",
    description: "대시 재사용 대기시간(쿨타임) 20% 감소",
    reason: "Evasive thrust engine friction detected. Tuning thruster cooldowns.",
    iconName: "Activity",
    aiType: "PATCH" as const,
    dialogue: "빠른 기동 회피를 자주 사용하시는군요! 대시 쿨타임을 한층 단축해 드립니다!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.dashCount >= 3
  },
  {
    id: "SPEED_UP_BUFF",
    name: "기동성 최적화 (Locomotor Boost)",
    description: "플레이어 이동속도 +1 증가",
    reason: "Evasion capabilities falling below optimal index. Boosting base speed.",
    iconName: "Zap",
    aiType: "PATCH" as const,
    dialogue: "적들이 너무 몰려와 피격이 잦아졌군요. 전속력으로 탈출하실 수 있게 속도를 높일게요!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.damageTaken >= 3
  },
  {
    id: "CHEAT_INVULN",
    name: "치트 모듈 (Cheat Frame)",
    description: "피격 후 무적 시간 1초 연장",
    reason: "System recovery code activated. Overclocking post-hit invulnerability.",
    iconName: "Cpu",
    aiType: "PATCH" as const,
    dialogue: "탈락 위기를 딛고 부활하셨군요! 피격 이후 위기 탈출을 돕기 위해 무적 프레임을 보강해요!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats, accuracy: number, retryCount: number) => retryCount > 0
  },
  {
    id: "DAMAGE_UP",
    name: "화력 보정 프로토콜 (Firepower Amp)",
    description: "플레이어 공격력(데미지) 20% 증가",
    reason: "Target neutralization times exceed threshold. Upgrading player caliber.",
    iconName: "Flame",
    aiType: "PATCH" as const,
    dialogue: "전투가 길어지고 있어요! 화력을 높여 적들을 빠르게 철거할 수 있게 보조하겠습니다!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats) => stats.timeElapsed >= 60
  },
  {
    id: "RANGED_DEFENSE",
    name: "원거리 대응 프로토콜 (Ranged Block)",
    description: "원거리 적에게 받는 모든 피해 1 감소",
    reason: "Excessive projectile damage detected. Injecting anti-projectile insulation.",
    iconName: "ShieldAlert",
    aiType: "PATCH" as const,
    dialogue: "사방에서 탄환이 날아와 성가시죠? 장거리 빔 및 탄환에 대한 경감 필터를 구성했습니다!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats) => stats.rangedHits >= 3
  },
  {
    id: "FIRE_RATE_UP",
    name: "사격 안정화 알고리즘 (Firing Speed)",
    description: "플레이어 무기 발사 속도 15% 가속",
    reason: "Prolonged combat duration recorded. Accelerating firing rate.",
    iconName: "Zap",
    aiType: "PATCH" as const,
    dialogue: "포화 속에서 긴 시간 버텨내셨네요! 더 빠른 고속 발사 모듈을 활성화해 드릴게요!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats) => stats.timeElapsed >= 60
  },
  {
    id: "AIM_ASSIST",
    name: "조준 보정 알고리즘 (Aim Assist)",
    description: "2발 발사 중 1발이 가까운 적을 조준 유도",
    reason: "Ballistic accuracy index has dropped. Deploying magnetic homing assist.",
    iconName: "Target",
    aiType: "PATCH" as const,
    dialogue: "명중 제어가 조금 어긋나도 안심하세요! 발사체의 절반이 적을 자동 추적하게 조치할게요!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats, accuracy: number) => accuracy <= 40
  },
  {
    id: "ADRENALINE",
    name: "아드레날린 모듈 (Adrenaline Rush)",
    description: "공격(발사 버튼 입력) 중 플레이어 이동속도 증가",
    reason: "Stun impact from charging unit detected. Boosting fire adrenaline.",
    iconName: "Activity",
    aiType: "PATCH" as const,
    dialogue: "돌격해 오는 적에게 피격당하셨군요! 트리거를 누르고 쏠 때 속도가 붙도록 조율할게요!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats) => stats.chargerHits >= 1
  },

  // --- Debuffs (GLITCH) ---
  {
    id: "ENEMY_SPEED_UP_DEBUFF",
    name: "적 기동성 향상 (Enemy Accelerate)",
    description: "모든 스폰 적군 이동속도 +1 증가",
    reason: "Player evasion metrics exceeded standard ceiling. Accelerating enemy units.",
    iconName: "Flame",
    aiType: "GLITCH" as const,
    dialogue: "뭐야, 한 대도 안 맞고 유유히 깨버린 거야? 어림없지, 적들의 구동 클럭을 오버클럭해 줄게!",
    minStage: 1,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.damageTaken === 0
  },
  {
    id: "ENEMY_DAMAGE_AMP",
    name: "적 화력 증폭 (Damage Amp)",
    description: "플레이어가 피해를 입을 때마다 받는 피해 +1 가중",
    reason: "Player integrity remains flawless. Scaling enemy caliber.",
    iconName: "AlertTriangle",
    aiType: "GLITCH" as const,
    dialogue: "후후후... 너무 쉽게 요리조리 피하는걸? 스치기만 해도 치명상을 입도록 화력을 올려놨어!",
    minStage: 1,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.damageTaken === 0
  },
  {
    id: "CHARGER_BUFF",
    name: "돌격 프로토콜 (Charger Speedup)",
    description: "돌격형(Charger) 적군의 돌진 속도 +2 대폭 가속",
    reason: "Charger unit contact frequency is zero. Hardening charger thrust engines.",
    iconName: "Activity",
    aiType: "GLITCH" as const,
    dialogue: "내 예쁜 돌진 로봇들을 전부 요리조리 피했겠다? 돌격 파워를 폭발시켜 줄 테니 맞춰봐!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.chargerHits === 0
  },
  {
    id: "SHOOTER_BUFF",
    name: "원거리 최적화 (Shooter Overclock)",
    description: "원거리(Shooter) 적군의 발사 연사력 20% 증가",
    reason: "Ranged unit contact frequency is zero. Tuning shooter battery timers.",
    iconName: "Zap",
    aiType: "GLITCH" as const,
    dialogue: "원거리 포격을 단 한 발도 안 맞아주다니... 저격 포탑들의 연사 장치를 오버쿨링했어!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.rangedHits === 0
  },
  {
    id: "ENEMY_HP_BUFF_DEBUFF",
    name: "방어 강화 패치 (Enemy HP Boost)",
    description: "모든 스폰 적군 최대 체력 +30% 버프",
    reason: "Stage cleared in record time. Hardening enemy hull integrity.",
    iconName: "HeartPulse",
    aiType: "GLITCH" as const,
    dialogue: "45초 컷이라니 너무 서두른 거 아냐? 적들의 철갑 장갑 두께를 대폭 보강했으니 어디 뚫어봐!",
    minStage: 2,
    maxStage: 3,
    checkCondition: (stats: GameStats) => stats.timeElapsed <= 45
  },
  {
    id: "DOUBLE_ENEMY",
    name: "물량 증폭 (Swarm Protocol)",
    description: "매 스테이지 스폰 유닛 웨이브 물량 2배 증폭",
    reason: "Speedrun metrics detected. Duplicating enemy spawner nodes.",
    iconName: "AlertTriangle",
    aiType: "GLITCH" as const,
    dialogue: "30초도 안 돼서 판을 정리하다니, 스피드런 핵이라도 쓰는 거야? 복사-붙여넣기로 스폰을 2배 늘렸다!",
    minStage: 3,
    maxStage: 6,
    checkCondition: (stats: GameStats) => stats.timeElapsed <= 30
  },
  {
    id: "BLACKOUT",
    name: "암전 (Critical Blackout)",
    description: "전장 메모리 일시 차단: 15초마다 3초간 전체 암전",
    reason: "Abnormal target lock efficiency. Inducing systemic screen blackout noise.",
    iconName: "Cpu",
    aiType: "GLITCH" as const,
    dialogue: "명중률 80%? 에임핵 사용자로 의심되는군! 에이밍을 방해하기 위해 주기적으로 눈을 가려주지!",
    minStage: 1,
    maxStage: 6,
    checkCondition: (stats: GameStats, accuracy: number) => accuracy >= 80 && stats.shotsFired >= 5
  }
];

export default function TerminalOverlay({
  stats,
  round,
  activeRules,
  onApplyPatch,
  onRemovePatch,
  soundEnabled,
  onToggleSound,
  retryCount,
}: TerminalOverlayProps) {
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatch, setSelectedPatch] = useState<Rule | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [progress, setProgress] = useState(0);

  // Analyze stats and compile stage-specific rules according to GDD
  useEffect(() => {
    playGlitch();

    const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

    // Filter candidate rules matching current stage range and trigger condition
    const candidates = RULES_DATA.filter(rule => {
      // 1. Must be in valid stage range
      if (round < rule.minStage || round > rule.maxStage) return false;
      // 2. Condition must evaluate to true
      return rule.checkCondition(stats, accuracy, retryCount);
    });

    let chosenRuleData: typeof RULES_DATA[0];

    if (candidates.length > 0) {
      // Randomly select one candidate from overlapping matches
      const randomIndex = Math.floor(Math.random() * candidates.length);
      chosenRuleData = candidates[randomIndex];
    } else {
      // Fallback defaults if no conditions match
      if (round <= 3) {
        // Fallback to speed up buff (Patch) or speed up debuff (Glitch)
        chosenRuleData = Math.random() > 0.5 ? {
          id: "SPEED_UP_BUFF",
          name: "기동성 최적화 (Locomotor Boost)",
          description: "플레이어 이동속도 +1 증가",
          reason: "Standard locomotor calibration.",
          iconName: "Zap",
          aiType: "PATCH" as const,
          dialogue: "스펙 보정을 위해 기본 이속 보정 알고리즘을 배치해 드릴게요!",
          minStage: 1,
          maxStage: 3,
          checkCondition: () => true
        } : {
          id: "ENEMY_SPEED_UP_DEBUFF",
          name: "적 기동성 향상 (Enemy Accelerate)",
          description: "모든 스폰 적군 이동속도 +1 증가",
          reason: "Normalizing challenge coefficients.",
          iconName: "Flame",
          aiType: "GLITCH" as const,
          dialogue: "흐응, 딱히 조건에 어긋나진 않았지만... 심심하니까 적들의 속도를 쬐끔 올려둘게!",
          minStage: 1,
          maxStage: 3,
          checkCondition: () => true
        };
      } else {
        // Fallback for stages 4-6
        chosenRuleData = Math.random() > 0.5 ? {
          id: "DAMAGE_UP",
          name: "화력 보정 프로토콜 (Firepower Amp)",
          description: "플레이어 공격력(데미지) 20% 증가",
          reason: "Standard battle calibration.",
          iconName: "Flame",
          aiType: "PATCH" as const,
          dialogue: "어려운 스테이지군요! 조금 더 강한 대미지로 격파하도록 도울게요!",
          minStage: 4,
          maxStage: 6,
          checkCondition: () => true
        } : {
          id: "DOUBLE_ENEMY",
          name: "물량 증폭 (Swarm Protocol)",
          description: "매 스테이지 스폰 유닛 웨이브 물량 2배 증폭",
          reason: "Scaling system complexity.",
          iconName: "AlertTriangle",
          aiType: "GLITCH" as const,
          dialogue: "흠, 무난무난하게 돌파하네? 난이도를 팍 올릴 겸 스폰 물량을 두 배로 확대한다!",
          minStage: 4,
          maxStage: 6,
          checkCondition: () => true
        };
      }
    }

    // Special Stage 3 override: Patch removal protocol
    let ruleId = chosenRuleData.id;
    let ruleName = chosenRuleData.name;
    let ruleDesc = chosenRuleData.description;
    let ruleReason = chosenRuleData.reason;
    let icon = chosenRuleData.iconName;
    let aiType = chosenRuleData.aiType;
    let dialogue = chosenRuleData.dialogue;

    if (round === 3) {
      ruleId = "REMOVE_PATCH";
      ruleName = "패치 파괴 백신 프로토콜 (Malware Wipe)";
      ruleDesc = "현재 활성화된 페널티(글리치) 패치 파일 중 하나를 골라 즉시 시스템에서 제거합니다.";
      ruleReason = "System Assistant vaccine fully charged. Wiping malware configuration files.";
      icon = "Trash2";
      aiType = "PATCH";
      dialogue = "백신 프로그램 충전 완료! 그동안 골치 아팠던 글리치의 오작동 코드 중 하나를 골라 날려버리세요!";
    }

    const newPatch: Rule = {
      id: ruleId,
      name: ruleName,
      description: ruleDesc,
      reason: ruleReason,
      iconName: icon,
      aiType,
      dialogue,
    };

    setSelectedPatch(newPatch);

    // Build terminal typing lines
    const lines = [
      `Initializing telemetry feed scan... [OK]`,
      `=================== STAGE ${round} METRICS ===================`,
      `Player Accuracy  :  ${accuracy}%  (${stats.shotsHit}/${stats.shotsFired} targets hit)`,
      `Damage Delivered :  ${stats.damageDealt} pts`,
      `Damage Suffered  :  ${stats.damageTaken} pts`,
      `Dash Engagements :  ${stats.dashCount} activations`,
      `Time Survived    :  ${stats.timeElapsed.toFixed(1)} seconds`,
      `======================================================`,
      `STATUS: ANALYSIS COMPLETE.`,
      round === 3 
        ? `VACCINE ACTIVE: SELECT MODIFIER FOR REMOVAL.`
        : `LOG: "${ruleReason}"`,
      round === 3
        ? `AWAITING USER SELECTION...`
        : `COMPILING SOLUTION... DEPLOYING PATCH.EXE [v0.${round + 1}]`,
    ];

    let lineIndex = 0;
    setTypedLines([]);
    setCurrentStep(0);
    setShowButton(false);
    setProgress(0);

    const interval = setInterval(() => {
      if (lineIndex < lines.length) {
        setTypedLines(prev => [...prev, lines[lineIndex]]);
        lineIndex++;
        setCurrentStep(lineIndex);
      } else {
        clearInterval(interval);
        
        let prog = 0;
        const progInterval = setInterval(() => {
          prog += 5;
          setProgress(Math.min(prog, 100));
          if (prog >= 100) {
            clearInterval(progInterval);
            setShowButton(true);
            playPatchApplied();
          }
        }, 20);
      }
    }, 350);

    return () => {
      clearInterval(interval);
    };
  }, [round, stats]);

  const handleNext = () => {
    if (selectedPatch) {
      onApplyPatch(selectedPatch);
    }
  };

  const aiType = selectedPatch?.aiType || "PATCH";

  return (
    <div className="absolute inset-0 bg-cyber-dark/95 z-50 flex flex-col items-center justify-center p-4 md:p-6 font-mono crt-screen scanline">
      {/* Sound toggle */}
      <button
        onClick={onToggleSound}
        className="absolute top-4 right-4 p-2 rounded-none border border-cyber-green/30 hover:border-cyber-green bg-black text-cyber-green transition-colors cursor-pointer z-20"
        title={soundEnabled ? "Mute audio" : "Unmute audio"}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-4xl flex flex-col bg-black border border-cyber-green/30 rounded-none shadow-2xl overflow-hidden z-10">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#0a0a0d] border-b border-cyber-green/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyber-green animate-pulse" />
            <span className="text-xs font-bold text-cyber-green tracking-wider">
              PATCH.EXE COMPILER // STAGE {round} ANALYSIS
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-red"></span>
            <span className="w-2 h-2 rounded-full bg-cyber-yellow"></span>
            <span className="w-2 h-2 rounded-full bg-cyber-green"></span>
          </div>
        </div>

        {/* Core Body: Character on Left, Terminal on Right */}
        <div className="flex flex-col md:flex-row border-b border-cyber-green/20">
          
          {/* Character Dialogue Screen (Left) */}
          <div className="w-full md:w-80 p-5 bg-black border-b md:border-b-0 md:border-r border-cyber-green/20 flex flex-col items-center justify-start gap-4">
            
            {/* Avatar container */}
            <div className={`w-40 h-52 border relative overflow-hidden bg-[#0c0c0f] ${
              aiType === "PATCH" 
                ? "border-cyber-blue shadow-[0_0_10px_rgba(0,204,255,0.25)]" 
                : "border-cyber-red shadow-[0_0_10px_rgba(255,0,85,0.25)]"
            }`}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundImage: 'url(/assets/characters.png)',
                backgroundSize: '200% 100%',
                backgroundPosition: aiType === "PATCH" ? 'left center' : 'right center',
                backgroundRepeat: 'no-repeat'
              }} />
            </div>

            {/* Character Name Tag */}
            <div className={`text-[10px] font-bold px-3 py-0.5 tracking-wider border select-none ${
              aiType === "PATCH" 
                ? "text-cyber-blue bg-cyber-blue/10 border-cyber-blue/30" 
                : "text-cyber-red bg-cyber-red/10 border-cyber-red/30"
            }`}>
              {aiType === "PATCH" ? "SYSTEM ASSISTANT: PATCH" : "SYSTEM INTERRUPT: GLITCH"}
            </div>

            {/* Balloon text */}
            <div className={`w-full p-3 text-xs leading-relaxed font-sans min-h-[70px] ${
              aiType === "PATCH" ? "text-gray-300 bg-cyber-blue/5 border border-cyber-blue/10" : "text-gray-300 bg-cyber-red/5 border border-cyber-red/10"
            }`}>
              {selectedPatch && currentStep >= 10 ? (
                <span>"{selectedPatch.dialogue}"</span>
              ) : (
                <span className="text-gray-600 italic">"통계를 수집하고 분석값을 연산하는 중..."</span>
              )}
            </div>
          </div>

          {/* Terminal Screen Output (Right) */}
          <div className="flex-1 p-5 min-h-[300px] md:min-h-[360px] max-h-[380px] overflow-y-auto bg-black text-gray-300 text-xs leading-normal">
            <div className="space-y-1.5 font-mono">
              {typedLines.map((line, idx) => {
                if (!line) return null;
                const isWarning = line.includes("WARNING") || line.includes("LOG:") || line.includes("VACCINE");
                const isHeader = line.includes("====");
                const isStatus = line.includes("STATUS:") || line.includes("COMPILING") || line.includes("AWAITING");
                const isValue = line.includes("Accuracy") || line.includes("Damage") || line.includes("Survived") || line.includes("Dash");

                let textColor = "text-gray-400";
                if (isWarning) textColor = "text-cyber-yellow glow-yellow";
                else if (isHeader) textColor = "text-cyber-green/20";
                else if (isStatus) textColor = "text-cyber-green font-bold glow-green";
                else if (isValue) textColor = "text-white";

                return (
                  <div key={idx} className="flex items-start gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-cyber-green/20 shrink-0 mt-0.5" />
                    <span className={textColor}>{line}</span>
                  </div>
                );
              })}

              {currentStep >= 11 && progress < 100 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] text-cyber-green font-mono">
                    <span>STAGED PROTOCOL INTEGRATION</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-[#0a0a0d] h-2 border border-cyber-green/10">
                    <div
                      className="bg-cyber-green h-full shadow-[0_0_8px_rgba(0,255,65,0.5)] transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Panel (Proposed Patch or Remove Patch List) */}
        {showButton && selectedPatch && (
          <div className="p-5 bg-[#07070a] border-t border-cyber-green/20">
            {round === 3 ? (
              // Stage 3: Patch Removal UI
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest">
                    PATCH CLEANUP INTERFACE
                  </span>
                  <p className="text-xs text-gray-400 font-sans">
                    시스템 안정을 위해 아래 활성화된 규칙 중 하나를 선택해 제거할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeRules.length === 0 ? (
                    <div className="col-span-full p-4 border border-dashed border-cyber-blue/30 text-center text-xs text-cyber-blue/60 bg-cyber-blue/5">
                      제거할 수 있는 활성 패치가 존재하지 않습니다.
                    </div>
                  ) : (
                    activeRules.map((rule, idx) => (
                      <button
                        key={idx}
                        onClick={() => onRemovePatch(rule.id)}
                        className="p-3 bg-black border border-cyber-red/30 hover:border-cyber-blue text-left hover:bg-cyber-blue/5 transition-all group cursor-pointer rounded-none"
                      >
                        <div className="text-xs font-bold text-cyber-red group-hover:text-cyber-blue uppercase">
                          {rule.name}
                        </div>
                        <p className="text-[10px] text-gray-500 font-sans mt-1 line-clamp-2">
                          {rule.description}
                        </p>
                        <div className="text-[9px] text-cyber-red/50 group-hover:text-cyber-blue/50 font-bold uppercase mt-2 border-t border-cyber-red/10 group-hover:border-cyber-blue/10 pt-1">
                          WIPE_FILE.EXE
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {activeRules.length === 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-cyber-blue text-black font-bold hover:bg-white hover:text-black transition-all cursor-pointer font-mono text-xs uppercase"
                    >
                      SKIP_CLEANUP.EXE
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Other Stages: Apply Patch UI
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2.5 border rounded-none shadow-inner animate-pulse ${
                    aiType === "PATCH" 
                      ? "bg-cyber-blue/10 border-cyber-blue/30 text-cyber-blue" 
                      : "bg-cyber-red/10 border-cyber-red/30 text-cyber-red"
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${aiType === "PATCH" ? "glow-blue" : "glow-red"}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      PROPOSED PROTOCOL CHANGE
                    </div>
                    <h3 className={`text-base font-bold font-mono tracking-tight flex items-center gap-2 ${
                      aiType === "PATCH" ? "text-cyber-blue glow-blue" : "text-cyber-red glow-red"
                    }`}>
                      {selectedPatch.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-sans">{selectedPatch.description}</p>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className={`w-full md:w-auto px-8 py-3 font-bold transition-all cursor-pointer flex items-center justify-center gap-2 font-mono uppercase tracking-wide shrink-0 rounded-none text-xs ${
                    aiType === "PATCH"
                      ? "bg-cyber-blue text-black hover:bg-white hover:text-black"
                      : "bg-cyber-red text-white hover:bg-white hover:text-black"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>APPLY & COMPLY</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
