import { PreviewBlock } from "./previewBlock";

export interface DialogData {
  subjectId: number;
  saveCopy: boolean;
  preview: {
    sessionId: string;
    totalBlocks: number;
    blocks: PreviewBlock[];
  };
}