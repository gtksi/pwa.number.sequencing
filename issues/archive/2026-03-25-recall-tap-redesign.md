# リコールフェーズの操作方式変更（ドラッグ → タップ）

## 概要
iOS/Androidでリコールフェーズの数字パネルのドラッグ操作が繰り返し失敗する問題に対し、根本的な解決策としてリコールフェーズの操作方式をドラッグからタップに変更しました。

## 背景
PixiJS v8 の `FederatedPointerEvent` ベースのドラッグ処理に以下の構造的問題が存在し、4回の修正を経ても安定しなかった：
- `EventSystem._onPointerMove` に `preventDefault()` がない
- Touch→Pointer 正規化時の `cancelable` プロパティ欠落
- `pointerId` によるイベント排他制御の信頼性不足

## 変更内容

### 新規ファイル: `src/components/RecallPhase.tsx`
React DOM コンポーネントとしてリコールフェーズを新規実装。`onClick` ベースのタップ操作で100%確実に動作。

### 変更: `src/components/GameCanvas.tsx`
recall フェーズのレンダリングとドラッグ処理を全削除（約170行削減）。memorize フェーズの数字表示アニメーションのみ残す。

### 変更: `src/App.tsx`
memorize フェーズ時に `GameCanvas`、recall フェーズ時に `RecallPhase` を表示するようルーティング変更。

### 変更: `src/App.css`
RecallPhase 用のスタイル（スロット、カード、アニメーション、レスポンシブ対応）追加。
