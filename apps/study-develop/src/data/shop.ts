/** 아바타 꾸미기 아이템 — 상점에서 코인으로 사거나 승급 보상으로 받는다 */
export type Slot = 'hat' | 'outfit' | 'pet' | 'desk';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  price: number; // 0 이면 상점 판매 안 함(승급 보상 전용)
  minLevel: number;
  desc: string;
}

export const ITEMS: Item[] = [
  { id: 'hat-cap', slot: 'hat', name: '개발자 캡모자', emoji: '🧢', price: 0, minLevel: 1, desc: 'Lv.1 승급 보상' },
  { id: 'hat-headset', slot: 'hat', name: '집중 헤드셋', emoji: '🎧', price: 0, minLevel: 1, desc: 'Lv.4 승급 보상' },
  { id: 'hat-beanie', slot: 'hat', name: '야근 비니', emoji: '🧶', price: 0, minLevel: 1, desc: 'Lv.7 승급 보상' },
  { id: 'hat-crown', slot: 'hat', name: '아키텍트 왕관', emoji: '👑', price: 0, minLevel: 1, desc: 'Lv.10 승급 보상' },
  { id: 'hat-grad', slot: 'hat', name: '학사모', emoji: '🎓', price: 300, minLevel: 3, desc: '배움에는 끝이 없다' },
  { id: 'hat-tophat', slot: 'hat', name: '신사 모자', emoji: '🎩', price: 600, minLevel: 6, desc: '코드에도 품격을' },

  { id: 'outfit-hoodie', slot: 'outfit', name: '후드티', emoji: '🧥', price: 0, minLevel: 1, desc: 'Lv.3 승급 보상' },
  { id: 'outfit-shirt', slot: 'outfit', name: '사원증 셔츠', emoji: '👔', price: 0, minLevel: 1, desc: 'Lv.6 승급 보상 — 입사 축하!' },
  { id: 'outfit-suit', slot: 'outfit', name: '시니어 수트', emoji: '🥼', price: 0, minLevel: 1, desc: 'Lv.9 승급 보상' },
  { id: 'outfit-tshirt', slot: 'outfit', name: '컨퍼런스 티셔츠', emoji: '👕', price: 150, minLevel: 1, desc: '공짜 티셔츠는 개발자의 교복' },
  { id: 'outfit-kimono', slot: 'outfit', name: '편안한 잠옷', emoji: '👘', price: 400, minLevel: 4, desc: '재택근무 전용' },

  { id: 'pet-duck', slot: 'pet', name: '러버덕', emoji: '🦆', price: 0, minLevel: 1, desc: 'Lv.2 승급 보상 — 말로 설명하면 버그가 보여요' },
  { id: 'pet-cat', slot: 'pet', name: '키보드 고양이', emoji: '🐈', price: 0, minLevel: 1, desc: 'Lv.5 승급 보상' },
  { id: 'pet-robot', slot: 'pet', name: 'CI 로봇', emoji: '🤖', price: 0, minLevel: 1, desc: 'Lv.8 승급 보상' },
  { id: 'pet-bug', slot: 'pet', name: '애완 버그', emoji: '🐞', price: 200, minLevel: 2, desc: '잡지 말고 키워보자' },
  { id: 'pet-coffee', slot: 'pet', name: '아메리카노', emoji: '☕', price: 120, minLevel: 1, desc: '자바의 원동력' },
  { id: 'pet-dragon', slot: 'pet', name: '레거시 드래곤', emoji: '🐉', price: 1500, minLevel: 9, desc: '20년 된 코드에 사는 전설의 존재' },

  { id: 'desk-plant', slot: 'desk', name: '책상 화분', emoji: '🪴', price: 100, minLevel: 1, desc: '공부방에 놓여요' },
  { id: 'desk-monitor', slot: 'desk', name: '듀얼 모니터', emoji: '🖥️', price: 350, minLevel: 3, desc: '생산성 +200% (기분상)' },
  { id: 'desk-books', slot: 'desk', name: '이펙티브 자바', emoji: '📗', price: 500, minLevel: 5, desc: '자바 개발자의 필독서' },
  { id: 'desk-trophy', slot: 'desk', name: '해커톤 트로피', emoji: '🏆', price: 900, minLevel: 7, desc: '자랑은 책상 위에' },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
