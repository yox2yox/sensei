# plan-viewer

AIが生成した実装プランのJSONをビジュアルに表示する静的Webアプリです。viewerは [C4 モデル](https://c4model.com/) に沿って構成要素を `Context / Container / Component / Code` の4レイヤーに整理し、必要なレイヤーごとにアーキテクチャ図を描画します。

## セットアップ

```bash
npm install
npm run dev       # 開発サーバー起動
npm run build     # dist/ に静的ファイルをビルド
npm run preview   # ビルド成果物をプレビュー
npm run typecheck # TypeScript 型チェック
npm test          # ユニットテスト実行
```

## プランの渡し方

URLクエリパラメータ `?plan=<base64エンコードJSON>` でJSONを渡します。
`fetch` 不要・`file://` プロトコルでも動作します。

### エンコード方法

```js
const json = JSON.stringify(plan)
const encoded = btoa(unescape(encodeURIComponent(json)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '')
const url = `http://localhost:4173/?plan=${encoded}`
```

### サンプル

`example.json` は C4 モデルに沿った認証システム刷新プランの実例です。`context / container / component / code` の 4 レイヤーすべてに図が含まれ、各レイヤーは glossary type の制約に従っています。

開発サーバーで確認する場合は `npm run dev` または `npm run preview` を起動し、上記のエンコード方法で `plan-viewer/example.json` を `?plan=` に渡してください。自己完結 HTML を作る場合は `.apm/skills/sensei/scripts/make_plan.mjs` を使います。

## URL長制限の注意

URLの最大長はブラウザ・サーバーによって異なりますが、一般的に **2,000〜8,000文字** 程度が安全な上限です。大きなプランJSONでは `base64` エンコード後のURLが長くなります（JSON 3KB → base64 約4KB）。10KB超のJSONは別途ファイル配信を検討してください。

## C4 レイヤーと glossary type の対応

各 glossary item は `type` でレイヤーが一意に決まります。

| C4 レイヤー | 含まれる type | 用途 |
| --- | --- | --- |
| `context` | `person`, `external-system` | システムを取り巻く人や外部システム |
| `container` | `client`, `server`, `cloud-service`, `db` | アプリ・サーバー・DB などデプロイ単位 |
| `component` | `class`, `module` | コンテナ内の構成要素 |
| `code` | `function`, `table`, `interface` | コード詳細 |

アーキテクチャ図は state ごとに `architectureDiagrams.{context|container|component|code}` の最大4枚を持てます。すべてが必須ではなく、必要なレイヤーだけ書けば十分です。各レイヤーの `edges` の source / target には、**そのレイヤーに対応する type を持つ glossary** しか指定できません（違反すると viewer はロード時にエラーを表示します）。

**各 pair は最低 2 つの C4 レイヤーをまたぐ必要があります** (apm validator が機械的にチェックします)。Container だけ・Code だけのような単一レイヤーで閉じる pair はエラーになります。アーキテクチャ図がまったく無い説明だけの pair (`safeguards` と `takeaway` のみ) は例外として許容されます。

`pair.workflowPosition` (任意フィールド) で、その pair が end-to-end フロー上のどの工程かを短く書けます。viewer がタイトル横にバッジで表示するので、読者は局所改修ペアを読んでも「全体のどこの話か」を即座に把握できます。

scene の `action` / `result` や各種 `takeaway` に「— 例えるとこれは ◯◯ にあたる」のような比喩補足を書くと、viewer は em-dash 以降を薄い色 (`text-gray-500`) で描画し、本文と比喩を視覚的に分けます。

## JSONスキーマ

```jsonc
{
  "title": "プランタイトル",
  "description": "概要説明",
  "metaphor": {
    "title": "ホテルの受付と部屋キー",
    "description": "全体をどういう現実世界のたとえで読むか"
  },
  "takeaway": "ひと言で持ち帰る本質",
  "glossary": [
    {
      "id": "unique-id",
      "type":
        // Context layer
        "person" | "external-system" |
        // Container layer
        "client" | "server" | "cloud-service" | "db" |
        // Component layer
        "class" | "module" |
        // Code layer
        "function" | "table" | "interface",
      "name": "表示名",
      "description": "説明文",
      "icon": "🔐",                 // type 別デフォルトを表示するため省略可
      "parentId": "parent-id",       // 省略可。親アイテムのidを指定すると階層構造で表示（最大3階層まで）
      "analogy": "チェックインカウンター", // 省略可。メタファー内での姿
      "responsibility": "本人確認をして鍵を渡す", // 省略可。担当
      "evidence": [
        { "path": "src/file.ts", "startLine": 10, "endLine": 20, "label": "主な実装" }
      ]
    }
  ],
  "pairs": [
    {
      "title": "ペアのタイトル",            // 必須。空文字はヘッダ非表示
      "workflowPosition": "全体俯瞰",       // 省略可。end-to-end フロー上の工程をひと言で。viewer はタイトル横にバッジ表示
      "examples": [
        {
          "title": "例のタイトル",          // 必須
          "condition": "想定する状況",      // 省略可
          "currentState": {                 // 省略可
            "storyTitle": "現状の時系列ストーリー",
            "scenes": [
              {
                "title": "場面1: 受付係が依頼を受ける",
                "actor": "unique-id",       // glossary id
                "action": "誰が何をするか",
                "result": "その結果どうなるか",
                "edgeRefs": [1],            // この state 内の order を指す（layer 横断）
                "evidence": [...]
              }
            ],
            "takeaway": "この状態をひと言で",
            "architectureDiagrams": {
              // 必要なレイヤーだけ書けばよい（4枚すべて必須ではない）
              "context":   { "edges": [...] },
              "container": { "edges": [...] },
              "component": { "edges": [...] },
              "code":      { "edges": [...] }
              // 各 edges: { order, source, target, label, data, ... }
              // 各 layer の source/target は、そのレイヤーに対応する type の glossary のみ
            }
          },
          "proposedState": {                // 変更後。currentState と同じ構造
            "architectureDiagrams": { ... }
          }
        }
      ],
      "safeguards": ["細かいけど大事な防御や制約"],
      "takeaway": "この章をひと言で"
    }
  ]
}
```

`architectureDiagrams.{layer}.edges` はそのレイヤーのアーキテクチャ図の矢印です。`order` は **state 内で一意の連番** で、`1` から始めて全レイヤー合計で 1..N となるように振ります。`scenes[].edgeRefs` は layer をまたいで同じ番号空間を参照できます。

`glossary[].type` は曖昧な「機能」ではなく、C4 モデルの構造的レイヤーを指定します。**`term` 型は廃止されました。** どのレイヤーにも当てはまらない抽象概念は、`interface`（Code レイヤーの型定義）か、metaphor / pair の takeaway として表現することを推奨します。

### 説明文内の glossary リンク

説明用の文字列フィールドでは、glossary の項目を参照するリンク風テキストを埋め込めます。構文は次の完全一致のみです。

```html
<a href="#glossary:unique-id">表示ラベル</a>
```

`unique-id` は同じ plan 内の `glossary[].id` と完全一致する必要があります。クリックしてもページ内ジャンプや glossary カードへのスクロールは行わず、クリックまたはマウスをかざすと対象 glossary の概要をカード型チップとして表示します。クリックで表示したチップは右上の閉じるボタンを押すまで残り、ホバーで表示したチップはマウスが離れると消えます。存在しない ID や空 ID はリンクにならず、表示ラベルだけが通常のテキストとして表示されます。

安全のため、対応するのは小文字の `a`、小文字の `href`、ダブルクォート、`#glossary:` 接頭辞、対応する `</a>` を持つ構文だけです。その他の HTML や壊れた anchor は文字列としてそのまま表示され、ラベル内の `<` や `>` も HTML として解釈されません。

対象フィールドは、ヘッダーやペア、状態、ナラティブ、glossary カードなどの説明文全般です。具体的には `description` / `takeaway`、`metaphor.description`、`scenes[].title|action|result`、`pairs[].safeguards[]`、`glossary[].description|analogy|responsibility` で利用できます。`edges[].label` / `edges[].data` は現時点では対象外です。

`scenes` は読者向けの設計説明です。`edgeRefs` で対応するアーキテクチャ図の矢印番号（state 内で一意）を指定すると、文章と図がつながります。`safeguards` は「なぜ単純な置き換えだけでは足りないか」や防御設計の説明に使います。

**ペアを分けるべき目安**: 単一ステートでアーキテクチャ図全体（4 レイヤー合計）が 12 本以上、または関係するノードが 12 個以上、もしくは独立した複数の設計観点（認証境界 / API 境界 / 永続化境界など）を扱う場合は `pairs` に分割するとアーキテクチャ図が読みやすく保てます。アーキテクチャ図で説明する必要がない観点は、図を作らず説明文・safeguards だけにしてください。
