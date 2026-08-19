/* eslint-disable react-hooks/refs */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  History,
  Laptop,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { createLibrarySection, PUBLIC_PAGE_LABELS, SECTION_LIBRARY } from "@/site-builder/default-document";
import type { BuilderSection, PublicPageKey, SiteBuilderDocument } from "@/site-builder/schema";
import ResponsivePreviewFrame from "./ResponsivePreviewFrame";

type Viewport = "desktop" | "tablet" | "mobile";

function newId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function SortableSectionRow({ section, selected, onSelect, onToggle, onMove, index, count }: {
  section: BuilderSection;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  index: number;
  count: number;
}) {
  const sortable = useSortable({ id: section.id });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={`group flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${selected ? "border-[#155cff] bg-[#eef3ff]" : "border-[#e4e9f8] bg-white hover:border-[#c8d3f4]"}`}
    >
      <button {...sortable.attributes} {...sortable.listeners} aria-label={`Drag ${section.content.title || section.systemKey || section.type}`} className="cursor-grab rounded p-1 text-[#9aa0b4] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
      <button onClick={onSelect} className="min-w-0 flex-1 px-1 text-left">
        <span className="block truncate text-[12px] font-bold text-[#0a1128]">{section.content.title || section.systemKey || section.type}</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa0b4]">{section.type} · {section.variant}</span>
      </button>
      <div className="flex items-center">
        <button disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move section up" className="rounded p-1 text-[#7c8498] disabled:opacity-25"><ChevronUp className="h-3.5 w-3.5" /></button>
        <button disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move section down" className="rounded p-1 text-[#7c8498] disabled:opacity-25"><ChevronDown className="h-3.5 w-3.5" /></button>
        <button onClick={onToggle} aria-label={section.visible ? "Hide section" : "Show section"} className="rounded p-1 text-[#7c8498]">{section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-[#7c8498]">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-[12px] font-semibold text-[#0a1128] outline-none transition focus:border-[#155cff] focus:ring-2 focus:ring-[#155cff]/10";

export default function SiteCustomizer() {
  const utils = trpc.useUtils();
  const workspace = trpc.siteBuilder.getWorkspace.useQuery();
  const versions = trpc.siteBuilder.versionList.useQuery(undefined, { enabled: false });
  const saveDraft = trpc.siteBuilder.saveDraft.useMutation();
  const publish = trpc.siteBuilder.publish.useMutation();
  const restoreVersion = trpc.siteBuilder.restoreVersion.useMutation();
  const [document, setDocument] = useState<SiteBuilderDocument | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedPage, setSelectedPage] = useState<PublicPageKey>("home");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [dirty, setDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const initialized = useRef(false);
  const undoStack = useRef<SiteBuilderDocument[]>([]);
  const redoStack = useRef<SiteBuilderDocument[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!workspace.data || initialized.current) return;
    initialized.current = true;
    setDocument(workspace.data.draft as SiteBuilderDocument);
    setRevision(workspace.data.draftRevision);
    setSelectedSectionId(workspace.data.draft.pages.home.sections[0]?.id ?? null);
  }, [workspace.data]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const page = document?.pages[selectedPage] ?? null;
  const selectedSection = page?.sections.find((section) => section.id === selectedSectionId) ?? null;

  const commit = (next: SiteBuilderDocument) => {
    if (document) {
      undoStack.current = [...undoStack.current.slice(-49), document];
      redoStack.current = [];
    }
    setDocument(next);
    setDirty(true);
  };

  const updatePageSections = (sections: BuilderSection[]) => {
    if (!document) return;
    commit({ ...document, pages: { ...document.pages, [selectedPage]: { ...document.pages[selectedPage], sections } } });
  };

  const updateSelected = (update: (section: BuilderSection) => BuilderSection) => {
    if (!page || !selectedSection) return;
    updatePageSections(page.sections.map((section) => section.id === selectedSection.id ? update(section) : section));
  };

  const undo = () => {
    if (!document || !undoStack.current.length) return;
    const previous = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current.push(document);
    setDocument(previous);
    setDirty(true);
  };

  const redo = () => {
    if (!document || !redoStack.current.length) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current.push(document);
    setDocument(next);
    setDirty(true);
  };

  const addSection = (type: BuilderSection["type"]) => {
    if (!page) return;
    const section = createLibrarySection(type, newId(type));
    updatePageSections([...page.sections, section]);
    setSelectedSectionId(section.id);
  };

  const duplicateSelected = () => {
    if (!page || !selectedSection || selectedSection.type === "system") return;
    const index = page.sections.findIndex((section) => section.id === selectedSection.id);
    const clone = structuredClone(selectedSection);
    clone.id = newId(selectedSection.type);
    clone.content.title = `${clone.content.title} copy`;
    clone.content.items = clone.content.items.map((item) => ({ ...item, id: newId("item") }));
    const rows = [...page.sections];
    rows.splice(index + 1, 0, clone);
    updatePageSections(rows);
    setSelectedSectionId(clone.id);
  };

  const deleteSelected = () => {
    if (!page || !selectedSection || selectedSection.type === "system") return;
    const rows = page.sections.filter((section) => section.id !== selectedSection.id);
    updatePageSections(rows);
    setSelectedSectionId(rows[0]?.id ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!page || !over || active.id === over.id) return;
    const oldIndex = page.sections.findIndex((section) => section.id === active.id);
    const newIndex = page.sections.findIndex((section) => section.id === over.id);
    updatePageSections(arrayMove(page.sections, oldIndex, newIndex));
  };

  const persistDraft = async () => {
    if (!document) throw new Error("Builder is not ready");
    const result = await saveDraft.mutateAsync({ document, baseRevision: revision });
    setRevision(result.draftRevision);
    setDirty(false);
    toast.success("Draft saved");
    return result.draftRevision;
  };

  const handlePublish = async () => {
    if (!document) return;
    if (!window.confirm("Publish this draft to the live public site? A restorable version will be created.")) return;
    try {
      const draftRevision = dirty || revision === 0 ? await persistDraft() : revision;
      const result = await publish.mutateAsync({ baseRevision: draftRevision, note: `Published from Site Customize · ${PUBLIC_PAGE_LABELS[selectedPage]}` });
      await Promise.all([utils.siteBuilder.published.invalidate(), workspace.refetch()]);
      toast.success(`Version ${result.publishedRevision} is live`);
    } catch (error: any) {
      toast.error(error?.message || "Publish failed");
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    await versions.refetch();
  };

  const handleRestore = async (version: number) => {
    if (!window.confirm(`Restore version ${version} into the draft? It will not go live until you publish.`)) return;
    try {
      const result = await restoreVersion.mutateAsync({ version, baseRevision: revision });
      initialized.current = false;
      setRevision(result.draftRevision);
      setDirty(false);
      undoStack.current = [];
      redoStack.current = [];
      await workspace.refetch();
      toast.success(`Version ${version} restored to draft`);
    } catch (error: any) {
      toast.error(error?.message || "Restore failed");
    }
  };

  const pageOptions = useMemo(() => Object.keys(PUBLIC_PAGE_LABELS) as PublicPageKey[], []);

  if (workspace.isLoading || !document || !page) {
    return <div className="flex min-h-[560px] items-center justify-center rounded-xl border border-[#dfe6ff] bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#155cff]" /><span className="ml-3 text-sm font-bold text-[#596176]">Loading visual builder…</span></div>;
  }
  if (workspace.error) {
    return <div className="rounded-xl border border-[#ffd6df] bg-[#fff4f6] p-6 text-sm font-bold text-[#d11f4a]">Could not load Site Customize: {workspace.error.message}</div>;
  }

  return (
    <div className="-mx-4 -mb-10 -mt-5 flex h-[calc(100vh-57px)] min-h-[680px] flex-col overflow-hidden bg-[#eef3fb] sm:-mx-6 lg:-mx-8">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#d8e0f2] bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[#0a1128] text-white sm:flex"><Laptop className="h-4 w-4" /></div>
          <div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-black text-[#0a1128]">Site Customize</p><p className="text-[10px] font-semibold text-[#7c8498]">Draft r{revision} · Live v{workspace.data?.publishedRevision ?? 0}</p></div>
          <select value={selectedPage} aria-label="Public page to customize" onChange={(event) => { const key = event.target.value as PublicPageKey; setSelectedPage(key); setSelectedSectionId(document.pages[key].sections[0]?.id ?? null); }} className="w-[132px] rounded-lg border border-[#dfe6ff] bg-[#f8faff] px-2 py-2 text-xs font-bold text-[#0a1128] sm:ml-2 sm:w-auto sm:max-w-[180px] sm:px-3">
            {pageOptions.map((key) => <option key={key} value={key}>{PUBLIC_PAGE_LABELS[key]}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={!undoStack.current.length} aria-label="Undo" className="hidden rounded-lg border border-[#dfe6ff] bg-white p-2 text-[#596176] disabled:opacity-30 sm:inline-flex"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={!redoStack.current.length} aria-label="Redo" className="hidden rounded-lg border border-[#dfe6ff] bg-white p-2 text-[#596176] disabled:opacity-30 sm:inline-flex"><Redo2 className="h-4 w-4" /></button>
          <button onClick={openHistory} className="hidden items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs font-bold text-[#596176] sm:flex"><History className="h-3.5 w-3.5" /> Versions</button>
          <button onClick={() => persistDraft().catch((error) => toast.error(error?.message || "Save failed"))} disabled={!dirty || saveDraft.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd6f5] bg-[#eef3ff] px-3 py-2 text-xs font-black text-[#155cff] disabled:opacity-50">{saveDraft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : dirty ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {dirty ? "Save draft" : "Saved"}</button>
          <button onClick={handlePublish} disabled={publish.isPending || saveDraft.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a1128] px-3.5 py-2 text-xs font-black text-white disabled:opacity-50">{publish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Monitor className="h-3.5 w-3.5" />} Publish</button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-[#d8e0f2] bg-[#f8faff] p-3 lg:block">
          <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7c8498]">Page sections</p><span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#7c8498] ring-1 ring-[#dfe6ff]">{page.sections.length}</span></div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={page.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-3 space-y-1.5">{page.sections.map((section, index) => <SortableSectionRow key={section.id} section={section} selected={section.id === selectedSectionId} onSelect={() => setSelectedSectionId(section.id)} onToggle={() => updatePageSections(page.sections.map((row) => row.id === section.id ? { ...row, visible: !row.visible } : row))} onMove={(direction) => { const target = index + direction; if (target >= 0 && target < page.sections.length) updatePageSections(arrayMove(page.sections, index, target)); }} index={index} count={page.sections.length} />)}</div>
            </SortableContext>
          </DndContext>
          <div className="my-4 border-t border-[#dfe6ff]" />
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7c8498]">Add section</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">{SECTION_LIBRARY.map((entry) => <button key={entry.type} onClick={() => addSection(entry.type)} className="flex min-h-14 flex-col items-start justify-between rounded-lg border border-[#dfe6ff] bg-white p-2 text-left transition hover:border-[#155cff] hover:bg-[#f4f7ff]"><Plus className="h-3.5 w-3.5 text-[#155cff]" /><span className="text-[10px] font-bold text-[#0a1128]">{entry.label}</span></button>)}</div>
        </aside>

        <main className="min-h-0 overflow-auto bg-[#e9eef8] p-3 sm:p-5">
          <div className="sticky top-0 z-10 mx-auto mb-4 flex w-fit items-center gap-1 rounded-lg border border-[#d8e0f2] bg-white p-1 shadow-sm">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((mode) => { const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone; return <button key={mode} onClick={() => setViewport(mode)} aria-label={`${mode} preview`} className={`rounded-md p-2 ${viewport === mode ? "bg-[#0a1128] text-white" : "text-[#7c8498] hover:bg-[#f4f6ff]"}`}><Icon className="h-4 w-4" /></button>; })}
          </div>
          <ResponsivePreviewFrame page={page} viewport={viewport} pathLabel={selectedPage === "home" ? "" : selectedPage} />
        </main>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-[#d8e0f2] bg-white p-4 lg:block">
          {!selectedSection ? <div className="py-12 text-center text-xs font-semibold text-[#9aa0b4]">Select a section to edit.</div> : <>
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black text-[#0a1128]">{selectedSection.content.title || selectedSection.systemKey || selectedSection.type}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9aa0b4]">{selectedSection.type} settings</p></div><div className="flex"><button disabled={selectedSection.type === "system"} onClick={duplicateSelected} aria-label="Duplicate section" className="rounded p-1.5 text-[#7c8498] disabled:opacity-25"><Copy className="h-4 w-4" /></button><button disabled={selectedSection.type === "system"} onClick={deleteSelected} aria-label="Delete section" className="rounded p-1.5 text-[#d11f4a] disabled:opacity-25"><Trash2 className="h-4 w-4" /></button></div></div>
            <div className="my-4 border-t border-[#e7ecf8]" />
            {selectedSection.type === "system" && !selectedSection.systemKey?.startsWith("home.") ? <div className="rounded-lg border border-[#dfe6ff] bg-[#f7f9ff] p-3 text-[11px] font-semibold leading-5 text-[#596176]">This database-powered page block remains protected. You can reorder or hide it without risking its customer actions.</div> : <div className="space-y-4">
              {selectedSection.type === "system" && <div className="rounded-lg border border-[#cbd6f5] bg-[#eef3ff] p-3 text-[11px] font-semibold leading-5 text-[#42506d]">Display content is editable below. The section design, product data, search, checkout, and customer actions remain protected.</div>}
              {selectedSection.type !== "system" && <Field label="Template"><select value={selectedSection.variant} onChange={(event) => updateSelected((section) => ({ ...section, variant: event.target.value }))} className={inputClass}>{(SECTION_LIBRARY.find((entry) => entry.type === selectedSection.type)?.variants ?? [selectedSection.variant]).map((variant) => <option key={variant}>{variant}</option>)}</select></Field>}
              <Field label="Eyebrow"><input value={selectedSection.content.eyebrow} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, eyebrow: event.target.value } }))} className={inputClass} /></Field>
              <Field label="Heading"><textarea rows={3} value={selectedSection.content.title} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, title: event.target.value } }))} className={inputClass} /></Field>
              <Field label="Body"><textarea rows={4} value={selectedSection.content.body} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, body: event.target.value } }))} className={inputClass} /></Field>
              {((["hero", "cta", "rich-text"] as string[]).includes(selectedSection.type) || Boolean(selectedSection.content.primaryLabel)) && <div className="grid grid-cols-2 gap-2"><Field label="Button label"><input value={selectedSection.content.primaryLabel} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, primaryLabel: event.target.value } }))} className={inputClass} /></Field><Field label="Button link"><input value={selectedSection.content.primaryHref} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, primaryHref: event.target.value } }))} className={inputClass} /></Field></div>}
              {Boolean(selectedSection.content.secondaryLabel) && <div className="grid grid-cols-2 gap-2"><Field label="Second button"><input value={selectedSection.content.secondaryLabel} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, secondaryLabel: event.target.value } }))} className={inputClass} /></Field><Field label="Second link"><input value={selectedSection.content.secondaryHref} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, secondaryHref: event.target.value } }))} className={inputClass} /></Field></div>}
              {selectedSection.type !== "system" && <div className="grid grid-cols-2 gap-2"><Field label="Surface"><select value={selectedSection.style.surface} onChange={(event) => updateSelected((section) => ({ ...section, style: { ...section.style, surface: event.target.value as BuilderSection["style"]["surface"] } }))} className={inputClass}>{["default", "muted", "brand", "dark"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Spacing"><select value={selectedSection.style.spacing} onChange={(event) => updateSelected((section) => ({ ...section, style: { ...section.style, spacing: event.target.value as BuilderSection["style"]["spacing"] } }))} className={inputClass}>{["none", "compact", "normal", "spacious"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Width"><select value={selectedSection.style.width} onChange={(event) => updateSelected((section) => ({ ...section, style: { ...section.style, width: event.target.value as BuilderSection["style"]["width"] } }))} className={inputClass}>{["narrow", "content", "wide", "full"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Alignment"><select value={selectedSection.style.align} onChange={(event) => updateSelected((section) => ({ ...section, style: { ...section.style, align: event.target.value as BuilderSection["style"]["align"] } }))} className={inputClass}>{["left", "center"].map((value) => <option key={value}>{value}</option>)}</select></Field></div>}
              {selectedSection.content.items.length > 0 && <div><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#7c8498]">Items</p><button onClick={() => updateSelected((section) => ({ ...section, content: { ...section.content, items: [...section.content.items, { id: newId("item"), title: "New item", text: "", label: "", href: "", imageUrl: "", value: "" }] } }))} className="text-[10px] font-black text-[#155cff]">+ Add</button></div><div className="space-y-2">{selectedSection.content.items.map((item, index) => <div key={item.id} className="rounded-lg border border-[#e4e9f8] bg-[#f8faff] p-2"><div className="flex gap-2"><input value={item.title} aria-label={`Item ${index + 1} title`} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, items: section.content.items.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row) } }))} className={inputClass} /><button onClick={() => updateSelected((section) => ({ ...section, content: { ...section.content, items: section.content.items.filter((row) => row.id !== item.id) } }))} aria-label={`Remove item ${index + 1}`} className="text-[#d11f4a]"><Trash2 className="h-3.5 w-3.5" /></button></div><textarea rows={2} value={item.text} aria-label={`Item ${index + 1} text`} onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, items: section.content.items.map((row) => row.id === item.id ? { ...row, text: event.target.value } : row) } }))} className={`${inputClass} mt-2`} />{selectedSection.type === "stats" && <input value={item.value} placeholder="Value" onChange={(event) => updateSelected((section) => ({ ...section, content: { ...section.content, items: section.content.items.map((row) => row.id === item.id ? { ...row, value: event.target.value } : row) } }))} className={`${inputClass} mt-2`} />}</div>)}</div></div>}
            </div>}
          </>}
        </aside>
      </div>

      {historyOpen && <div className="fixed inset-0 z-[80] flex items-center justify-end bg-[#07102a]/35" onClick={() => setHistoryOpen(false)}><div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-[#0a1128]">Published versions</h2><p className="mt-1 text-xs text-[#7c8498]">Restore any version into a new draft.</p></div><button onClick={() => setHistoryOpen(false)} className="rounded-lg border border-[#dfe6ff] px-3 py-2 text-xs font-bold">Close</button></div><div className="mt-5 space-y-2">{versions.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-[#155cff]" /> : versions.data?.length ? versions.data.map((version) => <article key={version.id} className="rounded-xl border border-[#dfe6ff] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-[#0a1128]">Version {version.version}</p><p className="mt-1 text-[11px] text-[#7c8498]">{new Date(version.publishedAt).toLocaleString()}</p></div><button onClick={() => handleRestore(version.version)} disabled={restoreVersion.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef3ff] px-3 py-2 text-xs font-black text-[#155cff]"><RotateCcw className="h-3.5 w-3.5" /> Restore</button></div>{version.note && <p className="mt-3 text-xs leading-5 text-[#596176]">{version.note}</p>}</article>) : <p className="py-10 text-center text-sm text-[#9aa0b4]">No published versions yet.</p>}</div></div></div>}
    </div>
  );
}
