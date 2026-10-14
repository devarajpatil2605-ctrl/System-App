import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import './App.css';

const DB_KEY = 'shadow-system-dev-v1';
const INTERVALS = [1, 3, 7, 14, 30, 90];
const RANKS = [
  { name: 'E-RANK', min: 0, className: 'rank-e' },
  { name: 'D-RANK', min: 20, className: 'rank-d' },
  { name: 'C-RANK', min: 35, className: 'rank-c' },
  { name: 'B-RANK', min: 50, className: 'rank-b' },
  { name: 'A-RANK', min: 65, className: 'rank-a' },
  { name: 'S-RANK', min: 80, className: 'rank-s' }
];
const BASE_FOODS = [
  { id:'bf-rice', name:'White rice, cooked', brand:'Generic', kcal:130, protein:2.7, carbs:28.2, fat:0.3, fiber:0.4, source:'Starter catalogue' },
  { id:'bf-chicken', name:'Chicken breast, cooked', brand:'Generic', kcal:165, protein:31, carbs:0, fat:3.6, fiber:0, source:'Starter catalogue' },
  { id:'bf-egg', name:'Egg, whole, cooked', brand:'Generic', kcal:155, protein:12.6, carbs:1.1, fat:10.6, fiber:0, source:'Starter catalogue' },
  { id:'bf-roti', name:'Roti / chapati', brand:'Generic', kcal:297, protein:9.8, carbs:55.7, fat:7.5, fiber:8, source:'Starter catalogue' },
  { id:'bf-banana', name:'Banana, raw', brand:'Generic', kcal:89, protein:1.1, carbs:22.8, fat:0.3, fiber:2.6, source:'Starter catalogue' },
  { id:'bf-paneer', name:'Paneer', brand:'Generic', kcal:265, protein:18.3, carbs:1.2, fat:20.8, fiber:0, source:'Starter catalogue' },
  { id:'bf-milk', name:'Milk, whole', brand:'Generic', kcal:61, protein:3.2, carbs:4.8, fat:3.3, fiber:0, source:'Starter catalogue' },
  { id:'bf-dal', name:'Dal, cooked', brand:'Generic', kcal:116, protein:9, carbs:20, fat:0.4, fiber:7.9, source:'Starter catalogue' },
  { id:'bf-oats', name:'Oats, dry', brand:'Generic', kcal:389, protein:16.9, carbs:66.3, fat:6.9, fiber:10.6, source:'Starter catalogue' },
  { id:'bf-curd', name:'Curd / plain yogurt', brand:'Generic', kcal:61, protein:3.5, carbs:4.7, fat:3.3, fiber:0, source:'Starter catalogue' },
  { id:'bf-almond', name:'Almonds', brand:'Generic', kcal:579, protein:21.2, carbs:21.6, fat:49.9, fiber:12.5, source:'Starter catalogue' },
  { id:'bf-apple', name:'Apple, raw, with skin', brand:'Generic', kcal:52, protein:0.3, carbs:13.8, fat:0.2, fiber:2.4, source:'Starter catalogue' }
];
const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const dateKey = (date = new Date()) => {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return dateKey(d);
};
const niceDate = (date, options = { month:'short', day:'numeric' }) => {
  if (!date) return 'Not scheduled';
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, options);
};
const num = (n, digits = 0) => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined,{maximumFractionDigits:digits,minimumFractionDigits:digits}) : '0';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const sum = (items, key) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
const defaultData = () => ({
  profile: { name:'Dev', calories:2200, protein:160, carbs:220, fat:70, startWeight:97, goalWeight:80, weightUnit:'kg' },
  settings: {
    revisionIntervals: INTERVALS, reminderTime:'08:00', questPopup:true, notifications:true, sound:true, haptics:true,
    animations:true, accent:'cyan', weekStartsMonday:true, weights:{ revision:40, nutrition:25, quests:25, body:10 },
    rankThresholds:[20,35,50,65,80], dailyMealQuest:true, dailyWeightQuest:false
  },
  meals: [], customFoods: [], foodCache: [], recipes: [], weights: [], subjects: [],
  questDefs: [{ id:'default-meal-log', title:'Log today’s meals', description:'Record your food intake in the Nutrition section.', kind:'meal', repeat:'daily', xp:10, active:true, priority:'normal' }],
  questOccurrences: [], xpLedger: [], achievements: []
});
const loadData = () => {
  try {
    const saved = localStorage.getItem(DB_KEY);
    if (!saved) return defaultData();
    const parsed = JSON.parse(saved);
    const base = defaultData();
    return {
      ...base, ...parsed,
      profile:{...base.profile,...(parsed.profile||{})},
      settings:{...base.settings,...(parsed.settings||{}),weights:{...base.settings.weights,...((parsed.settings||{}).weights||{})}},
      meals:Array.isArray(parsed.meals)?parsed.meals:[], customFoods:Array.isArray(parsed.customFoods)?parsed.customFoods:[],
      foodCache:Array.isArray(parsed.foodCache)?parsed.foodCache:[], recipes:Array.isArray(parsed.recipes)?parsed.recipes:[],
      weights:Array.isArray(parsed.weights)?parsed.weights:[], subjects:Array.isArray(parsed.subjects)?parsed.subjects:[],
      questDefs:Array.isArray(parsed.questDefs)?parsed.questDefs:base.questDefs,
      questOccurrences:Array.isArray(parsed.questOccurrences)?parsed.questOccurrences:[],
      xpLedger:Array.isArray(parsed.xpLedger)?parsed.xpLedger:[], achievements:Array.isArray(parsed.achievements)?parsed.achievements:[]
    };
  } catch (e) { return defaultData(); }
};
const allTopics = (subjects) => subjects.flatMap(s => (s.headings||[]).flatMap(h => (h.topics||[]).map(t => ({...t, subjectId:s.id, subjectName:s.name, headingId:h.id, headingName:h.name}))));
const rankFor = (score, thresholds = [20,35,50,65,80]) => {
  const mins = [0,...thresholds];
  const names = ['E-RANK','D-RANK','C-RANK','B-RANK','A-RANK','S-RANK'];
  const idx = score >= thresholds[4] ? 5 : score >= thresholds[3] ? 4 : score >= thresholds[2] ? 3 : score >= thresholds[1] ? 2 : score >= thresholds[0] ? 1 : 0;
  return {...RANKS[idx], name:names[idx], min:mins[idx], next:thresholds[idx] ?? 100};
};
const dayIsDue = (topic, today = dateKey()) => topic.status === 'active' && topic.dueDate && topic.dueDate <= today;
const initials = (text) => (text||'D').trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();

function Icon({ name, size=18 }) {
  const icons = {
    system:<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="4"/></>,
    nutrition:<><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 3-2 7 0 9h3V3M18.5 12v9"/></>,
    revision:<><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></>,
    body:<><path d="M12 3c-2 0-3 2-3 4l-2 3v4l3 2v5h4v-5l3-2v-4l-2-3c0-2-1-4-3-4z"/><path d="M9 10h6"/></>,
    status:<><path d="M3 20V5M3 20h19"/><path d="m6 15 4-4 3 2 6-7"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 1.1 1.9-2 2-1.9-1.1a7 7 0 0 1-2 .8l-.6 2.1h-2.8l-.6-2.1a7 7 0 0 1-2-.8l-1.9 1.1-2-2L5.8 15a7 7 0 0 1-.8-2L3 12.4V9.6l2.1-.6a7 7 0 0 1 .8-2L4.8 5.1l2-2L8.7 4.2a7 7 0 0 1 2-.8l.6-2.1h2.8l.6 2.1a7 7 0 0 1 2 .8l1.9-1.1 2 2L19.4 7a7 7 0 0 1 .8 2l2.1.6v2.8l-2.1.6a7 7 0 0 1-.8 2z"/></>,
    plus:<><path d="M12 5v14M5 12h14"/></>,
    arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    scale:<><path d="M12 3v18M4 7h16M6 7l-3 6h6L6 7zM18 7l-3 6h6l-3-6zM7 21h10"/></>,
    spark:<><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/></>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    trash:<><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    edit:<><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16zM13.5 6.5l4 4"/></>,
    heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>,
    upload:<><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
    download:<><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]||icons.spark}</svg>;
}

