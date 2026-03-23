# モバイルタッチドラッグ不具合の根本修正

## 概要
モバイル端末（Android, iOS）においてリコールフェーズの数字パネルがタッチ操作でドラッグできない不具合を修正しました。
過去2回の修正（キャッシュ更新、イベントターゲット変更）では解消せず、**PixiJS v8 の EventSystem ソースコードの精読**により根本原因を特定しました。

## 原因
PixiJS v8（v8.17.0）の `EventSystem.js` を精読した結果、以下の根本原因が判明しました。

1. **PixiJS の `_onPointerMove` でネイティブの `preventDefault()` が呼ばれない**
   `_onPointerDown` では `autoPreventDefault: true` 設定に基づき `nativeEvent.preventDefault()` を実行するが、`_onPointerMove` にはその処理が一切なく、指を動かした瞬間にモバイルブラウザが「ページのスクロール/パン操作」として認識してしまう。
   その結果、ブラウザが `pointercancel` イベントを発行しPixiJSのドラッグ追跡が強制中断される。

2. **CSS `touch-action: none` の適用範囲**
   PixiJSは内部でcanvas要素に `touch-action: none` を設定するが、iOS Safari等ではページの階層構造に起因して親要素のスクロールコンテキストが残っている場合にこれが無視されることがある。

## 修正内容

### `src/components/GameCanvas.tsx`
- PixiJSが生成する `<canvas>` 要素に対し、ネイティブの `touchmove` と `touchstart` イベントリスナーを `{ passive: false }` で直接登録し、`e.preventDefault()` を呼び出すようにした。
  → これによりブラウザレベルでスクロール/パンの判定を**完全にブロック**し、`pointercancel` の発行を防止する。
- ドラッグ時のムーブイベントを `pointermove` → `globalpointermove` に修正（PixiJS v8 では `pointermove` はオブジェクト直上でしか発火しないため、指がカードの外に出るとドラッグが止まる問題があった）。

### `src/App.css`
- `html, body` に `touch-action: none` を追加し、ページルートから多重防御を構築。
