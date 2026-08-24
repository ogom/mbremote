# mbremote CLI リファレンス

[English](README.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote は、BBC micro:bit 向けの MicroPython / PicoRuby プロジェクトをビルドし、書き込み、調べるための CLI です。

## 動作要件

- Node.js 20以降（npmを含む）。
- MicroPython プロジェクトでは、`mbremote setup` が公式 V1/V2 ベースファームウェアをダウンロードします。追加のビルドツールは不要です。
- PicoRuby プロジェクトでは、Git、Rake を含む Ruby、GNU Make、CMake、Arm GNU Toolchain も必要です。初回ビルド時に、固定した PicoRuby と micro:bit V2 のソースをダウンロードします。
- DAPLink USB を使用するには、`usb` npm 依存パッケージのビルド済みバイナリがない環境で、プラットフォームの libusb 開発パッケージが必要になることがあります。

## インストールとプロジェクトのセットアップ

```sh
npm install --global mbremote
cd my-microbit-project
mbremote setup
```

`setup` は、公式ベースファームウェアをプロジェクトの `firmware/` ディレクトリにダウンロードし、存在しない場合だけ `config/setting.json` を作成します。

## コマンド構文

```text
mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--no-monitor]
mbremote setup
mbremote repl [--port PORT]
mbremote monitor [--port PORT]
mbremote fs ls [--port PORT]
mbremote ports
```

| コマンド | 説明 |
| --- | --- |
| `build` | プロジェクトをビルドします。既定では Universal HEX を生成します。単体の `.py` ファイルは、ボード上の `main.py` になります。 |
| `build clean` | プロジェクトの生成済み `build/` ディレクトリを削除します。 |
| `flash` | DAPLink USB またはマウント済み MICROBIT ボリュームで HEX を書き込みます。`--firmware` を省略した場合は `build/microbit.hex` を使います。 |
| `run` | ビルド、書き込みの後、`--no-monitor` がなければシリアルモニターを開きます。 |
| `setup` | プロジェクト設定を作成し、公式ベースファームウェアをダウンロードします。 |
| `repl` | MicroPython REPL を開きます。 |
| `monitor` | シリアルモニターを開きます。 |
| `fs ls` | 接続したボード上のファイルを一覧表示します。 |
| `ports` | 検出した micro:bit のシリアルポートを一覧表示します。 |

対話式のシリアルコマンドは `Ctrl-]` で終了します。

## オプション

| オプション | 説明 |
| --- | --- |
| `--config FILE` | 別の設定ファイルから既定値を読み込みます。 |
| `--firmware HEX` | `build` と `run` では生成する HEX のパス、`flash` では書き込む HEX のパスです。既定値は `build/microbit.hex` です。 |
| `--base-firmware HEX` | ボードを限定した `build` または `run` のための MicroPython ベース HEX です。PicoRuby では使えません。 |
| `--board BOARD` | `universal`、`v1`、`v2`。既定値は `universal` です。 |
| `--language LANG` | `micropython` または `picoruby`。既定では入力から自動判別します。 |
| `--shared DIR`、`--no-shared` | 自動検出する共有 MicroPython モジュールを選択または無効にします。 |
| `--port PORT` | シリアルデバイスパスを選択します。 |
| `--baud RATE` | シリアル通信速度。既定値は `115200` です。 |
| `--timeout SEC` | 秒単位のデバイス待機時間。既定値は `10` です。 |
| `--mass-storage` | DAPLink USB の代わりに、マウント済み MICROBIT ボリュームへ HEX をコピーします。 |
| `--mount DIR` | マウント済み MICROBIT ボリュームを指定し、mass-storage 方式を有効にします。 |
| `--all` | 検出したすべてのボードへ書き込みます。2台以上が必要です。 |
| `--force` | DAPLink USB による完全書き込みを強制します。 |
| `--no-monitor` | `run` 後にシリアルモニターを開きません。 |
| `-h`、`--help` | ヘルプを表示します。 |
| `-V`、`--version` | インストール済みのバージョンを表示します。 |

コマンドラインオプションは設定ファイルより優先されます。すべての設定キー、型、既定値、対象コマンドは[設定リファレンス](../../docs/config.ja.md)を参照してください。

## プロジェクトをビルドする

`main.py` を含むプロジェクトディレクトリ、または単体の Python ファイルをビルドします。

```sh
mbremote build src
mbremote build main.py
```

プロジェクト内または隣接する `shared/` ディレクトリの MicroPython モジュールは自動で含まれます。別のディレクトリを使うには `--shared DIR`、共有モジュールを除外するには `--no-shared` を指定します。

PicoRuby プロジェクトでは `.rb` ファイルまたは `main.rb` を使います。対象は V2 のみで、Ruby コードをファームウェアへコンパイルします。

```sh
mbremote build main.rb --language picoruby --board v2
mbremote run main.rb --language picoruby --board v2 --force
```

PicoRuby では REPL を利用できません。初回の PicoRuby 書き込み時と、そのファームウェアを変更したときは `--force` を指定してください。

## プロジェクトを書き込む

```sh
mbremote flash
mbremote flash --firmware build/other.hex
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote run src --all
```

`--force` は DAPLink USB による完全書き込みを行います。省略した場合は、mbremote が部分書き込みまたは完全書き込みを自動選択します。`run --all` の後はシリアルモニターを開きません。

## ベースファームウェア

カスタム MicroPython ベースファームウェアが必要なプロジェクトでは、対象ボードを指定して `--base-firmware` を使います。

```sh
mbremote run main.py --board v2 \
  --base-firmware firmware/custom-v2.hex --force
```

このオプションには `--board v1` または `--board v2` が必要です。`--base-firmware` はベースファームウェアを指定します。一方、`--firmware` は生成する HEX または `flash` で書き込む HEX を指定します。

## 開発

リポジトリを開発する場合は、リポジトリのルートで次を実行します。

```sh
npm install
npm run setup
npm link --workspace mbremote
npm test --workspace mbremote
```

npm 公開前には、チェックを実行して[リリース手順](RELEASING.md)に従ってください。

## ライセンス

[MIT](LICENSE)です。異なるライセンスで配布されるコンポーネントは、[第三者ソフトウェアに関する通知](THIRD_PARTY_NOTICES.md)を参照してください。
