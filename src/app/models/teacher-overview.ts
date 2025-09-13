export interface TeacherOverviewDto {
  subjects: {
    assigned: number;
    myContribTop: Array<{
      subjectId: number;
      subjectName: string;
      myQuestions: number;
      subjectTotal: number;
    }>;
  };
  questions: {
    total: number;
    byType: Record<string, number>;      // MULTIPLE_CHOICE / ESSAY
    byLabel: Record<string, number>;     // PRACTICE / EXAM
    byDifficulty: Record<string, number>;
  };
  coverage: Record<string, number>;       // chapter0..chapter7
  archive: {
    pending: number;
    approved: number;
    rejected: number;
    avgReviewHours: number;
    pendingSoon: Array<{
      id: number;
      filename: string;
      variant: string | null;
      reviewStatus: string;
      createdAt: string;         // ISO
      reviewDeadline: string | null;
      subjectName: string | null;
    }>;
  };
}
