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
  kind: DreamKind | null; // null = 종류 없음(기타)
  honesty: Honesty;
  price: number;
  status: 'on_sale' | 'sold';
  buyer_id: string | null;
  buyer_nickname: string | null;
  sold_at: string | null;
  created_at: string;
  content: string | null;
  /** 되판 매물이면 원래 산 꿈 id */
  parent_id: string | null;
  /** 1 = 처음 올라온 꿈, 2부터 되판 꿈 */
  generation: number;
  original_seller_nickname: string | null;
  votes_real: number;
  votes_fake: number;
  /** 구매자가 이 꿈을 되팔기 했는지 */
  resold: boolean;
  review: Review | null;
}

export type OwnedDream = Dream;

export type Verdict = 'real' | 'fake';
export type ReviewVerdict = 'hit' | 'meh' | 'miss';

export interface Review {
  verdict: ReviewVerdict;
  body: string;
  user_nickname: string;
}

/** 보상 지급 결과. amount 0이면 reason에 이유 */
export interface Reward {
  amount: number;
  reason?: 'guest' | 'daily_cap' | 'already' | 'too_short' | 'changed' | 'same';
  today?: number;
  cap?: number;
  coins?: number;
}
