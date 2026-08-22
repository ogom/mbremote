# Detects the side construction gesture.
class SideGesture
  def initialize
    @gesture = LearnedMotionGesture.new(
      MLModel::LABEL_SIDE,
      "side",
      30
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
