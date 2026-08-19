include("$(PORT_DIR)/manifest.py")
freeze(
    "$(PROJECT_DIR)/examples/magic-circle",
    ("ml_model.py", "rgb_led.py"),
    opt=3,
)
