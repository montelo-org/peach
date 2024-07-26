import FileAudioControls from "@/components/audio/sourceControls/file";

const ControlledAudioSource = ({
                                 audio,
                               }: {
  audio: HTMLAudioElement;
}) => {
  return <FileAudioControls audio={audio}/>;
};
export default ControlledAudioSource;
