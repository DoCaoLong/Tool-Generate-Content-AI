"use client";

import { useEffect, useState } from "react";
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
  const [draft, setDraft] = useState<StyleDraft>({ name, description: description || "", instruction });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setDraft({ name, description: description || "", instruction });
    setLocalError("");
  }, [name, description, instruction, editing, open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,720px)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa phong cách" : name}</DialogTitle>
          <DialogDescription>{kindLabel}{username ? ` · @${username}` : ""}{projectName ? ` · ${projectName}` : ""}</DialogDescription>
        </DialogHeader>
        {editing ? (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
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
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" disabled={saving} onClick={() => onEditingChange?.(false)}>Huỷ</Button>
              <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="space-y-4 text-sm">
              {description ? <p className="leading-6 text-slate-600">{description}</p> : null}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hướng dẫn văn phong</h3>
                <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{instruction}</p>
              </section>
            </div>
            <DialogFooter>
              {canEdit && <Button type="button" variant="outline" className="rounded-xl" onClick={() => onEditingChange?.(true)}>Sửa</Button>}
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Đóng</Button>
              <Button type="button" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => { onApply(); onOpenChange(false); }}>{active ? "Đang dùng" : "Áp dụng"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
