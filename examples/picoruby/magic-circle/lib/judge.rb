# Judges a magic-circle battle from hands and completion times.
class Judge
  ROCK = 0
  PAPER = 1
  SCISSORS = 2

  def judge(my_choice, opponent_choice, my_time, opponent_time, time_limit)
    time_difference = my_time - opponent_time
    if time_difference.abs > time_limit
      return time_difference < 0 ? 1 : -1
    end
    return 0 if my_choice == opponent_choice

    if (my_choice == ROCK && opponent_choice == SCISSORS) ||
       (my_choice == SCISSORS && opponent_choice == PAPER) ||
       (my_choice == PAPER && opponent_choice == ROCK)
      1
    else
      -1
    end
  end
end
