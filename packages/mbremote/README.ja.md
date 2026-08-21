# mbremote

[English](README.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

BBC micro:bit 向けMicroPython / PicoRubyプロジェクトをビルド、書き込み、操作するためのコマンドラインツールです。

## 依存関係

- **すべてのプロジェクト:** Node.js 20以降（npmを含む）
- **MicroPythonプロジェクト:** 公式 micro:bit Python Editor V3 のV1/V2 firmware、`@microbit/microbit-fs`、`@microbit/microbit-connection` を使用します。
  - JavaScriptパッケージはnpmがインストールし、firmwareは `mbremote setup` がダウンロードします。追加のビルドツールは不要です。
- **PicoRubyプロジェクト（実験対応）:** Git、Rakeを含むRuby、GNU Make、CMake、Arm GNU Toolchain（`arm-none-eabi-gcc` と `arm-none-eabi-ar`）が必要です。
  - 初回ビルド時には、固定されたPicoRubyとmicro:bit V2のソースを取得するため、ネットワーク接続も必要です。
- **DAPLink USBによる書き込み:** `usb` npm依存パッケージに対応するビルド済みバイナリがない場合、プラットフォームのlibusb開発パッケージが必要になることがあります。

## インストール

```sh
npm install --global mbremote
```

ビルド前に、プロジェクトのディレクトリで公式V1/V2 firmwareをダウンロードします。

```sh
mbremote setup
```

firmwareはカレントディレクトリの `firmware/` に保存され、空の `config/setting.json` も作成されます。既存の設定ファイルは上書きされません。

## 使い方

### プロジェクトをビルドする

`main.py` を含むディレクトリをビルドします。

```sh
mbremote build src
```

Pythonファイル1つをmicro:bit上の `main.py` としてビルドすることもできます。

```sh
mbremote build main.py
```

標準では、micro:bit V1/V2の両方に対応するUniversal HEXを `build/microbit.hex` に生成します。

### PicoRubyをビルドする（実験対応）

`main.rb` をFemtoRuby（mruby/c）バイトコードへ変換し、micro:bit V2用firmwareへ組み込みます。

```sh
mbremote build main.rb --language ruby --board v2
mbremote run main.rb --language ruby --board v2 --force
```

初回ビルドにはGit、CMake、Arm GNU Toolchain、Rubyが必要です。公式ソースと中間生成物は `.mbremote-cache/` に保存されます。現在はV2、プロジェクト直下の複数 `.rb`、`puts`、LED表示、A/Bボタン、ロゴタッチ、加速度XYZ、待機・経過時間、無線通信、Pin/PWM、NeoPixelをサポートします。Rubyファイルはファイル名順に結合され、`main.rb` が最後に実行されます。REPLには未対応です。複数ファイルの構成はworkspaceの [picoruby/led-roverサンプル](../../examples/picoruby/led-rover/README.ja.md)、API一覧は [picoruby/microbitサンプル](../../examples/picoruby/microbit/README.ja.md) を参照してください。

### 書き込みと実行

DAPLink USBを使って標準の `build/microbit.hex` を書き込みます。

```sh
mbremote flash
```

ビルド、書き込み、シリアルモニターの起動をまとめて実行します。

```sh
mbremote run main.py
```

`--no-monitor` を指定するとシリアルモニターを開かずに書き込みます。`--all` を指定すると、接続中のすべてのmicro:bitへ書き込みます。

```sh
mbremote run main.py --no-monitor
mbremote run main.py --all
```

### カスタムfirmwareを使う

カスタムMicroPython firmwareを使う場合は、対象ボードとHEXファイルを指定します。

```sh
mbremote build main.py --board v2 --firmware firmware/custom-v2.hex
mbremote run main.py --board v2 --firmware firmware/custom-v2.hex --force
```

`--firmware` を使うには `--board v1` または `--board v2` が必要です。カスタムfirmwareを初めて書き込むときや変更したときは `--force` を指定します。

### 共有モジュールを含める

プロジェクト内または同階層にある `shared/` ディレクトリのPythonファイルは自動で含まれます。
別の場所を指定するには `--shared DIR`、含めない場合は `--no-shared` を使います。

```sh
mbremote build src --shared ../shared
mbremote build src --no-shared
```

たとえば `shared/motor/main.py` は `motor` モジュールとしてインストールされます。

```text
examples/
├── begin/
│   └── main.py
└── shared/
    └── motor/
        └── main.py
```

## 設定

`mbremote` はプロジェクトの `config/setting.json` から既定値を読み込みます。
別の設定ファイルを使う場合は `--config FILE` を指定します。コマンドラインで指定した値が優先されます。

```json
{
  "shared": false,
  "board": "v2",
  "language": "python",
  "firmware": "firmware/custom-v2.hex",
  "all": true
}
```

## コマンド

| コマンド                     | 説明                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `mbremote setup`             | 設定ファイルを作成し、公式V1/V2 firmwareをダウンロードします。 |
| `mbremote build [FILE\|DIR]` | `build/microbit.hex` を生成します。                            |
| `mbremote flash [HEX]`       | DAPLink USBまたはmass storageでHEXを書き込みます。             |
| `mbremote run [FILE\|DIR]`   | ビルド、書き込み、シリアルモニター起動を行います。             |
| `mbremote ports`             | 接続中のmicro:bitのシリアルポートを一覧表示します。            |
| `mbremote monitor`           | シリアルモニターを開きます。                                   |
| `mbremote repl`              | MicroPython REPLを開きます。                                   |
| `mbremote ls`                | 接続中のmicro:bit上のファイルを一覧表示します。                |

すべてのオプションは `mbremote --help` で確認できます。複数台のmicro:bitが接続されている場合は、`--port /dev/cu.usbmodem...` で対象を選択します。
`monitor` と `repl` は `Ctrl-]` で終了します。

## 書き込みオプション

```sh
mbremote flash --force
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote flash --all --mass-storage
```

`--force` は常にfull flashを行います。指定しない場合、mbremoteがpartial flashまたはfull flashを自動選択します。
`--all` には2台以上のmicro:bitの接続が必要で、シリアルモニターは起動しません。

## 開発

このworkspace版を使用する場合は、以下を実行します。

```sh
npm install
npm run setup
npm link --workspace mbremote
```

テストは次のコマンドで実行できます。

```sh
npm test --workspace mbremote
```

PicoRubyファームウェアの統合ビルドは、必要なツールを用意して次のコマンドで確認できます。

```sh
npm run test:picoruby-firmware --workspace mbremote
```

## ライセンス

[MIT](LICENSE)です。異なるライセンスで配布されるコンポーネントについては、[第三者ソフトウェアに関する通知](THIRD_PARTY_NOTICES.md)を参照してください。
