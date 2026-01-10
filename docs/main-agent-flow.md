# メインエージェントフロー

メインエージェントの詳細な動作フローと会話例。

## 基本フロー

```typescript
async function mainAgent(userInput: string) {
  const memory = initializeMemory();
  const tools = [
    call_flight_search,
    call_accommodation_search,
    call_spot_search,
    call_gourmet_search,
    call_routing_optimization,
    web_search,
    calculate_distance,
    save_to_db
  ];

  while (!isTaskComplete(memory)) {
    // 1. Thought: メモリを分析して次のアクションを決定
    const thought = llm.think({
      memory: memory,
      available_tools: tools,
      system_prompt: MAIN_AGENT_PROMPT
    });

    // 2. Action: ツール呼び出し（並列可能な場合は並列実行）
    const actions = parseActions(thought);
    const results = await executeActions(actions, { parallel: true });

    // 3. Observation: 結果をメモリに記録
    memory.addObservation(results);

    // エラーハンドリング
    if (hasErrors(results)) {
      handleErrors(results, memory);
    }
  }

  return memory.getFinalPlan();
}
```

## 詳細な会話フロー例

### 初期入力〜フライト検索

```
=== ユーザー入力 ===
ユーザー: "上海ディズニーに行きたい"

[Thought 1]
目的: 上海ディズニー（明確）
不足情報: 時期、期間、出発地
→ 自然に情報を引き出す質問を生成

[Action 1]
respond_to_user("いいですね！いつ頃、何日間を考えていますか？出発地はどちらですか？")

=== ユーザー応答 ===
ユーザー: "1月に3泊4日で、東京から"

[Thought 2]
収集した情報:
  - 目的地: 上海
  - 時期: 1月
  - 期間: 3泊4日
  - 出発地: 東京
全情報揃った → フライト検索を実行
（仕様: 即座に呼び出し）

[Action 2]
call_flight_search({
  origin: "東京",
  destination: "上海",
  month: "1月",
  duration: "3泊4日"
})

[Observation 2]
フライト検索結果:
  Option 1: 1/17-20, ANA, ¥35,000
  Option 2: 1/20-23, JAL, ¥38,000
  Option 3: 1/24-27, ANA, ¥32,000

[Thought 3]
3つのオプションが見つかった
→ ユーザーに提示

[Action 3]
respond_to_user("以下のフライトが見つかりました：
1. 1/17-20, ANA, ¥35,000
2. 1/20-23, JAL, ¥38,000
3. 1/24-27, ANA, ¥32,000
どれがいいですか？")
```

### 日別コンセプト〜ホテル検索

```
=== ユーザー応答 ===
ユーザー: "1番で"

[Thought 4]
フライト確定: 1/17-20
次: 日別コンセプトの決定（手順7）
→ メインエージェントで推論

[Action 4]
think_daily_concept({
  destination: "上海",
  duration: "3泊4日",
  main_goal: "ディズニー"
})

[Observation 4]
日別コンセプト:
  Day 1 (1/17): 外灘（到着日、軽め）
  Day 2 (1/18): 豫園（文化体験）
  Day 3 (1/19): ディズニー（メイン）
  Day 4 (1/20): 外灘（帰国日、買い物）

[Thought 5]
日別コンセプト決定
次: 宿泊検索（手順8）
→ サブエージェント呼び出し

[Action 5]
call_accommodation_search({
  destination: "上海",
  dates: "1/17-20",
  daily_plan: {
    day1: "外灘",
    day2: "豫園",
    day3: "ディズニー",
    day4: "外灘"
  }
})

[Observation 5]
ホテル提案: 上海外灘ホテル（外灘エリア、¥15,000/泊）

[Thought 6]
ホテル決定
ユーザーに確認
```

### Day 1詳細計画（並列実行）

```
[Thought 7]
大枠（フライト・ホテル）確定
次: 各日の詳細計画
Day 1から順に処理

[Action 7 - 並列実行]
// Day 1の観光とグルメを並列で検索
await Promise.all([
  call_spot_search({
    day: 1,
    area: "外灘",
    theme: "到着日、軽め"
  }),
  call_gourmet_search({
    day: 1,
    area: "外灘",
    meal_types: ["dinner"]
  })
])

[Observation 7]
Day 1スポット:
  - 外灘（2時間）
  - 南京東路（1時間）
Day 1グルメ:
  - 外灘レストランX（夕食）

[Thought 8]
Day 1のスポットとグルメ決定
→ ルート最適化

[Action 8]
call_routing_optimization({
  day: 1,
  hotel: { name: "上海外灘ホテル", ... },
  spots: [
    { name: "外灘", duration_minutes: 120, ... },
    { name: "南京東路", duration_minutes: 60, ... }
  ],
  restaurants: [
    { name: "外灘レストランX", meal_type: "dinner", ... }
  ]
})

[Observation 8]
Day 1スケジュール:
  15:00-15:30 ホテルチェックイン
  16:00-18:00 外灘散策
  18:15-19:15 南京東路
  19:30-21:00 夕食（外灘レストランX）
  Total: 6時間 → OK

[Thought 9]
Day 1完了。Day 2へ
（以降、Day 2, 3, 4を同様に処理）
```

