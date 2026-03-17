# 数字の記憶と操作ゲーム (Number Sequencing PWA)

ワーキングメモリー（WM）を鍛えるための、数唱課題（順唱・逆唱）および配列課題をベースとしたトレーニングアプリです。

## 🎮 ゲームのモード

1.  **順唱 (Forward Span)**: 表示された数字を「そのままの順番」で回答します。
2.  **逆唱 (Backward Span)**: 表示された数字を「最後から逆の順番」で回答します。
3.  **配列 (Sequencing)**: 表示された数字を「小さい順（昇順）」に並び替えて回答します。

## 🕹 プレイの流れ

1.  **記憶フェーズ**: 画面にランダムな数字が順番に表示されます。その数字と順番を覚えてください。
2.  **回答フェーズ**: モードに応じたルールで、数字カードをスロットにドラッグ＆ドロップしてください。
3.  **エラーレス学習**: 正解ではないカードを入れようとすると、端末が振動（対応デバイスのみ）し、カードが元の位置に戻ります。誤学習を防ぎ、正しい記憶痕跡を強化します。
4.  **動的難易度調整 (DDA)**: あなたの回答速度や正確さに合わせて、桁数、表示速度、ダミーカードの数が自動的に調整されます。進捗はモードごとに個別に記録されます。

## 🚀 技術スタック

-   **Frontend**: React + TypeScript
-   **Rendering**: PixiJS (WebGLによる滑らかなアニメーション)
-   **State Management**: Redux Toolkit
-   **Database**: IndexedDB (Dexie.js) - オフラインプレイ対応
-   **PWA**: Vite PWA Plugin
-   **CI/CD**: GitHub Actions (GitHub Pagesへの自動デプロイ)

## 🛠 実行方法

### ローカル開発環境のセットアップ

```bash
# 依存関係のインストール
npm install --legacy-peer-deps

# 開発サーバーの起動
npm run dev
```

### ビルドとプレビュー

```bash
# ビルド
npm run build

# プレビュー
npm run preview
```

### デプロイ

GitHub Actions が設定されているため、`main` ブランチにプッシュすると自動的に GitHub Pages にデプロイされます。

手動でデプロイする場合は以下のコマンドを使用します：
```bash
npm run deploy
```

## 📄 ライセンス

MIT License
