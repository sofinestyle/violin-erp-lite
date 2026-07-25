import {
  AttachmentCategoryMismatchError,
  AttachmentNotFoundError,
  AttachmentPermissionDeniedError,
} from "./errors.js";
import { AttachmentCategoryRegistry } from "./category-registry.js";
import { AttachmentObjectRegistry } from "./object-registry.js";
import type { ValidateAttachmentObjectInput, ValidatedAttachmentObject } from "./types.js";

const attachmentPermission = {
  delete: "attachment.file.delete",
  link: "attachment.file.link",
  read: "attachment.file.read",
  unlink: "attachment.file.unlink",
} as const;

export class AttachmentValidator {
  readonly #categories: AttachmentCategoryRegistry;
  readonly #objects: AttachmentObjectRegistry;

  constructor(objects: AttachmentObjectRegistry, categories = new AttachmentCategoryRegistry()) {
    this.#objects = objects;
    this.#categories = categories;
  }

  async validate(input: ValidateAttachmentObjectInput): Promise<ValidatedAttachmentObject> {
    const objectType = this.#categories.requireObjectType(input.objectType);
    const category = this.#categories.requireCategory(input.attachmentCategory);
    if (
      !this.#objects.supportsCategory(
        objectType,
        category,
        this.#categories.allowObjectType.bind(this.#categories),
      )
    ) {
      throw new AttachmentCategoryMismatchError();
    }

    const object = await this.#objects.load(objectType, input.objectId, input.objectItemId);
    if (!object) throw new AttachmentNotFoundError();

    this.#objects.checkObjectState(object, input.operation);
    if (!input.access.permissionCodes.includes(attachmentPermission[input.operation])) {
      throw new AttachmentPermissionDeniedError();
    }
    if (input.operation === "read") {
      this.#objects.checkReadPermission(objectType, input.access);
    } else {
      this.#objects.checkWritePermission(objectType, input.access);
    }
    this.#objects.checkDataScope(object, input.access);

    const protectedObject = this.#objects.isProtected(object, category);
    if (input.operation === "delete" || input.operation === "unlink") {
      this.#objects.requireNotProtected(object, category);
    }

    return Object.freeze({
      category,
      defaultSensitive: this.#categories.defaultSensitive(category),
      object,
      objectType,
      protected: protectedObject,
    });
  }
}
