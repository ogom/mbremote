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
git clone https://github.com/ogom/mbremote.git
cd mbremote
mbremote setup
```

`setup` は、公式ベースファームウェアをプロジェクトの `firmware/` ディレクトリにダウンロードし、存在しない場合だけ `config/setting.json` を作成します。

## コマンド構文

```text
mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--monitor|--no-monitor]
mbremote setup
mbremote repl [--port PORT]
mbremote monitor [--port PORT]
mbremote exec CODE [--port PORT]
mbremote reset [--port PORT]
mbremote fs cp FILE :FILENAME [--port PORT]
mbremote fs cp :FILENAME FILE [--port PORT]
mbremote fs cat :FILENAME [--port PORT]
mbremote fs ls [:/] [--port PORT]
mbremote fs rm :FILENAME [--port PORT]
mbremote config show [--config FILE]
mbremote ports
```

| コマンド | 説明 |
| --- | --- |
| `build` | プロジェクトをビルドします。既定では Universal HEX を生成します。単体の `.py` ファイルは、ボード上の `main.py` になります。 |
| `build clean` | プロジェクトの生成済み `build/` ディレクトリを削除します。 |
| `flash` | DAPLink USB またはマウント済み MICROBIT ボリュームで HEX を永続的に書き込みます。`--firmware` を省略した場合は `build/microbit.hex` を使います。 |
| `run` | ビルド、永続的な書き込み、必要に応じたシリアルモニターを順に実行します。 |
| `setup` | プロジェクト設定を作成し、公式ベースファームウェアをダウンロードします。 |
| `repl` | MicroPython REPL を開きます。 |
| `monitor` | シリアルモニターを開きます。 |
| `exec` | MicroPython コードを実行し、出力を表示します。 |
| `reset` | 接続した micro:bit をソフトリセットします。 |
| `fs cp/cat/ls/rm` | 接続したボードの MicroPython ファイルシステムを操作します。 |
| `config show` | 実効プロジェクト・ターゲット値を JSON で表示します。 |
| `ports` | 検出した micro:bit のシリアルポートを、1行に1つずつ表示します。 |

対話式のシリアルコマンドは `Ctrl-]` で終了します。

`ports` は検出した micro:bit のシリアルポートだけをパス順で表示するため、複数台は複数行になります。未検出時は `No micro:bit serial ports found.` と表示します。

## コード実行とリセット

引用符で囲んだ MicroPython コードを実行し、`print` の出力を表示します。

```sh
mbremote exec 'print(1 + 2)'
mbremote exec 'from microbit import display; display.show("H")'
mbremote reset
```

`exec` とファイル操作コマンドは MicroPython REPL を使います。実行中のプログラムを停止し、終了後にボードをソフトリセットします。`reset` はこのソフトリセットを明示的に実行します。REPL を待ってからリセットを送りますが、再起動したプログラムの完了は待ちません。

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
| `--monitor`、`--no-monitor` | 1台に対する `run` 後のシリアルモニターを有効または無効にします。 |
| `-h`、`--help` | ヘルプを表示します。 |
| `-V`、`--version` | インストール済みのバージョンを表示します。 |

コマンドラインオプションは設定ファイルより優先されます。すべての設定キー、型、既定値、対象コマンドは[設定リファレンス](https://github.com/ogom/mbremote/blob/main/docs/config.ja.md)を参照してください。

全コマンドの一覧は `mbremote --help`、コマンド固有の構文とオプションは `mbremote <command> --help` で確認します。たとえば `mbremote run --help`、`mbremote fs --help` を使用します。`mbremote fs cp --help`（`cat`、`ls`、`rm` も同様）ではファイル操作を絞り込んで表示します。

## 実効設定を表示する

```sh
mbremote config show
mbremote config show --config config/device-v2.json
```

JSON 出力は `config/setting.json`、コマンドライン指定、組み込み既定値をマージします。`language`、`board`、`firmware`、`base_firmware`、`port`、`timeout` を表示します。パスはプロジェクトディレクトリから解決し、`timeout` は秒単位です。

## `run` の仕様

`mbremote run` は永続的なデプロイコマンドです。`build`、`flash`、（1台の場合は必要に応じて）`monitor` を順に実行します。一時ファイルを転送して実行する `rpremote run` の方式ではありません。生成した HEX は micro:bit に残り、書き込み後は通常のプログラムとして起動します。

- 1台では既定でモニターを開きます。対話しないビルド・書き込みには `--no-monitor` を指定します。設定の `"monitor": false` を CLI で有効化するには `--monitor` を指定します。
- `run --all` は検出したすべてのボードへ書き込み、`--monitor` を指定してもモニターを開きません。
- モニターを開いた場合、`Ctrl-]` を入力するかシリアルポートが閉じると `run` は終了します。プログラムは無期限に動作し得るため、プログラムの終了は判定しません。
- `--timeout` は、書き込み後にモニターを開く前のシリアルポート待機だけを制限します。ビルド、書き込み、プログラムの実行時間、モニター時間は制限しません。
- 選択したすべての段階が成功し（モニター使用時は正常に終了し）た場合だけ終了コードは `0` です。ビルド、書き込み、ポート待機、シリアル通信の失敗は非0で終了します。デプロイ後の MicroPython 例外はボードの出力であり、CLI の終了コードにはなりません。`--no-monitor` では書き込み成功時点で成功終了します。
- 状態を変更する操作の前に、CLI は段階と対象を表示します。特に `flash` はボード上の永続ファームウェアを置き換える HEX を、`run` は各段階の前に `build`、永続的な `flash`、`monitor` を表示します。

## ファイル操作

リモートパスには `:` を付けます。`:` のないパスはローカルとして扱うため、`fs cp` の片側だけをリモートパスにします。micro:bit のファイルシステムはフラット構造です。一覧には `fs ls`、ファイルには `:FILENAME` を指定します。従来の `:/FILENAME` も互換のため利用できます。ディレクトリはボード上の MicroPython では利用できません。

```sh
mbremote fs ls
mbremote fs cp helper.py :helper.py
mbremote fs cat :helper.py
mbremote fs cp :data.bin data.bin
mbremote fs rm :helper.py
```

ファイル操作コマンドは MicroPython REPL を使用し、操作後にボードを再起動します。

プラットフォームとコマンドの制限は [制限事項](https://github.com/ogom/mbremote/blob/main/docs/limitations.ja.md)を参照してください。

## プロジェクトをビルドする

`main.py` を含むプロジェクトディレクトリ、または単体の Python ファイルをビルドします。

```sh
mbremote build examples/micropython/begin
mbremote build main.py
```

プロジェクト内または隣接する `shared/` ディレクトリの MicroPython モジュールは自動で含まれます。別のディレクトリを使うには `--shared DIR`、共有モジュールを除外するには `--no-shared` を指定します。

PicoRuby プロジェクトでは `.rb` ファイルまたは `main.rb` を使います。対象は V2 のみで、Ruby コードをファームウェアへコンパイルします。

```sh
mbremote build main.rb --language picoruby --board v2
mbremote run main.rb --language picoruby --board v2 --force
```

PicoRuby では REPL を利用できません。初回の PicoRuby 書き込み時と、そのファームウェアを変更したときは `--force` を指定してください。

PicoRuby のビルドは AOT コンパイルでファームウェア HEX を生成します。CLI はコンパイル開始前にその予定を表示し、`flash` または `run` はデバイスを変更する前に永続書き込みを表示します。

## プロジェクトを書き込む

`flash` は指定した HEX を、リセット後に起動するボードの永続ファームウェアとして書き込みます。一時実行コマンドではなく、既存プログラムを置き換える書き込み操作です。CLI は転送開始前に HEX と対象を表示します。

```sh
mbremote flash
mbremote flash --firmware build/other.hex
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote run examples/micropython/begin --all
```

`--force` は DAPLink USB による完全書き込みを行います。省略した場合は、mbremote が部分書き込みまたは完全書き込みを自動選択します。`run --all` の後はシリアルモニターを開きません。

## ベースファームウェア

カスタム MicroPython ベースファームウェアが必要なプロジェクトでは、対象ボードを指定して `--base-firmware` を使います。

```sh
mbremote run main.py --board v2 --base-firmware firmware/custom-v2.hex --force
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
