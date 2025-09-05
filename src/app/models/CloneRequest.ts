export interface CloneRequest {
  count: number;                     // >=1
  labels?: ('PRACTICE'|'EXAM')[];    // optional: nếu không gửi -> BE copy từ gốc
  difficulty?: 'A'|'B'|'C'|'D'|'E';  // optional
  chapter?: number;                  // optional
  copyImages?: boolean;              // default true (nếu không gửi)
}