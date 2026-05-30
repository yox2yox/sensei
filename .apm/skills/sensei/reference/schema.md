# Plan スキーマ — リファレンス

`viewer/` バンドルが読み込む JSON ペイロードの仕様。アーキテクチャ図は [C4 モデル](https://c4model.com/) の `context / container / component / code` の 4 レイヤーで構成し、`glossary[].type` ごとに固定されたレイヤーに属する項目だけがそのレイヤーの図の source/target に登場できる。

## C4 レイヤーと glossary type

| レイヤー | type |
| --- | --- |
| `context` | `person`, `external-system` |
| `container` | `client`, `server`, `cloud-service`, `db` |
| `component` | `class`, `module` |
| `code` | `function`, `table`, `interface` |

`term` 型は廃止された。必要なレイヤーだけ図を書けばよく、4 枚すべて必須ではない。

## ふるまい仕様（Gherkin）— `Concern.behavior`（必須）

各関心領域（`pairs[]` = `Concern`）には Gherkin 記法のふるまい仕様 `behavior` を **必ず** 登録する。平文ではなく構造化 JSON で書き、viewer が Given/When/Then を色分けして整形表示する。実装計画ではこの振る舞いがそのまま **受け入れ条件（acceptance criteria）** になる。

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `feature` | ✓ | 機能名（Gherkin の `Feature:`）。1 行で。 |
| `description` | | `As a / I want / So that` 形式のナラティブ。 |
| `background.steps[]` | | 全 scenario 共通の前提（`Background:`）。 |
| `scenarios[]` | ✓ | シナリオ一覧（最低 1 件）。代表例＋エッジケースを網羅。 |
| `scenarios[].name` | ✓ | シナリオ名（`Scenario:`）。 |
| `scenarios[].tags[]` | | `@tag` 分類（先頭の `@` 不要）。 |
| `scenarios[].steps[]` | ✓ | ステップ群（最低 1 件、`then` を最低 1 つ含む）。 |
| `scenarios[].examples` | | Scenario Outline の `Examples` テーブル（`header` / `rows`）。 |
| `steps[].keyword` | ✓ | `given` / `when` / `then` / `and` / `but`（小文字）。 |
| `steps[].text` | ✓ | ステップ本文。glossary リンク・`<param>` 可。 |
| `steps[].table` | | Data Table（行配列、先頭行をヘッダ表示）。 |

参照整合性: 各 scenario は最低 1 つ `then` ステップを持つこと（`validate_plan.mjs` がチェックする）。

## スキーマ本体

機械可読な定義は [`plan.schema.json`](./plan.schema.json) を参照

## 検証方法

```bash
# 単体検証（exit 0=valid、exit 1=invalid を返す CLI）
node scripts/validate_plan.mjs path/to/plan.json

# HTML 生成（内部で validate_plan を呼ぶ）
node scripts/make_plan.mjs path/to/plan.json /abs/out/basename
```

## 完全な例

3 階層ネスト・両 state 入りの例（セッションベース認証 → JWT 移行）は、リポジトリルートの `plan-viewer/example.json` を参照。
