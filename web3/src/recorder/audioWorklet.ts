export const audioWorkletCode = `
  class StreamingProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
      const input = inputs[0];

      if (outputs.length > 0) {
        const output = outputs[0];

        for (let channel = 0; channel < input.length; channel++) {
          const inputChannel = input[channel];
          const outputChannel = output[channel];

          if (outputChannel) {
            for (let i = 0; i < inputChannel.length; i++) {
              outputChannel[i] = inputChannel[i];
            }
          }
        }
      }

      this.port.postMessage({ audioData: input[0] });

      return true;
    }
  }

  registerProcessor('streaming-processor', StreamingProcessor);
`;
