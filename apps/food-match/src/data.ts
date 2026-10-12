/**
 * 음식 궁합 데이터. 새 음식/궁합은 여기에만 추가하면 된다.
 *
 * 규칙(rule)의 a, b 는 음식 id 또는 `#태그`.
 * 예: { a: '#iron', b: '#vitc' } → 철분 식품(태그 iron) × 비타민C 식품(태그 vitc) 모든 조합에 적용.
 *
 * verdict
 *  - good : 함께 먹으면 좋다는 근거가 있음
 *  - bad  : 함께 먹을 때 주의할 근거가 있음
 *  - myth : 흔히 그렇게 알려졌지만 근거가 약하거나 과장된 속설
 */

export type Verdict = 'good' | 'bad' | 'myth';

export type Food = {
  id: string;
  name: string;
  emoji: string;
  /** 검색용 다른 이름 */
  aliases?: string[];
  tags?: string[];
};

export type Rule = {
  a: string;
  b: string;
  verdict: Verdict;
  /** 한 줄 요약 */
  title: string;
  /** 이유 (두세 문장) */
  why: string;
};

export const FOODS: Food[] = [
  // 채소 · 과일
  { id: 'tomato', name: '토마토', emoji: '🍅', tags: ['carotenoid'] },
  { id: 'carrot', name: '당근', emoji: '🥕', tags: ['carotenoid'] },
  { id: 'spinach', name: '시금치', emoji: '🥬', tags: ['carotenoid', 'iron'] },
  { id: 'pumpkin', name: '단호박', emoji: '🎃', aliases: ['호박'], tags: ['carotenoid'] },
  { id: 'radish', name: '무', emoji: '🌱', aliases: ['무생채', '깍두기'] },
  { id: 'green-onion', name: '파', emoji: '🧅', aliases: ['대파', '쪽파'] },
  { id: 'garlic', name: '마늘', emoji: '🧄' },
  { id: 'lemon', name: '레몬', emoji: '🍋', tags: ['vitc'] },
  { id: 'orange-juice', name: '오렌지주스', emoji: '🍊', aliases: ['오렌지', '귤'], tags: ['vitc'] },
  { id: 'kiwi', name: '키위', emoji: '🥝', tags: ['vitc'] },
  { id: 'strawberry', name: '딸기', emoji: '🍓', tags: ['vitc'] },
  { id: 'avocado', name: '아보카도', emoji: '🥑', tags: ['fat'] },
  { id: 'peach', name: '복숭아', emoji: '🍑' },
  { id: 'persimmon', name: '감', emoji: '🟠', aliases: ['홍시', '곶감'] },
  { id: 'seaweed', name: '미역', emoji: '🌿', aliases: ['미역국'] },

  // 고기 · 해산물
  { id: 'beef', name: '소고기', emoji: '🥩', aliases: ['스테이크', '불고기'] },
  { id: 'pork', name: '돼지고기', emoji: '🥓', aliases: ['삼겹살', '보쌈', '수육', '목살'] },
  { id: 'chicken', name: '치킨', emoji: '🍗', aliases: ['닭', '닭고기', '후라이드'], tags: ['purine'] },
  { id: 'mackerel', name: '고등어', emoji: '🐟', aliases: ['생선', '등푸른생선'], tags: ['fish', 'purine'] },
  { id: 'salmon', name: '연어', emoji: '🍣', aliases: ['회', '생선회'], tags: ['fish'] },
  { id: 'anchovy', name: '멸치', emoji: '🐠', tags: ['fish', 'purine'] },
  { id: 'gopchang', name: '곱창', emoji: '🔥', aliases: ['막창', '대창', '내장'], tags: ['purine'] },
  { id: 'eel', name: '장어', emoji: '🐍', aliases: ['민물장어'] },
  { id: 'crab', name: '게', emoji: '🦀', aliases: ['꽃게', '대게', '게장'] },
  { id: 'salted-shrimp', name: '새우젓', emoji: '🦐' },

  // 곡물 · 콩 · 유제품
  { id: 'rice', name: '쌀밥', emoji: '🍚', aliases: ['밥', '흰쌀밥'] },
  { id: 'tofu', name: '두부', emoji: '🧈', aliases: ['콩', '두유'], tags: ['iron', 'legume'] },
  { id: 'oats', name: '귀리', emoji: '🌾', aliases: ['오트밀'] },
  { id: 'milk', name: '우유', emoji: '🥛' },
  { id: 'yogurt', name: '요거트', emoji: '🍶', aliases: ['요구르트', '요플레'] },

  // 양념 · 기름
  { id: 'olive-oil', name: '올리브유', emoji: '🫒', aliases: ['올리브오일', '기름'], tags: ['fat'] },
  { id: 'sesame-oil', name: '참기름', emoji: '🫙', aliases: ['들기름'], tags: ['fat'] },
  { id: 'curry', name: '카레', emoji: '🍛', aliases: ['강황', '커리'] },
  { id: 'pepper', name: '후추', emoji: '🧂', aliases: ['후춧가루'] },
  { id: 'sugar', name: '설탕', emoji: '🍬' },

  // 음료 · 간식
  { id: 'coffee', name: '커피', emoji: '☕', aliases: ['아메리카노', '라떼'], tags: ['tannin'] },
  { id: 'green-tea', name: '녹차', emoji: '🍵', aliases: ['홍차', '차'], tags: ['tannin'] },
  { id: 'energy-drink', name: '에너지드링크', emoji: '⚡', aliases: ['몬스터', '레드불', '핫식스'] },
  { id: 'cola', name: '콜라', emoji: '🥤', aliases: ['사이다', '탄산음료'], tags: ['soda'] },
  { id: 'mentos', name: '멘토스', emoji: '🍥', aliases: ['사탕'] },

  // 술
  { id: 'soju', name: '소주', emoji: '🍶', tags: ['alcohol'] },
  { id: 'beer', name: '맥주', emoji: '🍺', aliases: ['치맥'], tags: ['alcohol', 'soda'] },
  { id: 'wine', name: '와인', emoji: '🍷', aliases: ['포도주'], tags: ['alcohol'] },
  { id: 'makgeolli', name: '막걸리', emoji: '🍾', tags: ['alcohol'] },
];

