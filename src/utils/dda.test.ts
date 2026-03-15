import { expect, test } from 'vitest';
import { determineNextLevel } from './dda';

test('determineNextLevel', () => {
  // 履歴が足りない場合は維持
  expect(determineNextLevel('1.1', [100])).toBe('1.1');
  
  // スコアが高ければレベルアップ
  expect(determineNextLevel('1.1', [90, 95, 100])).toBe('1.2');
  
  // スコアが低ければレベルダウン
  expect(determineNextLevel('1.2', [40, 45, 40])).toBe('1.1');
  
  // スコアが中間なら維持
  expect(determineNextLevel('1.1', [70, 75, 80])).toBe('1.1');
});
