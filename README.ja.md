# mbremote

[English](README.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote は、BBC micro:bit 向けの MicroPython / PicoRuby プロジェクトの開発環境です。micro:bit V1/V2 用の Universal HEX をビルドし、接続したボードへ書き込み、シリアル操作とファイル操作を提供します。

このリポジトリには、公開する `mbremote` CLI
（[`packages/mbremote`](packages/mbremote)）、サンプル、開発用ツールを含みます。

## クイックスタート

Node.js 20以降を用意し、CLI をインストールします。

```sh
npm install --global mbremote
```

プロジェクトのディレクトリで、公式 micro:bit ベースファームウェアをダウンロードし、必要に応じてプロジェクト設定を作成します。

```sh
mbremote setup
```

`main.py` を含む MicroPython プロジェクトをビルドして書き込みます。

```sh
mbremote build src
mbremote flash
```

ビルド、書き込み、シリアルモニターの起動は1コマンドでも実行できます。

```sh
mbremote run src
```

PicoRuby プロジェクトは micro:bit V2 を対象にします。

```sh
mbremote run examples/picoruby/begin --language picoruby --board v2 --force
```

`--force` は完全書き込みを行います。PicoRuby ファームウェアの初回導入時や変更時に必要です。

## サンプル

同梱サンプルを使うには、このリポジトリをクローンします。

- [サンプル一覧](examples/README.ja.md)
- [基本的な MicroPython プログラム](examples/begin/main.py)
- [LED ローバー](examples/led-rover/README.ja.md)
- [無線じゃんけん](examples/rps-radio/README.ja.md)
- [動作認識の魔法陣対戦じゃんけん](examples/magic-circle/README.ja.md)
- [PicoRuby サンプル](examples/picoruby/README.ja.md)

## ドキュメント

- [CLI リファレンスと詳細な使い方](packages/mbremote/README.ja.md)
- [設定リファレンス](docs/config.ja.md)（[English](docs/config.md)）
- [リリース手順](packages/mbremote/RELEASING.md)

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
