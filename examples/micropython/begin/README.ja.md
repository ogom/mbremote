# Begin

[English](README.md)

micro:bit V1 / V2向けの基本MicroPythonプログラムです。ハートを表示し、`Hello`をスクロールした後、P0に接続した10個の低輝度NeoPixelをアニメーションします。

## 実行

リポジトリのルートで実行します。`run`はプログラムをビルドし、接続したmicro:bitへ永続的なファームウェアを書き込み、シリアルモニターを開きます。

```sh
mbremote setup
mbremote run examples/micropython/begin
```

書き込み後すぐにコマンドを終了するには、`--no-monitor`を指定します。

```sh
mbremote run examples/micropython/begin --no-monitor
```

`rgb_led`モジュールは親の[`shared/`](../shared/)ディレクトリから自動で含まれます。ほかのプロジェクトは[MicroPythonサンプル](../README.ja.md)を参照してください。
