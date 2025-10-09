export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ArchiveVariant = 'EXAM' | 'PRACTICE';
export type ArchiveKind = 'IMPORT' | 'EXPORT' | 'SUBMISSION';

export interface FileArchive {
  id: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: ArchiveKind;
  subjectId: number | null;
  userId: number | null;
  createdAt: string; // ISO

  uploaderName?: string;
  subjectName?: string;

  // NEW:
  variant?: ArchiveVariant | null;
  reviewStatus?: ReviewStatus | null;
  reviewNote?: string | null;
  reviewDeadline?: string | null; // ISO (BE trả Instant)

  reviewedAt?: string;          // ISO
  reviewedById?: number;
  reviewedByName?: string;

  linkedTaskId?: number | null;        // NEW
  linkedTaskStatus?: 'ASSIGNED' | 'IN_PROGRESS' | 'REPORTED' | 'SUBMITTED' | 'DONE' | 'CANCELLED' | 'RETURNED' | null;
}

