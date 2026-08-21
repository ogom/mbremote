# Detects a learned motion from a stream of accelerometer samples.
class LearnedMotionGesture
  EVALUATE_EVERY = 3

  def initialize(target_label, target_action, window_size)
    @model = MLModel.new
    @target_label = target_label
    @target_action = target_action
    @window_size = window_size
    reset
  end

  def reset
    @x_values = []
    @y_values = []
    @z_values = []
    @samples_since_evaluation = EVALUATE_EVERY - 1
    @evaluated = false
    @last_metrics = nil
  end

  def evaluated?
    @evaluated
  end

  def last_metrics
    @last_metrics
  end

  def collect(sample)
    @evaluated = false
    @x_values << sample[0]
    @y_values << sample[1]
    @z_values << sample[2]

    if @x_values.length > @window_size
      @x_values.shift
      @y_values.shift
      @z_values.shift
    end
  end

  def update(sample)
    collect(sample)

    return nil if @x_values.length < @window_size

    @samples_since_evaluation += 1
    return nil if @samples_since_evaluation < EVALUATE_EVERY

    @samples_since_evaluation = 0
    @evaluated = true
    evaluation = @model.evaluate(
      @x_values,
      @y_values,
      @z_values
    )
    action_index = evaluation[0]
    confidence = evaluation[1]
    confident = evaluation[2]
    side_fallback = @target_label == MLModel::LABEL_SIDE && evaluation[3]
    recognized = (confident && action_index == @target_label) || side_fallback
    evaluation[0] = MLModel::LABELS[action_index]
    @last_metrics = evaluation
    return nil unless recognized

    action = @target_action
    reset
    action
  end

end
