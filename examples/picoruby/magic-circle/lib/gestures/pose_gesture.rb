# Detects the pose construction gesture with the learned motion model.
class PoseGesture
  WINDOW_SIZE = 35

  def initialize
    @gesture = LearnedMotionGesture.new(
      MLModel::LABEL_POSE,
      "pose",
      WINDOW_SIZE
    )
  end

  def reset
    @gesture.reset
  end

  def evaluated?
    @gesture.evaluated?
  end

  def last_metrics
    @gesture.last_metrics
  end

  def collect(sample)
    @gesture.collect(sample)
  end

  def update(sample)
    @gesture.update(sample)
  end
end
