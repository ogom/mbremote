# 魔法陣対戦じゃんけん

[English](README.md)

CreateAIの動作認識で魔法陣を構築する、1人練習と2人対戦のじゃんけんです。2人対戦では、両方のmicro:bitへ同じ[main.py](main.py)を書き込みます。

## 概要

- 動きを認識して魔法陣を完成させる、じゃんけんです。
- 対象人数: 1人または2人
- 使用する機能: LED、A・Bボタン、ロゴタッチ、無線通信、加速度センサー、NeoPixel
- 対応機種: micro:bit V2

## 遊び方

### 準備

1. 1人練習は1台、2人対戦は2台のmicro:bitに同じプログラムを書き込みます。
2. ロゴをタップしてモードを選びます。`1`は1人練習、`2`は2人対戦です。
3. micro:bitを右手に持ち、画面の表示に合わせて動かします。

### 操作方法

| 操作 | 動作 |
| --- | --- |
| Aボタン | グー（ROCK）→ パー（PAPER）→ チョキ（SCISSORS）を選択 |
| Bボタン | 2人対戦では手を決定、1人練習では魔法陣の構築を開始 |
| A+Bボタン | 現在の練習または対戦をリセットして再戦 |
| ロゴをタップ | 1人練習と2人対戦を切り替え |
| `down`の動き | 中心を点灯して魔法陣の構築を開始 |
| `up`の動き | 消灯して構築をリセット |

### ルール

- 1人練習では、選んだ魔法陣を完成させると😀を表示します。
- 2人対戦では、両方が手を決定してから魔法陣を構築します。😀と緑・金色の拡散は勝ちを表し、演出後は選択した魔法陣の完成アニメーションをもう1回再生します。😢と赤色の収縮は負け、横線と青・白のリングは引き分けです。
- 魔法陣が完成すると相手の完成を5秒間待ちます。5秒以内に相手が完成しなければ、先に完成した側の勝ちです。
- 5秒以内に両方が完成した場合は、通常のじゃんけんのルールで勝敗を決めます。同じ手は引き分けです。
- 結果はそのまま表示され、A+Bボタンを押すと再戦します。
- 動作の順番を間違えると`NO`を表示して最初からやり直します。

### 魔法陣の動き

`data/samples.json`はCreateAIで記録してダウンロードした、`pose`・`side`・`circle`・`up`・`down`の5種類49件の加速度データです。モデルは約1秒間（20ms間隔×約50サンプル）の動きを判定するため、各動作を約1秒かけて大きく行います。

1. `down`: 最初に`down`の動きを行い、中心を点灯します。
2. `pose`: 垂直に構え、水平になるように前へ振り出して止めます。
3. `side`: 水平にして左から右へ横振りして止めます。
4. `circle`: 水平にして右から左へ半円を描くように動かして止めます。

画面のImageが切り替わったことを確認してから次の動作へ進み、認識しない場合は動きを小さく繰り返さず、一度止めてから同じ軌道を大きく動かします。

| 選択 | 発動する魔法陣 | 構築順序 |
| --- | --- | --- |
| グー（ROCK） | `Delphinium` | `down` → `pose` → `side` → `circle` |
| パー（PAPER） | `Gerbera` | `down` → `pose` → `side` → `circle` |
| チョキ（SCISSORS） | `Clover` | `down` → `pose` → `side` → `circle` |
| 古代（SKULL、1人練習のみ） | `Ancient` | `down` → `pose` → `side` → `circle` → `side` → `circle` |

## 設定

- 初期値は無線グループ43、チャンネル7です。複数ペアで遊ぶ場合は、`RADIO_GROUP`をペアごとに別の値へ変更して再度書き込みます。
- 魔法の決定情報と構築時間はACKを受信するまで再送されます。
- NeoPixelのデータ入力はP16へ接続し、十分な容量の外部電源を使用してmicro:bitとGNDを共有します。
- モデルの重みは`INPUT_WEIGHTS`・`HIDDEN_BIAS`・`OUTPUT_WEIGHTS`・`OUTPUT_BIAS`に分け、動作ごとの判定閾値は`REQUIRED_CONFIDENCE`で調整します。
- `side`を待っている手順では、micro:bitの加速度センサーの個体差を吸収する補助判定も使用します。x・y方向の動きとz方向の安定性は、`SIDE_MIN_X_STDDEV`・`SIDE_MIN_Y_STDDEV`・`SIDE_MAX_Z_STDDEV`・`SIDE_MAX_Z_MEAN`で調整できます。

## 開発

コマンドはリポジトリのルートで実行します。

### 動作モデルの学習

`data/samples.json`を変更した後は、学習済みの重みを`ml_model.py`へ反映します。

```sh
npm run train:micropython:magic-circle
```

### カスタムベースファームウェアの生成

初回、`ml_model.py`を学習し直した後、または`rgb_led.py`を変更したときに実行します。

```sh
npm run build:firmware:magic-circle
```

`data/samples.json`の学習モデルと`rgb_led.py`はカスタムベースファームウェアに組み込まれるため、20KBのファイル領域を消費しません。

### 1台でデバッグ

micro:bitを1台だけ接続して`--all`を付けずに実行すると、書き込み後にシリアルモニターが開きます。状態遷移、動作認識と信頼度、魔法陣の完成時間、通信、勝敗のデバッグログを表示します。

```sh
mbremote run examples/micropython/magic-circle/main.py --no-shared --board v2 --base-firmware firmware/microbit-micropython-v2-magic-circle.hex
```

モニターは`Ctrl-]`で終了します。ログを止める場合は[main.py](main.py)の`DEBUG`を`False`に変更します。

### プログラムの転送

初回は`--force`を付け、カスタムベースファームウェアと`main.py`を2台へ完全書き込みします。

```sh
mbremote run examples/micropython/magic-circle/main.py --config config/setting.json --force
```

2回目以降は`--force`を外し、`main.py`を2台へ書き込みます。

```sh
mbremote run examples/micropython/magic-circle/main.py --config config/setting.json
```

設定ファイルを使わない場合は、オプションをワンライナーで指定します。

```sh
mbremote run examples/micropython/magic-circle/main.py --all --no-shared --board v2 --base-firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

### `setting.json`の設定

`mbremote`では、設定ファイルを`--config FILE`で指定できます。`--all`、`--no-shared`、`--board v2`、`--base-firmware`は、次のように設定できます。

```json
{
  "all": true,
  "shared": false,
  "board": "v2",
  "base_firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```
