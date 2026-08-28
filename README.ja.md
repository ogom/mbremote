# mbremote

[English](README.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote は、BBC micro:bit 向けの MicroPython / PicoRuby プロジェクトの開発環境です。micro:bit V1/V2 用の Universal HEX をビルドし、接続したボードへ書き込み、シリアル操作とファイル操作を提供します。

このリポジトリには、公開する `mbremote` CLI（[`packages/mbremote`](packages/mbremote)）、サンプル、開発用ツールを含みます。

## クイックスタート

Node.js 20以降を用意し、CLI をインストールして、サンプルとプロジェクトファイルをクローンします。

```sh
npm install --global mbremote
git clone https://github.com/ogom/mbremote.git
cd mbremote
mbremote setup
```

`main.py` を含む MicroPython プロジェクトをビルドして書き込みます。

```sh
mbremote build examples/micropython/begin
mbremote flash
```

ビルド、書き込み、シリアルモニターの起動は、永続的なデプロイとして1コマンドでも実行できます。

```sh
mbremote run examples/micropython/begin
```

## ファイル操作

`mbremote fs` で、ボード上の永続的な MicroPython ファイルを転送・確認できます。

```sh
mbremote fs ls
mbremote fs cp examples/micropython/filesystem/message.txt :message.txt
mbremote fs cat :message.txt
mbremote fs cp :message.txt message.txt
mbremote fs rm :message.txt
```

`:` は micro:bit 上のファイルを表し、付かないパスはローカルです。ファイルシステムはフラット構造のため、ファイルには `:FILENAME` を指定し、ディレクトリは使えません。ボードを再書き込みすると、転送したファイルは削除されます。ビルド、書き込み、転送の一連の手順は[ファイル操作サンプル](examples/micropython/filesystem/README.ja.md)を参照してください。

## コード実行とリセット

ボード上で引用符で囲んだ MicroPython コマンドを実行する、またはソフトリセットします。

```sh
mbremote exec 'print("hello")'
mbremote reset
```

どちらも MicroPython REPL を使います。`exec` は出力を表示してからボードを再起動します。

## 接続中のボードを一覧する

```sh
mbremote ports
```

検出した micro:bit のシリアルポートを1行に1つずつ表示します。複数台接続時も同じ形式です。該当するボードがない場合は `No micro:bit serial ports found.` と表示します。

## ターゲット設定を確認する

```sh
mbremote config show
```

プロジェクト設定と既定値を適用した language、board、ファームウェアパス、port、timeout を表示します。

## PicoRuby

PicoRuby プロジェクトは micro:bit V2 を対象にします。

```sh
mbremote run examples/picoruby/begin --language picoruby --board v2 --force
```

`--force` は完全書き込みを行います。PicoRuby ファームウェアの初回導入時や変更時に必要です。

`run` はビルドして永続的に書き込むデプロイです。段階、モニター、timeout、終了コードの詳しい仕様は [CLI リファレンス](packages/mbremote/README.ja.md#run-の仕様)を参照してください。

## サンプル

同梱サンプルを使うには、このリポジトリをクローンします。

- [サンプル一覧](examples/README.ja.md)
- [MicroPythonサンプル](examples/micropython/README.ja.md)
- [基本的な MicroPython プログラム](examples/micropython/begin/main.py)
- [ファイル操作](examples/micropython/filesystem/README.ja.md)
- [LED ローバー](examples/micropython/led-rover/README.ja.md)
- [無線じゃんけん](examples/micropython/rps-radio/README.ja.md)
- [動作認識の魔法陣対戦じゃんけん](examples/micropython/magic-circle/README.ja.md)
- [PicoRuby サンプル](examples/picoruby/README.ja.md)

## ドキュメント

- [CLI リファレンスと詳細な使い方](packages/mbremote/README.ja.md)
- [設定リファレンス](docs/config.ja.md)（[English](docs/config.md)）
- [制限事項](docs/limitations.ja.md)（[English](docs/limitations.md)）
- [リリース手順](packages/mbremote/RELEASING.md)

全コマンドの一覧は `mbremote --help`、コマンド固有のオプションは `mbremote <command> --help` で確認できます。

## 開発

リポジトリのルートで依存関係をインストールし、ワークスペース版 CLI をリンクします。

```sh
npm install
npm run setup
npm link --workspace mbremote
```

CLI を変更した後はテストを実行します。

```sh
npm test
```

PicoRuby ファームウェアの統合ビルドには、Git、Rake を含む Ruby、GNU Make、CMake、Arm GNU Toolchain が必要です。

```sh
npm run test:picoruby-firmware --workspace mbremote
```

公開前は[リリース手順](packages/mbremote/RELEASING.md)に従ってください。

## 関連プロジェクト

- [rpremote](https://github.com/ogom/rpremote) は、同じプロジェクト中心の考え方で Raspberry Pi Pico を扱うツールです。カスタム PicoRuby ファームウェアの準備、ビルド、書き込み、操作を提供します。

## ライセンス

[MIT](packages/mbremote/LICENSE)
