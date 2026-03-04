# データ構造仕様

## data.json

`extract.py` が生成する `data.json` のスキーマ定義と各フィールドの説明。  
データはリレーショナルDBに倣い正規化されており、人物・所属・セッション・発表をIDで相互参照する。

`extract.py` は `pydantic` を使って `data_for_extraction/workshop.json` の入力値と、
出力する `data.json` の最終構造を検証する。

ワークショップ (`WS1`〜`WS4`) については HTML からは抽出せず、
`data_for_extraction/workshop.json` を唯一のデータソースとして親セッション・個別セッション・個別発表を生成する。

### トップレベル構造

```json
{
  "generated_at":  "2026-03-05T01:44:12Z",
  "persons":       { "p0001": Person, ... },
  "affiliations":  { "a0001": Affiliation, ... },
  "rooms":         { "r0001": Room, ... },
  "sessions":      { "B1": Session, ... },
  "presentations": { "B1-1": Presentation, ... }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `generated_at` | `string \| null` | `data.json` の生成日時（UTC の ISO 8601 形式。例: `2026-03-05T01:44:12Z`） |
| `persons` | `Record<PersonId, Person>` | 人物マスタ。著者索引を正典とし、索引外の著者も含む |
| `affiliations` | `Record<AffiliationId, Affiliation>` | 所属機関マスタ |
| `rooms` | `Record<RoomId, Room>` | 会場マスタ |
| `sessions` | `Record<SessionId, Session>` | セッション（時間枠×会場） |
| `presentations` | `Record<PresentationId, Presentation>` | 発表（論文）エントリ |

各 `Record` のキーがそのままIDとして機能する（`persons["p0001"]` で O(1) 参照可能）。

### Person

```json
"p0001": { "name": "相澤 彰子" }
```

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | 氏名（フルネーム） |

**PersonId** は `p` + 4桁連番（例: `p0001`）。  
著者索引の掲載順に採番し、索引外の著者は末尾に追番する。

### Affiliation

```json
"a0001": { "name": "デンソーITラボ" }
```

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | 所属機関名（HTML記載の略称そのまま。例: `東大`, `NII`） |

**AffiliationId** は `a` + 4桁連番（例: `a0001`）。初出順に採番。  
所属が省略されている著者は `affiliation_id: null` となる（`Affiliation` エントリは作られない）。

### Room

```json
"r0001": { "name": "B会場(2F 大会議室201)" }
```

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | 会場名（例: `A会場(1F 大ホール(東))`） |

**RoomId** は `r` + 4桁連番（例: `r0001`）。初出順に採番。  
1つのセッションが複数会場を使う場合でも、`sessions[*].room_ids` から複数参照できる。

### Session

```json
"B1": {
  "title":            "B1:NLPモデルの評価・安全性・信頼性",
  "date":             "2026-03-10",
  "start_time":       "9:30",
  "end_time":         "11:00",
  "room_ids":         ["r0001"],
  "chair":            "大井 聖也 (科学大)",
  "presentation_ids": ["B1-1", "B1-2", "B1-3"]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string` | セッション名。IDを含む（例: `A1:口頭発表1`） |
| `date` | `string` | 開催日（`YYYY-MM-DD` 形式） |
| `start_time` | `string` | 開始時刻（`H:MM` 形式） |
| `end_time` | `string` | 終了時刻（`H:MM` 形式） |
| `room_ids` | `RoomId[]` | 会場IDのリスト。複数会場利用セッションでは複数要素を持つ |
| `chair` | `string` | 座長の氏名と所属（文字列のまま保持） |
| `presentation_ids` | `PresentationId[]` | このセッションで発表された論文IDのリスト（HTML記載順）。イベント系セッションでは空配列 |
| `url` | `string \| null`  | 一般の外部サイトURL |
| `youtube_url` | `string \| null`  | YouTube 配信URL |

> **口頭セッション（A1〜A9）の `presentation_ids`**  
> 口頭発表として登壇した論文（ホームセッションは別のポスターセッション）が列挙される。  
> `presentations[id].oral_session_id` でも同じ関係を逆引きできる。

> **ワークショップの手動補完**  
> `extract.py` は `data_for_extraction/workshop.json` を読み込み、`WS1` など親ワークショップセッション自体を生成する。   
> さらに `sessions` 配列を持たせると、`WS1-1` のような個別セッションを `sessions` に追加生成する。  
> 個別セッション内に `presentations` 配列を持たせると、対応する `presentations` / `persons` / `affiliations`
> も手動追加される。

#### SessionId の命名規則

| プレフィックス | 種別 | 例 |
|---|---|---|
| `A` | 口頭発表（A会場） | `A1`〜`A9` |
| `B` `C` `P` `Q` | ポスター発表 | `B1`〜`B9` など |
| `T` | チュートリアル | `T1`〜`T4` |
| `TS` | テーマセッション | `TS2`, `TS3`, `TS4` |
| `invited` | 招待講演 | `invited1`, `invited2` |
| `opening` | オープニング | `opening` |
| `closing` | クロージング | `closing` |
| `sponsor` | スポンサーミートアップ | `sponsor` |
| `reception` | 懇親会 | `reception` |
| `WS` | ワークショップ | `WS1`〜`WS4` |

ワークショップの個別セッションは `WS1-1`, `WS2-3` のように、
親ワークショップIDに連番を付けた形式を使う。

#### data_for_extraction/workshop.json

`extract.py --workshop-config data_for_extraction/workshop.json` で読み込む任意設定ファイル。
引数を省略した場合は読み込まない。`task extract` では `Taskfile.yml` からこのパスを明示的に渡す。

`data_for_extraction/workshop.json` は `pydantic` モデルで検証される。
未定義のキーは受け付けず、バリデーションエラー時は
`data_for_extraction/workshop.json.sessions[0].presentations[1].title` のようなパス付きで失敗箇所を表示する。

```json
{
  "WS2": {
    "title": "ワークショップ２：日本語言語資源の構築と利用性の向上",
    "date": "2026-03-13",
    "start_time": "10:05",
    "end_time": "15:45",
    "rooms": ["1F 大ホール(西)"],
    "url": "https://jedworkshop.github.io/JLR2026/",
    "sessions": [
      {
        "id": "WS2-1",
        "title": "WS2 午前＜1＞",
        "start_time": "10:05",
        "end_time": "11:45",
        "chair": "河原 大輔 (早稲田大)",
        "presentations": [
          {
            "id": "WS2-1-1",
            "title": "独自日本語Webコーパス構築のための巡回クロール基盤構築",
            "authors": [
              { "name": "石原 慧人", "affiliation": "SB Intuitions" }
            ]
          }
        ]
      }
    ]
  }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `WSn` | `object` | 親ワークショップ `WS1`〜`WS4` に対する上書き設定 |
| `title` | `string` | 親ワークショップのタイトル |
| `date` | `string` | 親ワークショップの開催日 (`YYYY-MM-DD`) |
| `start_time` | `string` | 親ワークショップの開始時刻 (`H:MM`) |
| `end_time` | `string` | 親ワークショップの終了時刻 (`H:MM`) |
| `rooms` | `string[]` | 親ワークショップの会場名。`data_for_extraction/original_program.html` と同じ表記で記述する |
| `chair` | `string` | 親ワークショップの座長 |
| `url` | `string` | 親ワークショップの一般URL |
| `youtube_url` | `string` | 親ワークショップの YouTube 配信URL |
| `sessions` | `object[]` | 個別セッションの追加定義 |

補足:

- トップレベルのキーは `WS1`, `WS2` のような `WS` + 数字のみ許可する
- 文字列フィールドに空文字列や空白のみは指定できない
- `rooms` は空配列にできない
- 親セッションの `start_time` / `end_time` は省略可能だが、指定する場合は `H:MM` 形式
- `date` は `YYYY-MM-DD` 形式

`sessions[*]` の各要素は以下を持つ。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 個別セッションID。`WS1-1` のように一意である必要がある |
| `title` | `string` | 個別セッション名 |
| `start_time` | `string` | 開始時刻 (`H:MM`) |
| `end_time` | `string` | 終了時刻 (`H:MM`) |
| `date` | `string` | 省略時は親ワークショップの `date` を継承 |
| `chair` | `string` | 省略可 |
| `rooms` | `string[]` | 省略時は親ワークショップの `rooms` を継承 |
| `url` | `string` | 省略時は親ワークショップの `url` を継承 |
| `youtube_url` | `string` | 省略時は親ワークショップの `youtube_url` を継承 |
| `presentations` | `object[]` | 個別発表の手動定義。定義時は `data.json.presentations` にも追加される |

補足:

- `start_time` / `end_time` は必須で、`H:MM` 形式
- `date`, `chair`, `rooms`, `url`, `youtube_url` は省略可能
- `rooms` を省略した場合は親ワークショップの `rooms` を継承する
- `presentations` を省略した場合は空配列として扱う

#### data_for_extraction/youtube.json

`extract.py --youtube-config data_for_extraction/youtube.json` で読み込む任意設定ファイル。
引数を省略した場合は読み込まない。`task extract` では `Taskfile.yml` からこのパスを明示的に渡す。

`data_for_extraction/youtube.json` は「`session_id -> youtube_url`」の辞書形式で、既存セッションに YouTube URL を付与する。
存在しないセッションIDを指定した場合はエラーにする。

```json
{
  "invited1": "https://www.youtube.com/@anlpyoutubechannel7888/streams",
  "invited2": "https://www.youtube.com/@anlpyoutubechannel7888/streams"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `キー` | `string` | 対象セッションID。例: `invited1` |
| `値` | `string` | 付与する YouTube 配信URL |

補足:

- `data_for_extraction/youtube.json` はオブジェクト形式
- 文字列フィールドに空文字列や空白のみは指定できない
- `task extract` では自動的に `data_for_extraction/youtube.json` も入力として扱う

`presentations[*]` の各要素は以下を持つ。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 発表ID。`WS2-1-1` のように一意である必要がある |
| `title` | `string` | 発表タイトル |
| `presenter` | `string` | 省略時は `authors[0].name` を発表者として使う |
| `is_english` | `boolean` | 省略時は `false` |
| `is_online` | `boolean` | 省略時は `false` |
| `pdf_url` | `string \| null` | 省略時は `null` |
| `authors` | `object[]` | 著者一覧。`persons` / `affiliations` に自動反映される |

#### data_for_extraction/invitedpapers.json

`extract.py --invitedpapers-config data_for_extraction/invitedpapers.json` で読み込む任意設定ファイル。
引数を省略した場合は読み込まない。`task extract` では `Taskfile.yml` からこのパスを明示的に渡す。

`data_for_extraction/invitedpapers.json` は `pydantic` モデルで検証される。
`invitedpapers` セッション自体の日時・会場・座長は HTML から取得し、
このファイルでは `invitedpapers` 配下の発表だけを補完する。

```json
[
  {
    "id": "invitedpapers-1",
    "title": "招待論文1（未定）",
    "authors": []
  },
  {
    "id": "invitedpapers-2",
    "title": "招待論文2（未定）",
    "authors": []
  },
  {
    "id": "invitedpapers-3",
    "title": "招待論文3（未定）",
    "authors": []
  }
]
```

各要素は `data_for_extraction/workshop.json` の `presentations[*]` と同じ形式で、以下を持つ。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 発表ID。`invitedpapers-1` のような形式で一意である必要がある |
| `title` | `string` | 発表タイトル |
| `presenter` | `string` | 省略時は `authors[0].name` を発表者として使う |
| `is_english` | `boolean` | 省略時は `false` |
| `is_online` | `boolean` | 省略時は `false` |
| `pdf_url` | `string \| null` | 省略時は `null` |
| `authors` | `object[]` | 著者一覧。`persons` / `affiliations` に自動反映される |

補足:

- `data_for_extraction/invitedpapers.json` は配列形式
- `id` は `invitedpapers-` + 数字の形式のみ許可する
- `task extract` では自動的に `data_for_extraction/invitedpapers.json` も入力として扱う

補足:

- `authors` を省略した場合は空配列として扱う
- `presenter` を省略した場合、`authors` が非空なら先頭著者を発表者にする

`presentations[*].authors[*]` の各要素は以下を持つ。

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | `string` | 著者名 |
| `affiliation` | `string` \| `null` | 所属。省略時は `null` として扱う |

### Presentation

```json
"B1-1": {
  "title":           "情報スペクトル理論に基づく大規模言語モデルの生成挙動解析",
  "session_id":      "B1",
  "presenter_id":    "p0820",
  "is_english":      false,
  "is_online":       false,
  "oral_session_id": "A2",
  "authors": [
    { "person_id": "p0820", "affiliation_id": "a0001" }
  ],
  "pdf_url": "/proceedings/annual_meeting/2026/pdf_dir/B1-1.pdf"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string` | 発表タイトル |
| `session_id` | `SessionId` | ホームセッション（掲載されているポスターセッション）のID |
| `presenter_id` | `PersonId \| null` | 発表者（HTML上で ○ が付いた著者、または特殊セッションの先頭講演者）の `PersonId`。取得できない場合は `null` |
| `is_english` | `boolean` | `true`: ◊ マークあり（英語での発表を予定） |
| `is_online` | `boolean` | `true`: 💻 マークあり（ポスターのオンライン発表を予定） |
| `oral_session_id` | `SessionId` &#124; 省略 | 対応する口頭発表セッションのID。口頭登壇がない場合はキー自体が存在しない |
| `authors` | `PresentationAuthor[]` | 著者リスト。HTML記載順（発表者が先頭とは限らない） |
| `pdf_url` | `string \| null` | 抄録PDFへのパス（サイトルート相対）。PDFリンクがないセッションは `null` |

#### PresentationAuthor

| フィールド | 型 | 説明 |
|---|---|---|
| `person_id` | `PersonId` | `persons` への参照 |
| `affiliation_id` | `AffiliationId` &#124; `null` | `affiliations` への参照。HTML上で所属が省略されている場合は `null` |

> **PresentationId の命名規則**  
> `{セッション記号}-{番号}` 形式（例: `B1-1`, `TS2-16`）。  
> 末尾 `J` は「自然言語処理」誌掲載論文のポスター発表（例: `Q6-1J`）。

> **所属 `null` について**  
> 著者行の記法 `○齋藤 幸史郎, 小池 隆斗 (科学大)` では、括弧内の所属が直前の著者のみに対応する。  
> 所属が書かれていない著者（`null`）は「前の著者と同所属」または「省略」の可能性がある。

### 参照関係まとめ

```txt
sessions[id].presentation_ids  →  presentations のキー
presentations[id].session_id   →  sessions のキー
presentations[id].oral_session_id → sessions のキー（A1〜A9）
presentations[id].presenter_id →  persons のキー
presentations[id].authors[].person_id      → persons のキー
presentations[id].authors[].affiliation_id → affiliations のキー
```
