import { formatCoins } from '../lib/format';

const PRICE_STEPS: [string, number][] = [
  ['+1천', 1_000],
  ['+1만', 10_000],
  ['+10만', 100_000],
  ['+100만', 1_000_000],
  ['+1000만', 10_000_000],
];
const MAX_PRICE = 1_000_000_000_000;

interface Props {
  guest: boolean;
  price: number;
  free: boolean;
  onPrice: (update: (p: number) => number) => void;
  onFree: (free: boolean) => void;
}

/** 가격 정하기: 회원은 버튼으로 올리고 무료 토글, 게스트는 무료 고정 */
export default function PricePicker({ guest, price, free, onPrice, onFree }: Props) {
  if (guest)
    return (
      <div className="mint-box">
        <div className="t">🎁 가격: 무료 나눔</div>
        <div className="s">게스트는 코인이 없어서 무료로만 나눌 수 있어요. 가입하면 1억 코인을 받고 꿈을 팔 수 있어요.</div>
      </div>
    );

  return (
    <div className="price-box">
      <div className="top">
        <span>가격</span>
        <button type="button" className={`free-toggle ${free ? 'on' : ''}`} onClick={() => onFree(!free)}>
          🎁 무료로 나눔
        </button>
      </div>
      <div className="price-val">{free ? '🎁 무료' : `${formatCoins(price)} 코인`}</div>
      {!free && (
        <div className="price-chips">
          {PRICE_STEPS.map(([label, v]) => (
            <button type="button" key={label} onClick={() => onPrice((p) => Math.min(MAX_PRICE, p + v))}>
              {label}
            </button>
          ))}
          <button type="button" className="reset" onClick={() => onPrice(() => 0)}>
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
