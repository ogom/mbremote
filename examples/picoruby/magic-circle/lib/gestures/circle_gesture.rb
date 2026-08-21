# Detects the circle construction gesture.
class CircleGesture
  def initialize
    @gesture = LearnedMotionGesture.new(
      MLModel::LABEL_CIRCLE,
      "circle",
      50
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
