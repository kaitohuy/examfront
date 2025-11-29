
export type QuestionLabel = 'EXAM' | 'PRACTICE';
export type UnitKind = 'SUB_ITEM' | 'FULL_QUESTION';
export type ItemNature = 'THEORY' | 'EXERCISE';
export type RecordStatus = 'APPROVED' | 'REJECTED' | 'PENDING';
export type AutoSettingKind = 'EXAM' | 'PRACTICE';

export interface AutoGenSelectorDTO {
  unitKind: UnitKind | null;
  chapterIn?: number[] | null;
  pointsEq?: number | null;
  pointsMin?: number | null;
  pointsMax?: number | null;
  typeCodeIn?: string[] | null;
  nature?: ItemNature | null;
  status?: RecordStatus | null;
  cognitive?: string | null;
}

export interface AutoGenStepDTO {
  title?: string | null;
  grouping?: string | null;
  selectors: AutoGenSelectorDTO[];
}

export interface AutoPaperSettingDTO {
  subjectId?: number;
  name: string;
  variants: number;
  noRepeatWithin: boolean;
  noRepeatAcross: boolean;
  notUsedYears: number;
  labelScope?: QuestionLabel[] | null;
  steps: AutoGenStepDTO[];
  kind?: AutoSettingKind;
}