### 検証と調整（手順13）

```
[Thought 13]
全日程のスケジュール生成完了

Day 1: 6時間 → OK
Day 2: 9時間 → OK
Day 3: 12時間 → 詰め込みすぎ！
Day 4: 5時間 → OK

Day 3が12時間で詰め込みすぎ
→ 調整が必要

[Action 13]
analyze_adjustment_options({
  day: 3,
  issue: "overcrowded",
  total_hours: 12,
  threshold: 10
})

[Observation 13]
Day 3の内容:
  09:00-21:00 ディズニーランド（12時間）
  19:00-20:30 ディズニー内レストラン

調整案:
  オプション1: ディズニーの滞在時間を10時間に短縮（9:00-19:00）
  オプション2: ディズニー内レストランをスキップし、簡易食事に変更

[Thought 14]
調整案をユーザーに提示
（仕様: 後ろの手順から提案）

[Action 14]
respond_to_user("Day 3が少し詰め込み気味です。以下のどちらかで調整しませんか？
1. ディズニーの滞在時間を10時間に短縮（9:00-19:00）
2. ディズニー内レストランでの食事時間を短縮（簡易食事に変更）
どちらがいいですか？もしくは、このままでも大丈夫ですか？")

=== ユーザー応答 ===
ユーザー: "1で"

[Thought 15]
調整実施: Day 3のスケジュールを更新
全スケジュール確定
→ DB保存

[Action 15]
update_schedule({ day: 3, adjustment: "reduce_hours" })
save_to_db(finalPlan)

[Observation 15]
Day 3更新完了
プラン保存完了: plan_id = "xyz123"

[Thought 16]
タスク完了

[Action 16]
respond_to_user("旅程が完成しました！
/users/user_abc/plans/xyz123 で確認できます。
素敵な旅行をお楽しみください！")
```

## エラーハンドリングの例

### フライトが見つからない場合

```
[Observation 2]
エラー: 1月17-20のフライトが見つかりませんでした

[Thought 3]
エラー対応: 別の日程を自動検索
（仕様: パターンB - 自動で別日程を試す）

[Action 3]
call_flight_search({
  origin: "東京",
  destination: "上海",
  month: "1月",
  duration: "3泊4日",
  flexible_dates: true  // 柔軟な日程で再検索
})

[Observation 3]
代替フライト:
  Option 1: 1/20-23, JAL, ¥38,000
  Option 2: 1/24-27, ANA, ¥32,000

[Thought 4]
代替案が見つかった
→ ユーザーに提案

[Action 4]
respond_to_user("1/17-20のフライトは満席でしたが、以下の日程が空いています：
1. 1/20-23, JAL, ¥38,000
2. 1/24-27, ANA, ¥32,000
どちらかでいかがですか？")
```

### サブエージェントがタイムアウトした場合

```
[Observation 6]
エラー: spot_search タイムアウト（30秒）

[Thought 7]
サブエージェント失敗
→ リトライ（1回のみ）

[Action 7]
call_spot_search({
  day: 1,
  area: "外灘",
  theme: "到着日、軽め",
  retry: true
})

[Observation 7]
（リトライ成功 or 失敗）

If 失敗:
  [Thought 8]
  2回失敗
  → ユーザーに報告、スキップして次へ

  [Action 8]
  respond_to_user("申し訳ありません。Day 1の観光スポット検索でエラーが発生しました。
  後で手動で追加していただけますか？先にDay 2以降を作成します。")
```

## 手戻りの処理

### Layer 2内での調整（通常ケース）

```
[Thought]
Day 3が詰め込みすぎ
→ まず手順12（スケジュール）で調整を試みる
→ ダメなら手順10（グルメ）→ 手順9（観光）と戻る

優先順位:
  1. 手順12: 滞在時間削減
  2. 手順10: レストラン変更
  3. 手順9: スポット削除
  4. 手順7: 日別計画見直し（稀）
```

### Layer 1への手戻り（ほぼない）

```
現実的にはLayer 1（フライト・ホテル）への手戻りはない
→ すでに予約済みの想定

もし必要な場合:
  ユーザーに明示的に確認
  「フライトから見直しますか？」
```

## ReAct実装の参考資料

- [HuggingFace - ReAct Agents](https://huggingface.co/docs/smolagents/conceptual_guides/react)
- Mastraドキュメント（実装時に参照）

## 関連ドキュメント

- [AIエージェントアーキテクチャ](./agent-architecture.md)
- [状態管理](./state-management.md)
- [サブエージェント仕様](./subagent-specifications.md)
