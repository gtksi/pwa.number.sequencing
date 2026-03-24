# 2回目以降のドラッグ不具合修正

## 概要
モバイル端末（Android, iOS）において、リコールフェーズの数字パネルの1回目のドラッグは成功するが、2回目以降のドラッグが一切反応しなくなる不具合を修正しました。

## 原因
PixiJS v8 のイベントリスナーと `pointerId` による排他制御に起因するリスナーリーク。

`onDragEnd` の先頭で `if (e.pointerId !== draggingPointerId) return;` としているが、モバイルブラウザでは以下のシナリオで `pointerId` のミスマッチが生じ、早期 return してしまう：
- ブラウザが `pointercancel` → `pointerup` の順で発行し、それぞれ異なる `pointerId` を持つ場合
- タッチの接触・離脱が高速で行われ、ブラウザ内部でポインターIDが再割り当てされる場合

この結果、`app.stage` に登録されたドラッグ関連リスナー（`globalpointermove`, `pointerup` 等）が解除されずに残留し、2回目以降のドラッグに干渉。`dragging = true` のままスタックするため、次のカードの `pointerdown` も `if (dragging) return;` でブロックされていた。

## 修正内容

### `src/components/GameCanvas.tsx`
1. **`pointerId` チェックの完全削除** — `onDragMove`, `onDragEnd` から `pointerId` による排他制御を除去。本アプリはシングルタッチ操作のみのため不要。
2. **`cleanupDragListeners()` 関数の導出** — 4つの `app.stage.off()` 呼び出しを独立関数化し、全ての終了パスで確実に呼ばれるようにした。
3. **`pointerdown` での安全弁** — `pointerdown` ハンドラの先頭で、もし前回のドラッグ状態が残っていた場合に強制クリーンアップしてからドラッグを開始するように変更。従来の `if (dragging) return;`（無視）ではなく、`if (dragging) { cleanup(); reset(); }`（回復）とした。
