import { useMemo } from "react";
import { FFTAnalyzerControls } from "@/components/analyzers/fftAnalyzerControls";
import ControlledAudioSource from "@/components/audio/audioSource";
import { AUDIO_SOURCE, buildAudio, buildAudioContext, } from "@/components/audio/sourceControls/common";
import MicrophoneAudioControls from "@/components/audio/sourceControls/mic";
import { useAudioSourceContext } from "@/context/audioSource";
import { useMediaStreamLink } from "@/lib/analyzers/common";
import FFTAnalyzer from "@/lib/analyzers/fft";

const InternalAudioAnalyzer = () => {
  const audioCtx = useMemo(() => buildAudioContext(), []);
  const audio = useMemo(() => buildAudio(), []);
  const analyzer = useMemo(() => {
    console.log("Creating analyzer...");
    return new FFTAnalyzer(audio, audioCtx, 1.0);
  }, [audio, audioCtx]);
  
  return (
    <>
      <ControlledAudioSource audio={audio}/>
      <FFTAnalyzerControls analyzer={analyzer}/>
    </>
  );
};

const InternalMediaStreamAnalyzer = () => {
  const audioCtx = useMemo(() => buildAudioContext(), []);
  const audio = useMemo(() => buildAudio(), []);
  const analyzer = useMemo(() => {
    console.log("Creating analyzer...");
    return new FFTAnalyzer(audio, audioCtx, 0.0);
  }, [audio, audioCtx]);
  
  const { onDisabled, onStreamCreated } = useMediaStreamLink(audio, analyzer);
  
  return (
    <>
      <MicrophoneAudioControls
        audio={audio}
        onDisabled={onDisabled}
        onStreamCreated={onStreamCreated}
      />
      <FFTAnalyzerControls analyzer={analyzer}/>
    </>
  );
};

const AudioAnalyzer = () => {
  const { audioSource } = useAudioSourceContext();
  
  switch (audioSource) {
    case AUDIO_SOURCE.FILE_UPLOAD:
      return <InternalAudioAnalyzer/>;
    case AUDIO_SOURCE.MICROPHONE:
      return (
        <InternalMediaStreamAnalyzer/>
      );
    default:
      return audioSource satisfies never;
  }
};

export default AudioAnalyzer;
