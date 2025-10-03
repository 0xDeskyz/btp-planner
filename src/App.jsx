"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  useDraggable,
} from "@dnd-kit/core";

import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Users,
  Plus,
  Trash2,
  FileText,
  RotateCcw,
  Upload,
  Download,
} from "lucide-react";

// ================= UI maison (Tailwind)
const cx = (...cls) => cls.filter(Boolean).join(" ");

function Button({ children, className = "", variant = "default", size = "md", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = { default: "bg-black text-white hover:bg-black/90", outline: "border border-neutral-300 hover:bg-neutral-50", ghost: "hover:bg-neutral-100" };
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", icon: "h-9 w-9" };
  return (
    <button className={cx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
}
function Card({ children, className = "" }) { return <div className={cx("border rounded-xl bg-white", className)}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={cx("p-4", className)}>{children}</div>; }
function Input(props) { return <input {...props} className={cx("w-full h-9 px-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400", props.className)} />; }
function Textarea(props) { return <textarea {...props} className={cx("w-full min-h-28 p-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400", props.className)} />; }

// Tabs
const TabsCtx = React.createContext(null);
function Tabs({ value, onValueChange, children }) { return <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>; }
function TabsList({ children, className = "" }) { return <div role="tablist" aria-label="Vues" className={cx("inline-flex gap-1 bg-neutral-100 p-1 rounded-lg", className)}>{children}</div>; }
function TabsTrigger({ value, children }) { const ctx = React.useContext(TabsCtx) || { value: undefined, onValueChange: () => {} }; const active = ctx.value === value; return (<button role="tab" aria-selected={active} onClick={() => ctx.onValueChange(value)} className={cx("px-3 py-1.5 rounded-md text-sm", active ? "bg-white shadow text-black" : "text-neutral-600 hover:bg-white/70")}>{children}</button>); }

// Dialog (basique)
const DialogCtx = React.createContext(null);
function Dialog({ open, onOpenChange, children }) { if (!open) return null; return (<DialogCtx.Provider value={{ open, onOpenChange }}><div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />{children}</div></DialogCtx.Provider>); }
function DialogContent({ children, className = "" }) { return <div className={cx("relative z-10 w-full max-w-lg rounded-xl bg-white p-4 shadow-lg", className)}>{children}</div>; }
function DialogHeader({ children }) { return <div className="mb-2">{children}</div>; }
function DialogTitle({ children }) { return <div className="text-lg font-semibold">{children}</div>; }
function DialogFooter({ children }) { return <div className="mt-3 flex items-center justify-end gap-2">{children}</div>; }

// ==================================
// Constantes & Démo
// ==================================
const COLORS = ["bg-rose-500","bg-amber-500","bg-emerald-500","bg-sky-500","bg-violet-500","bg-pink-500","bg-indigo-500"];
const DEMO_PEOPLE = [{ id: "p1", name: "Ali", color: "bg-rose-500" },{ id: "p2", name: "Mina", color: "bg-amber-500" },{ id: "p3", name: "Rachid", color: "bg-emerald-500" }];
const DEMO_SITES = [{ id: "s1", name: "Chantier A" },{ id: "s2", name: "Chantier B" }];

// ==================================
// Date Helpers (ISO week, local time, Lun->Ven)
// ==================================
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; // évite UTC shift

function startOfISOWeekLocal(d){ const c=new Date(d); const day=(c.getDay()+6)%7; c.setDate(c.getDate()-day); c.setHours(0,0,0,0); return c; }
function getWeekDatesLocal(anchor){ const start=startOfISOWeekLocal(anchor); return Array.from({length:7},(_,i)=>{ const dd=new Date(start); dd.setDate(start.getDate()+i); return dd;}); }

// ISO week number (1..53) + ISO week-year (peut différer de l'année calendaire)
function getISOWeekAndYear(date){
  const tmp = new Date(date);
  tmp.setHours(0,0,0,0);
  const day = (tmp.getDay()+6)%7;
  tmp.setDate(tmp.getDate()-day+3); // jeudi
  const isoYear = tmp.getFullYear();
  const jan4 = new Date(isoYear,0,4);
  const jan4Day = (jan4.getDay()+6)%7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate()-jan4Day); // lundi de la semaine 1
  const diffMs = tmp - week1Start;
  const week = 1 + Math.floor(diffMs / (7*24*3600*1000));
  return { week, isoYear };
}
const getISOWeek = (d)=>getISOWeekAndYear(d).week;
const getISOWeekYear = (d)=>getISOWeekAndYear(d).isoYear;
const weekKeyOf = (d)=>`${getISOWeekYear(d)}-W${pad2(getISOWeek(d))}`;

function getMonthWeeks(anchor){
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfISOWeekLocal(first);
  return Array.from({length:6},(_,w)=>{ const start=new Date(gridStart); start.setDate(gridStart.getDate()+w*7); return Array.from({length:7},(__,i)=>{ const dd=new Date(start); dd.setDate(start.getDate()+i); return dd;}); });
}
function getQuarterMonths(month){ if(month<=2) return [0,1,2]; if(month<=5) return [3,4,5]; if(month<=8) return [6,7,8]; return [9,10,11]; }
const cellKey = (siteId, dateKey) => `${siteId}|${dateKey}`;

const NOTE_BG = { yellow: "bg-yellow-200", green: "bg-green-200", blue: "bg-blue-200", pink: "bg-pink-200", orange: "bg-orange-200" };
const NOTE_RING = { yellow: "ring-yellow-300", green: "ring-green-300", blue: "ring-blue-300", pink: "ring-pink-300", orange: "ring-orange-300" };

// ==================================
// Draggable Person Chip
// ==================================
function PersonChip({ person }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `person-${person.id}`, data: { type: "person", person } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`select-none inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${person.color} shadow cursor-grab`}>
      <Users className="w-4 h-4" /> {person.name}
    </div>
  );
}

