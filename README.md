
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
data_for_extraction/slack.json
```

`data_for_extraction/slack.json` は `task extract` で `data.json` に埋め込まれる Slack 設定です。
`public/slack.json` は後方互換のフォールバックとして `task extract` で自動生成されます。
どちらも `session_id -> { team, channel_id }` の辞書形式です。

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
  --venue "A=https://zoom.us/j/11111111111?pwd=aaaa" \
  --venue "B=https://zoom.us/j/22222222222?pwd=bbbb" \
  --session "B1=https://zoom.us/j/33333333333?pwd=cccc" \
  --workshop "WS1=https://zoom.us/j/55555555555?pwd=wwww" \
  --presentation "B1-1=https://zoom.us/j/44444444444?pwd=dddd"
```

`--workshop` は `WS1` のような親Workshopセッション向けです。  
WebUI上のリンク置換優先順位は `発表 > セッション > 部屋 > WS` です。

- 出力の1行目 `ZOOM_IMPORT_HASH=...` を `src/constants/index.ts` の `ZOOM_IMPORT_HASHES` に追加してください。  
- アプリ側は `SubtleCrypto (SHA-256)` で同じハッシュを再計算し、一致しない `#import_zoom_settings=` は拒否します。
    - 悪意のあるURLの誤入力を拒否するため
- 通常のインポート(`#import_settings=` )には現状危険性の有る要素はないので、任意データ受けつけ

## セキュリティ注意事項

- GitHub Pagesのようなサブディレクトリ運用を行う場合は、どのような運用上のリスクがあることを理解した上で行ってください
- **よくわからない場合は、このアプリ専用の独自ドメインで運用してください**

### 補足

- `localStorage` の保存領域は「パス単位」ではなく「オリジン（scheme + host + port）単位」です
- そのため、`https://<user>.github.io/<repo>/` のような運用では、同一オリジン上の別ページ/別アプリから読み書き可能です
- 別ページの内容によっては、localStorageの破損・漏洩・衝突・改ざんなどがありえます

## デプロイ例

### GitHub Pages

- GitHub Actions の `CI` workflow で `main` への push 時に `dist/` をデプロイします
- リポジトリ設定の `Settings > Pages > Source` は `GitHub Actions` を選択してください

## License

AGPL-3.0 license
