import { PreviewBlock } from "./previewBlock";

export interface DialogData {
  subjectId: number;
  saveCopy?: boolean;   // optional để không bắt buộc truyền
  preview: {
    sessionId: string;
    totalBlocks?: number;
    blocks: PreviewBlock[];
  };
}
