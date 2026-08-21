# Detects the up/down board orientation gestures.
class OrientationGesture
  DOWN_THRESHOLD = -950
  UP_THRESHOLD = 950
  RELEASE_MIN = -750
  RELEASE_MAX = 750
  STABLE_SAMPLES = 3

  def initialize
    @candidate = nil
    @candidate_count = 0
    @active = nil
  end

  def update(sample)
    y = sample[1]
    candidate = nil

    if y <= DOWN_THRESHOLD
      candidate = "down"
    elsif y >= UP_THRESHOLD
      candidate = "up"
    end

    if candidate
      if candidate == @active
        return nil
      end

      if candidate == @candidate
        @candidate_count += 1
      else
        @candidate = candidate
        @candidate_count = 1
      end

      if @candidate_count >= STABLE_SAMPLES
        @active = candidate
        @candidate = nil
        @candidate_count = 0
        return candidate
      end
    else
      @candidate = nil
      @candidate_count = 0
      if y > RELEASE_MIN && y < RELEASE_MAX
        @active = nil
      end
    end

    nil
  end
end
