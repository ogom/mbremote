# ファイル操作

[English](README.md)

このサンプルでは、MicroPython を実行する micro:bit に対して `mbremote fs` を使います。コマンドはリポジトリのルートで実行してください。

## 最初に MicroPython を書き込む

プロジェクトで初めて使う場合は、公式ベースファームウェアをダウンロードします。続けて、この最小の MicroPython プログラムをビルドし、生成した HEX をボードへ書き込みます。

```sh
mbremote setup
mbremote build examples/micropython/filesystem
mbremote flash
```

書き込み後、`message.txt` を転送するまでは micro:bit のディスプレイに `?` が表示されます。以下の転送でボードが再起動し、ファイルの内容をスクロール表示します。複数のボードを接続している場合は、`mbremote flash` と以下の各ファイル操作コマンドに `--port PORT` を追加してください。

## 一覧表示とディレクトリ作成

リモートパスは `:` で始まります。micro:bit の MicroPython ファイルシステムはフラット構造のため、ルートを一覧表示します。

```sh
mbremote fs ls
```

ファイルには `:FILENAME` を指定します。ディレクトリはボード上の MicroPython では利用できません。

## アップロード、一覧表示、内容表示

ローカルのサンプルテキストをボードへコピーします。

```sh
mbremote fs cp examples/micropython/filesystem/message.txt :message.txt
mbremote fs ls
mbremote fs cat :message.txt
```

最後のコマンドは次を表示します。

```text
Hello from the mbremote filesystem example!
```

## ダウンロードと削除

別名でローカルへコピーした後、リモートのファイルを削除します。

```sh
mbremote fs cp :message.txt filesystem-message.txt
mbremote fs rm :message.txt
mbremote fs ls
```

ローカルの `filesystem-message.txt` は、確認後に不要であれば削除してください。

複数の micro:bit を接続している場合は、各コマンドに `--port PORT` を追加します。
