# 設定リファレンス

[English](config.md)

mbremote は、カレントプロジェクトの `config/setting.json` から既定値を読み込みます。別の設定ファイルを使うには `--config FILE` を指定します。設定キーは `snake_case` です。

コマンドラインオプションは、設定ファイルの値より優先されます。有効なキーでも、実行するコマンドに対応しないものは無視されます。未知のキーまたは型が異なる値はエラーです。

`mbremote config show` で、既定値と設定をマージした後の `language`、`board`、`firmware`、`base_firmware`、`port`、`timeout` を確認できます。パスはプロジェクトディレクトリから解決し、`timeout` は秒単位で表示します。

## 優先順位

| 優先順位 | 設定元 | 動作 |
| --- | --- | --- |
| 1 | コマンドラインオプション | 設定ファイルの値を上書きします。`--no-shared`、`--monitor`、`--no-monitor` も含みます。 |
| 2 | `--config FILE`、または省略時は `config/setting.json` | 選択したコマンドのプロジェクト既定値を設定します。 |
| 3 | 組み込みの既定値 | コマンドラインと設定ファイルのどちらにも値がない場合に使います。 |

```json
{
  "board": "v2",
  "language": "micropython",
  "firmware": "build/microbit.hex",
  "base_firmware": "firmware/custom-v2.hex",
  "shared": false,
  "port": "/dev/cu.usbmodem0000000000001",
  "timeout": 10
}
```

## ビルドとファームウェアのキー

| キー | 型 | 既定値 | 対象コマンド | CLI オプション | 説明 |
| --- | --- | --- | --- | --- | --- |
| `board` | `universal`、`v1`、`v2` の文字列 | `universal` | `build`、`run` | `--board` | 対象の micro:bit ボード。 |
| `language` | `micropython` または `picoruby` の文字列 | 入力から自動判別 | `build`、`run` | `--language` | ソース言語。 |
| `firmware` | 空でない文字列 | `build/microbit.hex` | `build`、`run`、`flash` | `--firmware` | `build` と `run` では生成する HEX のパス、`flash` では書き込む HEX のパス。 |
| `base_firmware` | 空でない文字列 | インストール済みの公式ベースファームウェア | `build`、`run` | `--base-firmware` | ベースとなる MicroPython HEX。`board` は `v1` または `v2` が必要です。PicoRuby では使えません。 |
| `shared` | 空でない文字列または `false` | 自動検出する `shared/` ディレクトリ | `build`、`run` | `--shared`、`--no-shared` | 共有 MicroPython モジュールのディレクトリ。`false` で共有モジュールを除外します。 |

## デバイスと実行のキー

| キー | 型 | 既定値 | 対象コマンド | CLI オプション | 説明 |
| --- | --- | --- | --- | --- | --- |
| `port` | 空でない文字列 | 自動選択したボード | `flash`、`run`、`repl`、`monitor`、`exec`、`reset`、`fs cp/cat/ls/rm` | `--port` | 対象 micro:bit のシリアルデバイスパス。 |
| `mount` | 空でない文字列 | 自動検出したマウント済みボリューム | `flash`、`run` | `--mount` | マウント済みの MICROBIT ボリューム。`mass_storage` を有効にします。 |
| `baud` | 正の整数 | `115200` | `run`、`repl`、`monitor`、`exec`、`reset`、`fs cp/cat/ls/rm` | `--baud` | シリアル通信速度。 |
| `timeout` | 秒単位の正の整数 | `10` | `run`、`exec`、`reset`、`fs cp/cat/ls/rm` | `--timeout` | `run` では書き込み後のシリアルポートを待ちます。`exec`、`reset`、`fs` では各 MicroPython REPL 応答を待ちます。ビルド、書き込み、プログラム、モニターの時間は制限しません。 |
| `monitor` | 真偽値 | `true` | `run` | `--monitor`、`--no-monitor` | 1台に対する `run` 後にシリアルモニターを開くかどうか。`run --all` では開きません。 |
| `mass_storage` | 真偽値 | `false` | `flash`、`run` | `--mass-storage` | DAPLink USB の代わりに、マウント済み MICROBIT ボリュームへ HEX をコピーします。 |
| `all` | 真偽値 | `false` | `flash`、`run` | `--all` | 検出したすべてのボードへ書き込みます。2台以上が必要です。 |
| `force` | 真偽値 | `false` | `flash`、`run` | `--force` | DAPLink USB による完全書き込みを強制します。 |

## 補足

- `mbremote setup` は、既存の設定を上書きせず空の `config/setting.json` を作成し、公式ベースファームウェアを `firmware/` へダウンロードします。
- `mbremote build clean`、`mbremote ports`、その他の一部コマンドはプロジェクト設定を使用しません。
- `fs` はフラット構造の MicroPython ファイルシステムを使います。一覧にはパスなしの `fs ls`、ボード上のファイルには `:message.txt` のような `:` 接頭辞を指定します。ディレクトリは未対応です。
- `--config FILE` はコマンドライン専用であり、設定キーではありません。
- 全コマンドの構文は `mbremote --help`、コマンド固有の構文とオプションは `mbremote <command> --help` で確認できます。
