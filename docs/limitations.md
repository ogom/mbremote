# Limitations

- The MicroPython filesystem is flat. Use `:FILENAME`; directories and `fs mkdir` are not supported.
- `fs`, `exec`, and `reset` require a MicroPython board and its serial REPL. PicoRuby has no MicroPython REPL or filesystem interface.
- Flashing replaces persistent board firmware. Reflashing removes files previously transferred with `fs`.
- `run` deploys persistent firmware; it does not detect when the deployed program completes or fails.
- `reset` waits for the REPL before sending a soft reset, but does not wait for the restarted program.
- `ports` and explicit `--port` selections recognize only serial devices identified as micro:bit boards.

See the [CLI reference](../packages/mbremote/README.md) for command specifications.
