export interface UploadDialogConfig {
  accept?: string;           // ví dụ ".zip,.doc,.docx,.pdf"
  maxSizeMb?: number;        // ví dụ 50

  // tuỳ biến UI/hành vi
  title?: string;            // mặc định: "Tải câu hỏi lên"
  showNote?: boolean;        // mặc định: false
  hideSaveCopy?: boolean;    // mặc định: false (hiện checkbox)
  primaryText?: string;      // mặc định: "Bản xem trước"
}
