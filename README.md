
# NLP2026 予定表 (非公式版)

スマホを意識したデザインの非公式のNLP2026 予定表です。

## 設定ファイル

```txt
src/constants/index.ts
src/locales/ja.ts
data_for_extraction/original_program.html
data_for_extraction/workshop.json
data_for_extraction/invitedpapers.json
public/slack.json
```

`public/slack.json` は `session_id -> { team, channel_id }` の辞書形式です。

`data_for_extraction/invitedpapers.json` は `invitedpapers` セッションに差し込む発表一覧です。

```json
[
  {
    "id": "invitedpapers-1",
    "title": "招待論文1（未定）",
    "pdf_url": "https://example.invalid/paper1.pdf",
    "authors": [
      { "name": "著者名1" },
      { "name": "著者名2", "affiliation": "所属名" }
    ]
  }
]
```

### 開発

```bash
wget https://www.anlp.jp/proceedings/annual_meeting/2026/ -O data_for_extraction/original_program.html
task -p

task dev
```

### GitHub Pages

- GitHub Actions の `CI` workflow で `main` への push 時に `dist/` をデプロイします
- リポジトリ設定の `Settings > Pages > Source` は `GitHub Actions` を選択してください
