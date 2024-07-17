import { useRef, useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { audioWorkletCode } from "./audioWorklet.ts";
import { RecordingState } from "./RecordingState.ts";
import { CHANNELS, FRAMES_PER_BUFFER, MESSAGES, SAMPLE_RATE } from "./constants.ts";
import { useProgress } from "@react-three/drei";

export const Recorder = () => {
	// three progress
	const { progress } = useProgress();
	const showComponents = progress === 100;

	// health check
	const healthCheckQuery = useQuery({
		enabled: false, // disable automatic fetching when query mounts, manually perform query
		queryKey: ["health-check"],
		queryFn: async () => {
			return await fetch(`https://${import.meta.env.VITE_API_BASE_URL}/health`, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Content-Type": "application/json",
				},
			});
		},
	});

	// recording
	const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLING);
	const streamRef = useRef<MediaStream | null>(null);
	const websocketRef = useRef<WebSocket | null>(null);
	const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
	const audioContextRef = useRef<AudioContext | null>(null);
	const streamingProcessorRef = useRef<AudioWorkletNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);
	const nextPlayTimeRef = useRef<number>(0);
	const startTimeRef = useRef(0);

	const closeAudioResources = () => {
		if (streamingProcessorRef.current && "disconnect" in streamingProcessorRef.current) {
			streamingProcessorRef.current.disconnect();
			streamingProcessorRef.current = null;
		}

		if (sourceRef.current && "disconnect" in sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}

		if (streamRef.current && "getTracks" in streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		if (audioContextRef.current && "close" in audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}
	};

	const sendAudioData = (audioData: Int16Array, eventType: string) => {
		if (websocketRef.current && websocketRef.current?.readyState === WebSocket.OPEN) {
			const arrayBuffer = audioData.buffer;
			const uint8Array = new Uint8Array(arrayBuffer);
			const base64Audio = btoa(String.fromCharCode.apply(null, uint8Array));
			const message = JSON.stringify({
				event: eventType,
				audio: base64Audio,
			});
			websocketRef.current?.send(message);
		}
	};

	const processAudioData = (newAudioData: Float32Array) => {
		const int16Data = new Int16Array(newAudioData.length);
		for (let i = 0; i < newAudioData.length; i++) {
			int16Data[i] = Math.max(-32768, Math.min(32767, Math.round(newAudioData[i] * 32767)));
		}

		let combinedBuffer = new Int16Array(audioBufferRef.current.length + int16Data.length);
		combinedBuffer.set(audioBufferRef.current);
		combinedBuffer.set(int16Data, audioBufferRef.current.length);

		while (combinedBuffer.length >= FRAMES_PER_BUFFER) {
			const bufferToSend = combinedBuffer.slice(0, FRAMES_PER_BUFFER);
			sendAudioData(bufferToSend, "AUDIO_UPDATE");
			combinedBuffer = combinedBuffer.slice(FRAMES_PER_BUFFER);
		}

		audioBufferRef.current = combinedBuffer;

		if (Date.now() - startTimeRef.current > 10000) {
			console.log("Maximum duration reached, ending recording.");
			stopRecording();
		}
	};

	const schedulePlayback = (audioBuffer: AudioBuffer) => {
		console.log(`Resampled buffer duration: ${audioBuffer.duration}`);
		const source = audioContextRef.current?.createBufferSource();
		source.buffer = audioBuffer;
		const gainNode = gainNodeRef.current;
		if (!gainNode) {
			return;
		}
		source.connect(gainNode);

		const currentTime = audioContextRef.current?.currentTime;
		if (!currentTime) {
			return;
		}
		const startTime = Math.max(currentTime, nextPlayTimeRef.current);
		source.start(startTime);
		nextPlayTimeRef.current = startTime + audioBuffer.duration;

		console.log(`Scheduled playback at: ${startTime}, duration: ${audioBuffer.duration}`);

		// Cleanup: remove the source node when it's finished playing
		source.onended = () => {
			source.disconnect();
		};
	};

	const resampleAudio = async (
		audioBuffer: AudioBuffer,
		newSampleRate: number | undefined,
	): Promise<AudioBuffer> => {
		const sampleRate = newSampleRate || SAMPLE_RATE;
		const ctx = new OfflineAudioContext(CHANNELS, audioBuffer.duration * sampleRate, sampleRate);
		const source = ctx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(ctx.destination);
		source.start();
		return ctx.startRendering();
	};

	const processAudioChunk = (chunk: ArrayBuffer) => {
		if (!audioContextRef.current) {
			initAudioPlayback();
		}

		const pcmData = new Int16Array(chunk);
		console.log(`Received chunk length: ${pcmData.length}`);
		const audioBuffer = audioContextRef.current?.createBuffer(
			CHANNELS,
			pcmData.length,
			SAMPLE_RATE,
		);
		const channelData = audioBuffer.getChannelData(0);

		// Convert Int16Array to Float32Array
		for (let i = 0; i < pcmData.length; i++) {
			channelData[i] = pcmData[i] / 32768.0;
		}

		// If the audio context's sample rate doesn't match the incoming audio,
		// resample the audio before scheduling playback
		if (audioContextRef.current?.sampleRate !== SAMPLE_RATE) {
			resampleAudio(audioBuffer, audioContextRef.current?.sampleRate).then(schedulePlayback);
		} else {
			schedulePlayback(audioBuffer);
		}

		if (recordingState !== RecordingState.PLAYBACK) {
			setRecordingState(RecordingState.PLAYBACK);
		}
	};

	const initAudioPlayback = () => {
		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext();
			gainNodeRef.current = audioContextRef.current?.createGain();
			if ("connect" in gainNodeRef.current) {
				gainNodeRef.current.connect(audioContextRef.current?.destination);
			}
		}
	};

	const startRecording = async () => {
		console.log("[startRecording] At the top");

		// Hit the container to spin it up
		setRecordingState(RecordingState.INITIALIZING);
		const healthRes = await healthCheckQuery.refetch();
		if (healthRes.error) {
			console.log("Health res errored out, returning");
			return;
		}

		// Start websocket connection
		const websocket = new WebSocket(`wss://${import.meta.env.VITE_API_BASE_URL}/ws`);
		websocketRef.current = websocket;

		const onSocketOpen = async () => {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
			audioContextRef.current = audioContext;
			
			const source = audioContext.createMediaStreamSource(stream);
			sourceRef.current = source;

			await audioContext.audioWorklet.addModule(
				URL.createObjectURL(new Blob([audioWorkletCode], { type: "text/javascript" })),
			);

			const streamingProcessor = new AudioWorkletNode(audioContext, "streaming-processor");
			streamingProcessorRef.current = streamingProcessor;

			source.connect(streamingProcessor);

			streamingProcessor.port.onmessage = (event) => {
				const audioData = event.data.audioData;
				processAudioData(audioData);
			};

			setRecordingState(RecordingState.RECORDING);
		};

		websocket.onopen = () => {
			console.log("WebSocket connection opened");
			void onSocketOpen();
		};

		websocket.onmessage = (event) => {
			if (event.data instanceof Blob) {
				event.data.arrayBuffer().then(processAudioChunk);
			} else if (typeof event.data === "string") {
				const parsed = JSON.parse(event.data) as {
					content: string | null;
					image_url: string | null;
				};
				console.log("Parsed final message: ", parsed);
			}
		};

		websocket.onclose = () => {
			console.log("WebSocket connection closed");
		};

		startTimeRef.current = Date.now();
	};

	const stopRecording = () => {
		setRecordingState(RecordingState.PROCESSING);
		closeAudioResources();
		initAudioPlayback();

		// Send end messages
		websocketRef.current?.send(
			JSON.stringify({
				event: "AUDIO_END",
			}),
		);

		websocketRef.current?.send(
			JSON.stringify({
				event: "SEND_MESSAGES",
				messages: MESSAGES,
			}),
		);

		// Clear the audio buffer
		audioBufferRef.current = new Int16Array(0);
	};

	const handleClick = () => {
		const handlerMap: Record<RecordingState, () => void> = {
			[RecordingState.IDLING]: () => {
				void startRecording();
			},
			[RecordingState.INITIALIZING]: () => {
				return;
			},
			[RecordingState.RECORDING]: () => {
				void stopRecording();
			},
			[RecordingState.PROCESSING]: () => {
				return;
			},
			[RecordingState.PLAYBACK]: () => {
				// TODO stop playback
				return;
			},
		};
		handlerMap[recordingState]();
	};

	const ComponentMap: Record<RecordingState, JSX.Element> = {
		[RecordingState.IDLING]: <Mic />,
		[RecordingState.INITIALIZING]: <LoaderCircle className={"animate-spin"} />,
		[RecordingState.RECORDING]: <Square color={"#ef4444"} />,
		[RecordingState.PROCESSING]: <LoaderCircle className={"animate-spin"} />,
		[RecordingState.PLAYBACK]: <Square color={"#ef4444"} />,
	};

	const SubtitleTextMap: Record<RecordingState, string> = {
		[RecordingState.IDLING]: "Tap to start",
		[RecordingState.INITIALIZING]: "Connecting to server",
		[RecordingState.RECORDING]: "Tap to stop",
		[RecordingState.PROCESSING]: "Thinking",
		[RecordingState.PLAYBACK]: "Tap to end",
	};

	const whiteBackground =
		recordingState === RecordingState.RECORDING || recordingState === RecordingState.PLAYBACK;
	const cursorNotAllowed =
		recordingState === RecordingState.INITIALIZING || recordingState === RecordingState.PROCESSING;

	return (
		showComponents && (
			<div className={"absolute bottom-16 left-1/2 transform -translate-x-1/2"}>
				<div
					className={`w-16 h-16 rounded-full select-none transition-all duration-100 mx-auto
				[box-shadow:0_8px_0_0_#f81b22,0_13px_0_0_#f7404641] border-[1px] border-red-400
			 ${cursorNotAllowed ? "cursor-not-allowed" : "cursor-pointer active:translate-y-2 active:[box-shadow:0_0px_0_0_#f81b22,0_0px_0_0_#f7404641] active:border-b-[0px]"}
			 ${whiteBackground ? "bg-white" : "bg-red-500"}`}
					onClick={handleClick}
				>
					<span className="flex flex-col justify-center items-center h-full text-white font-bold text-lg">
						<div>{ComponentMap[recordingState]}</div>
					</span>
				</div>
				<p className={"mt-4 text-white text-sm mx-auto"}>{SubtitleTextMap[recordingState]}</p>
			</div>
		)
	);
};
