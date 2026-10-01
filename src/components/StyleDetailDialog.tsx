"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface StyleDraft {
  name: string;
  description: string;
  instruction: string;
}

interface StyleDetailDialogProps {
  open: boolean;
  name: string;
  kindLabel: string;
  description?: string | null;
  instruction: string;
  username?: string | null;
  projectName?: string | null;
  active?: boolean;
  canEdit?: boolean;
  editing?: boolean;
  saving?: boolean;
  saveError?: string;
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
  onEditingChange?: (editing: boolean) => void;
  onSave?: (values: StyleDraft) => void;
}

export function StyleDetailDialog({
  open,
  name,
  kindLabel,
  description,
  instruction,
  username,
  projectName,
  active = false,
  canEdit = false,
  editing = false,
  saving = false,
  saveError,
  onApply,
  onOpenChange,
  onEditingChange,
  onSave,
}: StyleDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(80vh,720px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <StyleDetailBody
          key={`${open}-${editing}-${name}`}
          name={name}
          kindLabel={kindLabel}
          description={description}
          instruction={instruction}
          username={username}
          projectName={projectName}
          active={active}
          canEdit={canEdit}
          editing={editing}
          saving={saving}
          saveError={saveError}
          onApply={onApply}
          onOpenChange={onOpenChange}
          onEditingChange={onEditingChange}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function StyleDetailBody({
  name,
  kindLabel,
  description,
  instruction,
  username,
  projectName,
  active,
  canEdit,
  editing,
  saving,
  saveError,
  onApply,
  onOpenChange,
  onEditingChange,
  onSave,
}: Omit<StyleDetailDialogProps, "open">) {
  const [draft, setDraft] = useState<StyleDraft>({ name, description: description || "", instruction });
  const [localError, setLocalError] = useState("");

  const submit = () => {
    const next = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      instruction: draft.instruction.trim(),
    };
    if (next.name.length < 2) {
      setLocalError("Tên phong cách cần ít nhất 2 ký tự.");
      return;
    }
    if (next.name.length > 100 || next.description.length > 300 || next.instruction.length > 5000) {
      setLocalError("Nội dung vượt quá độ dài cho phép.");
      return;
    }
    if (next.instruction.length < 10) {
      setLocalError("Hướng dẫn văn phong cần ít nhất 10 ký tự.");
      return;
    }
    setLocalError("");
    onSave?.(next);
  };

  const meta = `${kindLabel}${username ? ` · @${username}` : ""}${projectName ? ` · ${/^[A-Za-z0-9_]{1,15}$/.test(projectName) ? `@${projectName}` : projectName}` : ""}`;

  return (
    <>
      <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-6 py-4 pr-12 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle>{editing ? "Sửa phong cách" : name}</DialogTitle>
            <DialogDescription className="mt-1">{meta}</DialogDescription>
          </div>
          {canEdit && !editing && <Button type="button" variant="outline" className="h-8 shrink-0 rounded-lg px-3" onClick={() => onEditingChange?.(true)}>Sửa</Button>}
        </div>
      </DialogHeader>
      {editing ? (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <label className="block text-sm font-medium">Tên phong cách
              <Input className="mt-2 rounded-xl" value={draft.name} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium">Mô tả ngắn
              <Input className="mt-2 rounded-xl" value={draft.description} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium">Hướng dẫn văn phong
              <Textarea className="mt-2 min-h-40 rounded-xl" value={draft.instruction} maxLength={5000} onChange={(event) => setDraft((current) => ({ ...current, instruction: event.target.value }))} />
            </label>
            {(localError || saveError) && <p className="text-sm text-red-600">{localError || saveError}</p>}
          </div>
          <DialogFooter className="shrink-0 flex-row justify-end gap-1.5 border-t border-slate-100 px-6 py-3 sm:space-x-0">
            <Button type="button" variant="outline" className="rounded-xl" disabled={saving} onClick={() => onEditingChange?.(false)}>Huỷ</Button>
            <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
          </DialogFooter>
        </form>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
            {description ? <p className="leading-6 text-slate-600">{description}</p> : null}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hướng dẫn văn phong</h3>
              <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{instruction}</p>
            </section>
          </div>
          <DialogFooter className="shrink-0 flex-row justify-end gap-1.5 border-t border-slate-100 px-6 py-3 sm:space-x-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Đóng</Button>
            <Button type="button" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => { onApply(); onOpenChange(false); }}>{active ? "Đang dùng" : "Áp dụng"}</Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}