export const RULES: Rule[] = [
  // ───────── 찰떡 (good)
  {
    a: '#carotenoid',
    b: '#fat',
    verdict: 'good',
    title: '기름과 함께 먹으면 영양소 흡수가 잘 돼요',
    why: '라이코펜·베타카로틴 같은 색소 영양소는 기름에 녹는 성질이라, 기름진 재료와 같이 먹을 때 몸에 더 많이 흡수돼요. 토마토는 살짝 익혀 먹으면 더 좋아요.',
  },
  {
    a: '#iron',
    b: '#vitc',
    verdict: 'good',
    title: '비타민C가 철분 흡수를 도와요',
    why: '채소·콩에 든 철분(비헴철)은 원래 흡수율이 낮은데, 비타민C가 함께 있으면 흡수되기 쉬운 형태로 바뀌어요.',
  },
  {
    a: '#iron',
    b: 'beef',
    verdict: 'good',
    title: '고기가 채소 철분 흡수를 거들어요',
    why: '고기·생선과 함께 먹으면 채소·콩에 든 철분(비헴철)의 흡수율이 올라간다고 알려져 있어요(“육류 인자”). 고기 자체의 철분도 흡수가 잘 되는 편이고요.',
  },
  {
    a: 'garlic',
    b: 'pork',
    verdict: 'good',
    title: '마늘이 돼지고기 비타민B1을 더 잘 쓰이게 해요',
    why: '돼지고기는 비타민B1이 풍부한데, 마늘의 알리신과 만나면 몸에 오래 머무는 형태(알리티아민)로 바뀌어요.',
  },
  {
    a: 'curry',
    b: 'pepper',
    verdict: 'good',
    title: '후추가 강황 성분 흡수를 크게 높여요',
    why: '강황의 커큐민은 흡수가 잘 안 되는 성분인데, 후추의 피페린이 함께 있으면 흡수율이 크게 올라간다는 연구가 있어요.',
  },
  {
    a: 'kiwi',
    b: 'beef',
    verdict: 'good',
    title: '키위가 고기를 연하게, 소화는 편하게',
    why: '키위의 단백질 분해효소(액티니딘)가 고기를 부드럽게 하고 단백질 소화를 돕는다는 연구가 있어요. 재울 때 너무 오래 두면 고기가 물러져요.',
  },
  {
    a: 'lemon',
    b: '#fish',
    verdict: 'good',
    title: '레몬이 비린내를 잡아줘요',
    why: '생선 비린내 성분(트리메틸아민)은 염기성이라 레몬의 산과 만나면 냄새가 덜 나는 형태로 바뀌어요.',
  },
  {
    a: 'tofu',
    b: 'rice',
    verdict: 'good',
    title: '서로 모자란 아미노산을 채워줘요',
    why: '쌀에는 라이신이, 콩에는 메티오닌이 상대적으로 적어요. 같이 먹으면 단백질 구성이 고르게 맞춰져요.',
  },
  {
    a: 'green-tea',
    b: 'lemon',
    verdict: 'good',
    title: '레몬이 녹차 카테킨을 지켜줘요',
    why: '소화 과정을 흉내 낸 실험에서 레몬 같은 시트러스를 넣으면 녹차 카테킨이 더 많이 남았다는 결과가 있어요.',
  },
  {
    a: 'yogurt',
    b: 'oats',
    verdict: 'good',
    title: '유산균 + 유산균 먹이',
    why: '귀리의 식이섬유(베타글루칸)는 장내 유익균의 먹이가 돼요. 요거트 유산균과 함께 먹으면 장 건강에 도움이 될 수 있어요.',
  },

  // ───────── 주의 (bad)
  {
    a: '#alcohol',
    b: 'energy-drink',
    verdict: 'bad',
    title: '취한 걸 못 느끼게 해서 더 마시게 돼요',
    why: '카페인이 술의 졸음을 가려서 덜 취했다고 착각하게 만들어요. 그래서 과음하기 쉽고, 심장에도 부담이 될 수 있어요.',
  },
  {
    a: 'soju',
    b: '#soda',
    verdict: 'bad',
    title: '탄산이 술을 더 빨리 취하게 해요',
    why: '탄산이 위에서 알코올이 흡수되는 속도를 높인다는 연구가 있어요. 소맥이나 소주에 탄산음료를 섞으면 생각보다 빨리 취해요.',
  },
  {
    a: 'beer',
    b: '#purine',
    verdict: 'bad',
    title: '요산이 쌓이기 쉬운 조합 (통풍 주의)',
    why: '맥주는 그 자체로 퓨린이 있고, 알코올은 요산 배출을 방해해요. 퓨린이 많은 안주까지 더해지면 요산 수치가 오르기 쉬워요. 통풍이 있거나 요산 수치가 높다면 특히 조심하세요.',
  },
  {
    a: '#iron',
    b: '#tannin',
    verdict: 'bad',
    title: '차·커피가 철분 흡수를 방해해요',
    why: '차와 커피의 폴리페놀(탄닌)이 채소·콩에 든 철분과 결합해 흡수를 떨어뜨려요. 빈혈이 걱정되면 식후 1시간쯤 지나서 마시세요.',
  },
  {
    a: 'coffee',
    b: 'energy-drink',
    verdict: 'bad',
    title: '카페인이 한꺼번에 몰려요',
    why: '커피 한 잔과 에너지드링크 한 캔만으로도 카페인이 꽤 많아요. 성인 하루 권장 최대량은 400mg이에요. 가슴 두근거림이나 불면이 생길 수 있어요.',
  },

  // ───────── 속설 (myth)
  {
    a: 'spinach',
    b: 'tofu',
    verdict: 'myth',
    title: '결석 생긴다? 오히려 반대에 가까워요',
    why: '시금치 옥살산이 두부 칼슘과 만나 결석이 된다는 얘기가 있지만, 둘은 장에서 미리 결합해 대변으로 나가요. 그래서 몸에 흡수되는 옥살산은 오히려 줄어요.',
  },
  {
    a: 'eel',
    b: 'peach',
    verdict: 'myth',
    title: '같이 먹으면 탈 난다? 근거 없어요',
    why: '장어의 지방과 복숭아의 유기산이 만나 설사를 일으킨다는 속설이에요. 이를 뒷받침하는 연구는 없어요. 기름진 음식을 많이 먹으면 누구나 배탈이 날 수 있는 정도예요.',
  },
  {
    a: 'carrot',
    b: 'radish',
    verdict: 'myth',
    title: '비타민C를 다 파괴한다? 과장이에요',
    why: '당근의 효소(아스코르비나아제)가 비타민C를 산화시키는 건 맞아요. 다만 산화된 비타민C도 몸 안에서 다시 비타민C로 쓰여요. 식초를 살짝 넣으면 효소도 약해져요.',
  },
  {
    a: 'seaweed',
    b: 'green-onion',
    verdict: 'myth',
    title: '파가 미역 칼슘을 막는다? 근거 약해요',
    why: '파의 인·황 성분이 미역 칼슘 흡수를 방해한다는 속설이에요. 국에 넣는 정도의 파로는 의미 있는 차이가 났다는 근거가 없어요.',
  },
  {
    a: 'crab',
    b: 'persimmon',
    verdict: 'myth',
    title: '같이 먹으면 식중독? 근거 없어요',
    why: '함께 먹어서 탈이 난다는 근거는 없어요. 다만 덜 익은 떫은 감(탄닌)을 한꺼번에 많이 먹으면 변비나 드물게 위석이 생길 수 있어요. 게는 신선도가 더 중요해요.',
  },
  {
    a: 'milk',
    b: 'orange-juice',
    verdict: 'myth',
    title: '배 속에서 우유가 굳는다? 원래 굳어요',
    why: '산과 만나면 우유 단백질이 몽글몽글해지는 건 맞아요. 그런데 위산이 훨씬 강해서 우유만 마셔도 위에서는 똑같이 굳어요. 해롭지 않아요.',
  },
  {
    a: 'milk',
    b: '#fish',
    verdict: 'myth',
    title: '생선이랑 우유는 상극? 근거 없어요',
    why: '일부 지역에서 피부병을 일으킨다고 알려진 속설이지만 과학적 근거는 없어요. 크림소스 생선 요리처럼 세계 곳곳에서 흔히 같이 먹어요.',
  },
  {
    a: '#alcohol',
    b: 'coffee',
    verdict: 'myth',
    title: '커피로 술 깬다? 안 깨요',
    why: '혈중 알코올을 분해하는 건 간뿐이고, 커피는 그 속도를 높이지 못해요. 졸음만 가려서 덜 취했다고 착각하게 만드니 운전은 절대 안 돼요.',
  },
  {
    a: 'cola',
    b: 'mentos',
    verdict: 'myth',
    title: '같이 먹으면 배가 터진다? 안 터져요',
    why: '병 속에서 분수처럼 솟는 건 사탕 표면에 기포가 몰리는 물리 현상이에요. 입과 위에서는 그렇게 터지지 않고, 트림이 좀 날 뿐이에요.',
  },
  {
    a: 'pork',
    b: 'salted-shrimp',
    verdict: 'myth',
    title: '맛 궁합은 진짜, 소화효소 효과는 과장',
    why: '새우젓에 단백질·지방 분해효소가 있는 건 맞아요. 하지만 찍어 먹는 양으로 소화를 크게 돕는다는 근거는 약해요. 그래도 짭짤한 감칠맛 궁합은 확실해요. 나트륨만 조심하세요.',
  },
  {
    a: 'tomato',
    b: 'sugar',
    verdict: 'myth',
    title: '비타민B1을 빼앗는다? 영향 미미해요',
    why: '당을 분해할 때 비타민B1이 쓰이긴 하지만, 토마토에 설탕 조금 뿌리는 정도로는 걱정할 수준이 아니에요. 차라리 설탕이 늘어나는 게 문제예요. 소금 한 꼬집도 맛있어요.',
  },
];

/** 함께 담아보기 좋은 예시 조합 */
export const PRESETS: { label: string; ids: string[] }[] = [
  { label: '🍗🍺 치맥', ids: ['chicken', 'beer'] },
  { label: '🥬🧈 시금치 + 두부', ids: ['spinach', 'tofu'] },
  { label: '🍅🫒 토마토 + 올리브유', ids: ['tomato', 'olive-oil'] },
  { label: '🥓🧄🦐 보쌈 한 상', ids: ['pork', 'garlic', 'salted-shrimp', 'soju'] },
  { label: '🍛🧂 카레 + 후추', ids: ['curry', 'pepper'] },
  { label: '🍶⚡ 소주 + 에너지드링크', ids: ['soju', 'energy-drink'] },
];