// ==================================
// Droppable Cell (Day x Site)
// ==================================
function DayCell({ date, site, assignments, people, onEditNote, notes, onRemoveAssignment }) {
  const id = `cell-${site.id}-${toLocalKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "day-site", date, site } });
  const todays = assignments.filter((a) => a.date === toLocalKey(date) && a.siteId === site.id);
  const key = cellKey(site.id, toLocalKey(date));
  const hasNote = Boolean(notes[key]);
  const noteText = notes[key];
  return (
    <div className={`border border-neutral-200 min-h-20 p-2 relative rounded-xl ${isOver ? "ring-2 ring-sky-400" : ""}`} ref={setNodeRef}>
      <div className="absolute top-1 right-2 text-[11px] text-neutral-500">{date.getDate()}</div>
      <div className="flex flex-wrap gap-1 pr-6">
        {todays.map((a) => {
          const p = people.find((pp) => pp.id === a.personId);
          return p ? (
            <div key={a.id} className={`px-2 py-0.5 rounded-full text-white text-xs ${p.color} flex items-center gap-1`}>
              <span>{p.name}</span>
              <button className="ml-1 w-4 h-4 leading-none rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center" title="Retirer du jour" aria-label={`Retirer ${p.name}`} onClick={() => onRemoveAssignment(a.id)}>×</button>
            </div>
          ) : null;
        })}
      </div>
      {hasNote && (<FileText className="w-4 h-4 text-amber-500 absolute top-1 left-1" title={noteText || "Annotation"} />)}
      <button onClick={() => onEditNote(date, site)} className="absolute bottom-1 right-1 opacity-70 hover:opacity-100" aria-label="Ajouter/editer une annotation" title="Ajouter/editer une annotation">
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ==================================
// Dialogs
// ==================================
function AddPersonDialog({ open, setOpen, onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un salarié</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <div key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full cursor-pointer ${c} ${color === c ? "ring-2 ring-black" : ""}`} title={c} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim(), color); setOpen(false); setName(""); setColor(COLORS[0]); } }}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSiteDialog({ open, setOpen, onAdd }) {
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un chantier</DialogTitle></DialogHeader>
        <Input placeholder="Nom du chantier" value={name} onChange={(e) => setName(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setOpen(false); setName(""); } }}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnotationDialog({ open, setOpen, value, onSave }) {
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Annotation</DialogTitle></DialogHeader>
        <Textarea className="min-h-40" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ajouter une note pour cette case (chantier + jour)..." />
        <DialogFooter>
          <Button onClick={() => { onSave(txt); setOpen(false); }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================================
// Mini Month (read-only Lun->Ven)
// ==================================
function MiniMonth({ date }) {
  const weeks = getMonthWeeks(date);
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="text-sm font-medium capitalize">{date.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="grid grid-cols-6 text-[11px] text-neutral-500">
          <div className="px-1">Sem.</div>
          {["Lun","Mar","Mer","Jeu","Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
        </div>
        <div className="space-y-1">
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-6 gap-1">
              <div className="text-[11px] text-neutral-500 flex items-center justify-center">{getISOWeek(week[0])}</div>
              {week.slice(0, 5).map((d) => (<div key={toLocalKey(d)} className="border border-neutral-200 rounded-md h-6" />))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================================
// Quarter interactive month (post-it jour + Notes semaine)
// ==================================
function QuarterMonth({ date, getDayPosts, getWeekPosts, onAddDayPost, onAddWeekPost, onRemoveDayPost, onRemoveWeekPost, onPreviewDayPost, onPreviewWeekPost, className, }) {
  const weeks = getMonthWeeks(date);
  return (
    <Card className={cx("shadow-sm", className ?? "")}>
      <CardContent className="p-4 space-y-3">
        <div className="text-base font-semibold capitalize tracking-tight">{date.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="grid grid-cols-7 text-xs text-neutral-600 font-medium">
          <div className="px-2">Sem.</div>
          {["Lun","Mar","Mer","Jeu","Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
          <div className="text-center">Notes</div>
        </div>
        <div className="space-y-3">
          {weeks.map((week, i) => {
            const wkKey = weekKeyOf(week[0]);
            const wkPosts = getWeekPosts(wkKey);
            return (
              <div key={i} className="grid grid-cols-7 gap-2 items-stretch">
                <div className="text-xs text-neutral-500 flex items-center justify-center">{getISOWeek(week[0])}</div>
                {week.slice(0, 5).map((d) => {
                  const dk = toLocalKey(d);
                  const posts = getDayPosts(dk);
                  const highlight = posts[0]?.color;
                  return (
                    <div key={dk} className={`border rounded-xl h-32 md:h-36 lg:h-40 p-2 relative bg-white overflow-hidden ${highlight ? `ring-2 ${NOTE_RING[highlight]}` : "border-neutral-200"}`} title={posts.length ? posts.map((p) => p.text).join("; ") : ""}>
                      <div className="absolute top-1 right-2 text-[11px] text-neutral-500">{d.getDate()}</div>
                      <div className="flex flex-col gap-1 pr-6">
                        {posts.map((p) => (
                          <div key={p.id} onClick={() => onPreviewDayPost(dk, p)} className={`text-[11px] px-2 py-1 rounded ${NOTE_BG[p.color]} shadow-sm flex justify-between items-center cursor-pointer`}>
                            <span className="truncate">{p.text}</span>
                            <button className="ml-2 text-[10px] opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemoveDayPost(dk, p.id); }} aria-label="Supprimer le post-it">×</button>
                          </div>
                        ))}
                      </div>
                      <button className="absolute bottom-1 left-1 text-[11px] px-2 py-0.5 rounded border border-dashed" onClick={() => onAddDayPost(dk)}>+ post-it</button>
                    </div>
                  );
                })}
                <div className="border border-neutral-200 rounded-xl h-32 md:h-36 lg:h-40 p-2 relative bg-neutral-50">
                  <div className="text-[11px] text-neutral-500 mb-1">Notes S{getISOWeek(week[0])}</div>
                  <div className="flex flex-col gap-1 pr-1 overflow-auto max-h-[85%]">
                    {wkPosts.map((p) => (
                      <div key={p.id} onClick={() => onPreviewWeekPost(wkKey, p)} className={`text-[11px] px-2 py-1 rounded ${NOTE_BG[p.color]} shadow-sm flex justify-between items-center cursor-pointer`}>
                        <span className="truncate">{p.text}</span>
                        <button className="ml-2 text-[10px] opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemoveWeekPost(wkKey, p.id); }} aria-label="Supprimer la note">×</button>
                      </div>
                    ))}
                  </div>
                  <button className="absolute bottom-1 left-1 text-[11px] px-2 py-0.5 rounded border border-dashed" onClick={() => onAddWeekPost(wkKey)}>+ note</button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================================
// Main Component (Page)
// ==================================
export default function Page() {
  // Core state
  const [people, setPeople] = useState(DEMO_PEOPLE);
  const [sites, setSites] = useState(DEMO_SITES);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState({}); // per cell `${siteId}|${dateKey}`
  const [absencesByWeek, setAbsencesByWeek] = useState({}); // { "YYYY-W##": { personId: true } }

  // Quarter-only: post-its
  const [dayPosts, setDayPosts] = useState({});
  const [weekPosts, setWeekPosts] = useState({});
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postTarget, setPostTarget] = useState(null); // { type: 'day'|'week', key: string }
  const [postText, setPostText] = useState("");
  const [postColor, setPostColor] = useState("yellow");

  // Quarter-only: preview enlarged post-it
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState(null); // { scope: 'day'|'week', post: {id,text,color} }
  const openPreview = (scope, post) => { setPreviewPost({ scope, post }); setPreviewOpen(true); };

  // Dialog open helper (fix ReferenceError)
  const openPostItDialog = (target) => { setPostTarget(target); setPostText(""); setPostColor("yellow"); setPostDialogOpen(true); };

  // View / navigation
  const [view, setView] = useState("week"); // "week" | "month" | "quarter" | "year"
  const [anchor, setAnchor] = useState(() => new Date());
  const weekFull = useMemo(()=>getWeekDatesLocal(anchor), [anchor]);
  const weekDays = useMemo(()=>weekFull.slice(0, 5), [weekFull]); // Monday..Friday
  const monthWeeks = useMemo(()=>getMonthWeeks(anchor), [anchor]);
  const currentWeekKey = useMemo(()=>weekKeyOf(weekDays[0]), [weekDays]);

  // DnD sensors (Pointer + Touch)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor)
  );

  const isAbsentOnWeek = (pid, wk) => Boolean(absencesByWeek[wk]?.[pid]);
  const toggleAbsentThisWeek = (pid) => { setAbsencesByWeek((prev) => { const week = { ...(prev[currentWeekKey] || {}) }; week[pid] = !week[pid]; return { ...prev, [currentWeekKey]: week }; }); };

  const handleDrop = (person, date, site) => {
    const dateKey = toLocalKey(date);
    const wkKey = weekKeyOf(date);
    if (isAbsentOnWeek(person.id, wkKey)) return; // absent this week
    const hasSameDay = assignments.some((a) => a.personId === person.id && a.date === dateKey);
    if (hasSameDay) return; // conflict same day
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${person.id}-${site.id}-${dateKey}-${Date.now()}`;
    setAssignments((prev) => [...prev, { id, personId: person.id, siteId: site.id, date: dateKey }]);
  };

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || !active?.data?.current) return;
    const data = active.data.current; // { type, person }
    if (data?.type === "person" && data.person && over.data?.current?.type === "day-site") {
      handleDrop(data.person, over.data.current.date, over.data.current.site);
    }
  };

  const shift = (delta) => {
    const d = new Date(anchor);
    if (view === "week") d.setDate(d.getDate() + delta * 7);
    else if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "quarter") d.setMonth(d.getMonth() + delta * 3);
    else d.setFullYear(d.getFullYear() + delta);
    setAnchor(d);
  };

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteKeyState, setNoteKeyState] = useState(null);
  const currentNoteValue = noteKeyState ? notes[noteKeyState] ?? "" : "";
  const openNote = (date, site) => { setNoteKeyState(cellKey(site.id, toLocalKey(date))); setNoteOpen(true); };
  const saveNote = (val) => { if (noteKeyState) setNotes((prev) => ({ ...prev, [noteKeyState]: val })); };

  // CRUD helpers
  const removeAssignment = (id) => setAssignments((prev) => prev.filter((a) => a.id !== id));
  const addPerson = (name, color) => setPeople((p) => [...p, { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `p${Date.now()}`, name, color }]);
  const removePerson = (id) => {
    setPeople((p) => p.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.personId !== id));
    setAbsencesByWeek((prev) => { const next = { ...prev }; for (const wk of Object.keys(next)) { if (next[wk] && Object.prototype.hasOwnProperty.call(next[wk], id)) { const { [id]: _omit, ...rest } = next[wk]; next[wk] = rest; } } return next; });
  };
  const addSite = (name) => setSites((s) => [...s, { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `s${Date.now()}`, name }]);
  const removeSite = (id) => {
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id)); // nettoie les affectations orphelines
    setNotes((prev) => { const next = { ...prev }; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete next[k]; }); return next; });
  };

  // ==========================
  // Persistance locale (auto-save)
  // ==========================
  const firstLoad = useRef(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("btp-planner-state:v1");
      if (raw) {
        const s = JSON.parse(raw);
        setPeople(s.people || DEMO_PEOPLE);
        setSites(s.sites || DEMO_SITES);
        setAssignments(s.assignments || []);
        setNotes(s.notes || {});
        setAbsencesByWeek(s.absencesByWeek || {});
        setDayPosts(s.dayPosts || {});
        setWeekPosts(s.weekPosts || {});
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    const payload = { people, sites, assignments, notes, absencesByWeek, dayPosts, weekPosts };
    try { localStorage.setItem("btp-planner-state:v1", JSON.stringify(payload)); } catch {}
  }, [people, sites, assignments, notes, absencesByWeek, dayPosts, weekPosts]);

  // ==========================
  // Dev Self-Tests
  // ==========================
  useEffect(() => {
    console.assert(/\d{4}-\d{2}-\d{2}/.test(toLocalKey(new Date("2025-10-02"))), "toLocalKey format");
    console.assert(weekKeyOf(new Date("2021-01-04")) === "2021-W01", "weekKeyOf ISO-year");
    console.assert(getISOWeek(new Date("2020-12-31")) === 53, "ISO week 2020-12-31 = 53");
  }, []);

  // ==========================
  // Import / Export JSON
  // ==========================
  const fileRef = useRef(null);
  const exportJSON = () => {
    const payload = { people, sites, assignments, notes, absencesByWeek, dayPosts, weekPosts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `btp-planner-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const onImport = (e) => {
    const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(data.people||[]); setSites(data.sites||[]); setAssignments(data.assignments||[]); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); setDayPosts(data.dayPosts||{}); setWeekPosts(data.weekPosts||{}); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f);
  };

  // ==========================
  // UI
  // ==========================
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => shift(-1)} aria-label="Précédent"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => shift(1)} aria-label="Suivant"><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => { setAnchor(new Date()); setView("week"); }} className="ml-1" aria-label="Aujourd'hui"><RotateCcw className="w-4 h-4" /></Button>
          <div className="font-semibold text-lg flex items-center gap-2">
            <CalendarRange className="w-5 h-5" />
            {view === "week" && `Semaine ${getISOWeek(weekDays[0])} - du ${weekDays[0].toLocaleDateString()} au ${weekDays[4].toLocaleDateString()}`}
            {view === "month" && anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}
            {view === "quarter" && `T${Math.floor(anchor.getMonth() / 3) + 1} ${anchor.getFullYear()}`}
            {view === "year" && anchor.getFullYear()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept="application/json" ref={fileRef} onChange={onImport} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} aria-label="Importer"><Upload className="w-4 h-4 mr-1" />Importer</Button>
          <Button onClick={exportJSON} aria-label="Exporter"><Download className="w-4 h-4 mr-1" />Exporter</Button>
          <Tabs value={view} onValueChange={(v) => setView(v)}>
            <TabsList>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="quarter">Trimestre</TabsTrigger>
              <TabsTrigger value="year">Année</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* DnD provider */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-12 gap-4">
          {/* Left column: People & Sites */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Salariés</div>
                  <AddPerson people={people} onAdd={addPerson} />
                </div>
                <div className="space-y-2">
                  {people.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <PersonChip person={p} />
                      <div className="flex items-center gap-2">
                        <label className="text-xs flex items-center gap-1">
                          <input type="checkbox" checked={isAbsentOnWeek(p.id, currentWeekKey)} onChange={() => toggleAbsentThisWeek(p.id)} />
                          Abs. S{getISOWeek(weekDays[0])}
                        </label>
                        <Button size="icon" variant="ghost" onClick={() => removePerson(p.id)} aria-label={`Supprimer ${p.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">L'absence ne vaut que pour la <b>semaine affichée</b>.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Chantiers</div>
                  <AddSite onAdd={addSite} />
                </div>
                <div className="space-y-2">
                  {sites.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span>{s.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeSite(s.id)} aria-label={`Supprimer ${s.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Calendars */}
          <div className="col-span-12 lg:col-span-9">
            {/* WEEK VIEW */}
            {view === "week" && (
              <div className="space-y-2">
                <div className="grid grid-cols-6 text-xs text-neutral-500">
                  <div className="px-1">Sem. {getISOWeek(weekDays[0])}</div>
                  {["Lun","Mar","Mer","Jeu","Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                </div>
                <div className="space-y-2">
                  {sites.map((site) => (
                    <div key={site.id} className="grid grid-cols-6 gap-2 items-stretch">
                      <div className="text-sm flex items-center">{site.name}</div>
                      {weekDays.map((d) => (
                        <DayCell key={`${site.id}-${toLocalKey(d)}`} date={d} site={site} people={people} assignments={assignments} onEditNote={openNote} notes={notes} onRemoveAssignment={removeAssignment} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {view === "month" && (
              <div className="space-y-4">
                {monthWeeks.map((week, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="grid grid-cols-6 text-xs text-neutral-500">
                      <div className="px-1">Sem. {getISOWeek(week[0])}</div>
                      {["Lun","Mar","Mer","Jeu","Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                    </div>
                    {sites.map((site) => (
                      <div key={`${idx}-${site.id}`} className="grid grid-cols-6 gap-2 items-stretch">
                        <div className="text-sm flex items-center">{site.name}</div>
                        {week.slice(0, 5).map((d) => (
                          <DayCell key={`${site.id}-${toLocalKey(d)}`} date={d} site={site} people={people} assignments={assignments} onEditNote={openNote} notes={notes} onRemoveAssignment={removeAssignment} />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* QUARTER VIEW */}
            {view === "quarter" && (
              <div className="overflow-x-auto pb-2 snap-x">
                <div className="min-w-[1100px] snap-start">
                  <div className="flex flex-col gap-4">
                    {getQuarterMonths(anchor.getMonth()).map((m) => (
                      <QuarterMonth key={m} className="" date={new Date(anchor.getFullYear(), m, 1)} getDayPosts={(dk) => dayPosts[dk] || []} getWeekPosts={(wk) => weekPosts[wk] || []} onAddDayPost={(dk) => openPostItDialog({ type: "day", key: dk })} onAddWeekPost={(wk) => openPostItDialog({ type: "week", key: wk })} onRemoveDayPost={(dk, id) => setDayPosts((prev) => ({ ...prev, [dk]: (prev[dk] || []).filter((p) => p.id !== id) }))} onRemoveWeekPost={(wk, id) => setWeekPosts((prev) => ({ ...prev, [wk]: (prev[wk] || []).filter((p) => p.id !== id) }))} onPreviewDayPost={(dk, post) => openPreview('day', post)} onPreviewWeekPost={(wk, post) => openPreview('week', post)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* YEAR VIEW */}
            {view === "year" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 12 }, (_, m) => (
                  <MiniMonth key={m} date={new Date(anchor.getFullYear(), m, 1)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <DragOverlay />
      </DndContext>

      {/* Dialogs */}
      <AnnotationDialog open={noteOpen} setOpen={setNoteOpen} value={currentNoteValue} onSave={saveNote} />

      {/* Post-it dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{postTarget?.type === "week" ? "Ajouter une note de semaine" : "Ajouter un post-it (jour)"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea className="min-h-32" placeholder="Texte de la note/post-it" value={postText} onChange={(e) => setPostText(e.target.value)} />
            <div className="flex items-center gap-2">
              {["yellow","green","blue","pink","orange"].map((c) => (
                <button key={c} type="button" onClick={() => setPostColor(c)} className={`w-7 h-7 rounded-full border ${NOTE_BG[c]} ${postColor === c ? "ring-2 ring-black" : ""}`} aria-label={`Choisir couleur ${c}`} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { if (!postTarget || !postText.trim()) { setPostDialogOpen(false); return; } const item = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}`, text: postText.trim(), color: postColor }; if (postTarget.type === "day") { setDayPosts((prev) => ({ ...prev, [postTarget.key]: [...(prev[postTarget.key] || []), item] })); } else { setWeekPosts((prev) => ({ ...prev, [postTarget.key]: [...(prev[postTarget.key] || []), item] })); } setPostDialogOpen(false); }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview post-it */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Post-it</DialogTitle></DialogHeader>
          {previewPost && (
            <div className={`p-4 rounded-lg text-sm ${NOTE_BG[previewPost.post.color]} shadow`}>
              <div className="whitespace-pre-wrap break-words leading-relaxed text-black">{previewPost.post.text}</div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setPreviewOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================================
// Small helper components
// ==================================
function AddPerson({ people, onAdd }) { const [open, setOpen] = useState(false); return (<><Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button><AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} /></>); }
function AddSite({ onAdd }) { const [open, setOpen] = useState(false); return (<><Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button><AddSiteDialog open={open} setOpen={setOpen} onAdd={onAdd} /></>); }
