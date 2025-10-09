import { ArchiveVariant, ReviewStatus } from "./fileArchive";

export interface ArchiveQuery {
  kind?: 'IMPORT' | 'EXPORT' | 'SUBMISSION';
  q?: string;
  subject?: string;
  uploader?: string;
  from?: string; // yyyy-MM-dd
  to?: string;   // yyyy-MM-dd
  variant?: ArchiveVariant;
  reviewStatus?: ReviewStatus; // NEW
}
