# 数字の逆さま記憶ゲーム (Number Sequencing PWA)

ワーキングメモリー（WM）を鍛えるための、逆唱課題ベースのトレーニングアプリです。

## 🎮 ゲームの基本ルール

1.  **記憶フェーズ**: 画面にランダムな数字が順番に表示されます。その数字と順番を覚えてください。
2.  **回答フェーズ**: 覚えた数字を**「最後から逆の順番」**でスロットにドラッグ＆ドロップしてください。
    *   例: 「7 → 2 → 9」と表示された場合、「9 → 2 → 7」の順で入れます。
3.  **エラーレス学習**: 間違った数字を入れようとすると、カードが元の位置に戻ります。正しい記憶を定着させることを優先しています。
4.  **動的難易度調整 (DDA)**: あなたの回答速度や正確さに合わせて、桁数、表示速度、ダミーカードの数が自動的に調整されます。

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