function SectionHeading({ eyebrow, title, subtitle, action }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function Card({ children, className='' }) { return <section className={'panel '+className}>{children}</section>; }
function ProgressBar({ value=0, max=100, color }) {
  const pct = clamp((Number(value)/(Number(max)||100))*100,0,100);
  return <div className="progress-track"><div className="progress-fill" style={{width:pct+'%', ...(color?{'--bar-color':color}:{})}}/></div>;
}
function EmptyState({ icon='spark', title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={25}/></div><strong>{title}</strong><p>{text}</p>{action}</div>;
}
function MiniStat({ label, value, sub, icon }) {
  return <div className="mini-stat"><div className="mini-stat-top"><span>{label}</span>{icon&&<span className="mini-stat-icon"><Icon name={icon} size={15}/></span>}</div><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;
}

export default function App() {
  const [data,setData] = useState(loadData);
  const [page,setPage] = useState('system');
  const [showPopup,setShowPopup] = useState(false);
  const [popupSeen,setPopupSeen] = useState(false);
  const [toast,setToast] = useState('');
  const [mealType,setMealType] = useState('Breakfast');
  const [foodQuery,setFoodQuery] = useState('');
  const [remoteFoods,setRemoteFoods] = useState([]);
  const [foodBusy,setFoodBusy] = useState(false);
  const [foodError,setFoodError] = useState('');
  const [selectedFood,setSelectedFood] = useState(null);
  const [foodAmount,setFoodAmount] = useState('100');
  const [foodDate,setFoodDate] = useState(dateKey());
  const [newSubjectName,setNewSubjectName] = useState('');
  const [newHeadingName,setNewHeadingName] = useState('');
  const [newTopicName,setNewTopicName] = useState('');
  const [selectedSubject,setSelectedSubject] = useState('');
  const [selectedHeading,setSelectedHeading] = useState('');
  const [revFilter,setRevFilter] = useState('all');
  const [weightInput,setWeightInput] = useState('');
  const [weightDate,setWeightDate] = useState(dateKey());
  const [questName,setQuestName] = useState('');
  const [questDesc,setQuestDesc] = useState('');
  const [questXp,setQuestXp] = useState('15');
  const [questRepeat,setQuestRepeat] = useState('daily');
  const [activeSettingsTab,setActiveSettingsTab] = useState('goals');
  const [foodSearchMode,setFoodSearchMode] = useState('all');
  const [notificationRefresh,setNotificationRefresh] = useState(0);
  const [calendarMonth,setCalendarMonth] = useState(new Date());
  const [showAddQuest,setShowAddQuest] = useState(false);
  const [showCustomFood,setShowCustomFood] = useState(false);
  const [customFoodForm,setCustomFoodForm] = useState({name:'',brand:'',kcal:'',protein:'',carbs:'',fat:'',fiber:''});
  const [customTopicForm,setCustomTopicForm] = useState({name:'',notes:''});
  const today = dateKey();

  useEffect(()=>{ try { localStorage.setItem(DB_KEY,JSON.stringify(data)); } catch(e) { console.warn('Local save failed',e); } },[data]);
  const topics = useMemo(()=>allTopics(data.subjects),[data.subjects]);
  const dueTopics = useMemo(()=>topics.filter(t=>dayIsDue(t,today)),[topics,today]);
  const todayMeals = useMemo(()=>data.meals.filter(m=>m.date===today),[data.meals,today]);
  const dayMeals = useMemo(()=>data.meals.filter(m=>m.date===foodDate),[data.meals,foodDate]);
  const dayCalories = sum(todayMeals,'kcal');
  const dayProtein = sum(todayMeals,'protein');
  const dayCarbs = sum(todayMeals,'carbs');
  const dayFat = sum(todayMeals,'fat');
  const totalXp = sum(data.xpLedger,'xp');
  const level = Math.floor(totalXp/100)+1;
  const xpProgress = totalXp%100;
  const metricData = useMemo(()=>{
    const since=addDays(today,-29);
    const revisions=topics.flatMap(t=>t.history||[]).filter(h=>h.type==='review'&&h.date>=since);
    const revisionDue=topics.filter(t=>t.status==='active'&&t.dueDate&&t.dueDate<=today&&t.dueDate>=since).length;
    const revisionScore = revisions.length+revisionDue ? revisions.length/(revisions.length+revisionDue)*100 : 0;
    const foodDays = new Set(data.meals.filter(m=>m.date>=since&&m.date<=today).map(m=>m.date)).size;
    const nutritionScore = foodDays/30*100;
    const occ=data.questOccurrences.filter(o=>o.date>=since&&o.date<=today);
    const questsDone=occ.filter(o=>o.status==='completed').length;
    const questScore=occ.length?questsDone/occ.length*100:0;
    const weightDays=new Set(data.weights.filter(w=>w.date>=since&&w.date<=today).map(w=>w.date)).size;
    const bodyScore=weightDays/30*100;
    const weights=data.settings.weights;
    const weighted=[['revision',revisionScore],['nutrition',nutritionScore],['quests',questScore],['body',bodyScore]].reduce((a,[k,v])=>({sum:a.sum+(Number(weights[k])||0)*v,weight:a.weight+(Number(weights[k])||0)}),{sum:0,weight:0});
    return {revisionScore,nutritionScore,questScore,bodyScore,score:weighted.weight?Math.round(weighted.sum/weighted.weight):0,foodDays,questsDone,questCount:occ.length,weightDays};
  },[topics,data.meals,data.questOccurrences,data.weights,data.settings.weights,today]);
  const rank = rankFor(metricData.score,data.settings.rankThresholds||[20,35,50,65,80]);
  const rankIndex = RANKS.findIndex(r=>r.name===rank.name);
  const dueOcc = data.questOccurrences.filter(o=>o.status!=='completed'&&o.date<=today);
  const todayOcc = data.questOccurrences.filter(o=>o.date===today);
  const doneToday = todayOcc.filter(o=>o.status==='completed').length;
  const lastWeight = [...data.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];

  const notifyToast = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2600); };
  const changeData = (fn) => setData(prev => fn(prev));
  const awardXp = (eventKey, xp, reason) => {
    changeData(prev=>{
      if(prev.xpLedger.some(x=>x.eventKey===eventKey)) return prev;
      return {...prev,xpLedger:[...prev.xpLedger,{id:uid(),eventKey,xp:Number(xp)||0,reason,date:today,at:new Date().toISOString()}]};
    });
  };
  const ensureTodayOccurrences = (prev) => {
    let occurrences=[...prev.questOccurrences];
    prev.questDefs.filter(d=>d.active && (d.repeat==='daily'||d.repeat==='weekdays'||d.repeat==='once')).forEach(def=>{
      const due=def.repeat==='weekdays' ? [1,2,3,4,5].includes(new Date().getDay()) : true;
      if(!due) return;
      if(def.repeat==='once'&&occurrences.some(o=>o.defId===def.id)) return;
      if(!occurrences.some(o=>o.defId===def.id&&o.date===today)){
        occurrences.push({id:uid(),defId:def.id,date:today,status:'open',createdAt:new Date().toISOString()});
      }
    });
    if(prev.settings.dailyWeightQuest && !occurrences.some(o=>o.defId==='default-weight-log'&&o.date===today)){
      occurrences.push({id:uid(),defId:'default-weight-log',date:today,status:'open',createdAt:new Date().toISOString()});
    }
    return occurrences;
  };
  useEffect(()=>{
    changeData(prev=>({...prev,questOccurrences:ensureTodayOccurrences(prev)}));
    // The popup is evaluated at every fresh app launch, not just once for the current day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{
    if(!popupSeen && data.settings.questPopup && dueOcc.length>0) {
      setShowPopup(true); setPopupSeen(true);
    }
  },[dueOcc.length,data.settings.questPopup,popupSeen]);
  useEffect(()=>{
    if(!Capacitor.isNativePlatform() || !data.settings.notifications) return;
    let listener;
    (async()=>{
      try {
        const p=await LocalNotifications.checkPermissions();
        if(p.display!=='granted') return;
        const pending=await LocalNotifications.getPending();
        const managed=pending.notifications.filter(n=>String(n.id).startsWith('711'));
        if(managed.length) await LocalNotifications.cancel({notifications:managed.map(n=>({id:n.id}))});
        const entries=topics.filter(t=>t.status==='active'&&t.dueDate&&t.dueDate>=today).slice(0,50);
        const reminders=entries.map((t)=> {
          const [hour,minute]=(data.settings.reminderTime||'08:00').split(':').map(Number);
          const at=new Date(t.dueDate+'T00:00:00');
          at.setHours(hour||8,minute||0,0,0);
          return {id:711000+Math.abs(hashCode(t.id))%80000,title:'SYSTEM NOTIFICATION — REVISION QUEST',body:'Revision due: '+t.name+' · '+t.subjectName,schedule:{at},extra:{screen:'revision',topicId:t.id}};
        }).filter(n=>n.schedule.at.getTime()>Date.now());
        if(reminders.length) await LocalNotifications.schedule({notifications:reminders});
      } catch(e) { console.warn('Reminder sync failed',e); }
    })();
    return ()=>{ if(listener&&listener.remove) listener.remove(); };
  },[topics,data.settings.notifications,data.settings.reminderTime,today,notificationRefresh]);
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()) return;
    let handle;
    LocalNotifications.addListener('localNotificationActionPerformed', event=>{
      const action=event.notification?.extra?.screen;
      if(action) setPage(action);
    }).then(h=>{handle=h;});
    return ()=>{if(handle) handle.remove();};
  },[]);
  function hashCode(value) { let h=0; for(let i=0;i<value.length;i++) h=((h<<5)-h)+value.charCodeAt(i)|0; return h; }

  const updateProfile = (key,value) => changeData(prev=>({...prev,profile:{...prev.profile,[key]:value}}));
  const updateSettings = (key,value) => changeData(prev=>({...prev,settings:{...prev.settings,[key]:value}}));
  const addMeal = (food,amount,date=foodDate,chosenMeal=mealType) => {
    const factor=(Number(amount)||100)/100;
    const entry={id:uid(),foodId:food.id||uid(),name:food.name,brand:food.brand||'',source:food.source||'Custom',date,meal:chosenMeal,amount:Number(amount)||100,unit:'g',
      kcal:Math.round((Number(food.kcal)||0)*factor*10)/10,protein:Math.round((Number(food.protein)||0)*factor*10)/10,carbs:Math.round((Number(food.carbs)||0)*factor*10)/10,
      fat:Math.round((Number(food.fat)||0)*factor*10)/10,fiber:Math.round((Number(food.fiber)||0)*factor*10)/10,
      nutrients:food.nutrients||{},createdAt:new Date().toISOString()};
    changeData(prev=>{
      let questOccurrences=prev.questOccurrences;
      if(date===today) questOccurrences=questOccurrences.map(o=>{
        const def=prev.questDefs.find(d=>d.id===o.defId);
        if(def?.kind==='meal'&&o.status!=='completed'&&o.date===date) return {...o,status:'completed',completedAt:new Date().toISOString(),completionNote:'Food logged'};
        return o;
      });
      const ledger=prev.xpLedger.some(x=>x.eventKey==='meal-log:'+date) ? prev.xpLedger : (date===today ? [...prev.xpLedger,{id:uid(),eventKey:'meal-log:'+date,xp:10,reason:'Logged nutrition',date,at:new Date().toISOString()}] : prev.xpLedger);
      return {...prev,meals:[...prev.meals,entry],questOccurrences,xpLedger:ledger};
    });
    setSelectedFood(null); setFoodQuery(''); setFoodAmount('100'); notifyToast('MEAL LOGGED · '+Math.round(entry.kcal)+' KCAL'); 
  };
  const removeMeal = (id) => changeData(prev=>({...prev,meals:prev.meals.filter(m=>m.id!==id)}));
  const searchFoodDatabase = async () => {
    const query=foodQuery.trim();
    if(!query) return;
    setFoodBusy(true); setFoodError(''); setRemoteFoods([]);
    const local=[...BASE_FOODS,...data.customFoods,...data.foodCache].filter(f=>(f.name+' '+(f.brand||'')).toLowerCase().includes(query.toLowerCase()));
    setRemoteFoods(local);
    try {
      if(foodSearchMode==='usda'&&data.settings.usdaApiKey) {
        const res=await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(data.settings.usdaApiKey)+'&query='+encodeURIComponent(query)+'&pageSize=15');
        if(!res.ok) throw new Error('USDA request failed ('+res.status+').');
        const body=await res.json();
        const foods=(body.foods||[]).map(f=>{
          const get=(ids)=>{const x=(f.foodNutrients||[]).find(n=>ids.includes(n.nutrientId));return x?.value||0;};
          return {id:'usda-'+f.fdcId,name:f.description,brand:f.brandOwner||'',kcal:get([1008]),protein:get([1003]),fat:get([1004]),carbs:get([1005]),fiber:get([1079]),source:'USDA FoodData Central',nutrients:{}};
        });
        setRemoteFoods([...foods,...local]);
      } else {
        const res=await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(query)+'&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments');
        if(!res.ok) throw new Error('Food database request failed ('+res.status+').');
        const body=await res.json();
        const foods=(body.products||[]).filter(f=>f.product_name&&f.nutriments).map(f=>({
          id:'off-'+f.code,name:f.product_name,brand:f.brands||'',source:'Open Food Facts',
          kcal:Number(f.nutriments['energy-kcal_100g']||f.nutriments['energy-kcal']||0),
          protein:Number(f.nutriments.proteins_100g||0),carbs:Number(f.nutriments.carbohydrates_100g||0),fat:Number(f.nutriments.fat_100g||0),fiber:Number(f.nutriments.fiber_100g||0),
          nutrients:{sugars:f.nutriments.sugars_100g,sodium:f.nutriments.sodium_100g,salt:f.nutriments.salt_100g}
        })).filter(f=>f.kcal||f.protein||f.carbs||f.fat);
        const combined=[...local,...foods].filter((f,i,a)=>a.findIndex(g=>g.id===f.id)===i);
        setRemoteFoods(combined);
        if(!combined.length) setFoodError('No matches found. Try another spelling or create a custom food.');
        changeData(prev=>({...prev,foodCache:[...prev.foodCache,...foods].filter((f,i,a)=>a.findIndex(g=>g.id===f.id)===i).slice(-500)}));
      }
    } catch(e) {
      setFoodError((e.message||'Food search unavailable')+' Your saved foods and manual entries still work.');
      setRemoteFoods(local);
    } finally { setFoodBusy(false); }
  };
  const saveCustomFood = () => {
    if(!customFoodForm.name.trim() || customFoodForm.kcal==='') {notifyToast('Enter a food name and calories');return;}
    const food={id:uid(),name:customFoodForm.name.trim(),brand:customFoodForm.brand.trim(),source:'Custom food',kcal:Number(customFoodForm.kcal)||0,
      protein:Number(customFoodForm.protein)||0,carbs:Number(customFoodForm.carbs)||0,fat:Number(customFoodForm.fat)||0,fiber:Number(customFoodForm.fiber)||0};
    changeData(prev=>({...prev,customFoods:[...prev.customFoods,food]}));
    setCustomFoodForm({name:'',brand:'',kcal:'',protein:'',carbs:'',fat:'',fiber:''});setShowCustomFood(false);notifyToast('CUSTOM FOOD SAVED');
  };
  const updateTopic = (subjectId,headingId,topicId,patch) => changeData(prev=>({...prev,subjects:prev.subjects.map(s=>s.id!==subjectId?s:{...s,headings:s.headings.map(h=>h.id!==headingId?h:{...h,topics:h.topics.map(t=>t.id!==topicId?t:{...t,...patch})})})}));
  const addSubject = () => {
    if(!newSubjectName.trim()) return;
    const subject={id:uid(),name:newSubjectName.trim(),headings:[],createdAt:new Date().toISOString()};
    changeData(prev=>({...prev,subjects:[...prev.subjects,subject]}));setSelectedSubject(subject.id);setSelectedHeading('');setNewSubjectName('');notifyToast('SUBJECT CREATED');
  };
  const addHeading = () => {
    if(!selectedSubject||!newHeadingName.trim()) return;
    const heading={id:uid(),name:newHeadingName.trim(),topics:[]};
    changeData(prev=>({...prev,subjects:prev.subjects.map(s=>s.id===selectedSubject?{...s,headings:[...s.headings,heading]}:s)}));setSelectedHeading(heading.id);setNewHeadingName('');notifyToast('HEADING CREATED');
  };
  const addTopic = () => {
    if(!selectedSubject||!selectedHeading||!newTopicName.trim()) return;
    const topic={id:uid(),name:newTopicName.trim(),notes:'',status:'new',stage:0,learnedAt:null,lastReviewedAt:null,dueDate:null,history:[],createdAt:new Date().toISOString(),confidence:0};
    changeData(prev=>({...prev,subjects:prev.subjects.map(s=>s.id!==selectedSubject?s:{...s,headings:s.headings.map(h=>h.id!==selectedHeading?h:{...h,topics:[...h.topics,topic]})})}));setNewTopicName('');notifyToast('TOPIC ADDED');
  };
  const renameNode = (kind,id,parentId) => {
    const current = kind==='subject'?data.subjects.find(s=>s.id===id)?.name:kind==='heading'?data.subjects.find(s=>s.id===parentId)?.headings.find(h=>h.id===id)?.name:data.subjects.find(s=>s.id===parentId.subjectId)?.headings.find(h=>h.id===parentId.headingId)?.topics.find(t=>t.id===id)?.name;
    const next=window.prompt('Rename '+kind,current||'');
    if(!next?.trim()) return;
    changeData(prev=>({...prev,subjects:prev.subjects.map(s=>{
      if(kind==='subject'&&s.id===id)return {...s,name:next.trim()};
      if(kind==='heading'&&s.id===parentId)return {...s,headings:s.headings.map(h=>h.id===id?{...h,name:next.trim()}:h)};
      if(kind==='topic'&&s.id===parentId.subjectId)return {...s,headings:s.headings.map(h=>h.id===parentId.headingId?{...h,topics:h.topics.map(t=>t.id===id?{...t,name:next.trim()}:t)}:h)};
      return s;
    })}));notifyToast('UPDATED');
  };
  const deleteNode = (kind,id,parentId) => {
    if(!window.confirm('Delete this '+kind+'? This cannot be undone.')) return;
    changeData(prev=>({...prev,subjects:kind==='subject'?prev.subjects.filter(s=>s.id!==id):prev.subjects.map(s=>{
      if(kind==='heading'&&s.id===parentId)return {...s,headings:s.headings.filter(h=>h.id!==id)};
      if(kind==='topic'&&s.id===parentId.subjectId)return {...s,headings:s.headings.map(h=>h.id===parentId.headingId?{...h,topics:h.topics.filter(t=>t.id!==id)}:h)};
      return s;
    })}));
    if(kind==='subject'&&selectedSubject===id){setSelectedSubject('');setSelectedHeading('');}
    if(kind==='heading'&&selectedHeading===id)setSelectedHeading('');
    notifyToast(kind.toUpperCase()+' DELETED');
  };
  const startTopic = (entry) => {
    const learned=today;
    updateTopic(entry.subjectId,entry.headingId,entry.id,{status:'active',stage:0,learnedAt:learned,dueDate:addDays(learned,Number(data.settings.revisionIntervals?.[0]??1)),history:[...(entry.history||[]),{id:uid(),type:'learned',date:today,at:new Date().toISOString()}]});
    awardXp('topic-start:'+entry.id,5,'Started revision cycle');
    notifyToast('QUEST ACCEPTED · FIRST REVIEW '+niceDate(addDays(learned,Number(data.settings.revisionIntervals?.[0]??1))));
  };
  const completeReview = (entry) => {
    const intervals=(data.settings.revisionIntervals||INTERVALS).map(n=>Math.max(1,Number(n)||1));
    const nextStage=entry.stage+1;
    const history=[...(entry.history||[]),{id:uid(),type:'review',date:today,stage:entry.stage+1,at:new Date().toISOString()}];
    if(nextStage>=intervals.length) {
      updateTopic(entry.subjectId,entry.headingId,entry.id,{status:'complete',stage:entry.stage,dueDate:null,lastReviewedAt:today,history:history});
      awardXp('review:'+entry.id+':'+entry.stage+':'+today,25,'Completed final revision stage');
      notifyToast('CYCLE CLEARED · TOPIC COMPLETE');
    } else {
      const nextDate=addDays(today,intervals[nextStage]);
      updateTopic(entry.subjectId,entry.headingId,entry.id,{stage:nextStage,dueDate:nextDate,lastReviewedAt:today,history});
      awardXp('review:'+entry.id+':'+entry.stage+':'+today,15,'Completed revision');
      notifyToast('REVISION COMPLETE · NEXT '+niceDate(nextDate));
    }
  };
  const resetTopic = (entry) => updateTopic(entry.subjectId,entry.headingId,entry.id,{status:'new',stage:0,learnedAt:null,lastReviewedAt:null,dueDate:null,history:[...(entry.history||[]),{id:uid(),type:'reset',date:today,at:new Date().toISOString()}]});
  const saveWeight = () => {
    const value=Number(weightInput);
    if(!Number.isFinite(value)||value<=0||value>500){notifyToast('Enter a valid body weight');return;}
    changeData(prev=>{
      const already=prev.weights.some(w=>w.date===weightDate);
      const weights=already?prev.weights.map(w=>w.date===weightDate?{...w,value,unit:prev.profile.weightUnit,updatedAt:new Date().toISOString()}:w):[...prev.weights,{id:uid(),date:weightDate,value,unit:prev.profile.weightUnit,createdAt:new Date().toISOString()}];
      let occurrences=prev.questOccurrences;
      if(weightDate===today) occurrences=occurrences.map(o=>o.defId==='default-weight-log'&&o.status!=='completed'?{...o,status:'completed',completedAt:new Date().toISOString()}:o);
      let xpLedger=prev.xpLedger;
      if(weightDate===today&&!xpLedger.some(x=>x.eventKey==='weight:'+weightDate)) xpLedger=[...xpLedger,{id:uid(),eventKey:'weight:'+weightDate,xp:5,reason:'Recorded body status',date:weightDate,at:new Date().toISOString()}];
      return {...prev,weights,questOccurrences:occurrences,xpLedger};
    });
    setWeightInput('');notifyToast('BODY STATUS UPDATED');
  };
  const addQuest = () => {
    if(!questName.trim()) return;
    const def={id:uid(),title:questName.trim(),description:questDesc.trim(),kind:'manual',repeat:questRepeat,xp:clamp(Number(questXp)||10,0,10000),active:true,priority:'normal'};
    changeData(prev=>({...prev,questDefs:[...prev.questDefs,def]}));
    setQuestName('');setQuestDesc('');setQuestXp('15');setQuestRepeat('daily');setShowAddQuest(false);notifyToast('QUEST REGISTERED');
  };
  const completeQuest = (occ) => {
    const def=data.questDefs.find(d=>d.id===occ.defId);
    changeData(prev=>{
      const occurrence=prev.questOccurrences.find(o=>o.id===occ.id);
      if(!occurrence||occurrence.status==='completed') return prev;
      const awardKey='quest:'+occ.id;
      const xpLedger=prev.xpLedger.some(x=>x.eventKey===awardKey)?prev.xpLedger:[...prev.xpLedger,{id:uid(),eventKey:awardKey,xp:Number(def?.xp)||10,reason:'Quest: '+(def?.title||'Daily quest'),date:today,at:new Date().toISOString()}];
      return {...prev,questOccurrences:prev.questOccurrences.map(o=>o.id===occ.id?{...o,status:'completed',completedAt:new Date().toISOString()}:o),xpLedger};
    });notifyToast('QUEST COMPLETE · XP AWARDED');
  };
  const snoozeQuest = (occ) => { changeData(prev=>({...prev,questOccurrences:prev.questOccurrences.map(o=>o.id===occ.id?{...o,snoozedUntil:addDays(today,1)}:o)}));notifyToast('QUEST SNOOZED UNTIL TOMORROW'); };
  const deleteQuestDef = (id) => {
    if(!window.confirm('Remove this quest and its future occurrences? Completed history remains.')) return;
    changeData(prev=>({...prev,questDefs:prev.questDefs.map(d=>d.id===id?{...d,active:false}:d)}));
  };
  const exportBackup = () => {
    const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString(),schemaVersion:1},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='shadow-system-dev-backup-'+today+'.json';a.click();URL.revokeObjectURL(url);notifyToast('BACKUP EXPORTED');
  };
  const importBackup = async (file) => {
    try {
      const parsed=JSON.parse(await file.text());
      if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.meals)||!Array.isArray(parsed.subjects)||!parsed.profile) throw new Error('This file does not look like a Shadow System backup.');
      if(!window.confirm('Restore this backup? Current app data will be replaced. Export a backup first if you need it.')) return;
      const base=defaultData();setData({...base,...parsed,settings:{...base.settings,...parsed.settings},profile:{...base.profile,...parsed.profile}});notifyToast('BACKUP RESTORED');
    } catch(e){notifyToast(e.message||'Could not import backup');}
  };
  const openNotifications = async () => {
    try {
      if(Capacitor.isNativePlatform()) {
        const p=await LocalNotifications.requestPermissions();
        if(p.display==='granted') {setNotificationRefresh(v=>v+1);notifyToast('SYSTEM NOTIFICATIONS ENABLED');}
        else notifyToast('Notification permission not granted');
      } else if('Notification' in window) {
        const result=await Notification.requestPermission();notifyToast(result==='granted'?'Browser notifications enabled':'Notification permission not granted');
      } else notifyToast('Notifications are unavailable in this browser');
    } catch(e){notifyToast('Unable to request notification permission');}
  };
  const startEditWeight = (entry) => {setWeightDate(entry.date);setWeightInput(String(entry.value));document.getElementById('weight-entry')?.scrollIntoView({behavior:'smooth',block:'center'});};
  const visibleMeals = dayMeals.filter(m=>m.meal===mealType);
  const filteredTopics = topics.filter(t=>revFilter==='all'?t.status!=='complete':revFilter==='due'?dayIsDue(t,today):revFilter==='active'?t.status==='active':revFilter==='complete'?t.status==='complete':t.status==='new');
  const foodResults = (remoteFoods.length?remoteFoods:[...BASE_FOODS,...data.customFoods,...data.foodCache].filter(f=>(f.name+' '+(f.brand||'')).toLowerCase().includes(foodQuery.toLowerCase())));
  const foodNutrition = selectedFood ? ['kcal','protein','carbs','fat','fiber'].reduce((o,k)=>({...o,[k]:(Number(selectedFood[k])||0)*(Number(foodAmount)||0)/100}),{}) : null;

  const renderSystem = () => <div className="page-enter">
    <div className="hero-grid">
      <Card className="hero-panel"><div className="hero-glow"/><div className="hero-topline"><span><i className="pulse-dot"/> SYSTEM ONLINE</span><span className="tiny-label">{niceDate(today,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div>
        <div className="hero-layout"><div><div className="eyebrow">WELCOME BACK, HUNTER</div><h1 className="hero-title">ARISE<span className="accent">.</span></h1><p className="hero-copy">Every small action moves your status forward.</p><div className="hero-rank-row"><div className={'rank-emblem '+rank.className}><span>{rank.name[0]}</span></div><div><span className="tiny-label">CURRENT HUNTER RANK</span><strong>{rank.name}</strong><small>Level {level} · {totalXp} total XP</small></div></div></div>
          <div className="hero-level"><div className="level-orb"><span>LVL</span><strong>{level}</strong><small>DEV</small></div><div className="level-meta"><div className="split-label"><span>EXPERIENCE</span><b>{xpProgress}/100 XP</b></div><ProgressBar value={xpProgress} max={100}/><small>{100-xpProgress} XP to next level</small></div></div></div>
        <div className="hero-bottom"><span><Icon name="calendar" size={14}/> DAILY OPERATION</span><strong>{doneToday}/{todayOcc.length} objectives cleared</strong></div><ProgressBar value={doneToday} max={Math.max(todayOcc.length,1)}/>
      </Card>
      <Card className="daily-panel"><div className="panel-title-row"><div><div className="eyebrow">SYSTEM ASSIGNMENT</div><h2>Daily quests</h2></div><span className="counter-chip">{todayOcc.filter(o=>o.status!=='completed').length} LEFT</span></div>
        {todayOcc.length===0?<EmptyState title="No quests generated" text="Create a daily quest or enable the meal-log quest in settings." action={<button className="btn btn-secondary" onClick={()=>setPage('quests')}>Manage quests</button>}/>:<div className="quest-list compact">{todayOcc.map(o=>{const d=data.questDefs.find(q=>q.id===o.defId)||{title:'Archived quest',xp:0};return <div className={'quest-row '+(o.status==='completed'?'is-done':'')} key={o.id}><button className={'check-control '+(o.status==='completed'?'checked':'')} onClick={()=>o.status==='completed'?null:completeQuest(o)} aria-label="Complete quest">{o.status==='completed'&&<Icon name="check" size={14}/>}</button><div className="quest-main"><strong>{d.title}</strong><small>{d.description||'Daily objective'} · {d.xp||0} XP</small></div><span className="quest-status">{o.status==='completed'?'CLEARED':'ACTIVE'}</span></div>})}</div>}
        <button className="text-action" onClick={()=>setPage('quests')}>Open quest board <Icon name="arrow" size={15}/></button>
      </Card>
    </div>
    {dueOcc.length>0&&<button className="overdue-banner" onClick={()=>{setShowPopup(true);setPopupSeen(true);}}><span className="warning-pip"/> <span><strong>{dueOcc.length} unresolved quest{dueOcc.length===1?'':'s'}</strong><small>Your System is waiting for an update.</small></span><Icon name="arrow" size={18}/></button>}
    <div className="section-bar"><div><div className="eyebrow">TODAY'S STATUS</div><h2>Live overview</h2></div><span className="muted tiny-label">SAVED ON DEVICE</span></div>
    <div className="stats-grid four"><MiniStat icon="nutrition" label="Calories" value={num(dayCalories)} sub={'of '+num(data.profile.calories)+' kcal'}/><MiniStat icon="revision" label="Revisions due" value={dueTopics.length} sub={dueTopics.length?'Requires attention':'No reviews due'}/><MiniStat icon="scale" label="Latest weight" value={lastWeight?num(lastWeight.value,1)+' '+data.profile.weightUnit:'—'} sub={lastWeight?niceDate(lastWeight.date):'Add first entry'}/><MiniStat icon="spark" label="Hunter score" value={metricData.score+'/100'} sub={rank.name}/></div>
    <div className="two-column">
      <Card><div className="panel-title-row"><div><div className="eyebrow">NUTRITION</div><h2>Energy & macros</h2></div><button className="icon-button" onClick={()=>setPage('nutrition')} aria-label="Open nutrition"><Icon name="arrow"/></button></div>
        <div className="calorie-summary"><div className="calorie-ring" style={{'--value':clamp(dayCalories/Math.max(1,data.profile.calories)*100,0,100)+'%'}}><div><strong>{num(dayCalories)}</strong><small>KCALS</small></div></div><div className="calorie-text"><span className="tiny-label">DAILY TARGET</span><strong>{num(data.profile.calories)} kcal</strong><p>{num(Math.abs(data.profile.calories-dayCalories))} kcal {dayCalories<=data.profile.calories?'remaining':'over target'}</p></div></div>
        <div className="macro-bars">{[['Protein',dayProtein,data.profile.protein,'protein'],['Carbs',dayCarbs,data.profile.carbs,'carbs'],['Fat',dayFat,data.profile.fat,'fat']].map(([label,val,target,key])=><div className="macro-line" key={key}><div className="split-label"><span>{label}</span><b>{num(val,1)} / {num(target)} g</b></div><ProgressBar value={val} max={target} color={'var(--'+key+')'}/></div>)}</div>
        <button className="btn btn-primary btn-block" onClick={()=>setPage('nutrition')}><Icon name="plus" size={16}/> Log food</button>
      </Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">REVISION PROTOCOL</div><h2>Next reviews</h2></div><button className="icon-button" onClick={()=>setPage('revision')} aria-label="Open revision"><Icon name="arrow"/></button></div>
        {dueTopics.length===0?<EmptyState icon="revision" title="No overdue topics" text={topics.some(t=>t.status==='active')?'Your upcoming reviews are on schedule.':'Create your first subject and start a revision cycle.'} action={<button className="btn btn-secondary" onClick={()=>setPage('revision')}>Open revision tracker</button>}/>:<div className="due-list">{dueTopics.slice(0,4).map(t=><div className="due-row" key={t.id}><div className="due-date">{t.dueDate<today?'LATE':niceDate(t.dueDate)}</div><div className="due-info"><strong>{t.name}</strong><small>{t.subjectName} / {t.headingName}</small></div><button className="round-arrow" onClick={()=>completeReview(t)} aria-label="Complete review"><Icon name="check" size={15}/></button></div>)}</div>}
      </Card>
    </div>
    <div className="two-column"><Card><div className="panel-title-row"><div><div className="eyebrow">BODY STATUS</div><h2>Goal progression</h2></div><button className="icon-button" onClick={()=>setPage('body')}><Icon name="arrow"/></button></div><div className="goal-weight-row"><div><span className="tiny-label">LATEST</span><strong>{lastWeight?num(lastWeight.value,1):'—'} <small>{data.profile.weightUnit}</small></strong></div><div className="goal-arrow">→</div><div><span className="tiny-label">GOAL</span><strong>{num(data.profile.goalWeight,1)} <small>{data.profile.weightUnit}</small></strong></div></div><div className="split-label"><span>Goal progress</span><b>{lastWeight?num(clamp(Math.abs(data.profile.startWeight-lastWeight.value)/Math.max(0.1,Math.abs(data.profile.startWeight-data.profile.goalWeight))*100,0,100))+'%':'0%'}</b></div><ProgressBar value={lastWeight?Math.abs(data.profile.startWeight-lastWeight.value):0} max={Math.abs(data.profile.startWeight-data.profile.goalWeight)||1}/><button className="text-action" onClick={()=>setPage('body')}>Open body status <Icon name="arrow" size={15}/></button></Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">HUNTER DEVELOPMENT</div><h2>Attribute breakdown</h2></div><button className="icon-button" onClick={()=>setPage('status')}><Icon name="arrow"/></button></div><div className="attribute-list">{[['REVISION',metricData.revisionScore,'revision'],['NUTRITION',metricData.nutritionScore,'nutrition'],['QUESTS',metricData.questScore,'quests'],['BODY STATUS',metricData.bodyScore,'body']].map(([label,value,key])=><div className="attribute-row" key={key}><div className="split-label"><span>{label}</span><b>{Math.round(value)}%</b></div><ProgressBar value={value} max={100}/></div>)}</div><small className="muted">Consistency score uses the last 30 local calendar days and your configured weights.</small></Card></div>
  </div>;

  const renderNutrition = () => <div className="page-enter"><SectionHeading eyebrow="MODULE 01 / NUTRITION" title="Nutrition log" subtitle="Fuel your progression. Track energy, macros, and available micronutrients." action={<button className="btn btn-secondary" onClick={()=>setShowCustomFood(true)}><Icon name="plus" size={16}/> Custom food</button>}/>
    <div className="date-strip"><button className="icon-button" onClick={()=>setFoodDate(addDays(foodDate,-1))}>‹</button><label><Icon name="calendar" size={16}/><input aria-label="Food log date" type="date" value={foodDate} onChange={e=>setFoodDate(e.target.value)}/></label><button className="icon-button" onClick={()=>setFoodDate(addDays(foodDate,1))}>›</button><button className="text-action compact-action" onClick={()=>setFoodDate(today)}>Today</button></div>
    <div className="nutrition-kpis"><div className="nutrition-main-kpi"><span className="eyebrow">ENERGY INTAKE</span><div><strong>{num(sum(dayMeals,'kcal'))}</strong><span> / {num(data.profile.calories)} kcal</span></div><ProgressBar value={sum(dayMeals,'kcal')} max={data.profile.calories}/><small>{num(data.profile.calories-sum(dayMeals,'kcal'))} kcal {sum(dayMeals,'kcal')<=data.profile.calories?'remaining':'over target'}</small></div><div className="nutrient-kpi"><span>Protein</span><strong>{num(sum(dayMeals,'protein'),1)} g</strong><ProgressBar value={sum(dayMeals,'protein')} max={data.profile.protein} color="var(--protein)"/></div><div className="nutrient-kpi"><span>Carbs</span><strong>{num(sum(dayMeals,'carbs'),1)} g</strong><ProgressBar value={sum(dayMeals,'carbs')} max={data.profile.carbs} color="var(--carbs)"/></div><div className="nutrient-kpi"><span>Fat</span><strong>{num(sum(dayMeals,'fat'),1)} g</strong><ProgressBar value={sum(dayMeals,'fat')} max={data.profile.fat} color="var(--fat)"/></div></div>
    <Card><div className="panel-title-row"><div><div className="eyebrow">FOOD DATABASE</div><h2>Find a food</h2><p className="panel-subtitle">Search saved foods or a live public food catalogue.</p></div><span className="source-chip">LIVE + LOCAL</span></div><form className="food-search" onSubmit={e=>{e.preventDefault();searchFoodDatabase();}}><div className="search-input"><Icon name="search" size={18}/><input value={foodQuery} onChange={e=>setFoodQuery(e.target.value)} placeholder="Search chicken, rice, paneer..." aria-label="Search foods"/></div><select value={foodSearchMode} onChange={e=>setFoodSearchMode(e.target.value)} aria-label="Food database source"><option value="all">Open Food Facts</option><option value="usda">USDA FoodData Central</option></select><button className="btn btn-primary" type="submit" disabled={foodBusy}>{foodBusy?'Searching…':'Search'}</button></form>{foodSearchMode==='usda'&&!data.settings.usdaApiKey&&<p className="inline-note">Add a USDA FoodData Central API key in Settings to use this provider. Open Food Facts and saved foods work without one.</p>}{foodError&&<p className="error-note">{foodError}</p>}{foodResults.length>0&&foodQuery.trim()&&<div className="food-results">{foodResults.slice(0,12).map((food,i)=><button className="food-result" key={food.id||i} onClick={()=>{setSelectedFood(food);setFoodAmount('100');}}><span className="food-mark"><Icon name="nutrition" size={18}/></span><span className="food-result-info"><strong>{food.name}</strong><small>{food.brand||food.source||'Food database'} · per 100 g</small></span><span className="food-kcal"><strong>{num(food.kcal)}</strong><small>kcal</small></span><Icon name="plus" size={17}/></button>)}</div>}</Card>
    <div className="meal-tabs">{['Breakfast','Lunch','Dinner','Snacks'].map(m=><button key={m} className={mealType===m?'active':''} onClick={()=>setMealType(m)}>{m}</button>)}</div>
    <Card><div className="panel-title-row"><div><div className="eyebrow">DAILY FOOD DIARY</div><h2>{mealType}</h2></div><span className="counter-chip">{visibleMeals.length} entries</span></div>{visibleMeals.length===0?<EmptyState icon="nutrition" title="Nothing logged here yet" text="Search for a food above, choose a serving amount, then add it to this meal."/>:<div className="meal-list">{visibleMeals.map(m=><div className="meal-entry" key={m.id}><div className="meal-entry-icon"><Icon name="nutrition" size={18}/></div><div className="meal-entry-main"><strong>{m.name}</strong><small>{num(m.amount)} g · {m.brand||m.source}</small><div className="meal-macros"><span>P {num(m.protein,1)}g</span><span>C {num(m.carbs,1)}g</span><span>F {num(m.fat,1)}g</span>{m.fiber>0&&<span>Fiber {num(m.fiber,1)}g</span>}</div></div><div className="meal-entry-calories"><strong>{num(m.kcal)}</strong><small>kcal</small></div><button className="icon-button danger" onClick={()=>removeMeal(m.id)} aria-label="Delete food"><Icon name="trash" size={16}/></button></div>)}</div>}
    <div className="meal-total"><span>Meal total</span><strong>{num(sum(visibleMeals,'kcal'))} kcal</strong><div><span>P {num(sum(visibleMeals,'protein'),1)} g</span><span>C {num(sum(visibleMeals,'carbs'),1)} g</span><span>F {num(sum(visibleMeals,'fat'),1)} g</span></div></div></Card>
    <Card><div className="panel-title-row"><div><div className="eyebrow">NUTRIENT DETAILS</div><h2>Micronutrients</h2><p className="panel-subtitle">Reported only when supplied by your food data source.</p></div></div><div className="micronutrient-grid">{[['Dietary fibre',sum(dayMeals,'fiber'),'g'],['Vitamin A',sumNutrient(dayMeals,'vitamin-a'),'µg'],['Vitamin C',sumNutrient(dayMeals,'vitamin-c'),'mg'],['Vitamin D',sumNutrient(dayMeals,'vitamin-d'),'µg'],['Calcium',sumNutrient(dayMeals,'calcium'),'mg'],['Iron',sumNutrient(dayMeals,'iron'),'mg'],['Potassium',sumNutrient(dayMeals,'potassium'),'mg'],['Sodium',sumNutrient(dayMeals,'sodium'),'mg'],['Sugars',sumNutrient(dayMeals,'sugars'),'g'],['Cholesterol',sumNutrient(dayMeals,'cholesterol'),'mg']].map(([label,value,unit])=><div className="micro-cell" key={label}><span>{label}</span><strong>{value===null?'Not available':num(value,1)+' '+unit}</strong></div>)}</div><p className="micro-disclaimer">Nutrient fields that are missing from an individual food remain unavailable; incomplete data is never treated as zero. Food values vary by brand and preparation.</p></Card>
  </div>;
  function sumNutrient(meals,key) {
    const keys={ 'vitamin-a':['vitamin_a_ug','vitamin-a','vitaminA','vitamin_a'], 'vitamin-c':['vitamin_c_mg','vitamin-c','vitaminC','vitamin_c'], 'vitamin-d':['vitamin_d_ug','vitamin-d','vitaminD','vitamin_d'], calcium:['calcium_mg','calcium'], iron:['iron_mg','iron'], potassium:['potassium_mg','potassium'], sodium:['sodium','sodium_mg'], sugars:['sugars','sugars_g'], cholesterol:['cholesterol','cholesterol_mg'] };
    let found=false,total=0;
    const candidates=keys[key]||[key];
    meals.forEach(m=>{const nutrients=m.nutrients||{};for(const k of candidates){if(nutrients[k]!==undefined&&nutrients[k]!==null&&nutrients[k]!==''){total+=Number(nutrients[k])*(Number(m.amount)||100)/100;found=true;break;}}});
    return found?total:null;
  }

  const renderRevision = () => {
    const activeSubject=data.subjects.find(s=>s.id===selectedSubject);
    const activeHeading=activeSubject?.headings.find(h=>h.id===selectedHeading);
    return <div className="page-enter"><SectionHeading eyebrow="MODULE 02 / KNOWLEDGE RETENTION" title="Revision protocol" subtitle="Subject → heading → topic. Your schedule, your hierarchy, your control." action={<span className="counter-chip">{dueTopics.length} DUE</span>}/>
      <div className="revision-stats stats-grid four"><MiniStat label="Subjects" value={data.subjects.length} icon="revision"/><MiniStat label="Topics" value={topics.length} icon="calendar"/><MiniStat label="Due / overdue" value={dueTopics.length} icon="bell"/><MiniStat label="Cycle complete" value={topics.filter(t=>t.status==='complete').length} icon="check"/></div>
      <div className="revision-layout"><Card className="hierarchy-card"><div className="panel-title-row"><div><div className="eyebrow">LEVEL 01</div><h2>Subjects</h2></div><span className="tiny-label">{data.subjects.length} total</span></div><form className="inline-add" onSubmit={e=>{e.preventDefault();addSubject();}}><input value={newSubjectName} onChange={e=>setNewSubjectName(e.target.value)} placeholder="New subject name" aria-label="New subject"/><button className="icon-button accent-button" type="submit" aria-label="Add subject"><Icon name="plus"/></button></form>
        {data.subjects.length===0?<EmptyState icon="revision" title="Start with a subject" text="Create your first subject, then add headings and topics."/>:<div className="hierarchy-list">{data.subjects.map(s=><div key={s.id} className={'hierarchy-item '+(selectedSubject===s.id?'selected':'')}><button className="hierarchy-select" onClick={()=>{setSelectedSubject(s.id);setSelectedHeading('');}}><span className="hierarchy-number">01</span><span><strong>{s.name}</strong><small>{s.headings.length} headings · {s.headings.reduce((n,h)=>n+h.topics.length,0)} topics</small></span></button><div className="hierarchy-tools"><button onClick={()=>renameNode('subject',s.id)} aria-label="Rename subject"><Icon name="edit" size={14}/></button><button onClick={()=>deleteNode('subject',s.id)} aria-label="Delete subject"><Icon name="trash" size={14}/></button></div></div>)}</div>}</Card>
      <Card className="hierarchy-card"><div className="panel-title-row"><div><div className="eyebrow">LEVEL 02</div><h2>Headings</h2></div></div>{!activeSubject?<EmptyState title="Select a subject" text="Choose a subject to view its headings."/>:<><div className="selected-parent"><span className="tiny-label">PARENT SUBJECT</span><strong>{activeSubject.name}</strong></div><form className="inline-add" onSubmit={e=>{e.preventDefault();addHeading();}}><input value={newHeadingName} onChange={e=>setNewHeadingName(e.target.value)} placeholder="New heading name" aria-label="New heading"/><button className="icon-button accent-button" type="submit" aria-label="Add heading"><Icon name="plus"/></button></form>{activeSubject.headings.length===0?<EmptyState title="No headings yet" text="Add a heading to organize its topics."/>:<div className="hierarchy-list">{activeSubject.headings.map(h=><div key={h.id} className={'hierarchy-item '+(selectedHeading===h.id?'selected':'')}><button className="hierarchy-select" onClick={()=>setSelectedHeading(h.id)}><span className="hierarchy-number">02</span><span><strong>{h.name}</strong><small>{h.topics.length} topics</small></span></button><div className="hierarchy-tools"><button onClick={()=>renameNode('heading',h.id,activeSubject.id)} aria-label="Rename heading"><Icon name="edit" size={14}/></button><button onClick={()=>deleteNode('heading',h.id,activeSubject.id)} aria-label="Delete heading"><Icon name="trash" size={14}/></button></div></div>)}</div>}</>}</Card>
      <Card className="topic-editor"><div className="panel-title-row"><div><div className="eyebrow">LEVEL 03</div><h2>Topics</h2></div><span className="tiny-label">SPACED REPETITION</span></div>{!activeHeading?<EmptyState title="Select a heading" text="Choose a heading to add and manage its topics."/>:<><div className="selected-parent"><span className="tiny-label">{activeSubject.name}</span><strong>{activeHeading.name}</strong></div><form className="inline-add" onSubmit={e=>{e.preventDefault();addTopic();}}><input value={newTopicName} onChange={e=>setNewTopicName(e.target.value)} placeholder="Topic or micro-topic name" aria-label="New topic"/><button className="icon-button accent-button" type="submit" aria-label="Add topic"><Icon name="plus"/></button></form>{activeHeading.topics.length===0?<EmptyState title="No topics yet" text="Add a topic. When you mark it learned, the review cycle begins automatically."/>:<div className="topic-list">{activeHeading.topics.map(t=>{const entry={...t,subjectId:activeSubject.id,subjectName:activeSubject.name,headingId:activeHeading.id,headingName:activeHeading.name};return <TopicCard key={t.id} topic={entry} today={today} intervals={data.settings.revisionIntervals||INTERVALS} onStart={()=>startTopic(entry)} onReview={()=>completeReview(entry)} onRename={()=>renameNode('topic',t.id,{subjectId:activeSubject.id,headingId:activeHeading.id})} onDelete={()=>deleteNode('topic',t.id,{subjectId:activeSubject.id,headingId:activeHeading.id})} onReset={()=>resetTopic(entry)} onPatch={patch=>updateTopic(activeSubject.id,activeHeading.id,t.id,patch)}/>})}</div>}</>}</Card></div>
      <Card><div className="panel-title-row"><div><div className="eyebrow">REVISION QUEUE</div><h2>All topics</h2></div><div className="select-wrap"><select value={revFilter} onChange={e=>setRevFilter(e.target.value)} aria-label="Filter topics"><option value="all">Active + new</option><option value="due">Due / overdue</option><option value="active">In cycle</option><option value="new">Not started</option><option value="complete">Completed</option></select></div></div>{filteredTopics.length===0?<EmptyState title="Queue is clear" text="Topics matching this filter will appear here."/>:<div className="queue-list">{filteredTopics.map(t=><div className="queue-row" key={t.id}><span className={'status-dot '+(dayIsDue(t,today)?'late':t.status==='complete'?'done':'')}/><div><strong>{t.name}</strong><small>{t.subjectName} / {t.headingName}</small></div><div className="queue-due">{t.status==='complete'?'CYCLE COMPLETE':t.status==='new'?'NOT STARTED':niceDate(t.dueDate)}</div></div>)}</div>}</Card>
    </div>;
  };
  function TopicCard({topic,today,intervals,onStart,onReview,onRename,onDelete,onReset,onPatch}) {
    const [expanded,setExpanded]=useState(false);
    const due=dayIsDue(topic,today);
    return <div className={'topic-card '+(due?'topic-due':'')}><div className="topic-card-head"><button className="topic-title-button" onClick={()=>setExpanded(v=>!v)}><span className="topic-status-icon">{topic.status==='complete'?<Icon name="check" size={14}/>:topic.status==='active'?<span className="status-dot"/>:<span>○</span>}</span><span><strong>{topic.name}</strong><small>{topic.status==='new'?'Ready to learn':topic.status==='complete'?'Revision cycle completed':due?'Revision required':'Stage '+(topic.stage+1)+' of '+intervals.length+' · Due '+niceDate(topic.dueDate)}</small></span></button><div className="topic-card-actions"><button onClick={onRename} aria-label="Rename topic"><Icon name="edit" size={14}/></button><button onClick={onDelete} aria-label="Delete topic"><Icon name="trash" size={14}/></button></div></div>
      {topic.status==='active'&&<div className="revision-stages">{intervals.map((d,i)=><div className={'stage-cell '+(i<topic.stage?'complete':i===topic.stage?'current':'')} key={i}><span>{i<topic.stage?'✓':i+1}</span><small>D{d}</small></div>)}</div>}
      <div className="topic-card-foot"><span className={'topic-pill '+(due?'pill-due':topic.status==='complete'?'pill-complete':'')}>{topic.status==='new'?'NEW':topic.status==='complete'?'COMPLETED':due?'DUE NOW':'IN PROGRESS'}</span><div>{topic.status==='new'?<button className="btn btn-primary btn-small" onClick={onStart}>Mark learned <Icon name="arrow" size={13}/></button>:topic.status==='active'?<button className={'btn btn-small '+(due?'btn-primary':'btn-secondary')} onClick={onReview}>{due?'Complete review':'Review early'} <Icon name="check" size={13}/></button>:<button className="btn btn-secondary btn-small" onClick={onReset}>Restart cycle</button>}</div></div>
      {expanded&&<div className="topic-detail"><label>Personal notes<textarea value={topic.notes||''} onChange={e=>onPatch({notes:e.target.value})} placeholder="Add recall cues, mistakes, or next steps..."/></label><label>Confidence <select value={topic.confidence||0} onChange={e=>onPatch({confidence:Number(e.target.value)})}><option value={0}>Not rated</option><option value={1}>1 · Low</option><option value={2}>2 · Developing</option><option value={3}>3 · Good</option><option value={4}>4 · Strong</option><option value={5}>5 · Mastered</option></select></label><div className="topic-history"><strong>History</strong>{(topic.history||[]).length===0?<small>No events recorded yet.</small>:[...(topic.history||[])].reverse().slice(0,8).map(h=><div key={h.id}><span>{h.type==='learned'?'Cycle started':h.type==='review'?'Revision '+(h.stage||'completed'):h.type==='reset'?'Cycle restarted':h.type}</span><small>{niceDate(h.date,{month:'short',day:'numeric',year:'numeric'})}</small></div>)}</div></div>}
    </div>;
  }

  const renderBody = () => {
    const chronological=[...data.weights].sort((a,b)=>a.date.localeCompare(b.date));
    const chart=chronological.slice(-14);
    const values=chart.map(w=>w.value);
    const min=values.length?Math.min(...values,data.profile.goalWeight)-1:0;
    const max=values.length?Math.max(...values,data.profile.startWeight)+1:100;
    const points=chart.map((w,i)=>{const x=chart.length===1?50:i/(chart.length-1)*100;const y=92-((w.value-min)/(max-min||1))*80;return x+','+y;}).join(' ');
    const current=lastWeight?.value;
    const delta=current?current-data.profile.startWeight:0;
    const toGoal=current?current-data.profile.goalWeight:0;
    const goalDistance=Math.abs(data.profile.startWeight-data.profile.goalWeight)||1;
    const progress=current?clamp(Math.abs(data.profile.startWeight-current)/goalDistance*100,0,100):0;
    return <div className="page-enter"><SectionHeading eyebrow="MODULE 03 / BODY STATUS" title="Body progression" subtitle="Record measurements, view honest trends, and track the goal you choose."/>
      <Card id="weight-entry"><div className="panel-title-row"><div><div className="eyebrow">NEW MEASUREMENT</div><h2>Log body weight</h2></div><span className="source-chip">LOCAL RECORD</span></div><form className="weight-form" onSubmit={e=>{e.preventDefault();saveWeight();}}><label><span>Date</span><input type="date" value={weightDate} max={today} onChange={e=>setWeightDate(e.target.value)} required/></label><label><span>Body weight ({data.profile.weightUnit})</span><input type="number" min="1" max="500" step="0.1" value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder={data.profile.weightUnit==='kg'?'e.g. 96.4':'e.g. 212.5'} required/></label><button className="btn btn-primary" type="submit"><Icon name="plus" size={16}/> Save measurement</button></form><p className="micro-disclaimer">Daily fluctuations are normal. Use the trend to understand change over time; this tracker does not diagnose health conditions.</p></Card>
      <div className="stats-grid four"><MiniStat label="Latest" value={current?num(current,1)+' '+data.profile.weightUnit:'—'} sub={lastWeight?niceDate(lastWeight.date):'No entries yet'} icon="scale"/><MiniStat label="Start" value={num(data.profile.startWeight,1)+' '+data.profile.weightUnit} sub="Selected baseline"/><MiniStat label="Change from start" value={current?(delta>0?'+':'')+num(delta,1)+' '+data.profile.weightUnit:'—'} sub={current?(delta>0?'Above baseline':delta<0?'Below baseline':'No change'):'Add a measurement'}/><MiniStat label="To goal" value={current?num(Math.abs(toGoal),1)+' '+data.profile.weightUnit:'—'} sub={current?(Math.abs(toGoal)<0.05?'Goal reached':toGoal>0?'Above goal':'Below goal'):'Set your goal below'}/></div>
      <Card><div className="panel-title-row"><div><div className="eyebrow">TREND ANALYSIS</div><h2>Weight history</h2><p className="panel-subtitle">Showing the last {chart.length} measurements.</p></div>{chart.length>0&&<span className="source-chip">REAL ENTRIES</span>}</div>{chart.length<2?<EmptyState icon="scale" title="Your graph is waiting" text="Log at least two measurements on different dates to draw your personal trend."/>:<><div className="weight-chart-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="weight-chart"><defs><linearGradient id="weightArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".25"/><stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>{[15,35,55,75,95].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-grid"/>)}<polygon points={'0,100 '+points+' 100,100'} fill="url(#weightArea)"/><polyline points={points} className="chart-line"/>{chart.map((w,i)=>{const x=chart.length===1?50:i/(chart.length-1)*100;const y=92-((w.value-min)/(max-min||1))*80;return <circle key={w.id} cx={x} cy={y} r="1.7" className="chart-point"><title>{niceDate(w.date)}: {w.value}</title></circle>;})}</svg><div className="chart-labels"><span>{niceDate(chart[0].date)}</span><span>{niceDate(chart[chart.length-1].date)}</span></div><div className="chart-key"><span><i className="chart-key-line"/>Weight ({data.profile.weightUnit})</span><span><i className="chart-key-goal"/>Goal {num(data.profile.goalWeight,1)}</span></div></div></>}</Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">GOAL CONFIGURATION</div><h2>Your target</h2></div></div><div className="goal-settings-grid"><label>Starting weight ({data.profile.weightUnit})<input type="number" step=".1" value={data.profile.startWeight} onChange={e=>updateProfile('startWeight',Number(e.target.value)||0)}/></label><label>Goal weight ({data.profile.weightUnit})<input type="number" step=".1" value={data.profile.goalWeight} onChange={e=>updateProfile('goalWeight',Number(e.target.value)||0)}/></label><label>Units<select value={data.profile.weightUnit} onChange={e=>updateProfile('weightUnit',e.target.value)}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label></div><div className="goal-progress-large"><div className="split-label"><span>Progress toward configured goal</span><b>{num(progress)}%</b></div><ProgressBar value={progress} max={100}/><small>{current?num(Math.abs(data.profile.goalWeight-current),1)+' '+data.profile.weightUnit+' between latest measurement and goal':'Progress appears after your first measurement.'}</small></div></Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">MEASUREMENT HISTORY</div><h2>All entries</h2></div><span className="counter-chip">{data.weights.length} entries</span></div>{data.weights.length===0?<EmptyState icon="scale" title="No measurements saved" text="Your entries will appear here with edit and delete controls."/>:<div className="weight-history">{[...data.weights].sort((a,b)=>b.date.localeCompare(a.date)).map(w=><div className="weight-history-row" key={w.id}><div className="weight-history-date"><strong>{niceDate(w.date,{month:'short',day:'numeric',year:'numeric'})}</strong><small>{w.date===today?'Today':w.date}</small></div><strong>{num(w.value,1)} {data.profile.weightUnit}</strong><div className="history-actions"><button className="icon-button" onClick={()=>startEditWeight(w)} aria-label="Edit weight"><Icon name="edit" size={15}/></button><button className="icon-button danger" onClick={()=>{if(window.confirm('Delete this weight entry?'))changeData(prev=>({...prev,weights:prev.weights.filter(x=>x.id!==w.id)}));}} aria-label="Delete weight"><Icon name="trash" size={15}/></button></div></div>)}</div>}</Card>
    </div>;
  };

  const renderQuests = () => <div className="page-enter"><SectionHeading eyebrow="MODULE 04 / MISSION CONTROL" title="Quest board" subtitle="Your daily objectives persist until resolved. Dismissal is never completion." action={<button className="btn btn-primary" onClick={()=>setShowAddQuest(v=>!v)}><Icon name="plus" size={16}/> New quest</button>}/>
    {showAddQuest&&<Card><form className="quest-create-form" onSubmit={e=>{e.preventDefault();addQuest();}}><label>Quest title<input value={questName} onChange={e=>setQuestName(e.target.value)} placeholder="e.g. 30-minute walk" required/></label><label>Description<input value={questDesc} onChange={e=>setQuestDesc(e.target.value)} placeholder="What does completion look like?"/></label><label>XP reward<input type="number" min="0" max="10000" value={questXp} onChange={e=>setQuestXp(e.target.value)}/></label><label>Recurrence<select value={questRepeat} onChange={e=>setQuestRepeat(e.target.value)}><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="once">One-time (next generated day)</option></select></label><div className="form-actions"><button className="btn btn-secondary" type="button" onClick={()=>setShowAddQuest(false)}>Cancel</button><button className="btn btn-primary" type="submit">Create quest</button></div></form></Card>}
    <div className="stats-grid four"><MiniStat label="Today's total" value={todayOcc.length} icon="calendar"/><MiniStat label="Cleared today" value={doneToday} icon="check"/><MiniStat label="Still active" value={dueOcc.length} icon="bell"/><MiniStat label="XP earned" value={sum(data.xpLedger.filter(x=>x.date===today),'xp')} icon="spark"/></div>
    <Card><div className="panel-title-row"><div><div className="eyebrow">TODAY'S OPERATIONS</div><h2>Current objectives</h2></div><span className="counter-chip">{doneToday}/{todayOcc.length} CLEARED</span></div>{todayOcc.length===0?<EmptyState title="No active quests" text="Create a quest to start building your routine."/>:<div className="quest-list">{todayOcc.map(o=>{const d=data.questDefs.find(q=>q.id===o.defId)||{title:'Archived quest',description:'This quest is no longer active.',xp:0};return <div className={'quest-row quest-row-large '+(o.status==='completed'?'is-done':'')} key={o.id}><button className={'check-control '+(o.status==='completed'?'checked':'')} onClick={()=>o.status==='completed'?null:completeQuest(o)}>{o.status==='completed'&&<Icon name="check" size={14}/>}</button><div className="quest-main"><strong>{d.title}</strong><small>{d.description||'Personal objective'} · {d.xp||0} XP</small><span className="quest-status inline-status">{o.status==='completed'?'CLEARED':'ACTIVE · '+o.date}</span></div>{o.status==='completed'?<span className="cleared-mark"><Icon name="check" size={17}/></span>:<div className="quest-row-actions"><button className="btn btn-secondary btn-small" onClick={()=>snoozeQuest(o)}>Snooze</button><button className="btn btn-primary btn-small" onClick={()=>completeQuest(o)}>Complete</button></div>}</div>})}</div>}</Card>
    <Card><div className="panel-title-row"><div><div className="eyebrow">QUEST DEFINITIONS</div><h2>Quest templates</h2></div><span className="tiny-label">CUSTOMIZABLE</span></div><div className="quest-def-list">{data.questDefs.map(d=><div className={'quest-def-row '+(!d.active?'disabled':'')} key={d.id}><div className="quest-def-icon"><Icon name={d.kind==='meal'?'nutrition':d.kind==='manual'?'spark':'calendar'} size={17}/></div><div><strong>{d.title}</strong><small>{d.repeat} · {d.xp} XP · {d.kind==='meal'?'Linked to meal logging':'Manual completion'}</small></div>{d.id!=='default-meal-log'&&<button className="icon-button danger" onClick={()=>deleteQuestDef(d.id)} aria-label="Archive quest"><Icon name="trash" size={16}/></button>}</div>)}</div><p className="micro-disclaimer">Recurring quest occurrences are stored by local date. Previous incomplete occurrences remain in history and do not get erased by a new day.</p></Card>
    <Card><div className="panel-title-row"><div><div className="eyebrow">HISTORY</div><h2>Recent missions</h2></div></div>{data.questOccurrences.length===0?<EmptyState title="No mission history yet" text="Quest occurrences will be recorded as days begin."/>:<div className="queue-list">{[...data.questOccurrences].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25).map(o=>{const d=data.questDefs.find(q=>q.id===o.defId)||{title:'Archived quest'};return <div className="queue-row" key={o.id}><span className={'status-dot '+(o.status==='completed'?'done':'late')}/><div><strong>{d.title}</strong><small>{niceDate(o.date,{month:'short',day:'numeric',year:'numeric'})}</small></div><div className="queue-due">{o.status==='completed'?'CLEARED':'UNRESOLVED'}</div></div>})}</div>}</Card>
  </div>;

  const renderStatus = () => {
    const threshold=rank.next || 100;
    const scoreProgress=rank.name==='S-RANK'?metricData.score:clamp((metricData.score-rank.min)/Math.max(1,threshold-rank.min)*100,0,100);
    const achievements=[
      {id:'first-meal',title:'Fuel Logged',desc:'Log your first meal',done:data.meals.length>0,icon:'nutrition'},
      {id:'first-topic',title:'Awakening',desc:'Create your first revision topic',done:topics.length>0,icon:'revision'},
      {id:'first-review',title:'Memory Forged',desc:'Complete a revision',done:topics.some(t=>(t.history||[]).some(h=>h.type==='review')),icon:'spark'},
      {id:'first-weight',title:'Body Registered',desc:'Record your first weight',done:data.weights.length>0,icon:'scale'},
      {id:'ten-quests',title:'Quest Clearer',desc:'Clear 10 quests',done:data.questOccurrences.filter(o=>o.status==='completed').length>=10,icon:'check'},
      {id:'rank-c',title:'Awakened Hunter',desc:'Reach C-Rank or higher',done:rankIndex>=2,icon:'spark'}
    ];
    return <div className="page-enter"><SectionHeading eyebrow="MODULE 05 / HUNTER RECORD" title="Hunter status" subtitle="A transparent record of consistency across your life modules."/>
      <Card className="status-hero"><div className="status-hero-grid"><div className="status-avatar"><div className="avatar-rings"><span>{initials(data.profile.name)}</span></div><span className="tiny-label">HOST / OWNER</span><h2>{data.profile.name}</h2><div className={'status-rank-tag '+rank.className}>{rank.name}</div></div><div className="status-core"><div className="eyebrow">HUNTER SCORE</div><div className="score-number">{metricData.score}<span>/100</span></div><ProgressBar value={scoreProgress} max={100}/><div className="split-label"><span>{rank.name}</span><span>{rank.name==='S-RANK'?'Maximum standard rank':Math.max(0,threshold-metricData.score)+' points to next rank'}</span></div><div className="status-xp"><div><span className="tiny-label">CURRENT LEVEL</span><strong>{level}</strong></div><div><span className="tiny-label">TOTAL XP</span><strong>{num(totalXp)}</strong></div><div><span className="tiny-label">XP TO LEVEL UP</span><strong>{100-xpProgress}</strong></div></div></div></div><div className="rank-ladder">{RANKS.map((r,i)=><div className={'rank-ladder-cell '+(i<=rankIndex?'unlocked':'')+(i===rankIndex?' current':'')} key={r.name}><div className={'rank-emblem small '+r.className}><span>{r.name[0]}</span></div><span>{r.name}</span></div>)}</div></Card>
      <div className="stats-grid four"><MiniStat label="Revisions done" value={topics.reduce((n,t)=>n+(t.history||[]).filter(h=>h.type==='review').length,0)} icon="revision"/><MiniStat label="Meals logged" value={data.meals.length} icon="nutrition"/><MiniStat label="Quests cleared" value={data.questOccurrences.filter(o=>o.status==='completed').length} icon="check"/><MiniStat label="Weight records" value={data.weights.length} icon="scale"/></div>
      <Card><div className="panel-title-row"><div><div className="eyebrow">CORE ATTRIBUTES</div><h2>Consistency profile</h2><p className="panel-subtitle">Weighted by the rules currently set in Settings.</p></div></div><div className="attribute-list large">{[['Revision retention',metricData.revisionScore,'revision',data.settings.weights.revision],['Nutrition tracking',metricData.nutritionScore,'nutrition',data.settings.weights.nutrition],['Quest execution',metricData.questScore,'quests',data.settings.weights.quests],['Body tracking',metricData.bodyScore,'body',data.settings.weights.body]].map(([label,value,key,weight])=><div className="attribute-row" key={key}><div className="split-label"><span>{label} <small>· {weight}% weight</small></span><b>{Math.round(value)}%</b></div><ProgressBar value={value} max={100}/></div>)}</div><div className="score-explainer"><Icon name="spark" size={17}/><p>Rank measures recent consistency, not medical condition, intelligence, or real-world combat ability. XP awards are an activity ledger and do not directly inflate the consistency score.</p></div></Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">MILESTONES</div><h2>Achievements</h2></div><span className="counter-chip">{achievements.filter(a=>a.done).length}/{achievements.length}</span></div><div className="achievement-grid">{achievements.map(a=><div className={'achievement '+(a.done?'unlocked':'locked')} key={a.id}><div className="achievement-icon"><Icon name={a.icon} size={21}/></div><div><strong>{a.title}</strong><small>{a.desc}</small></div><span className="achievement-state">{a.done?'UNLOCKED':'LOCKED'}</span></div>)}</div></Card>
      <Card><div className="panel-title-row"><div><div className="eyebrow">XP LEDGER</div><h2>Recent transactions</h2></div><span className="tiny-label">AUDITABLE REWARDS</span></div>{data.xpLedger.length===0?<EmptyState icon="spark" title="No XP earned yet" text="Completing a tracked action will create the first ledger entry."/>:<div className="xp-ledger">{[...data.xpLedger].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,30).map(x=><div className="xp-row" key={x.id}><div className="xp-badge">+{x.xp}</div><div><strong>{x.reason}</strong><small>{niceDate(x.date,{month:'short',day:'numeric',year:'numeric'})}</small></div><span>XP</span></div>)}</div>}</Card>
    </div>;
  };

  const renderSettings = () => <div className="page-enter"><SectionHeading eyebrow="SYSTEM CONFIGURATION" title="Settings" subtitle="Your system, your rules. Changes apply to future calculations and reminders."/>
    <div className="settings-layout"><nav className="settings-tabs">{[['goals','Goals & profile'],['revision','Revision rules'],['rank','Rank & XP'],['notifications','Notifications'],['appearance','Appearance'],['data','Data & privacy']].map(([id,label])=><button key={id} className={activeSettingsTab===id?'active':''} onClick={()=>setActiveSettingsTab(id)}>{label}<Icon name="arrow" size={14}/></button>)}</nav>
    <Card className="settings-content">
      {activeSettingsTab==='goals'&&<><div className="eyebrow">HOST PROFILE</div><h2>Goals & profile</h2><div className="settings-form-grid"><label>Host name<input value={data.profile.name} onChange={e=>updateProfile('name',e.target.value)}/></label><label>Calorie target (kcal)<input type="number" min="0" value={data.profile.calories} onChange={e=>updateProfile('calories',Number(e.target.value)||0)}/></label><label>Protein target (g)<input type="number" min="0" value={data.profile.protein} onChange={e=>updateProfile('protein',Number(e.target.value)||0)}/></label><label>Carbohydrate target (g)<input type="number" min="0" value={data.profile.carbs} onChange={e=>updateProfile('carbs',Number(e.target.value)||0)}/></label><label>Fat target (g)<input type="number" min="0" value={data.profile.fat} onChange={e=>updateProfile('fat',Number(e.target.value)||0)}/></label><label>Starting weight ({data.profile.weightUnit})<input type="number" step=".1" value={data.profile.startWeight} onChange={e=>updateProfile('startWeight',Number(e.target.value)||0)}/></label><label>Goal weight ({data.profile.weightUnit})<input type="number" step=".1" value={data.profile.goalWeight} onChange={e=>updateProfile('goalWeight',Number(e.target.value)||0)}/></label></div><div className="settings-divider"/><div className="eyebrow">FOOD PROVIDER</div><h3>USDA FoodData Central</h3><p className="panel-subtitle">Optional. Keep the API key private; it is saved on this device and is not committed to the project.</p><label className="full-label">API key<input type="password" autoComplete="off" value={data.settings.usdaApiKey||''} onChange={e=>updateSettings('usdaApiKey',e.target.value)} placeholder="Paste your USDA API key"/></label></>}
      {activeSettingsTab==='revision'&&<><div className="eyebrow">SPACED REPETITION</div><h2>Revision rules</h2><p className="panel-subtitle">Default cycle: Day 1 → 3 → 7 → 14 → 30 → 90 → Completed. Edit intervals for future reviews.</p><div className="interval-editor">{(data.settings.revisionIntervals||INTERVALS).map((v,i)=><label key={i}>Stage {i+1}<div className="interval-input"><input type="number" min="1" max="999" value={v} onChange={e=>{const next=[...(data.settings.revisionIntervals||INTERVALS)];next[i]=Math.max(1,Number(e.target.value)||1);updateSettings('revisionIntervals',next);}}/><span>days</span></div></label>)}</div><button className="btn btn-secondary" onClick={()=>updateSettings('revisionIntervals',[...INTERVALS])}>Reset to default intervals</button><div className="settings-divider"/><label className="full-label">Reminder time<input type="time" value={data.settings.reminderTime} onChange={e=>updateSettings('reminderTime',e.target.value)}/></label><p className="micro-disclaimer">Changing intervals affects future next-due dates after a review; already-completed history is preserved.</p></>}
      {activeSettingsTab==='rank'&&<><div className="eyebrow">PROGRESSION ENGINE</div><h2>Rank & XP rules</h2><p className="panel-subtitle">Hunter score is a weighted consistency index for the last 30 local calendar days. XP is a separate, auditable ledger.</p><div className="settings-form-grid">{[['revision','Revision consistency'],['nutrition','Nutrition logging'],['quests','Quest completion'],['body','Body tracking']].map(([key,label])=><label key={key}>{label} weight (%)<input type="number" min="0" max="100" value={data.settings.weights[key]} onChange={e=>updateSettings('weights',{...data.settings.weights,[key]:clamp(Number(e.target.value)||0,0,100)})}/></label>)}</div><p className="inline-note">All weights are normalized during score calculation. Current total: {Object.values(data.settings.weights).reduce((a,b)=>a+Number(b||0),0)}%.</p><div className="settings-divider"/><h3>Rank thresholds</h3><div className="settings-form-grid">{['D-Rank threshold','C-Rank threshold','B-Rank threshold','A-Rank threshold','S-Rank threshold'].map((label,i)=><label key={label}>{label}<input type="number" min="0" max="100" value={data.settings.rankThresholds[i]} onChange={e=>{const next=[...data.settings.rankThresholds];next[i]=clamp(Number(e.target.value)||0,0,100);updateSettings('rankThresholds',next);}}/></label>)}</div><p className="micro-disclaimer">For clean progression, keep thresholds in ascending order (default 20, 35, 50, 65, 80).</p></>}
      {activeSettingsTab==='notifications'&&<><div className="eyebrow">ALERT PROTOCOL</div><h2>Notifications & quests</h2><SettingsToggle title="System notifications" text="Allow due-review notifications in the Android build." value={data.settings.notifications} onChange={v=>updateSettings('notifications',v)}/><SettingsToggle title="Incomplete-quest popup" text="Show unresolved due and overdue quests whenever the app opens." value={data.settings.questPopup} onChange={v=>updateSettings('questPopup',v)}/><SettingsToggle title="Daily meal-log quest" text="Create a meal logging objective for each local day." value={data.settings.dailyMealQuest} onChange={v=>{updateSettings('dailyMealQuest',v);changeData(prev=>({...prev,questDefs:prev.questDefs.map(d=>d.id==='default-meal-log'?{...d,active:v}:d)}));}}/><SettingsToggle title="Daily weight reminder quest" text="Add an optional measurement objective each day." value={data.settings.dailyWeightQuest} onChange={v=>updateSettings('dailyWeightQuest',v)}/><SettingsToggle title="Sound effects" text="Enable app sound feedback where available." value={data.settings.sound} onChange={v=>updateSettings('sound',v)}/><SettingsToggle title="Haptic feedback" text="Allow supported vibration feedback." value={data.settings.haptics} onChange={v=>updateSettings('haptics',v)}/><div className="settings-divider"/><label className="full-label">Reminder time<input type="time" value={data.settings.reminderTime} onChange={e=>updateSettings('reminderTime',e.target.value)}/></label><button className="btn btn-primary" onClick={openNotifications}><Icon name="bell" size={16}/> Request notification permission</button><p className="micro-disclaimer">Android reminders use local notifications. Delivery depends on OS permissions, device battery settings, and alarm scheduling rules. Browser notifications cannot guarantee background delivery.</p></>}
      {activeSettingsTab==='appearance'&&<><div className="eyebrow">HUD CUSTOMIZATION</div><h2>Appearance</h2><p className="panel-subtitle">Tune the System's visual intensity for comfort and performance.</p><div className="accent-options">{[['cyan','#48dcff','Cyan'],['violet','#a78bfa','Violet'],['emerald','#4de0ac','Emerald'],['amber','#f4bf62','Amber']].map(([key,color,label])=><button key={key} className={data.settings.accent===key?'selected':''} onClick={()=>updateSettings('accent',key)}><span style={{background:color}}/>{label}{data.settings.accent===key&&<Icon name="check" size={14}/>}</button>)}</div><SettingsToggle title="Motion effects" text="Smooth entrance transitions and animated meters." value={data.settings.animations} onChange={v=>updateSettings('animations',v)}/><div className="settings-divider"/><div className="privacy-note"><Icon name="heart" size={20}/><div><strong>Original System-inspired visuals</strong><p>This app uses original interface art and effects. It does not bundle copyrighted anime footage, official artwork, or soundtrack recordings.</p></div></div></>}
      {activeSettingsTab==='data'&&<><div className="eyebrow">LOCAL DATA CONTROL</div><h2>Data & privacy</h2><div className="privacy-note"><Icon name="heart" size={20}/><div><strong>Your data stays on this device</strong><p>Tracker records are stored locally in app storage. Public food search sends your search query to the selected food provider only when you search.</p></div></div><div className="data-actions"><button className="btn btn-secondary" onClick={exportBackup}><Icon name="download" size={16}/> Export full backup</button><label className="btn btn-secondary file-button"><Icon name="upload" size={16}/> Restore backup<input type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value='';}}/></label></div><p className="micro-disclaimer">CSV and full JSON export are designed to keep your food logs, revision hierarchy, weight history, quests, settings, and XP ledger portable.</p><div className="settings-divider"/><button className="btn btn-danger" onClick={()=>{if(window.confirm('Permanently delete all local tracker data? Export a backup first if needed.')){localStorage.removeItem(DB_KEY);setData(defaultData());setSelectedSubject('');setSelectedHeading('');notifyToast('LOCAL DATA RESET');}}}><Icon name="trash" size={16}/> Reset all local data</button></>}
    </Card></div>
  </div>;
  function SettingsToggle({title,text,value,onChange}) {
    return <div className="settings-toggle"><div><strong>{title}</strong><p>{text}</p></div><button type="button" className={'toggle '+(value?'on':'')} onClick={()=>onChange(!value)} role="switch" aria-checked={!!value}><span/></button></div>;
  }

  const pageRender = {system:renderSystem,nutrition:renderNutrition,revision:renderRevision,body:renderBody,quests:renderQuests,status:renderStatus,settings:renderSettings};
  const nav=[['system','System','system'],['nutrition','Nutrition','nutrition'],['revision','Revision','revision'],['body','Body status','body'],['status','Hunter status','status']];
  const pageLabel=({system:'System overview',nutrition:'Nutrition tracker',revision:'Revision tracker',body:'Body progression',quests:'Quest board',status:'Hunter status',settings:'System settings'})[page];
  const appStyle={'--accent':data.settings.accent==='violet'?'#a78bfa':data.settings.accent==='emerald'?'#4de0ac':data.settings.accent==='amber'?'#f4bf62':'#48dcff'};
  return <div className={'app-root '+(!data.settings.animations?'reduce-motion':'')} style={appStyle}>
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><span/><span/><span/></div><div><strong>SHADOW<span>SYS</span></strong><small>PERSONAL SYSTEM / 01</small></div></div><div className="side-hunter"><div className="side-avatar">{initials(data.profile.name)}</div><div><strong>{data.profile.name}</strong><small>{rank.name} · LVL {level}</small></div><span className="online-dot"/></div><div className="side-section-label">OPERATIONS</div><nav className="side-nav">{nav.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon} size={18}/><span>{label}</span>{id==='revision'&&dueTopics.length>0&&<i className="nav-count">{dueTopics.length}</i>}</button>)}<button className={page==='quests'?'active':''} onClick={()=>setPage('quests')}><Icon name="spark" size={18}/><span>Quest board</span>{dueOcc.length>0&&<i className="nav-count">{dueOcc.length}</i>}</button></nav><div className="sidebar-bottom"><div className="sidebar-rank"><span className={'rank-emblem mini '+rank.className}>{rank.name[0]}</span><div><small>HUNTER SCORE</small><strong>{metricData.score} / 100</strong><ProgressBar value={metricData.score} max={100}/></div></div><button className={'side-settings '+(page==='settings'?'active':'')} onClick={()=>setPage('settings')}><Icon name="settings" size={18}/> Settings</button><div className="sidebar-footer"><span className="pulse-dot"/> LOCAL SYSTEM ACTIVE <small>v1.0.0</small></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>SHADOW SYSTEM</span><b>/</b><strong>{pageLabel}</strong></div><div className="topbar-actions"><span className="topbar-date">{niceDate(today,{weekday:'short',month:'short',day:'numeric'})}</span><button className="icon-button notification-button" onClick={()=>{setPage('quests');setShowPopup(dueOcc.length>0);}} aria-label="Open notifications"><Icon name="bell" size={18}/>{dueOcc.length>0&&<i/>}</button><button className="top-avatar" onClick={()=>setPage('status')} aria-label="Open hunter status">{initials(data.profile.name)}</button></div></header><div className="mobile-brand"><div className="brand-mark"><span/><span/><span/></div><strong>SHADOW<span>SYS</span></strong></div><div className="page-content">{(pageRender[page]||renderSystem)()}</div><footer className="mobile-footer"><span className="pulse-dot"/> SYSTEM LINK STABLE <span>·</span> DEV / PERSONAL BUILD</footer></main>
    <nav className="mobile-nav">{nav.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon} size={19}/><span>{label==='Hunter status'?'Status':label==='Body status'?'Body':label}</span></button>)}<button className={page==='quests'?'active':''} onClick={()=>setPage('quests')}><Icon name="spark" size={19}/><span>Quests</span></button></nav>
    {selectedFood&&<div className="modal-scrim" onClick={()=>setSelectedFood(null)}><div className="modal-panel" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow">ADD FOOD / {selectedFood.source||'CATALOGUE'}</div><h2>{selectedFood.name}</h2><p>{selectedFood.brand||'Nutrition values per 100 g'}</p></div><button className="icon-button" onClick={()=>setSelectedFood(null)}><Icon name="close"/></button></div><div className="serving-field"><label>Serving amount (grams)<input type="number" min="1" max="5000" value={foodAmount} onChange={e=>setFoodAmount(e.target.value)}/></label><label>Meal<select value={mealType} onChange={e=>setMealType(e.target.value)}>{['Breakfast','Lunch','Dinner','Snacks'].map(m=><option key={m}>{m}</option>)}</select></label><label>Date<input type="date" value={foodDate} onChange={e=>setFoodDate(e.target.value)}/></label></div>{foodNutrition&&<div className="serving-preview"><div><span>Calories</span><strong>{num(foodNutrition.kcal,1)} kcal</strong></div><div><span>Protein</span><strong>{num(foodNutrition.protein,1)} g</strong></div><div><span>Carbohydrates</span><strong>{num(foodNutrition.carbs,1)} g</strong></div><div><span>Fat</span><strong>{num(foodNutrition.fat,1)} g</strong></div><div><span>Fibre</span><strong>{num(foodNutrition.fiber,1)} g</strong></div></div>}<button className="btn btn-primary btn-block" onClick={()=>addMeal(selectedFood,foodAmount,foodDate,mealType)}><Icon name="plus" size={16}/> Add to diary</button></div></div>}
    {showCustomFood&&<div className="modal-scrim" onClick={()=>setShowCustomFood(false)}><div className="modal-panel" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow">CUSTOM FOOD</div><h2>Create food entry</h2><p>All values are per 100 g.</p></div><button className="icon-button" onClick={()=>setShowCustomFood(false)}><Icon name="close"/></button></div><div className="settings-form-grid"><label>Food name<input value={customFoodForm.name} onChange={e=>setCustomFoodForm({...customFoodForm,name:e.target.value})} required/></label><label>Brand (optional)<input value={customFoodForm.brand} onChange={e=>setCustomFoodForm({...customFoodForm,brand:e.target.value})}/></label><label>Calories (kcal)<input type="number" value={customFoodForm.kcal} onChange={e=>setCustomFoodForm({...customFoodForm,kcal:e.target.value})} required/></label><label>Protein (g)<input type="number" value={customFoodForm.protein} onChange={e=>setCustomFoodForm({...customFoodForm,protein:e.target.value})}/></label><label>Carbs (g)<input type="number" value={customFoodForm.carbs} onChange={e=>setCustomFoodForm({...customFoodForm,carbs:e.target.value})}/></label><label>Fat (g)<input type="number" value={customFoodForm.fat} onChange={e=>setCustomFoodForm({...customFoodForm,fat:e.target.value})}/></label><label>Fibre (g)<input type="number" value={customFoodForm.fiber} onChange={e=>setCustomFoodForm({...customFoodForm,fiber:e.target.value})}/></label></div><button className="btn btn-primary btn-block" onClick={saveCustomFood}>Save custom food</button></div></div>}
    {showPopup&&data.settings.questPopup&&dueOcc.length>0&&<div className="modal-scrim quest-scrim" role="dialog" aria-modal="true" aria-labelledby="quest-popup-title"><div className="quest-popup modal-panel"><div className="quest-popup-top"><span className="pulse-dot"/> SYSTEM NOTIFICATION <span className="warning-label">{dueOcc.length} UNRESOLVED</span></div><div className="quest-popup-symbol"><Icon name="bell" size={28}/></div><div className="eyebrow">DAILY QUEST INCOMPLETE</div><h2 id="quest-popup-title">Hunter, your objectives remain.</h2><p>The following quests are due or overdue. Dismissing this panel will not complete them.</p><div className="popup-quest-list">{dueOcc.slice(0,6).map(o=>{const def=data.questDefs.find(d=>d.id===o.defId)||{title:'Archived quest'};return <div key={o.id}><span className="warning-pip"/><div><strong>{def.title}</strong><small>{o.date<today?'Overdue since '+niceDate(o.date):'Due today'} · {o.date}</small></div><button className="icon-button" onClick={()=>{setShowPopup(false);setPage(def.kind==='meal'?'nutrition':'quests');}}><Icon name="arrow" size={15}/></button></div>})}{dueOcc.length>6&&<small>+ {dueOcc.length-6} more unresolved quests</small>}</div><div className="popup-actions"><button className="btn btn-secondary" onClick={()=>{setShowPopup(false);setPopupSeen(true);}}>Dismiss for now</button><button className="btn btn-primary" onClick={()=>{setShowPopup(false);setPopupSeen(true);setPage('quests');}}>Open quest board <Icon name="arrow" size={15}/></button></div><small className="popup-foot">UNRESOLVED QUESTS PERSIST ACROSS APP RESTARTS</small></div></div>}
    {toast&&<div className="toast"><span className="pulse-dot"/>{toast}</div>}
  </div>;
}
