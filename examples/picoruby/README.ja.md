# PicoRuby サンプル

[English](README.md)

micro:bit V2向けPicoRuby（FemtoRuby）サンプルです。コマンドはリポジトリのルートで実行します。

| サンプル                                  | 説明                                       |
| ----------------------------------------- | ------------------------------------------ |
| [begin](begin/README.ja.md)               | 最小Rubyプログラム                         |
| [microbit](microbit/README.ja.md)         | LED、ボタン、ロゴタッチ、加速度センサー    |
| [led-rover](led-rover/README.ja.md)       | 無線、モーター、NeoPixelを統合したローバー |
| [magic-circle](magic-circle/README.ja.md) | 4動作を順番に認識して構築する魔法陣対戦    |

Rubyコードはfirmwareへ組み込まれるため、実機への書き込みには `--force` を指定します。

```sh
mbremote run examples/picoruby/begin --language ruby --board v2 --force
```

## 実験対応を完了するまでの残課題

現在のPicoRuby firmwareは、サンプルで使用するLED表示、A/Bボタン、ロゴタッチ、加速度XYZ、Digital/Analog Pin、NeoPixel、文字列による無線通信を優先して実装しています。
micro:bit V2のMicroPython firmwareと現在のPicoRuby bindingを比較すると、PicoRuby版には次の機能がありません。

- [ ] **方位センサー**: 方角、磁力XYZ、磁力強度、キャリブレーション
- [ ] **マイク**: 音量、dB、音イベント、しきい値の設定
- [ ] **スピーカーと音声**: `music`、`audio`、`speech`、音程・メロディ・サウンドエフェクト、音量設定、スピーカーのON/OFF
- [ ] **シリアル通信バス**: UART、I2C、SPI
- [ ] **温度と電源制御**: 温度取得、リセット、panic、電源OFF、deep sleep
- [ ] **LEDディスプレイの拡張機能**: ON/OFF、照度取得、回転、複数Imageのアニメーション、待ち時間・繰り返しの指定
- [ ] **Imageの全機能**: 未登録の標準Image、任意Imageの生成、ピクセル編集、幅・高さの取得、切り出し、移動、反転、コピー、塗りつぶし、画像同士の演算
- [ ] **ボタンの拡張機能**: A/Bボタンを押した回数の取得
- [ ] **加速度センサーの拡張機能**: 強度、ジェスチャー判定と履歴、測定範囲の変更
- [ ] **Pinの拡張機能**: pull-up/pull-down、動作モード取得、タッチ入力と履歴、タッチ方式、マイクロ秒単位のPWM周期、低水準のWS2812出力
- [ ] **無線通信の拡張機能**: bytes送受信、受信強度と受信時刻、キュー長・パケット長・アドレス・データレートの設定
- [ ] **スケジュールと補助関数**: `run_every`による定期実行と`scale`による値の範囲変換
- [ ] **ファイルとデータ記録**: デバイス内ファイルシステム、`os`、`log`によるデータロギング
- [ ] **対話実行**: REPL、実行中のプログラムやファイルの差し替え
- [ ] **micro:bit V1**: 現在のPicoRuby firmwareはV2専用

各機能にはRuby API、CODALとのバインディング、自動テスト、実機テスト、利用例と文書を追加します。対応範囲を決めたうえで、この差を解消することをPicoRuby実験対応の残課題とします。
