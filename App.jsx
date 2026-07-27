import React, { useState, useEffect, useRef, useCallback } from "react";

/* =========================================================================
   THE SYSTEM — Dev's Physique Ascension Tracker
   Solo Leveling-style progression UI wired to real training + nutrition data
   ========================================================================= */

// ---------- Constants: your actual program (from uploaded routine + PDF) ----------
const DEFAULT_ROUTINE = {
  "Upper 1": [
    { name: "Bench Press (Smith Machine)", sets: 3, repRange: "6-10", rest: 120 },
    { name: "Incline Bench Press (Dumbbell)", sets: 3, repRange: "6-10", rest: 120 },
    { name: "Lat Pulldown (Cable, wide)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Shoulder Press (Dumbbell)", sets: 3, repRange: "8-12", rest: 90 },
    { name: "Single Arm Lateral Raise (Cable)", sets: 4, repRange: "12-15", rest: 60 },
    { name: "Face Pull", sets: 3, repRange: "12-15", rest: 60 },
    { name: "Triceps Pushdown", sets: 3, repRange: "10-12", rest: 60 },
  ],
  "Lower 1": [
    { name: "Squat (Smith Machine)", sets: 3, repRange: "6-10", rest: 150 },
    { name: "Bulgarian Split Squat", sets: 3, repRange: "8-10", rest: 90 },
    { name: "Leg Press (Machine)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Lying Leg Curl (Machine)", sets: 3, repRange: "12-15", rest: 60 },
    { name: "Leg Extension (Machine)", sets: 3, repRange: "12-15", rest: 60 },
    { name: "Standing Calf Raise (Machine)", sets: 4, repRange: "12-15", rest: 45 },
    { name: "Tibialis Raise", sets: 2, repRange: "10-12", rest: 45 },
    { name: "Hanging Leg Raise", sets: 3, repRange: "12-15", rest: 60 },
  ],
  "Upper 2": [
    { name: "Lat Pulldown (Cable, wide)", sets: 3, repRange: "8-12", rest: 90 },
    { name: "T Bar Row", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Iso-Lateral Row (Machine)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Incline Bench Press (Dumbbell)", sets: 3, repRange: "8-10", rest: 120 },
    { name: "Side Reverse Pec Deck", sets: 4, repRange: "12-15", rest: 60 },
    { name: "Preacher Curl (Machine)", sets: 2, repRange: "10-12", rest: 60 },
    { name: "Overhead Triceps Extension (Cable)", sets: 2, repRange: "12-13", rest: 60 },
  ],
  "Lower 2": [
    { name: "Deadlift (Barbell)", sets: 3, repRange: "4-6", rest: 180 },
    { name: "Romanian Deadlift (Barbell)", sets: 3, repRange: "8-10", rest: 120 },
    { name: "Hip Thrust (Barbell)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Standing Calf Raise (Machine)", sets: 3, repRange: "12-15", rest: 45 },
    { name: "Walking Lunge (Dumbbell)", sets: 2, repRange: "10/leg", rest: 90 },
    { name: "Lying Leg Curl (Machine)", sets: 2, repRange: "10-12", rest: 60 },
    { name: "Seated Cable Deadlift", sets: 2, repRange: "10-12", rest: 60 },
    { name: "Cable Crunch", sets: 3, repRange: "12-15", rest: 60 },
  ],
  "Upper 3": [
    { name: "Incline Bench Press (Smith Machine)", sets: 3, repRange: "6-10", rest: 120 },
    { name: "Chest Fly (Machine)", sets: 3, repRange: "8-10", rest: 90 },
    { name: "Seated Cable Row - Wide Grip", sets: 3, repRange: "8-12", rest: 90 },
    { name: "Shoulder Press (Dumbbell)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Rear Delt Reverse Fly (Cable)", sets: 3, repRange: "10-12", rest: 60 },
    { name: "Behind the Back Curl (Cable)", sets: 2, repRange: "10", rest: 60 },
    { name: "Rope Straight Arm Pulldown", sets: 2, repRange: "10-12", rest: 60 },
  ],
  "Lower 3": [
    { name: "Leg Press (Machine)", sets: 3, repRange: "12-15", rest: 120 },
    { name: "Lying Leg Curl (Machine)", sets: 3, repRange: "10-12", rest: 90 },
    { name: "Hip Abduction (Machine)", sets: 3, repRange: "15-20", rest: 60 },
    { name: "Lunge (Dumbbell)", sets: 2, repRange: "8-10/leg", rest: 90 },
    { name: "Tibialis Raise", sets: 2, repRange: "12-15", rest: 45 },
    { name: "Standing Calf Raise (Machine)", sets: 2, repRange: "15", rest: 45 },
    { name: "Hanging Knee Raise", sets: 3, repRange: "15", rest: 60 },
  ],
};
const DAY_ORDER = ["Upper 1", "Lower 1", "Rest", "Upper 2", "Lower 2", "Rest", "Upper 3", "Lower 3", "Rest"];

// ---------- Food database: macros per unit (auto-scales by quantity, MyFitnessPal-style) ----------
const FOOD_DB = [
  { name: "Egg, whole (boiled/fried)", unit: "piece", unitGrams: 50, cal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { name: "Egg white", unit: "piece", unitGrams: 33, cal: 17, protein: 3.6, carbs: 0.2, fat: 0.1 },
  { name: "Chicken breast, cooked", unit: "100g", unitGrams: 100, cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Chicken thigh, cooked", unit: "100g", unitGrams: 100, cal: 209, protein: 26, carbs: 0, fat: 10.9 },
  { name: "Basmati rice, cooked", unit: "100g", unitGrams: 100, cal: 121, protein: 2.7, carbs: 25, fat: 0.4 },
  { name: "Roti / chapati (whole wheat)", unit: "piece", unitGrams: 40, cal: 104, protein: 3.1, carbs: 18, fat: 2.5 },
  { name: "Oats, dry", unit: "100g", unitGrams: 100, cal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { name: "Greek yogurt, plain", unit: "100g", unitGrams: 100, cal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: "Curd / dahi (whole milk)", unit: "100g", unitGrams: 100, cal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: "Milk, whole", unit: "100ml", unitGrams: 100, cal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: "Whey protein powder", unit: "scoop (30g)", unitGrams: 30, cal: 113, protein: 24, carbs: 2.5, fat: 1.3 },
  { name: "Paneer", unit: "100g", unitGrams: 100, cal: 265, protein: 18.3, carbs: 1.2, fat: 20.8 },
  { name: "Peanut butter", unit: "100g", unitGrams: 100, cal: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Almonds", unit: "100g", unitGrams: 100, cal: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { name: "Banana", unit: "piece", unitGrams: 118, cal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Apple", unit: "piece", unitGrams: 182, cal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Sweet potato, boiled", unit: "100g", unitGrams: 100, cal: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
  { name: "Potato, boiled", unit: "100g", unitGrams: 100, cal: 87, protein: 1.9, carbs: 20.1, fat: 0.1 },
  { name: "Groundnut / peanut oil", unit: "tbsp (14g)", unitGrams: 14, cal: 124, protein: 0, carbs: 0, fat: 14 },
  { name: "Ghee", unit: "tbsp (14g)", unitGrams: 14, cal: 126, protein: 0, carbs: 0, fat: 14 },
  { name: "Spinach, cooked", unit: "100g", unitGrams: 100, cal: 23, protein: 2.9, carbs: 3.8, fat: 0.4 },
  { name: "Cabbage, cooked", unit: "100g", unitGrams: 100, cal: 25, protein: 1.3, carbs: 5.8, fat: 0.1 },
  { name: "Green capsicum, raw", unit: "100g", unitGrams: 100, cal: 20, protein: 0.9, carbs: 4.6, fat: 0.2 },
  { name: "Cucumber, raw", unit: "100g", unitGrams: 100, cal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: "Tomato, raw", unit: "100g", unitGrams: 100, cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Onion, raw", unit: "100g", unitGrams: 100, cal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { name: "Lentils / dal, cooked", unit: "100g", unitGrams: 100, cal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Chickpeas / chana, cooked", unit: "100g", unitGrams: 100, cal: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
  { name: "Black coffee (no sugar)", unit: "cup (240ml)", unitGrams: 240, cal: 2, protein: 0.3, carbs: 0, fat: 0 },
  { name: "Fish, tilapia/rohu cooked", unit: "100g", unitGrams: 100, cal: 128, protein: 26, carbs: 0, fat: 2.7 },
  { name: "Salmon, cooked", unit: "100g", unitGrams: 100, cal: 208, protein: 22, carbs: 0, fat: 13 },
  { name: "Chia seeds", unit: "tbsp (12g)", unitGrams: 12, cal: 58, protein: 2, carbs: 5, fat: 3.7 },
  { name: "Flax seeds", unit: "tbsp (10g)", unitGrams: 10, cal: 55, protein: 1.9, carbs: 3, fat: 4.3 },
  { name: "Pumpkin seeds", unit: "tbsp (9g)", unitGrams: 9, cal: 50, protein: 2.7, carbs: 1.4, fat: 4.3 },
  { name: "Whole wheat bread", unit: "slice (28g)", unitGrams: 28, cal: 69, protein: 3.6, carbs: 12, fat: 0.9 },
  { name: "Cooking spray / minimal oil", unit: "spray", unitGrams: 1, cal: 7, protein: 0, carbs: 0, fat: 0.8 },
];
function searchFoods(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
}
// Scales any food's macros by quantity of its stated unit (e.g. 2 eggs, 150 of "100g" chicken = 1.5x)
function computeMacros(food, quantity) {
  const qty = quantity || 0;
  return {
    cal: Math.round(food.cal * qty),
    protein: +(food.protein * qty).toFixed(1),
    carbs: +(food.carbs * qty).toFixed(1),
    fat: +(food.fat * qty).toFixed(1),
    grams: Math.round(food.unitGrams * qty),
  };
}

const STATS = ["STR", "END", "VIT", "AGI", "WIS", "DISC"];
const STAT_LABELS = {
  STR: "Strength", END: "Endurance", VIT: "Vitality", AGI: "Agility", WIS: "Wisdom", DISC: "Discipline",
};
// which stat gets XP for which muscle group emphasis
const MUSCLE_STAT = {
  "Bench Press (Smith Machine)": "STR", "Incline Bench Press (Dumbbell)": "STR",
  "Incline Bench Press (Smith Machine)": "STR", "Chest Fly (Machine)": "STR",
  "Squat (Smith Machine)": "STR", "Deadlift (Barbell)": "STR", "Leg Press (Machine)": "STR",
  "Romanian Deadlift (Barbell)": "END", "Hip Thrust (Barbell)": "VIT",
  "Lat Pulldown (Cable, wide)": "AGI", "T Bar Row": "AGI", "Iso-Lateral Row (Machine)": "AGI",
  "Seated Cable Row - Wide Grip": "AGI", "Shoulder Press (Dumbbell)": "STR",
  "Single Arm Lateral Raise (Cable)": "AGI", "Side Reverse Pec Deck": "AGI",
  "Face Pull": "VIT", "Rear Delt Reverse Fly (Cable)": "VIT",
  "Triceps Pushdown": "STR", "Preacher Curl (Machine)": "STR", "Overhead Triceps Extension (Cable)": "STR",
  "Behind the Back Curl (Cable)": "STR", "Rope Straight Arm Pulldown": "AGI",
  "Bulgarian Split Squat": "END", "Lying Leg Curl (Machine)": "END", "Leg Extension (Machine)": "END",
  "Standing Calf Raise (Machine)": "AGI", "Tibialis Raise": "AGI", "Walking Lunge (Dumbbell)": "END",
  "Seated Cable Deadlift": "END", "Cable Crunch": "VIT", "Hanging Leg Raise": "VIT",
  "Hip Abduction (Machine)": "END", "Lunge (Dumbbell)": "END", "Hanging Knee Raise": "VIT",
};

const RANKS = [
  { min: 1, max: 4, name: "E-Rank Hunter", color: "#7a8699" },
  { min: 5, max: 9, name: "D-Rank Hunter", color: "#5cb8ff" },
  { min: 10, max: 14, name: "C-Rank Hunter", color: "#4d7fff" },
  { min: 15, max: 19, name: "B-Rank Hunter", color: "#9b5cff" },
  { min: 20, max: 29, name: "A-Rank Hunter", color: "#c15cff" },
  { min: 30, max: 39, name: "S-Rank Hunter", color: "#ffd700" },
  { min: 40, max: 999, name: "Monarch", color: "#ff3b6a" },
];
function rankFor(level) {
  return RANKS.find(r => level >= r.min && level <= r.max) || RANKS[0];
}
function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

// ---------- Storage helpers (localStorage — persists in this browser only) ----------
async function storeGet(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
async function storeSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage full or unavailable */ }
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function defaultState() {
  return {
    level: 1,
    xp: 0,
    stats: { STR: 1, END: 1, VIT: 1, AGI: 1, WIS: 1, DISC: 1 },
    statPoints: 0,
    streak: 0,
    lastCompleteDate: null,
    dayIndex: 0, // index into DAY_ORDER
    targets: { calories: 1800, protein: 180, carbs: 150, fat: 50, water: 3000, steps: 10000 },
    routine: JSON.parse(JSON.stringify(DEFAULT_ROUTINE)), // editable copy — day -> [{name, sets, repRange, rest}]
    logs: {}, // date -> { quests: {}, sets: {name: [{w,r,done}]}, meals: [], steps, caloriesBurned, water }
  };
}

// Finds the most recent logged weight/reps for an exercise, searching backward through days (excluding today)
function findPreviousSets(logs, exName, excludeDate) {
  const dates = Object.keys(logs).sort().reverse();
  for (const d of dates) {
    if (d === excludeDate) continue;
    const sets = logs[d]?.sets?.[exName];
    if (sets && sets.some(s => s && (s.weight || s.reps))) {
      return { date: d, sets };
    }
  }
  return null;
}

// ---------- Sound-free "glitch" popup system ----------
function useSystemPopups() {
  const [queue, setQueue] = useState([]);
  const push = useCallback((popup) => {
    setQueue(q => [...q, { id: Date.now() + Math.random(), ...popup }]);
  }, []);
  const dismiss = useCallback((id) => {
    setQueue(q => q.filter(p => p.id !== id));
  }, []);
  return { queue, push, dismiss };
}

// ---------- Browser notification helper ----------
function ensureNotifyPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
function fireBrowserNotification(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: undefined });
    }
  } catch (e) { /* ignore */ }
}

// =========================================================================
// SYSTEM WINDOW (the signature visual component)
// =========================================================================
function SystemWindow({ popup, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(popup.id), popup.duration || 3600);
    return () => clearTimeout(t);
  }, [popup, onDismiss]);

  return (
    <div className="sw-overlay" onClick={() => onDismiss(popup.id)}>
      <div className={`sw-panel sw-${popup.kind}`}>
        <div className="sw-corner tl" /><div className="sw-corner tr" />
        <div className="sw-corner bl" /><div className="sw-corner br" />
        <div className="sw-scanline" />
        <div className="sw-title">{popup.title}</div>
        <div className="sw-body">
          {popup.lines.map((l, i) => <div className="sw-line" key={i}>{l}</div>)}
        </div>
        <div className="sw-tap">[ tap to close ]</div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN APP
// =========================================================================
export default function SystemApp() {
  const [state, setState] = useState(defaultState());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("status");
  const { queue, push, dismiss } = useSystemPopups();
  const dailyReminderFired = useRef(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      const saved = await storeGet("system-state-v1");
      if (saved) setState({ ...defaultState(), ...saved });
      setLoaded(true);
    })();
    ensureNotifyPermission();
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!loaded) return;
    storeSet("system-state-v1", state);
  }, [state, loaded]);

  // Daily reminder popup + browser notification (fires once per session after load)
  useEffect(() => {
    if (!loaded || dailyReminderFired.current) return;
    dailyReminderFired.current = true;
    const day = DAY_ORDER[state.dayIndex];
    const isRest = day === "Rest";
    const title = isRest ? "REST DAY — RECOVERY PROTOCOL" : `TODAY'S DUNGEON: ${day.toUpperCase()}`;
    const body = isRest
      ? "No lifting today. Hit your step + protein targets to keep the streak alive."
      : `${(state.routine[day] || []).length} exercises queued. Complete them to gain XP and level up.`;
    setTimeout(() => {
      push({
        kind: "quest",
        title: "DAILY QUEST ISSUED",
        lines: [title, body, "Failure to comply will not stop the sun from rising, but your gains will suffer."],
        duration: 5000,
      });
      fireBrowserNotification("Daily Quest Issued", body);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const today = todayKey();
  const todayLog = state.logs[today] || { quests: {}, sets: {}, meals: [], steps: 0, caloriesBurned: 0, water: 0 };

  function updateTodayLog(patch) {
    setState(s => ({
      ...s,
      logs: { ...s.logs, [today]: { ...(s.logs[today] || { quests: {}, sets: {}, meals: [], steps: 0, caloriesBurned: 0, water: 0 }), ...patch } },
    }));
  }

  function grantXP(amount, statKey, reason) {
    setState(s => {
      let xp = s.xp + amount;
      let level = s.level;
      let statPoints = s.statPoints;
      let leveledUp = false;
      let need = xpForLevel(level);
      while (xp >= need) {
        xp -= need;
        level += 1;
        statPoints += 3;
        leveledUp = true;
        need = xpForLevel(level);
      }
      const stats = { ...s.stats };
      if (statKey) stats[statKey] = (stats[statKey] || 0) + 1;
      if (leveledUp) {
        setTimeout(() => {
          push({
            kind: "levelup",
            title: "LEVEL UP!",
            lines: [`You have reached Level ${level}.`, `Rank: ${rankFor(level).name}`, `+${statPoints - s.statPoints} unspent stat points available.`],
            duration: 4500,
          });
          fireBrowserNotification("LEVEL UP!", `You reached Level ${level} — ${rankFor(level).name}`);
        }, 100);
      } else {
        push({ kind: "xp", title: "XP GAINED", lines: [reason, `+${amount} XP`], duration: 1800 });
      }
      return { ...s, xp, level, statPoints, stats };
    });
  }

  // Logs a completed set with real weight + reps (Hevy-style), grants XP, checks for PR
  function logSet(exName, setIdx, weight, reps) {
    const sets = todayLog.sets[exName] || [];
    const newSets = [...sets];
    newSets[setIdx] = { weight: +weight || 0, reps: +reps || 0, done: true };
    updateTodayLog({ sets: { ...todayLog.sets, [exName]: newSets } });

    // PR check against best previous same-exercise set
    const prev = findPreviousSets(state.logs, exName, today);
    let isPR = false;
    if (prev) {
      const prevBest = Math.max(0, ...prev.sets.filter(Boolean).map(s => (s.weight || 0) * (s.reps || 0)));
      const thisVol = (+weight || 0) * (+reps || 0);
      if (thisVol > prevBest && prevBest > 0) isPR = true;
    }
    grantXP(8, MUSCLE_STAT[exName] || "STR", `${exName} — set ${setIdx + 1}: ${weight}kg × ${reps}`);
    if (isPR) {
      setTimeout(() => {
        push({ kind: "levelup", title: "NEW PERSONAL RECORD", lines: [exName, `${weight}kg × ${reps} reps`, "Your limits have been exceeded."], duration: 3200 });
        fireBrowserNotification("New Personal Record!", `${exName}: ${weight}kg × ${reps}`);
      }, 250);
    }
  }

  function toggleQuest(key, xpAmt, statKey, label) {
    const wasDone = !!todayLog.quests[key];
    updateTodayLog({ quests: { ...todayLog.quests, [key]: !wasDone } });
    if (!wasDone) grantXP(xpAmt, statKey, label);
  }

  function advanceDay() {
    setState(s => ({ ...s, dayIndex: (s.dayIndex + 1) % DAY_ORDER.length }));
    dailyReminderFired.current = false;
  }

  function addStatPoint(stat) {
    if (state.statPoints <= 0) return;
    setState(s => ({ ...s, stats: { ...s.stats, [stat]: s.stats[stat] + 1 }, statPoints: s.statPoints - 1 }));
  }

  // ---- Routine editor operations ----
  function updateExercise(day, idx, patch) {
    setState(s => {
      const dayList = [...(s.routine[day] || [])];
      dayList[idx] = { ...dayList[idx], ...patch };
      return { ...s, routine: { ...s.routine, [day]: dayList } };
    });
  }
  function addExercise(day) {
    setState(s => {
      const dayList = [...(s.routine[day] || []), { name: "New Exercise", sets: 3, repRange: "8-12", rest: 90 }];
      return { ...s, routine: { ...s.routine, [day]: dayList } };
    });
  }
  function removeExercise(day, idx) {
    setState(s => {
      const dayList = (s.routine[day] || []).filter((_, i) => i !== idx);
      return { ...s, routine: { ...s.routine, [day]: dayList } };
    });
  }

  if (!loaded) {
    return <div className="boot"><div className="boot-text">[ SYSTEM INITIALIZING... ]</div><style>{GLOBAL_CSS}</style></div>;
  }

  const rank = rankFor(state.level);
  const needed = xpForLevel(state.level);
  const pct = Math.min(100, (state.xp / needed) * 100);
  const day = DAY_ORDER[state.dayIndex];

  return (
    <div className="app-root">
      <style>{GLOBAL_CSS}</style>

      {queue.map(p => <SystemWindow key={p.id} popup={p} onDismiss={dismiss} />)}

      <header className="topbar">
        <div className="topbar-rank" style={{ color: rank.color, borderColor: rank.color }}>{rank.name}</div>
        <div className="topbar-lvl">LV. {state.level}</div>
      </header>

      <div className="xpbar-wrap">
        <div className="xpbar-fill" style={{ width: `${pct}%` }} />
        <div className="xpbar-text">{state.xp} / {needed} XP</div>
      </div>

      <main className="content">
        {tab === "status" && (
          <StatusTab state={state} rank={rank} addStatPoint={addStatPoint} day={day} advanceDay={advanceDay}
            todayLog={todayLog} />
        )}
        {tab === "quests" && (
          <QuestsTab day={day} todayLog={todayLog} logSet={logSet} toggleQuest={toggleQuest}
            targets={state.targets} routine={state.routine} logs={state.logs} today={today}
            updateExercise={updateExercise} addExercise={addExercise} removeExercise={removeExercise} />
        )}
        {tab === "nutrition" && (
          <NutritionTab todayLog={todayLog} updateTodayLog={updateTodayLog} targets={state.targets}
            setState={setState} grantXP={grantXP} />
        )}
        {tab === "log" && (
          <LogTab state={state} />
        )}
      </main>

      <nav className="tabbar">
        {[
          ["status", "STATUS"],
          ["quests", "QUESTS"],
          ["nutrition", "NUTRITION"],
          ["log", "LOG"],
        ].map(([key, label]) => (
          <button key={key} className={`tabbtn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// =========================================================================
// STATUS TAB
// =========================================================================
function StatusTab({ state, rank, addStatPoint, day, advanceDay, todayLog }) {
  const questsDoneCount = Object.values(todayLog.quests).filter(Boolean).length;
  return (
    <div className="panel">
      <div className="panel-header">STATUS WINDOW</div>
      <div className="status-grid">
        <div className="status-row"><span>Name</span><span>Dev (Devaraj M. Patil)</span></div>
        <div className="status-row"><span>Title</span><span>Aspiring Diplomat</span></div>
        <div className="status-row"><span>Rank</span><span style={{ color: rank.color }}>{rank.name}</span></div>
        <div className="status-row"><span>Level</span><span>{state.level}</span></div>
        <div className="status-row"><span>Streak</span><span>{state.streak} 🔥</span></div>
        <div className="status-row"><span>Today's Dungeon</span><span>{day}</span></div>
      </div>

      <div className="panel-header" style={{ marginTop: 18 }}>STATS {state.statPoints > 0 && <span className="pulse">— {state.statPoints} POINTS UNSPENT</span>}</div>
      <div className="stats-grid">
        {STATS.map(s => (
          <div className="stat-card" key={s}>
            <div className="stat-name">{s}</div>
            <div className="stat-val">{state.stats[s]}</div>
            <div className="stat-full">{STAT_LABELS[s]}</div>
            {state.statPoints > 0 && (
              <button className="stat-plus" onClick={() => addStatPoint(s)}>+</button>
            )}
          </div>
        ))}
      </div>

      <button className="advance-btn" onClick={advanceDay}>
        [ ADVANCE TO NEXT DAY ] {questsDoneCount === 0 && "— quests today: none logged yet"}
      </button>
    </div>
  );
}

// =========================================================================
// QUESTS TAB
// =========================================================================
function QuestsTab({ day, todayLog, logSet, toggleQuest, targets, routine, logs, today,
  updateExercise, addExercise, removeExercise }) {
  const [editMode, setEditMode] = useState(false);
  const isRest = day === "Rest";
  const exercises = isRest ? [] : (routine[day] || []);

  const dailyQuests = [
    { key: "steps", label: `Walk ${targets.steps.toLocaleString()} steps`, xp: 15, stat: "AGI" },
    { key: "protein", label: `Hit protein target (${targets.protein}g)`, xp: 20, stat: "VIT" },
    { key: "water", label: `Drink ${(targets.water / 1000).toFixed(1)}L water`, xp: 10, stat: "VIT" },
    { key: "sleep", label: "Sleep 7+ hours", xp: 15, stat: "WIS" },
    { key: "study", label: "Complete UPSC study block", xp: 25, stat: "WIS" },
  ];

  return (
    <div className="panel">
      <div className="panel-header-row">
        <div className="panel-header" style={{ marginBottom: 0, border: "none", padding: 0 }}>
          {isRest ? "REST DAY QUESTS" : `${day.toUpperCase()} — DUNGEON QUEST`}
        </div>
        {!isRest && (
          <button className="edit-toggle" onClick={() => setEditMode(m => !m)}>
            {editMode ? "DONE" : "EDIT"}
          </button>
        )}
      </div>

      {!isRest && exercises.map((ex, exIdx) => (
        editMode
          ? <ExerciseEditorRow key={exIdx} ex={ex} onChange={p => updateExercise(day, exIdx, p)}
              onRemove={() => removeExercise(day, exIdx)} />
          : <ExerciseLogCard key={exIdx} ex={ex} sets={todayLog.sets[ex.name] || []}
              prev={findPreviousSets(logs, ex.name, today)} onLogSet={(i, w, r) => logSet(ex.name, i, w, r)} />
      ))}

      {!isRest && editMode && (
        <button className="add-btn" onClick={() => addExercise(day)}>[ + ADD EXERCISE TO {day.toUpperCase()} ]</button>
      )}

      <div className="panel-header" style={{ marginTop: 20 }}>DAILY QUESTS</div>
      {dailyQuests.map(q => {
        const done = !!todayLog.quests[q.key];
        return (
          <button key={q.key} className={`daily-quest ${done ? "done" : ""}`} onClick={() => toggleQuest(q.key, q.xp, q.stat, q.label)}>
            <span>{done ? "☑" : "☐"} {q.label}</span>
            <span className="xp-tag">+{q.xp} XP</span>
          </button>
        );
      })}
    </div>
  );
}

// Hevy-style per-set logger: shows previous session's weight×reps as a ghost placeholder
function ExerciseLogCard({ ex, sets, prev, onLogSet }) {
  const [draft, setDraft] = useState({}); // setIdx -> {weight, reps}

  return (
    <div className="quest-card">
      <div className="quest-name">{ex.name}</div>
      <div className="quest-meta">{ex.sets} sets × {ex.repRange} reps · rest {ex.rest}s</div>
      {prev && <div className="prev-session">Last time ({prev.date}): {prev.sets.filter(Boolean).map((s, i) => `${s.weight || 0}kg×${s.reps || 0}`).join("  ·  ")}</div>}

      <div className="set-table">
        <div className="set-table-header"><span>SET</span><span>KG</span><span>REPS</span><span /></div>
        {Array.from({ length: ex.sets }).map((_, i) => {
          const done = sets[i]?.done;
          const prevSet = prev?.sets?.[i];
          const d = draft[i] || {};
          return (
            <div className={`set-table-row ${done ? "done" : ""}`} key={i}>
              <span className="set-num">{i + 1}</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={prevSet ? String(prevSet.weight) : "0"}
                value={done ? sets[i].weight : (d.weight ?? "")}
                disabled={done}
                onChange={e => setDraft(dr => ({ ...dr, [i]: { ...dr[i], weight: e.target.value } }))}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder={prevSet ? String(prevSet.reps) : "0"}
                value={done ? sets[i].reps : (d.reps ?? "")}
                disabled={done}
                onChange={e => setDraft(dr => ({ ...dr, [i]: { ...dr[i], reps: e.target.value } }))}
              />
              <button
                className={`set-check ${done ? "done" : ""}`}
                disabled={done}
                onClick={() => onLogSet(i, d.weight || prevSet?.weight || 0, d.reps || prevSet?.reps || 0)}
              >
                {done ? "✓" : "LOG"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Inline editor row for building/adjusting your own routine
function ExerciseEditorRow({ ex, onChange, onRemove }) {
  return (
    <div className="editor-row">
      <input className="editor-name" value={ex.name} onChange={e => onChange({ name: e.target.value })} />
      <div className="editor-fields">
        <label>Sets <input type="number" value={ex.sets} onChange={e => onChange({ sets: +e.target.value || 0 })} /></label>
        <label>Reps <input type="text" value={ex.repRange} onChange={e => onChange({ repRange: e.target.value })} /></label>
        <label>Rest (s) <input type="number" value={ex.rest} onChange={e => onChange({ rest: +e.target.value || 0 })} /></label>
      </div>
      <button className="editor-remove" onClick={onRemove}>REMOVE</button>
    </div>
  );
}

// =========================================================================
// NUTRITION TAB
// =========================================================================
function NutritionTab({ todayLog, updateTodayLog, targets, setState, grantXP }) {
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState({ name: "", cal: "", protein: "", carbs: "", fat: "" });
  const [stepsInput, setStepsInput] = useState(todayLog.steps || 0);
  const [burnInput, setBurnInput] = useState(todayLog.caloriesBurned || 0);
  const [waterInput, setWaterInput] = useState(todayLog.water || 0);

  const results = searchFoods(query);
  const preview = selectedFood ? computeMacros(selectedFood, +quantity) : null;

  const totals = (todayLog.meals || []).reduce((acc, m) => ({
    cal: acc.cal + (+m.cal || 0), protein: acc.protein + (+m.protein || 0),
    carbs: acc.carbs + (+m.carbs || 0), fat: acc.fat + (+m.fat || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 });

  const deficit = (todayLog.caloriesBurned || 0) + 1600 /* base BMR estimate */ - totals.cal;

  function addFromDB() {
    if (!selectedFood) return;
    const m = computeMacros(selectedFood, +quantity);
    const entry = { name: `${selectedFood.name} (${quantity} ${selectedFood.unit})`, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat };
    updateTodayLog({ meals: [...(todayLog.meals || []), entry] });
    grantXP(5, "VIT", `Logged: ${entry.name}`);
    setSelectedFood(null); setQuery(""); setQuantity(1);
  }

  function addManual() {
    if (!manual.name || !manual.cal) return;
    updateTodayLog({ meals: [...(todayLog.meals || []), manual] });
    grantXP(5, "VIT", `Logged meal: ${manual.name}`);
    setManual({ name: "", cal: "", protein: "", carbs: "", fat: "" });
  }

  function saveMetrics() {
    updateTodayLog({ steps: +stepsInput, caloriesBurned: +burnInput, water: +waterInput });
  }

  return (
    <div className="panel">
      <div className="panel-header">NUTRITION LEDGER</div>

      <div className="macro-grid">
        <MacroBar label="Calories" val={totals.cal} target={targets.calories} unit="kcal" />
        <MacroBar label="Protein" val={totals.protein} target={targets.protein} unit="g" />
        <MacroBar label="Carbs" val={totals.carbs} target={targets.carbs} unit="g" />
        <MacroBar label="Fat" val={totals.fat} target={targets.fat} unit="g" />
      </div>

      <div className="deficit-line">Estimated deficit today: <b>{deficit > 0 ? `-${deficit}` : `+${-deficit}`} kcal</b></div>

      <div className="panel-header-row" style={{ marginTop: 16 }}>
        <div className="panel-header" style={{ marginBottom: 0, border: "none", padding: 0 }}>LOG FOOD</div>
        <button className="edit-toggle" onClick={() => setManualMode(m => !m)}>{manualMode ? "SEARCH" : "MANUAL"}</button>
      </div>

      {!manualMode ? (
        <div className="food-search">
          <input
            placeholder="Search food (e.g. chicken breast, egg, rice)"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedFood(null); }}
          />
          {results.length > 0 && !selectedFood && (
            <div className="food-results">
              {results.map(f => (
                <button key={f.name} className="food-result" onClick={() => { setSelectedFood(f); setQuery(f.name); }}>
                  {f.name} <span className="food-unit">— per {f.unit}: {f.cal}kcal, P{f.protein} C{f.carbs} F{f.fat}</span>
                </button>
              ))}
            </div>
          )}
          {selectedFood && (
            <div className="food-selected">
              <div className="food-selected-name">{selectedFood.name}</div>
              <label className="qty-label">
                Quantity ({selectedFood.unit})
                <input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </label>
              {preview && (
                <div className="macro-preview">
                  <span>{preview.grams}g</span><span>{preview.cal} kcal</span>
                  <span>P {preview.protein}g</span><span>C {preview.carbs}g</span><span>F {preview.fat}g</span>
                </div>
              )}
              <button className="add-btn" onClick={addFromDB}>[ + ADD TO LOG — +5 XP ]</button>
            </div>
          )}
        </div>
      ) : (
        <div className="meal-form">
          <input placeholder="Meal name" value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} />
          <div className="meal-form-row">
            <input placeholder="kcal" type="number" value={manual.cal} onChange={e => setManual({ ...manual, cal: e.target.value })} />
            <input placeholder="protein g" type="number" value={manual.protein} onChange={e => setManual({ ...manual, protein: e.target.value })} />
            <input placeholder="carbs g" type="number" value={manual.carbs} onChange={e => setManual({ ...manual, carbs: e.target.value })} />
            <input placeholder="fat g" type="number" value={manual.fat} onChange={e => setManual({ ...manual, fat: e.target.value })} />
          </div>
          <button className="add-btn" onClick={addManual}>[ + LOG MEAL — +5 XP ]</button>
        </div>
      )}

      {(todayLog.meals || []).length > 0 && (
        <div className="meal-list">
          {todayLog.meals.map((m, i) => (
            <div className="meal-item" key={i}>
              <span>{m.name}</span>
              <span>{m.cal} kcal · P{m.protein} C{m.carbs} F{m.fat}</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel-header" style={{ marginTop: 20 }}>DAILY METRICS</div>
      <div className="metrics-form">
        <label>Steps <input type="number" value={stepsInput} onChange={e => setStepsInput(e.target.value)} /></label>
        <label>Calories burned (active) <input type="number" value={burnInput} onChange={e => setBurnInput(e.target.value)} /></label>
        <label>Water (ml) <input type="number" value={waterInput} onChange={e => setWaterInput(e.target.value)} /></label>
        <button className="add-btn" onClick={saveMetrics}>[ SAVE METRICS ]</button>
      </div>
    </div>
  );
}

function MacroBar({ label, val, target, unit }) {
  const pct = Math.min(100, (val / target) * 100);
  const over = val > target;
  return (
    <div className="macrobar">
      <div className="macrobar-label"><span>{label}</span><span>{val}/{target}{unit}</span></div>
      <div className="macrobar-track"><div className={`macrobar-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// =========================================================================
// LOG TAB (history)
// =========================================================================
function LogTab({ state }) {
  const dates = Object.keys(state.logs).sort().reverse().slice(0, 14);
  return (
    <div className="panel">
      <div className="panel-header">HUNTER LOG — LAST 14 DAYS</div>
      {dates.length === 0 && <div className="empty-log">No entries yet. Complete quests to build your log.</div>}
      {dates.map(d => {
        const log = state.logs[d];
        const setsDone = Object.values(log.sets || {}).flat().filter(s => s?.done).length;
        const questsDone = Object.values(log.quests || {}).filter(Boolean).length;
        return (
          <div className="log-entry" key={d}>
            <div className="log-date">{d}</div>
            <div className="log-meta">{setsDone} sets logged · {questsDone} quests · {log.steps || 0} steps · {(log.meals || []).length} meals</div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// GLOBAL CSS — the System's visual identity
// =========================================================================
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #05070c; }

.boot { height: 100vh; display:flex; align-items:center; justify-content:center; background:#05070c; }
.boot-text { font-family: 'Orbitron', monospace; color:#4d7fff; letter-spacing:3px; animation: flicker 1.2s infinite; }

.app-root {
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #0d1220 0%, #05070c 60%);
  color: #cdd6e8;
  font-family: 'Rajdhani', sans-serif;
  display: flex;
  flex-direction: column;
  padding-bottom: 70px;
}

.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px 8px;
}
.topbar-rank {
  font-family: 'Orbitron', monospace; font-size: 12px; letter-spacing: 2px;
  border: 1px solid; padding: 4px 10px; border-radius: 2px;
  text-shadow: 0 0 8px currentColor;
}
.topbar-lvl {
  font-family: 'Orbitron', monospace; font-weight: 900; font-size: 20px;
  color: #4d7fff; text-shadow: 0 0 12px #4d7fff88;
}

.xpbar-wrap {
  position: relative; margin: 0 18px 14px; height: 22px;
  background: #0a0e18; border: 1px solid #1e2740; border-radius: 3px; overflow: hidden;
}
.xpbar-fill {
  height: 100%; background: linear-gradient(90deg, #2a4dff, #7c5cff);
  box-shadow: 0 0 10px #4d7fffaa; transition: width 0.4s ease;
}
.xpbar-text {
  position: absolute; inset: 0; display:flex; align-items:center; justify-content:center;
  font-size: 11px; letter-spacing: 1px; font-family: 'Orbitron', monospace; color: #e8ecf7;
  text-shadow: 0 0 4px #000;
}

.content { flex: 1; padding: 4px 14px 20px; }

.panel {
  border: 1px solid #1e2740; background: linear-gradient(160deg, #0b0f1c, #080b14);
  border-radius: 4px; padding: 16px; position: relative;
}
.panel-header {
  font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px;
  color: #7c9cff; margin-bottom: 12px; border-bottom: 1px solid #1e2740; padding-bottom: 8px;
}
.pulse { color: #ffd700; animation: flicker 1s infinite; font-size: 11px; }

.status-grid { display: flex; flex-direction: column; gap: 6px; }
.status-row { display: flex; justify-content: space-between; font-size: 15px; padding: 4px 0; border-bottom: 1px dashed #161c2c; }
.status-row span:first-child { color: #7a8699; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
.stat-card {
  border: 1px solid #1e2740; border-radius: 3px; padding: 10px; text-align: center; position: relative;
  background: #0a0e18;
}
.stat-name { font-family: 'Orbitron', monospace; font-size: 11px; color: #5c7cff; letter-spacing: 1px; }
.stat-val { font-size: 26px; font-weight: 700; color: #e8ecf7; }
.stat-full { font-size: 10px; color: #5a6478; text-transform: uppercase; letter-spacing: 1px; }
.stat-plus {
  position: absolute; top: 6px; right: 6px; background: #4d7fff; color: #fff; border: none;
  width: 20px; height: 20px; border-radius: 50%; font-weight: 700; cursor: pointer;
}

.advance-btn {
  width: 100%; margin-top: 18px; padding: 12px; background: transparent;
  border: 1px solid #4d7fff; color: #7c9cff; font-family: 'Orbitron', monospace;
  font-size: 12px; letter-spacing: 1px; border-radius: 3px; cursor: pointer;
}
.advance-btn:active { background: #4d7fff22; }

.panel-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e2740; padding-bottom: 8px; margin-bottom: 12px; }
.edit-toggle {
  font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 1px; color: #7c9cff;
  background: transparent; border: 1px solid #2a3650; border-radius: 3px; padding: 5px 10px; cursor: pointer;
}

.quest-card { border: 1px solid #1e2740; border-radius: 4px; padding: 12px; margin-bottom: 10px; background: #0a0e18; }
.quest-name { font-weight: 600; font-size: 15px; color: #e8ecf7; }
.quest-meta { font-size: 12px; color: #6a7488; margin-bottom: 6px; }
.prev-session { font-size: 11px; color: #5c7cff; margin-bottom: 8px; font-style: italic; }

.set-table { display: flex; flex-direction: column; gap: 6px; }
.set-table-header, .set-table-row {
  display: grid; grid-template-columns: 28px 1fr 1fr 52px; gap: 8px; align-items: center;
}
.set-table-header span { font-size: 10px; color: #4a5468; font-family: 'Orbitron', monospace; letter-spacing: 1px; }
.set-table-row input {
  width: 100%; padding: 8px 6px; background: #0d1220; border: 1px solid #1e2740; border-radius: 3px;
  color: #e8ecf7; font-size: 14px; text-align: center;
}
.set-table-row input::placeholder { color: #3a4258; }
.set-table-row.done input { border-color: #2a4dff55; color: #7c9cff; }
.set-num { text-align: center; color: #7a8699; font-size: 13px; font-weight: 600; }
.set-check {
  background: transparent; border: 1px solid #4d7fff; color: #7c9cff; border-radius: 3px;
  font-family: 'Orbitron', monospace; font-size: 9px; padding: 8px 2px; cursor: pointer;
}
.set-check.done { background: linear-gradient(160deg, #2a4dff, #7c5cff); color: #fff; border-color: transparent; }
.set-check:disabled { opacity: 0.9; }

.editor-row { border: 1px solid #1e2740; border-radius: 4px; padding: 10px; margin-bottom: 8px; background: #0a0e18; }
.editor-name {
  width: 100%; padding: 8px; margin-bottom: 8px; background: #0d1220; border: 1px solid #1e2740;
  border-radius: 3px; color: #e8ecf7; font-size: 14px; font-weight: 600;
}
.editor-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
.editor-fields label { display: flex; flex-direction: column; font-size: 10px; color: #7a8699; gap: 3px; }
.editor-fields input { padding: 7px; background: #0d1220; border: 1px solid #1e2740; border-radius: 3px; color: #e8ecf7; font-size: 13px; }
.editor-remove {
  width: 100%; padding: 7px; background: transparent; border: 1px solid #ff3b6a55; color: #ff6b8a;
  font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 1px; border-radius: 3px; cursor: pointer;
}

.food-search input {
  width: 100%; padding: 10px; background: #0a0e18; border: 1px solid #1e2740; border-radius: 3px;
  color: #e8ecf7; font-size: 14px; margin-bottom: 6px;
}
.food-results { display: flex; flex-direction: column; gap: 4px; }
.food-result {
  text-align: left; padding: 10px; background: #0d1220; border: 1px solid #1e2740; border-radius: 3px;
  color: #cdd6e8; font-size: 13px; cursor: pointer;
}
.food-unit { color: #5c7cff; font-size: 11px; display: block; margin-top: 2px; }
.food-selected { border: 1px solid #4d7fff55; border-radius: 4px; padding: 12px; margin-top: 6px; background: #0a0e18; }
.food-selected-name { font-weight: 600; color: #e8ecf7; margin-bottom: 8px; }
.qty-label { display: flex; flex-direction: column; font-size: 12px; color: #7a8699; gap: 4px; margin-bottom: 10px; }
.qty-label input { padding: 8px; background: #0d1220; border: 1px solid #1e2740; border-radius: 3px; color: #e8ecf7; font-size: 14px; }
.macro-preview {
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12px;
  color: #7c9cff; background: #0d1220; padding: 8px; border-radius: 3px; margin-bottom: 10px;
}

.daily-quest {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  padding: 12px; margin-bottom: 8px; background: #0a0e18; border: 1px solid #1e2740;
  border-radius: 4px; color: #cdd6e8; font-size: 14px; cursor: pointer; font-family: 'Rajdhani', sans-serif;
}
.daily-quest.done { border-color: #ffd70055; color: #ffd700; }
.xp-tag { font-family: 'Orbitron', monospace; font-size: 11px; color: #7c9cff; }

.macro-grid { display: flex; flex-direction: column; gap: 12px; }
.macrobar-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
.macrobar-track { height: 10px; background: #0a0e18; border: 1px solid #1e2740; border-radius: 3px; overflow: hidden; }
.macrobar-fill { height: 100%; background: linear-gradient(90deg, #2a4dff, #7c5cff); }
.macrobar-fill.over { background: linear-gradient(90deg, #ff3b6a, #ff8a3b); }

.deficit-line { margin-top: 14px; font-size: 14px; color: #7a8699; }
.deficit-line b { color: #7c9cff; }

.meal-form input {
  width: 100%; margin-bottom: 8px; padding: 10px; background: #0a0e18; border: 1px solid #1e2740;
  border-radius: 3px; color: #e8ecf7; font-family: 'Rajdhani', sans-serif; font-size: 14px;
}
.meal-form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.meal-form-row input { margin-bottom: 0; }
.add-btn {
  width: 100%; padding: 10px; margin-top: 6px; background: transparent; border: 1px solid #4d7fff;
  color: #7c9cff; font-family: 'Orbitron', monospace; font-size: 11px; border-radius: 3px; cursor: pointer;
}
.meal-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.meal-item { display: flex; justify-content: space-between; font-size: 12px; color: #8a94a8; border-bottom: 1px dashed #161c2c; padding-bottom: 4px; }

.metrics-form { display: flex; flex-direction: column; gap: 10px; }
.metrics-form label { display: flex; flex-direction: column; font-size: 12px; color: #7a8699; gap: 4px; }
.metrics-form input { padding: 10px; background: #0a0e18; border: 1px solid #1e2740; border-radius: 3px; color: #e8ecf7; font-size: 14px; }

.log-entry { border-bottom: 1px dashed #161c2c; padding: 10px 0; }
.log-date { font-family: 'Orbitron', monospace; font-size: 12px; color: #7c9cff; }
.log-meta { font-size: 12px; color: #7a8699; margin-top: 2px; }
.empty-log { color: #5a6478; font-size: 13px; text-align: center; padding: 20px 0; }

.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; display: flex;
  background: #05070cee; backdrop-filter: blur(6px); border-top: 1px solid #1e2740;
}
.tabbtn {
  flex: 1; padding: 14px 0; background: none; border: none; color: #5a6478;
  font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 1px; cursor: pointer;
}
.tabbtn.active { color: #7c9cff; text-shadow: 0 0 8px #4d7fff88; border-top: 2px solid #4d7fff; }

/* System popup windows */
.sw-overlay {
  position: fixed; inset: 0; background: #000a; z-index: 999;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  animation: fadein 0.2s ease;
}
.sw-panel {
  position: relative; width: 100%; max-width: 340px; padding: 26px 22px;
  background: linear-gradient(160deg, #0a1128ee, #05070cee);
  border: 1px solid #4d7fff; box-shadow: 0 0 30px #4d7fff55, inset 0 0 20px #4d7fff22;
  animation: panelIn 0.35s cubic-bezier(.2,1.5,.4,1);
  text-align: center;
}
.sw-panel.sw-levelup { border-color: #ffd700; box-shadow: 0 0 40px #ffd70077, inset 0 0 20px #ffd70022; }
.sw-panel.sw-xp { max-width: 260px; padding: 16px; }
.sw-corner { position: absolute; width: 14px; height: 14px; border: 2px solid #4d7fff; }
.sw-levelup .sw-corner { border-color: #ffd700; }
.sw-corner.tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.sw-corner.tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
.sw-corner.bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
.sw-corner.br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
.sw-scanline {
  position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #7c5cffaa;
  animation: scan 2.4s linear infinite;
}
.sw-title {
  font-family: 'Orbitron', monospace; font-weight: 900; font-size: 20px;
  color: #7c9cff; letter-spacing: 2px; text-shadow: 0 0 12px #4d7fffaa; margin-bottom: 14px;
}
.sw-levelup .sw-title { color: #ffd700; text-shadow: 0 0 14px #ffd700aa; }
.sw-body { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.sw-line { font-size: 15px; color: #cdd6e8; }
.sw-tap { font-size: 10px; color: #4a5468; font-family: 'Orbitron', monospace; }

@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes panelIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
@keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
`;
