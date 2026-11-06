import { itemById } from '../data/shop';
import type { Save } from '../store';

/** 아바타 = 기본 이모지 + 모자 + 옷 뱃지 */
export function Avatar({ save, size = 1 }: { save: Save; size?: number }) {
  const hat = save.equipped.hat ? itemById(save.equipped.hat)?.emoji : undefined;
  const outfit = save.equipped.outfit ? itemById(save.equipped.outfit)?.emoji : undefined;
  return (
    <span className="avatar" style={{ fontSize: `${size}em` }}>
      {hat && <span className="avatar-hat">{hat}</span>}
      <span className="avatar-body">{save.avatar}</span>
      {outfit && <span className="avatar-outfit">{outfit}</span>}
    </span>
  );
}
