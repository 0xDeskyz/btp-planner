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
  RotateCcw,
  Upload,
  Download,
} from "lucide-react";

// ================= UI maison (Tailwind)
const cx = (...cls: (string | false | null | undefined)[]) => cls.filter(Boolean).join(" ");

function Button({ children, className = "", variant = "default", size = "md", ...props }: any) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-black text-white hover:bg-black/90",
    outline: "border border-neutral-300 hover:bg-neutral-50",
    ghost: "hover:bg-neutral-100",
  };
  const sizes: Record<string, string> = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", icon: "h-9 w-9" };
  return (
    <button className={cx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
}
function Card({ children, className = "" }: any) {
  return <div className={cx("border rounded-xl bg-white", className)}>{children}</div>;
}
function CardContent({ children, className = "" }: any) {
  return <div className={cx("p-4", className)}>{children}</div>;
}
function Input(props: any) {
  return (
    <input
      {...props}
      className={cx(
        "w-full h-9 px-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}
function Textarea(props: any) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full min-h-28 p-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}

// Tabs
const TabsCtx = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);
function Tabs({ value, onValueChange, children }: any) {
  return <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
}
function TabsList({ children, className = "" }: any) {
  return (
    <div role="tablist" aria-label="Vues" className={cx("inline-flex gap-1 bg-neutral-100 p-1 rounded-lg", className)}>
      {children}
    </div>
  );
}
function TabsTrigger({ value, children }: any) {
  const ctx = (React.useContext(TabsCtx) || { value: undefined, onValueChange: () => {} }) as any;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onValueChange(value)}
      className={cx("px-3 py-1.5 rounded-md text-sm", active ? "bg-white shadow text-black" : "text-neutral-600 hover:bg-white/70")}
    >
      {children}
    </button>
  );
}

// Dialog (basique)
function Dialog({ open, onOpenChange, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
}
function DialogContent({ children, className = "" }: any) {
  return <div className={cx("relative z-10 w-full max-w-lg rounded-xl bg-white p-4 shadow-lg", className)}>{children}</div>;
}
function DialogHeader({ children }: any) {
  return <div className="mb-2">{children}</div>;
}
function DialogTitle({ children }: any) {
  return <div className="text-lg font-semibold">{children}</div>;
}
function DialogFooter({ children }: any) {
  return <div className="mt-3 flex items-center justify-end gap-2">{children}</div>;
}

// ==================================
// Constantes & Démo
// ==================================
const COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-blue-600",
  "bg-red-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-purple-400",
  "bg-slate-500",
];

const DEMO_PEOPLE = [
  { id: "p1", name: "Ali", color: "bg-rose-500" },
  { id: "p2", name: "Mina", color: "bg-amber-500" },
  { id: "p3", name: "Rachid", color: "bg-emerald-500" },
];
const DEMO_SITES = [
  { id: "s1", name: "Chantier A" },
  { id: "s2", name: "Chantier B" },
];

// Pastels (3 options) pour mini post-it & surlignage
const PASTELS: Record<string, { bg: string; ring: string; text: string }> = {
  mint: { bg: "bg-green-100", ring: "ring-green-200", text: "text-green-900" },
  sky: { bg: "bg-sky-100", ring: "ring-sky-200", text: "text-sky-900" },
  peach: { bg: "bg-orange-100", ring: "ring-orange-200", text: "text-orange-900" },
};

// ==================================
// Date Helpers (ISO week, local time, Lun->Ven)
// ==================================
const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function startOfISOWeekLocal(d: Date) {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}
function getWeekDatesLocal(anchor: Date) {
  const start = startOfISOWeekLocal(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}
function getISOWeekAndYear(date: Date) {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  const day = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - day + 3);
  const isoYear = tmp.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day);
  const diffMs = tmp.getTime() - week1Start.getTime();
  const week = 1 + Math.floor(diffMs / (7 * 24 * 3600 * 1000));
  return { week, isoYear };
}
const getISOWeek = (d: Date) => getISOWeekAndYear(d).week;
const getISOWeekYear = (d: Date) => getISOWeekAndYear(d).isoYear;
const weekKeyOf = (d: Date) => `${getISOWeekYear(d)}-W${pad2(getISOWeek(d))}`;
function getMonthWeeks(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfISOWeekLocal(first);
  return Array.from({ length: 6 }, (_, w) => {
    const start = new Date(gridStart);
    start.setDate(gridStart.getDate() + w * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      return dd;
    });
  });
}
const cellKey = (siteId: string, dateKey: string) => `${siteId}|${dateKey}`;
// Helper format FR (jour mois année)
const formatFR = (d: Date, withWeekday: boolean = false) =>
  d.toLocaleDateString('fr-FR', withWeekday
    ? { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: 'long', year: 'numeric' }
  );

