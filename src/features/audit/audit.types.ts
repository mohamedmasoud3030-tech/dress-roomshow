export type AuditEntityType =
  | 'customer'
  | 'dress'
  | 'reservation'
  | 'payment'
  | 'expense'
  | 'sale'
  | 'service-task'
  | 'delivery-return'
  | 'daily-closing'
  | 'backup'
  | 'database';

export type AuditActionType =
  | 'create'
  | 'update'
  | 'status-change'
  | 'cancel'
  | 'deliver'
  | 'return'
  | 'payment'
  | 'refund'
  | 'sale'
  | 'close-day'
  | 'reopen-day'
  | 'import-backup'
  | 'reset-data';

export type AuditLogEntry = {
  id: string;
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  timestamp: string;
  summary: string;
  previousValues?: Record<string, unknown>;
  nextValues?: Record<string, unknown>;
};

export type AuditLogFilters = {
  search: string;
  entityType: AuditEntityType | 'all';
  action: AuditActionType | 'all';
};
