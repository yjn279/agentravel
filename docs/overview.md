# Agentravel - プロジェクト概要

## プロジェクト名

**Agentravel**（エージェントラベル）
- Agent（AI）× Travel

## コンセプト

旅行のインスピレーションを詳細な計画に落とし込むAIエージェントアプリケーション

「上海ディズニーに行きたい」のような漠然としたインスピレーションから、時系列で詳細な旅程を自動生成。

## ターゲットユーザー

**個人旅行者**
- 旅行計画を立てるのがめんどくさい
- 時間がない
- でもちゃんと計画を立てて行きたい

## コアバリュー

漠然としたインスピレーション → 詳細で美しい旅程へ自動変換

## 主要機能

### 入力
- テキスト入力（フリーテキスト1つの大きなエリア）
- 例: 「沖縄で3日間、ビーチと沖縄料理を楽しみたい。予算は5万円」

### 生成
- ストリーミング表示で段階的に旅程を生成（10-30秒程度）
- LLM（GPT-5）+ 軽い検証ロジック
  - 移動時間の物理的な妥当性（Google Distance Matrix API）

### 表示
- **タイムライン表示**: 何時から何時はどこで何をしているか一目でわかる
- **俯瞰ビュー**: 複数日の旅程を一覧
- **詳細ビュー**: ドリルダウンで各スポットの詳細を確認
  - メイン写真1枚（GPT-5生成）
  - スポット名
  - 滞在時間
  - 簡単な説明（2-3行）
  - クリックで詳細表示（写真、説明、地図ピン）

### 編集
- フル編集可能
  - スポットの削除・追加
  - 時間の手動調整
  - 順序の入れ替え
- 手動保存（保存ボタン）

### 保存・共有
- 認証なしMVP: 匿名ユーザーID自動発行（localStorage + DB）
- URL形式: `/users/{userid}/plans/{planid}`
- uuidv7でID生成
- URL共有（コピーボタン）

## 技術スタック

### フロントエンド
- TanstackStart

### AIオーケストレーション
- Mastra（LLMオーケストレーション）
- GPT-5（テキスト生成 + 画像生成統合）

### バックエンド
- Cloudflare Workers

### データベース
- Cloudflare D1（SQLite）

### パッケージ管理
- pnpm

### 外部API
- **GPT-5**: LLM + 画像生成
- **Google Distance Matrix API**: 移動時間計算（正確な距離・時間）
- **Web検索API**: スポット情報収集（選定中）

## MVPのスコープ

### Phase 0: セットアップ、接続確認
- TanstackStart プロジェクト作成
- Mastra セットアップ
- Cloudflare Workers + D1 セットアップ
- GPT-5 API接続確認
- Google Distance Matrix API接続確認

### Phase 1: エージェント構築（Mastra Playgroundで動作）
- メインエージェント実装
- 5つのサブエージェント実装
- ツール群実装
- Mastra Playground で End-to-End テスト

### Phase 2: UI含めたアプリ実装
- フロントエンド実装（TanstackStart）
- バックエンドAPI実装（Cloudflare Workers）
- DB統合（D1）
- デプロイ

**Phase 2までをMVPの必要十分条件とする**

## 除外する機能（MVP範囲外）

- 興味タグ
- 詰め込みすぎ警告
- 別案生成ボタン
- PDF出力
- カレンダーエクスポート
- 地図表示
- 画像API（Unsplash等）の利用
- 認証機能（Phase 3以降）

## 関連ドキュメント

- [ユーザージャーニー](./user-journey.md)
- [AIエージェントアーキテクチャ](./agent-architecture.md)
- [データベース設計](./database-schema.md)
- [開発計画](./development-plan.md)
