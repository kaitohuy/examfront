export type Img = {
  src: string;
  alt?: string;
  caption?: string;
  captionAt?: 'below' | 'above';
};

export type Block =
  | { type: 'img'; src: string; alt?: string; caption?: string; captionAt?: 'below' | 'above' }
  | { type: 'gallery'; images: Img[]; layout?: 'auto' | 'one-per-row' }
  | { type: 'h3'; text: string }
  | { type: 'p'; html: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'success'; html: string };

export type Topic = {
  id: string;
  title: string;
  img?: string;    
  html?: string;   
  blocks?: Block[]; 
};
