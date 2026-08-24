# mbremote サンプル

[English](README.md)

このディレクトリには [mbremote](../README.ja.md) 向けの MicroPython / PicoRuby サンプルが含まれています。コマンドはリポジトリのルートで実行します。

## サンプル

| サンプル | 説明 | 対応機種 |
| --- | --- | --- |
| [begin](begin/main.py) | ディスプレイと NeoPixel を使う基本プログラム | V1 / V2 |
| [picoruby/begin](picoruby/begin/README.ja.md) | FemtoRubyを使う最小Rubyプログラム | V2 |
| [picoruby/microbit](picoruby/microbit/README.ja.md) | RubyからLED、ボタン、加速度センサーを使う | V2 |
| [picoruby/led-rover](picoruby/led-rover/README.ja.md) | 無線、モーター、NeoPixelを統合したRubyローバー | V2 |
| [picoruby/magic-circle](picoruby/magic-circle/README.ja.md) | 4動作を順番に認識して構築するRuby魔法陣 | V2 |
| [led-rover](led-rover/README.ja.md) | 無線、モーター、NeoPixel を使うコントローラーとローバー | V1 / V2 |
| [rps-radio](rps-radio/README.ja.md) | 2人で遊ぶ無線じゃんけん | V1 / V2 |
| [magic-circle](magic-circle/README.ja.md) | 動作認識と NeoPixel を使う魔法陣対戦じゃんけん | V2 |

## ビルドと書き込み

最初に mbremote をインストールし、公式ファームウェアをダウンロードします。

```sh
npm install --global mbremote
mbremote setup
```

基本サンプルをビルド・書き込みし、シリアルモニターを開きます。

```sh
mbremote run examples/begin/main.py
```

`--no-monitor` を付けるとモニターを開かずに書き込みます。2台以上の micro:bit に同じプログラムを書き込む場合は `--all` を指定します。

```sh
mbremote run examples/begin/main.py --no-monitor
mbremote run examples/rps-radio --all
```

## 共有モジュール

`shared/` には、サンプルで使うモーター、デュアルモーター、RGB LED のモジュールが含まれます。mbremote はサンプルをビルドするときに自動で検出します。明示的に指定する場合は次のように実行します。

```sh
mbremote build examples/begin --shared examples/shared
```

## magic-circle 用ファームウェア

`magic-circle` は、動作認識モデルと RGB LED モジュールを組み込んだ V2 用のカスタムファームウェアを必要とします。初回の書き込み時、またはファームウェアを変更したときは、ファームウェアを生成して完全書き込みします。

```sh
npm run build:firmware:magic-circle
mbremote run examples/magic-circle/main.py --all --no-shared --board v2 --base-firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

CLI の詳細は [ルートREADME](../README.ja.md) を参照してください。
