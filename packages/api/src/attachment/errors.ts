export class AttachmentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AttachmentNotFoundError extends AttachmentDomainError {
  constructor(message = "附件或关联对象不存在") {
    super(message);
  }
}

export class AttachmentStateConflictError extends AttachmentDomainError {
  constructor(message = "附件当前状态不允许执行该操作") {
    super(message);
  }
}

export class AttachmentStillReferencedError extends AttachmentDomainError {
  constructor(message = "附件仍存在有效业务关联") {
    super(message);
  }
}

export class AttachmentCategoryMismatchError extends AttachmentDomainError {
  constructor(message = "附件类别与目标对象不匹配") {
    super(message);
  }
}

export class AttachmentCategoryUnsupportedError extends AttachmentDomainError {
  constructor(message = "不支持的附件类别") {
    super(message);
  }
}

export class AttachmentObjectUnsupportedError extends AttachmentDomainError {
  constructor(message = "不支持的附件对象类型") {
    super(message);
  }
}

export class AttachmentProtectedError extends AttachmentDomainError {
  constructor(message = "附件受正式历史或证据保留规则保护") {
    super(message);
  }
}

export class AttachmentAlreadyLinkedError extends AttachmentDomainError {
  constructor(message = "附件已存在相同业务对象关联") {
    super(message);
  }
}

export class AttachmentPermissionDeniedError extends AttachmentDomainError {
  constructor(message = "无权访问或修改目标附件对象") {
    super(message);
  }
}

export class AttachmentDataScopeDeniedError extends AttachmentDomainError {
  constructor(message = "目标附件对象不在当前数据范围内") {
    super(message);
  }
}

export class AttachmentObjectStateError extends AttachmentDomainError {
  constructor(message = "目标业务对象当前状态不允许附件操作") {
    super(message);
  }
}
