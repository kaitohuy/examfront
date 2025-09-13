export interface AdminOverview {
  users: { total: number; byRole: Record<string, number> };
  departments: { count: number; withoutHead: number };
  subjects: { count: number; withoutTeachers: number };
  questions: {
    total: number;
    byType: Record<string, number>;   // MULTIPLE_CHOICE / ESSAY
    byLabel: Record<string, number>;  // PRACTICE / EXAM
    byDifficulty?: Record<string, number>;
  };
  coverage: Record<string, number>;   // chapter0..chapter7
  archive: { pending: number; approved: number; rejected: number; avgReviewHours: number };
}
