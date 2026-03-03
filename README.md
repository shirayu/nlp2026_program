
# NLP2026 非公式版 予定表

スマホを意識したデザインのNLP2026 非公式版 予定表です。

## 設定ファイル

```txt
src/constants/index.ts
src/locales/ja.ts
workshop.json
```

### 開発

```bash
wget https://www.anlp.jp/proceedings/annual_meeting/2026/ -O original_program.html
task -p

task dev
```

### GitHub Pages

- GitHub Actions の `CI` workflow で `main` への push 時に `dist/` をデプロイします
- リポジトリ設定の `Settings > Pages > Source` は `GitHub Actions` を選択してください
