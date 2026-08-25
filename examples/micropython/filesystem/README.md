# Filesystem operations

[日本語](README.ja.md)

This example exercises `mbremote fs` against a micro:bit running MicroPython. Run the commands from the repository root.

## Flash MicroPython first

On the first use in a project, download the official base firmware. Then build this minimal MicroPython program and flash the resulting HEX to the board:

```sh
mbremote setup
mbremote build examples/micropython/filesystem
mbremote flash
```

Until `message.txt` is transferred, the program shows `?` on the micro:bit display. The transfer below restarts the board and scrolls the file's content. With more than one connected board, add `--port PORT` to `mbremote flash` and each filesystem command below.

## Inspect and create

Remote paths start with `:`. The micro:bit MicroPython filesystem is flat, so list its root directory:

```sh
mbremote fs ls
```

Use `:FILENAME` for files. Directories are not supported by MicroPython on the board.

## Upload, list, and read

Copy the sample text file from the local filesystem to the board:

```sh
mbremote fs cp examples/micropython/filesystem/message.txt :message.txt
mbremote fs ls
mbremote fs cat :message.txt
```

The final command prints:

```text
Hello from the mbremote filesystem example!
```

## Download and remove

Copy the file back under a different local name, then remove the remote file:

```sh
mbremote fs cp :message.txt filesystem-message.txt
mbremote fs rm :message.txt
mbremote fs ls
```

Delete the local `filesystem-message.txt` when it is no longer needed.

Use `--port PORT` with any command when more than one micro:bit is connected.
