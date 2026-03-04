
# NLP2026 予定表 (非公式版)

スマホを意識したデザインの非公式のNLP2026 予定表です。

## 設定ファイル

```txt
src/constants/index.ts
src/locales/ja.ts
workshop.json
public/slack.json
```

`public/slack.json` は `session_id -> { team, channel_id }` の辞書形式です。

### 開発

```bash
wget https://www.anlp.jp/proceedings/annual_meeting/2026/ -O original_program.html
task -p

task dev
```

### GitHub Pages

- GitHub Actions の `CI` workflow で `main` への push 時に `dist/` をデプロイします
- リポジトリ設定の `Settings > Pages > Source` は `GitHub Actions` を選択してください
