import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  resourceType: string;
}

export const Audit = (meta: AuditMetadata) => SetMetadata(AUDIT_KEY, meta);
