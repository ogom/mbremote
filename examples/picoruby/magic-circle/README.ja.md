# PicoRuby 魔法陣対戦じゃんけん

[English](README.md)

動作認識で魔法陣を構築する、1人練習と2人対戦のじゃんけんです。
MicroPython版`examples/magic-circle`のゲーム仕様、無線同期、勝敗判定、NeoPixel演出を参照し、PicoRuby版として実装しています。

## 遊び方

241灯のNeoPixelのデータ入力をP16へ接続します。NeoPixelは十分な容量の外部電源から給電し、micro:bitとGNDを共有してください。

| 操作         | 動作                                                  |
| ------------ | ----------------------------------------------------- |
| Aボタン      | グー → パー → チョキを選択。1人練習では古代も選択可能 |
| Bボタン      | 2人対戦では手を決定。1人練習では構築を開始            |
| A+Bボタン    | 現在の練習または対戦をリセットして再戦                |
| ロゴをタップ | 1人練習と2人対戦を切り替え。`1`が練習、`2`が対戦      |
| `down`       | 中心を点灯して構築を開始                              |
| `up`         | 消灯して構築手順をリセット                            |

2人対戦では、両者がBボタンで手を決定すると構築を開始します。
完成後は相手を10秒待ち、両者が完成すれば手と完成時刻をACK付きで交換してじゃんけんを判定します。相手が時間内に完成しなければ勝ちです。

- 勝ち: 😀と緑・金色の演出後、元の魔法陣を再生
- 負け: 😢と赤色の収縮演出
- 引き分け: 横線と青・白のリング演出後、元の魔法陣を再生
- A+B: ラウンド番号を同期して再戦

## 魔法陣の動き

| 選択                | 魔法陣     | 構築順序                                                |
| ------------------- | ---------- | ------------------------------------------------------- |
| グー                | DELPHINIUM | `down` → `pose` → `side` → `circle`                     |
| パー                | GERBERA    | `down` → `pose` → `side` → `circle`                     |
| チョキ              | CLOVER     | `down` → `pose` → `side` → `circle`                     |
| 古代（1人練習のみ） | ANCIENT    | `down` → `pose` → `side` → `circle` → `side` → `circle` |

各動作は約0.6〜0.8秒かけて、大きく行います。構築は必ず`down`から始めます。

### 判定とやり直し

- `down`後、次の動作を2秒以内に認識できない場合は消灯し、`down`待ちへ戻ります。
- `up`にすると、いつでも消灯して`down`からやり直せます。
- 現在の手順で必要な動作だけを判定します。たとえば`pose`待ち中に一時的に`side`と判定されても、構築はリセットされません。
- LED演出中も次のML動作のサンプルを収集します。`pose → side`、`side → circle`、古代の`circle → side`でも、演出が終わる前から次の動作を始められます。
- 演出中に集めたサンプルは、演出完了後に初めて判定します。直前の動きの余韻を次の動作として即時に誤認することを防ぎます。

### LED演出

各魔法陣のNeoPixel演出は`lib/magic_circles`で属性ごとのクラスに分離しています。
共通描画は`MagicCircleLights`、LED配置は`MagicCircleLayout`が担当します。
ゲーム進行は`Game`、動作による構築は`Builder`、勝敗判定は`Judge`、無線メッセージ形式は`Protocol`が担当します。

## 機械学習

`pose`・`side`・`circle`は、PicoRuby専用のニューラルネットワークで判定します。`up`・`down`は向きで判定します。

| 項目           | 内容                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| 入力           | 加速度XYZから計算する24個の特徴量                                                |
| ネットワーク   | 隠れ層16ユニット、出力5種類（`circle`・`pose`・`side`・`up`・`down`）            |
| 学習データ     | `data/data-samples.json`                                                         |
| 学習済みモデル | `data/model.json`                                                                |
| 信頼度しきい値 | `pose`・`side`・`circle`: 0.80、`up`・`down`: 0.90（`scripts/model-config.mjs`） |

学習済みの重みはML4FでCortex-M4F向け機械語に変換し、ファームウェアへ組み込みます。
`lib/ml_model.rb`はラベル定義とnative APIの呼び出しだけを担当します。

### 再学習・生成・検証

学習データを変更した後は、次のコマンドで再学習、生成、検証を行います。

```sh
npm run train:ml4f:magic-circle
node examples/picoruby/magic-circle/scripts/generate-ml-model.mjs
npm run generate:ml4f:magic-circle
npm run verify:ml4f:magic-circle
```

`data/model.json`だけを変更した場合は、Rubyメタデータとファームウェアモデルを再生成します。

```sh
node examples/picoruby/magic-circle/scripts/generate-ml-model.mjs
npm run generate:ml4f:magic-circle
```

組み込み用の機械語モデルとPicoRuby専用モデルは、学習データ50件と実行時の部分窓40件で比較します。
Cortex-M4Fで使う単精度の特徴量計算も再現し、5クラスの出力確率、選択ラベル、信頼度判定が一致しない場合は失敗します。

```sh
npm run verify:ml4f:magic-circle
```

## 高速化の工夫

操作に対する点灯と次の動作の認識を遅らせないため、次の工夫をしています。

- **Cortex-M4Fで推論**: 特徴量計算とニューラルネットワーク推論はRubyではなくC/ML4Fで実行します。生成された機械語モデルの推論は、64MHzで約0.05msです。
- **XYZをまとめて取得**: 加速度XYZを1回の`sample`呼び出しで取得し、軸ごとの待ち時間をなくします。
- **短い周期で判定**: ゲームループは20ms周期で動作し、学習済み動作は3サンプルごとに再判定します。`pose`は35サンプル、`side`は30サンプル、`circle`は50サンプルで判定します。
- **点灯を先に開始**: 認識した直後に最初のNeoPixelを点灯します。残りのLED演出はブロックせず、ゲームループ内で少しずつ進めます。
- **演出中も次を収集**: `pose`・`side`・`circle`のLED演出中も、次の動作の加速度を収集します。古代の`circle → side`も含め、演出完了後すぐに判定できるため待ち時間を短縮できます。

## 書き込み

1台で練習する場合:

```sh
mbremote run examples/picoruby/magic-circle --language picoruby --board v2 --force
```

2台へ同じプログラムを書き込む場合:

```sh
mbremote run examples/picoruby/magic-circle --language picoruby --board v2 --all --force
```

無線はグループ43、チャンネル7、出力6を使用します。シリアルには状態遷移、認識した動作、通信、完成時間、勝敗を表示します。
