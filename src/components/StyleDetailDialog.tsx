"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StyleDetailDialogProps {
  open: boolean;
  name: string;
  kindLabel: string;
  description?: string | null;
  instruction: string;
  username?: string | null;
  projectName?: string | null;
  samples?: Array<{ id: string; text: string }>;
  active?: boolean;
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
}

export function StyleDetailDialog({
  open,
  name,
  kindLabel,
  description,
  instruction,
  username,
  projectName,
  samples = [],
  active = false,
  onApply,
  onOpenChange,
}: StyleDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,720px)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{kindLabel}{username ? ` · @${username}` : ""}{projectName ? ` · ${projectName}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {description ? <p className="leading-6 text-slate-600">{description}</p> : null}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hướng dẫn văn phong</h3>
            <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{instruction}</p>
          </section>
          {samples.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bài mẫu</h3>
              <div className="mt-2 space-y-2">
                {samples.map((sample, index) => (
                  <p key={sample.id || index} className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{sample.text}</p>
                ))}
              </div>
            </section>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button type="button" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => { onApply(); onOpenChange(false); }}>{active ? "Đang dùng" : "Áp dụng"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
