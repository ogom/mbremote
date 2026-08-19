# Motor

`Motor`はTB6612FNGなどの2入力＋PWM方式モータードライバーでDCモーター1台の速度、時計回り（CW）、反時計回り（CCW）、停止、ブレーキを制御するクラスです。

## 初期化

```python
from microbit import pin8, pin9, pin13
from motor import Motor

motor = Motor(pin8, pin9, pin13)
```

```python
Motor(in1, in2, pwm, polarity=1, pwm_period_ms=1)
```

| 引数 | 用途 |
|---|---|
| `in1` | TB6612FNGのIN1へ接続するデジタル出力ピン |
| `in2` | TB6612FNGのIN2へ接続するデジタル出力ピン |
| `pwm` | TB6612FNGのPWMへ接続するアナログ出力ピン |
| `polarity` | `1`は通常方向、`-1`はCWとCCWを反転 |
| `pwm_period_ms` | PWM周期のミリ秒、既定値は1ms |

初期化時にPWM周期を設定し、モーターを停止します。`polarity`には`1`または`-1`だけを指定できます。

## 制御

| メソッド | IN1 | IN2 | PWM | 動作 |
|---|---:|---:|---:|---|
| `cw(speed)` | High | Low | 速度 | 時計回り |
| `ccw(speed)` | Low | High | 速度 | 反時計回り |
| `stop()` | Low | Low | 0 | 停止 |
| `brake()` | High | High | 1023 | ブレーキ |

`set_speed(speed)`は`-100`から`100`へ値を制限し、正数をCW、負数をCCW、`0`を停止としてPWMの`0`から`1023`へ変換します。

```python
motor.set_speed(50)
motor.cw(90)
motor.ccw(90)
motor.stop()
motor.brake()
```

## 使用上の注意

STBYは3Vへ接続するかモータードライバー側でHighへプルアップし、モーターはmicro:bitから直接給電せず外部電源を使ってmicro:bitとGNDを共有してください。

`examples/shared/motor/main.py`はmbremoteによって実機上の`motor.py`として格納され、`from motor import Motor`で読み込みます。
