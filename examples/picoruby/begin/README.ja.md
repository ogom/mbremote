# PicoRuby begin

MicroPython版の `examples/begin/main.py` をmicro:bit V2上のFemtoRubyへ移植したサンプルです。ハートを表示し、`Hello` をスクロールした後、P0に接続した10個の低輝度NeoPixelを虹色にアニメーションします。

```sh
mbremote build examples/picoruby/begin --language ruby --board v2
mbremote run examples/picoruby/begin --language ruby --board v2 --force
```

NeoPixelのデータ入力をP0へ接続します。NeoPixelをmicro:bitから給電せず、適切な外部電源を使い、GNDをmicro:bitと共通にしてください。

現在のPicoRuby対応は実験段階です。V2のみを対象とし、Rubyコードを事前コンパイルしてfirmwareへ組み込みます。LED、ボタン、加速度センサーの使用例は [microbit](../microbit/README.ja.md)、複数ファイルの構成は [led-rover](../led-rover/README.ja.md)、より大きなゲームは [magic-circle](../magic-circle/README.ja.md) を参照してください。REPLは未対応です。
