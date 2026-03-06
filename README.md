
# NLP2026 予定表 (非公式版)

スマホを意識したデザインの非公式のNLP2026 予定表です。

![Screenshot](screenshot.avif)

## 設定ファイル

```txt
.env
src/constants/index.ts
src/locales/ja.ts
data_for_extraction/original_program.html
data_for_extraction/workshop.json
data_for_extraction/invitedpapers.json
data_for_extraction/youtube.json
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

## 開発

1. [mise](https://mise.jdx.dev/getting-started.html)をインストール
2. `mise trust mise.toml`
3. 開発

    ```bash
    wget https://www.anlp.jp/proceedings/annual_meeting/2026/ -O data_for_extraction/original_program.html
    task -p

    task dev
    ```

4. ビルドテスト

    ```bash
    task build
    task preview
    ```

## Zoom インポートURL生成CLI

`#import_zoom_settings=` 付きの URL を生成できます。

```bash
pnpm run create:import-zoom-settings-url -- \
  --base-url "https://example.github.io/nlp2026/" \
  --a-url "https://zoom.us/j/11111111111?pwd=aaaa" \
  --b-url "https://zoom.us/j/22222222222?pwd=bbbb"
```

出力の1行目 `ZOOM_IMPORT_HASH=...` を `src/constants/index.ts` の `ZOOM_IMPORT_HASHES` に追加してください。  
アプリ側は `SubtleCrypto (SHA-256)` で同じハッシュを再計算し、一致しない `#import_zoom_settings=` は拒否します。

## GitHub Pages

- GitHub Actions の `CI` workflow で `main` への push 時に `dist/` をデプロイします
- リポジトリ設定の `Settings > Pages > Source` は `GitHub Actions` を選択してください

## License

AGPL-3.0 license
