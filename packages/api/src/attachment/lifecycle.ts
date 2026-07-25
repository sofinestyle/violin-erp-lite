import { AttachmentStateConflictError } from "./errors.js";
import type { AttachmentStatus } from "./types.js";

export const ATTACHMENT_LIFECYCLE_ACTIONS = [
  "soft_delete",
  "begin_physical_delete",
  "physical_delete_succeeded",
  "physical_delete_failed",
  "retry_physical_delete",
] as const;

export type AttachmentLifecycleAction = (typeof ATTACHMENT_LIFECYCLE_ACTIONS)[number];

const TRANSITIONS: Readonly<
  Partial<Record<AttachmentStatus, Partial<Record<AttachmentLifecycleAction, AttachmentStatus>>>>
> = {
  active: { soft_delete: "soft_deleted" },
  soft_deleted: { begin_physical_delete: "pending_physical_delete" },
  pending_physical_delete: {
    physical_delete_failed: "physical_delete_failed",
    physical_delete_succeeded: "physically_deleted",
  },
  physical_delete_failed: { retry_physical_delete: "pending_physical_delete" },
};

export class AttachmentLifecycle {
  canSoftDelete(status: AttachmentStatus): boolean {
    return status === "active";
  }

  canPhysicalDelete(status: AttachmentStatus): boolean {
    return status === "soft_deleted" || status === "physical_delete_failed";
  }

  canDownload(status: AttachmentStatus): boolean {
    return status === "active";
  }

  canLink(status: AttachmentStatus): boolean {
    return status === "active";
  }

  nextState(status: AttachmentStatus, action: AttachmentLifecycleAction): AttachmentStatus {
    const next = TRANSITIONS[status]?.[action];
    if (!next) throw new AttachmentStateConflictError();
    return next;
  }
}
