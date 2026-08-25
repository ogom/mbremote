// PicoRuby-only motion recognition settings.
// These thresholds belong only to the PicoRuby magic-circle model.
export const REQUIRED_CONFIDENCE = [0.80, 0.80, 0.80, 0.90, 0.90];

// Architecture and gesture settings are source data. Training writes the
// learned weights to data/model.json, which is intentionally not tracked.
export const MODEL_METADATA = Object.freeze({
  labels: ["circle", "pose", "side", "up", "down"],
  inputSize: "24",
  hiddenSize: "16",
  outputSize: "5",
  sampleLength: "50",
  minimumGestureMotion: "0.20",
});

export function createModelMetadata() {
  return { ...MODEL_METADATA, labels: [...MODEL_METADATA.labels] };
}
