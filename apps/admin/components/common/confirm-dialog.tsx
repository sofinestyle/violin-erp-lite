"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReactNode } from "react";

type ConfirmDialogProps = Readonly<{
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}>;

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#6B7280]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">取消</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
