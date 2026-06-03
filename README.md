# Map App (Spring Boot)

シンプルな Spring Boot アプリケーション。Leaflet と OpenStreetMap を使用して地図を表示します。

## 実行方法

```bash
mvn spring-boot:run
```

ブラウザで `http://localhost:8080/` にアクセスします。

## ホットデプロイ

Spring Boot DevTools が有効です。Java ファイルやテンプレート（HTML）を保存すると自動的に再起動します。

### IDE 設定（ホットリロード有効化）

**VS Code:**
1. ファイル → オートセーブ を有効にする（`files.autoSave: onFocusChange`）
2. または、ファイル保存時に自動コンパイルされるよう IDE 設定を確認

**IntelliJ IDEA:**
1. Settings → Build, Execution, Deployment → Compiler
2. "Build project automatically" チェック有効
3. "Allow auto-make to start even if developed application is currently running" チェック有効
