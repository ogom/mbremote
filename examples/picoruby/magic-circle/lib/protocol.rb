# Encodes and decodes magic-circle radio messages.
class Protocol
  def initialize(radio)
    @radio = radio
  end

  def receive
    message = @radio.receive
    message ? message.split("|") : nil
  end

  def send_ready(round_no, choice)
    @radio.send("R|#{round_no}|#{choice}")
  end

  def send_ready_ack(round_no)
    @radio.send("A|#{round_no}")
  end

  def send_cast(round_no, choice, elapsed)
    @radio.send("C|#{round_no}|#{choice}|#{elapsed}")
  end

  def send_cast_ack(round_no)
    @radio.send("K|#{round_no}")
  end

  def send_reset(round_no)
    @radio.send("X|#{round_no}")
  end

  def send_reset_ack(round_no)
    @radio.send("Z|#{round_no}")
  end
end
