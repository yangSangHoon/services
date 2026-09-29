export type DreamKind = 'dragon' | 'pig' | 'poop' | 'baby' | 'love' | 'nightmare' | 'dog';
export type Honesty = 'real' | 'half' | 'fake';

export interface Profile {
  id: string;
  nickname: string;
  coins: number;
  bonus_claimed: boolean;
}

export interface Dream {
  id: string;
  seller_id: string;
  seller_nickname: string;
  title: string;
  teaser: string;
  kind: DreamKind;
  honesty: Honesty;
  price: number;
  status: 'on_sale' | 'sold';
  buyer_id: string | null;
  buyer_nickname: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface OwnedDream extends Dream {
  content: string | null;
}