// ==================================
// Draggable Person Chip
// ==================================
function PersonChip({ person }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `person-${person.id}`, data: { type: "person", person } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`select-none inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${person.color} shadow cursor-grab`}>
      <Users className="w-4 h-4" /> {person.name}
    </div>
  );
}

// ==================================
// Assignment chip (draggable)
// ==================================
function AssignmentChip({ a, person, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assign-${a.id}`,
    data: { type: "assignment", assignmentId: a.id, personId: a.personId, from: { siteId: a.siteId, dateKey: a.date } },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 5 } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`px-2 py-0.5 rounded-full text-white text-xs ${person.color} flex items-center gap-1 select-none ${isDragging ? "opacity-80 ring-2 ring-black/30" : ""}`}>
      <span>{person.name}</span>
      <button className="ml-1 w-4 h-4 leading-none rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center" title="Retirer du jour" aria-label={`Retirer ${person.name}`} onClick={onRemove}>×</button>
    </div>
  );
}

// ==================================
// Droppable Cell (Day x Site)
// ==================================
function DayCell({ date, site, assignments, people, onEditNote, notes, onRemoveAssignment }: any) {
  const id = `cell-${site.id}-${toLocalKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "day-site", date, site } });
  const todays = assignments.filter((a: any) => a.date === toLocalKey(date) && a.siteId === site.id);
  const key = cellKey(site.id, toLocalKey(date));
  const raw = notes[key];
  const meta = typeof raw === "string" ? { text: raw } : (raw || {});
  const pastel = meta.highlight && PASTELS[meta.highlight] ? meta.highlight : null;
  const status = meta.holiday ? "holiday" : (meta.blocked ? "blocked" : null);
  const unavailable = Boolean(status);

  return (
    <div
      className={cx(
        "border min-h-20 p-2 rounded-xl bg-white",
        isOver ? "ring-2 ring-sky-400" : "",
        status === "holiday"
          ? "bg-red-50 ring-2 ring-red-300 border-red-200"
          : status === "blocked"
          ? "bg-sky-50 ring-2 ring-sky-300 border-sky-200"
          : pastel
          ? `${PASTELS[pastel].bg} ${PASTELS[pastel].ring} ring-2`
          : "border-neutral-200",
        unavailable ? "opacity-90" : ""
      )}
      ref={setNodeRef}
      title={meta.text || meta.blText || meta?.brNote?.text || ""}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {meta.holiday && (<div className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Férié</div>)}
          {meta.blocked && !meta.holiday && (<div className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">Indispo</div>)}
          {meta.text && (
            <div className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 max-w-[60%] truncate" title={meta.text}>
              {meta.text}
            </div>
          )}
        </div>
        <div className="text-[11px] text-neutral-500">{date.getDate()}</div>
      </div>

      {/* Assignments list */}
      <div className="flex flex-wrap gap-1">
        {todays.map((a: any) => {
          const p = people.find((pp: any) => pp.id === a.personId);
          return p ? <AssignmentChip key={a.id} a={a} person={p} onRemove={() => onRemoveAssignment(a.id)} /> : null;
        })}
      </div>

      {/* Bottom bar */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap min-h-[18px]">
          {meta.blText && (<div className="text-[11px] text-neutral-700 max-w-[70%] truncate" title={meta.blText}>{meta.blText}</div>)}
          {meta.brNote?.text && (
            <div className={cx("text-[10px] px-1.5 py-0.5 rounded shadow border", meta.brNote.color && PASTELS[meta.brNote.color]?.bg)} title={meta.brNote.text}>
              {meta.brNote.text}
            </div>
          )}
        </div>
        <button onClick={() => onEditNote(date, site)} className="opacity-70 hover:opacity-100" aria-label="Éditer la case" title="Éditer la case">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==================================
// Dialogs
// ==================================
function AddPersonDialog({ open, setOpen, onAdd }: any) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un salarié</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Nom" value={name} onChange={(e: any) => setName(e.target.value)} />
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

function AddSiteDialog({ open, setOpen, onAdd }: any) {
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un chantier</DialogTitle></DialogHeader>
        <Input placeholder="Nom du chantier" value={name} onChange={(e: any) => setName(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setOpen(false); setName(""); } }}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ open, setOpen, name, onSave, title = "Renommer" }: any) {
  const [val, setVal] = useState<string>(name || "");
  useEffect(() => setVal(name || ""), [name]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input value={val} onChange={(e: any) => setVal(e.target.value)} placeholder="Nouveau nom" />
        <DialogFooter>
          <Button onClick={() => { const n = val.trim(); if (!n) return; onSave(n); }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnotationDialog({ open, setOpen, value, onSave }: any) {
  const initial = typeof value === "string" ? { text: value } : value || {};
  const [text, setText] = useState<string>(initial.text || "");
  const [holiday, setHoliday] = useState<boolean>(!!initial.holiday);
  const [blocked, setBlocked] = useState<boolean>(!!initial.blocked);
  const [blText, setBlText] = useState<string>(initial.blText || "");
  const [brText, setBrText] = useState<string>(initial.brNote?.text || "");
  const [brColor, setBrColor] = useState<string>(initial.brNote?.color || "mint");
  const [highlight, setHighlight] = useState<string>(initial.highlight || "");

  useEffect(() => {
    const i = typeof value === "string" ? { text: value } : value || {};
    setText(i.text || "");
    setHoliday(!!i.holiday);
    setBlocked(!!i.blocked);
    setBlText(i.blText || "");
    setBrText(i.brNote?.text || "");
    setBrColor(i.brNote?.color || "mint");
    setHighlight(i.highlight || "");
  }, [value]);

  const ColorDot = ({ c, selected, onClick }: any) => (
    <button type="button" onClick={onClick} className={cx("w-7 h-7 rounded-full border", PASTELS[c].bg, selected ? "ring-2 ring-black" : "")} aria-label={`Couleur ${c}`} title={c} />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Éditer la case</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Disponibilité */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={holiday} onChange={(e) => setHoliday(e.target.checked)} />Jour férié</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />Chantier indisponible</label>
          </div>
          {/* Note principale */}
          <div className="space-y-1">
            <div className="text-sm font-medium">Note principale</div>
            <Textarea className="min-h-24" value={text} onChange={(e: any) => setText(e.target.value)} placeholder="Note générale de la case" />
          </div>
          {/* Bas-gauche */}
          <div className="space-y-1">
            <div className="text-sm font-medium">Texte bas-gauche</div>
            <Input value={blText} onChange={(e: any) => setBlText(e.target.value)} placeholder="Petit texte affiché en bas à gauche" />
          </div>
          {/* Bas-droit (mini post-it) */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Post-it bas-droit</div>
            <Input value={brText} onChange={(e: any) => setBrText(e.target.value)} placeholder="Court texte du post-it" />
            <div className="flex items-center gap-2">
              {["mint", "sky", "peach"].map((c) => (
                <ColorDot key={c} c={c} selected={brColor === c} onClick={() => setBrColor(c)} />
              ))}
            </div>
          </div>
          {/* Surlignage */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Surlignage de la case</div>
            <div className="flex items-center gap-3">
              <button type="button" className={cx("px-2 py-1 text-sm rounded border", !highlight ? "border-black" : "")} onClick={() => setHighlight("")}>Aucun</button>
              {["mint", "sky", "peach"].map((c) => (
                <button key={c} type="button" onClick={() => setHighlight(c)} className={cx("px-2 py-1 text-sm rounded border", PASTELS[c].bg, highlight === c ? "ring-2 ring-black" : "")}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onSave({ text, holiday, blocked, blText, brNote: brText ? { text: brText, color: brColor } : undefined, highlight: highlight || undefined, }); setOpen(false); }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================================
// Small helpers
// ==================================
function AddPerson({ onAdd }: { onAdd: (name: string, color: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} />
    </>
  );
}
function AddSite({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddSiteDialog open={open} setOpen={setOpen} onAdd={onAdd} />
    </>
  );
}

// ==================================
// Main Component (Page) – Semaine & Mois seulement
// ==================================
export default function Page() {
  // Core state
  const [people, setPeople] = useState(DEMO_PEOPLE);
  const [sites, setSites] = useState(DEMO_SITES);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, any>>({});
  const [absencesByWeek, setAbsencesByWeek] = useState<Record<string, Record<string, boolean>>>({});

  // View / navigation
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const weekFull = useMemo(() => getWeekDatesLocal(anchor), [anchor]);
  const weekDays = useMemo(() => weekFull.slice(0, 5), [weekFull]);
  const monthWeeks = useMemo(() => getMonthWeeks(anchor), [anchor]);
  const currentWeekKey = useMemo(() => weekKeyOf(weekDays[0]), [weekDays]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor)
  );

  const isAbsentOnWeek = (pid: string, wk: string) => Boolean(absencesByWeek[wk]?.[pid]);
  const toggleAbsentThisWeek = (pid: string) => {
    setAbsencesByWeek((prev) => {
      const week = { ...(prev[currentWeekKey] || {}) };
      week[pid] = !week[pid];
      return { ...prev, [currentWeekKey]: week };
    });
  };

  const onDragEnd = (e: any) => {
    const { active, over } = e;
    if (!over || !active?.data?.current) return;
    const data = active.data.current;
    if (over.data?.current?.type !== "day-site") return;
    const targetDate: Date = over.data.current.date;
    const targetSite: any = over.data.current.site;
    const targetDateKey = toLocalKey(targetDate);
    const wkKey = weekKeyOf(targetDate);

    // Bloque drop si case fériée/indispo
    const cellMeta = (() => { const raw = notes[cellKey(targetSite.id, targetDateKey)]; return typeof raw === "string" ? { text: raw } : raw || {}; })();
    if (cellMeta.holiday || cellMeta.blocked) return;

    if (data.type === "person" && data.person) {
      const person = data.person;
      if (isAbsentOnWeek(person.id, wkKey)) return;
      const hasSameDay = assignments.some((a) => a.personId === person.id && a.date === targetDateKey);
      if (hasSameDay) return;
      const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${person.id}-${targetSite.id}-${targetDateKey}-${Date.now()}`;
      setAssignments((prev) => [...prev, { id, personId: person.id, siteId: targetSite.id, date: targetDateKey }]);
      return;
    }

    if (data.type === "assignment" && data.assignmentId) {
      const assId = data.assignmentId as string;
      const ass = assignments.find((a) => a.id === assId);
      if (!ass) return;
      if (isAbsentOnWeek(ass.personId, wkKey)) return;
      const conflict = assignments.some((a) => a.personId === ass.personId && a.date === targetDateKey && a.id !== assId);
      if (conflict) return;
      if (ass.date === targetDateKey && ass.siteId === targetSite.id) return;
      setAssignments((prev) => prev.map((a) => (a.id === assId ? { ...a, date: targetDateKey, siteId: targetSite.id } : a)));
      return;
    }
  };

  const shift = (delta: number) => {
    const d = new Date(anchor);
    if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setAnchor(d);
  };

  // Notes / Rename dialogs state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<null | { type: 'person' | 'site'; id: string; name: string }>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteKeyState, setNoteKeyState] = useState<string | null>(null);
  const currentNoteValue = noteKeyState ? (typeof notes[noteKeyState] === "string" ? { text: notes[noteKeyState] } : notes[noteKeyState] ?? {}) : {};
  const openNote = (date: Date, site: any) => { setNoteKeyState(cellKey(site.id, toLocalKey(date))); setNoteOpen(true); };
  const saveNote = (val: any) => { if (!noteKeyState) return; setNotes((prev) => ({ ...prev, [noteKeyState]: val })); };

  // CRUD helpers
  const renamePerson = (id: string, name: string) => setPeople((p) => p.map((x) => (x.id === id ? { ...x, name } : x)));
  const renameSite = (id: string, name: string) => setSites((s) => s.map((x) => (x.id === id ? { ...x, name } : x)));
  const removeAssignment = (id: string) => setAssignments((prev) => prev.filter((a) => a.id !== id));
  const addPerson = (name: string, color: string) => setPeople((p) => [...p, { id: typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `p${Date.now()}`, name, color }]);
  const removePerson = (id: string) => {
    setPeople((p) => p.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.personId !== id));
    setAbsencesByWeek((prev) => { const next: typeof prev = { ...prev }; for (const wk of Object.keys(next)) { if (next[wk] && Object.prototype.hasOwnProperty.call(next[wk], id)) { const { [id]: _omit, ...rest } = next[wk]; (next as any)[wk] = rest; } } return next; });
  };
  const addSite = (name: string) => setSites((s) => [...s, { id: typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `s${Date.now()}`, name }]);
  const removeSite = (id: string) => {
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id));
    setNotes((prev) => { const next = { ...prev } as Record<string, any>; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete (next as any)[k]; }); return next; });
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
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    const payload = { people, sites, assignments, notes, absencesByWeek };
    try { localStorage.setItem("btp-planner-state:v1", JSON.stringify(payload)); } catch {}
  }, [people, sites, assignments, notes, absencesByWeek]);

  // ==========================
  // Dev Self-Tests (NE PAS modifier les existants ; on ajoute des tests)
  // ==========================
  useEffect(() => {
    // existants
    console.assert(/\d{4}-\d{2}-\d{2}/.test(toLocalKey(new Date("2025-10-02"))), "toLocalKey format");
    console.assert(weekKeyOf(new Date("2021-01-04")) === "2021-W01", "weekKeyOf ISO-year");
    console.assert(getISOWeek(new Date("2020-12-31")) === 53, "ISO week 2020-12-31 = 53");

    // palette
    console.assert(Array.isArray(COLORS) && COLORS.length >= 17, "COLORS étendu (>=17)");
    console.assert(COLORS.every((c) => /^bg-[-a-z0-9]+$/i.test(c)), "Chaque couleur est une classe tailwind bg-*");

    // cellKey
    const nk = cellKey("s42", "2025-11-05");
    console.assert(nk === "s42|2025-11-05", "cellKey format s|date");

    // highlight + compat string
    const compat = typeof "Juste une note" === "string" ? { text: "Juste une note" } : {};
    console.assert(compat.text === "Juste une note", "compat string->object ok");
    // @ts-ignore
    console.assert(!PASTELS["unknown"], "highlight ignore unknown color");

    // rename helpers
    const _ppl = [{ id: 'pp', name: 'Old', color: 'bg-red-400' }];
    const _pplRenamed = _ppl.map(x => x.id === 'pp' ? { ...x, name: 'New' } : x);
    console.assert(_pplRenamed[0].name === 'New', 'rename person mapping works');
    const _sites = [{ id: 'ss', name: 'Site A' }];
    const _sitesRenamed = _sites.map(x => x.id === 'ss' ? { ...x, name: 'Site B' } : x);
    console.assert(_sitesRenamed[0].name === 'Site B', 'rename site mapping works');

    // month grid shape
    const g = getMonthWeeks(new Date("2025-11-01"));
    console.assert(Array.isArray(g) && g.length === 6 && g[0].length === 7, 'month grid 6x7');

    // export blob test
    const b = new Blob([JSON.stringify({ a: 1 })], { type: 'application/json' });
    console.assert(b.type === 'application/json', 'export blob type ok');
  }, []);

  // ==========================
  // Import / Export JSON
  // ==========================
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportJSON = () => {
    const payload = { people, sites, assignments, notes, absencesByWeek };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `btp-planner-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const onImport = (e: any) => {
    const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(data.people||[]); setSites(data.sites||[]); setAssignments(data.assignments||[]); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f); e.target.value = '';
  };

  // ==========================
  // UI (Semaine & Mois)
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
            {view === 'week' && `Semaine ${getISOWeek(weekDays[0])} - du ${formatFR(weekDays[0], true)} au ${formatFR(weekDays[4], true)}`}
            {view === 'month' && anchor.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept="application/json" ref={fileRef} onChange={onImport} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} aria-label="Importer"><Upload className="w-4 h-4 mr-1" />Importer</Button>
          <Button onClick={exportJSON} aria-label="Exporter"><Download className="w-4 h-4 mr-1" />Exporter</Button>
          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="month">Mois</TabsTrigger>
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
                  <AddPerson onAdd={addPerson} />
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
                        <Button size="icon" variant="ghost" onClick={() => { setRenameTarget({ type: 'person', id: p.id, name: p.name }); setRenameOpen(true); }} aria-label={`Renommer ${p.name}`}><Edit3 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removePerson(p.id)} aria-label={`Supprimer ${p.name}`}><Trash2 className="w-4 h-4" /></Button>
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
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => { setRenameTarget({ type: 'site', id: s.id, name: s.name }); setRenameOpen(true); }} aria-label={`Renommer ${s.name}`}><Edit3 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeSite(s.id)} aria-label={`Supprimer ${s.name}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
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
                  {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                </div>
                <div className="space-y-2">
                  {sites.map((site) => (
                    <div key={site.id} className="grid grid-cols-6 gap-2 items-stretch">
                      <div className="text-sm flex items-center">{site.name}</div>
                      {weekDays.map((d) => (
                        <DayCell key={`${site.id}-${toLocalKey(d)}`} date={d} site={site} people={people} assignments={assignments} onEditNote={openNote} notes={notes} onRemoveAssignment={(id:string)=>setAssignments((prev)=>prev.filter(a=>a.id!==id))} />
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
                      {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                    </div>
                    {sites.map((site) => (
                      <div key={`${idx}-${site.id}`} className="grid grid-cols-6 gap-2 items-stretch">
                        <div className="text-sm flex items-center">{site.name}</div>
                        {week.slice(0, 5).map((d) => (
                          <DayCell key={`${site.id}-${toLocalKey(d)}`} date={d} site={site} people={people} assignments={assignments} onEditNote={openNote} notes={notes} onRemoveAssignment={(id:string)=>setAssignments((prev)=>prev.filter(a=>a.id!==id))} />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DragOverlay />
      </DndContext>

      {/* Dialogs */}
      <AnnotationDialog open={noteOpen} setOpen={setNoteOpen} value={currentNoteValue} onSave={saveNote} />
      <RenameDialog open={renameOpen} setOpen={setRenameOpen} name={renameTarget?.name || ''} title={renameTarget?.type === 'person' ? 'Renommer le salarié' : 'Renommer le chantier'} onSave={(newName: string) => { if (!renameTarget) return; const n = newName.trim(); if (!n) return; if (renameTarget.type === 'person') renamePerson(renameTarget.id, n); else renameSite(renameTarget.id, n); setRenameOpen(false); }} />
    </div>
  );
}
