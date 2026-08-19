# mbremote

[English](README.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

BBC micro:bit 向けの MicroPython プロジェクトをビルド、書き込み、操作するための開発環境です。`packages/mbremote` の `mbremote` CLI と、micro:bit 向けのサンプルプログラムを含みます。

公式 micro:bit Python Editor V3 の firmware、`@microbit/microbit-fs`、`@microbit/microbit-connection` を使用します。V1/V2 両対応の Universal HEX を生成し、DAPLink USB または mass-storage 方式で書き込みます。

## インストール

Node.js 20 以降が必要です。

```sh
npm install --global mbremote
```

ビルド前に、MicroPython プロジェクトのディレクトリで公式 V1/V2 firmware をダウンロードします。

```sh
mbremote setup
```

firmware はプロジェクトの `firmware/` に保存され、空の `config/setting.json` も作成されます。
既存の設定ファイルは上書きされません。サンプルを使う場合は、このリポジトリをクローンして `examples/` を利用してください。

## 使い方

### プロジェクトをビルドする

`main.py` を含むディレクトリをビルドします。

```sh
mbremote build examples/begin
```

Python ファイル1つを micro:bit 上の `main.py` としてビルドすることもできます。

```sh
mbremote build examples/begin/main.py
```

標準では、micro:bit V1/V2 の両方に対応する Universal HEX を `build/microbit.hex` に生成します。

### 書き込みと実行

DAPLink USB を使って標準の `build/microbit.hex` を書き込みます。

```sh
mbremote flash
```

ビルド、書き込み、シリアルモニターの起動をまとめて実行できます。

```sh
mbremote run examples/begin/main.py
```

`--no-monitor` を指定すると、シリアルモニターを開かずに書き込みます。2台以上の micro:bit に同じプログラムを書き込む場合は `--all` を指定します。

```sh
mbremote run examples/begin/main.py --no-monitor
mbremote run examples/rps-radio --all
```

### カスタム firmware を使う

カスタム MicroPython firmware を使う場合は、対象ボードと HEX ファイルを指定します。初回の書き込み時、または firmware を変更したときは `--force` を付けて full flash します。

```sh
mbremote build examples/magic-circle/main.py --board v2 --firmware firmware/custom-v2.hex
mbremote run examples/magic-circle/main.py --board v2 --firmware firmware/custom-v2.hex --force
```

`--firmware` を使うには `--board v1` または `--board v2` が必要です。

`examples/magic-circle` 用の firmware は、次のコマンドで生成します。`ml_model.py` または `rgb_led.py` を変更した場合も再生成してください。

```sh
npm run build:firmware:magic-circle
mbremote run examples/magic-circle/main.py --all --no-shared --board v2 --firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

### 共有モジュールを含める

プロジェクト内または同階層の `shared/` ディレクトリにある Python ファイルは自動で含まれます。別の場所を指定するには `--shared DIR`、含めない場合は `--no-shared` を使います。

```sh
mbremote build examples/begin --shared examples/shared
mbremote build examples/begin --no-shared
```

たとえば、`examples/shared/motor/main.py` は `motor` モジュールとして micro:bit に格納されます。

```text
examples/
├── begin/
│   └── main.py
└── shared/
    └── motor/
        └── main.py
```

## 設定

`mbremote` はプロジェクトの `config/setting.json` から既定値を読み込みます。別の設定ファイルを使う場合は `--config FILE` を指定します。コマンドラインで指定した値が優先されます。

```json
{
  "all": true,
  "shared": false,
  "board": "v2",
  "firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```

`shared` には共有モジュールのディレクトリを指定でき、`false` を指定すると共有モジュールを含めません。設定項目の詳細は [mbremote の日本語README](packages/mbremote/README.ja.md) を参照してください。

## コマンド

| コマンド                     | 説明                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `mbremote setup`             | 設定ファイルを作成し、公式 V1/V2 firmware をダウンロードします。   |
| `mbremote build [FILE\|DIR]` | `build/microbit.hex` を生成します。                              |
| `mbremote flash [HEX]`       | DAPLink USB または mass-storage で HEX を書き込みます。           |
| `mbremote run [FILE\|DIR]`   | ビルド、書き込み、シリアルモニター起動を行います。               |
| `mbremote ports`             | 接続中の micro:bit のシリアルポートを一覧表示します。             |
| `mbremote monitor`           | シリアルモニターを開きます。                                     |
| `mbremote repl`              | MicroPython REPL を開きます。                                     |
| `mbremote ls`                | 接続中の micro:bit 上のファイルを一覧表示します。                 |

すべてのオプションは `mbremote --help` で確認できます。複数の micro:bit が接続されている場合は、`--port /dev/cu.usbmodem...` で対象を選択します。`monitor` と `repl` は `Ctrl-]` で終了します。

## 書き込みオプション

```sh
mbremote flash --force
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote flash --all --mass-storage
```

`--force` は DAPLink USB による full flash を強制します。指定しない場合、mbremote が partial flash または full flash を自動選択します。DAPLink USB が使用中の場合や失敗する場合は `--mass-storage` を試してください。

`--all` には2台以上の micro:bit 接続が必要で、`run --all` はシリアルモニターを起動しません。

## サンプル

- [begin](examples/begin/main.py): 基本的な MicroPython プログラム
- [led-rover](examples/led-rover/README.ja.md): LED とモーターを使う rover
- [rps-radio](examples/rps-radio/README.ja.md): 2台で遊ぶ無線じゃんけん
- [magic-circle](examples/magic-circle/README.ja.md): 動作認識と NeoPixel を使う魔法陣対戦じゃんけん

## 開発

この GitHub リポジトリの workspace 版を開発する場合は、リポジトリのルートで依存関係と公式 V1/V2 firmware をセットアップし、CLI をリンクします。

```sh
npm install
npm run setup
npm link --workspace mbremote
```

workspace 版の CLI を更新した場合は、テストを実行します。

```sh
npm test
```

CLI の実装と詳細な利用方法は [packages/mbremote](packages/mbremote/README.ja.md) を参照してください。

## ライセンス

[MIT](packages/mbremote/LICENSE)
