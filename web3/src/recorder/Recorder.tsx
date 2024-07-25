import { type MouseEventHandler, useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { audioWorkletCode } from "./audioWorklet.ts";
import { RecordingState } from "./RecordingState.ts";
import { CHANNELS, FRAMES_PER_BUFFER, MAX_RECORDING_DURATION, MESSAGES, SAMPLE_RATE, } from "./constants.ts";
import { useProgress } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";

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

	// change screen
	const { setUrl } = useScreenContentCtx();

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
	const lastScheduledEndTimeRef = useRef<number>(0);

	const closeWebSocket = () => {
		websocketRef.current?.close();
		websocketRef.current = null;
	};

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

		if (gainNodeRef.current && "disconnect" in gainNodeRef.current) {
			gainNodeRef.current.disconnect();
			gainNodeRef.current = null;
		}
	};

	const resetState = () => {
		setRecordingState(RecordingState.IDLING);
		audioBufferRef.current = new Int16Array(0);
		nextPlayTimeRef.current = audioContextRef.current?.currentTime as number;
		lastScheduledEndTimeRef.current = audioContextRef.current?.currentTime as number;
		startTimeRef.current = 0;
	};

	const comprehensiveCleanup = () => {
		closeWebSocket();
		closeAudioResources();
		resetState();
	};

	const sendAudioData = (audioData: Int16Array, eventType: string) => {
		if (websocketRef.current && websocketRef.current?.readyState === WebSocket.OPEN) {
			const arrayBuffer = audioData.buffer;
			const uint8Array = new Uint8Array(arrayBuffer);
			// @ts-ignore
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

		if (Date.now() - startTimeRef.current > MAX_RECORDING_DURATION) {
			console.log("Maximum duration reached, ending recording.");
			stopRecording();
		}
	};

	const playStartSound = () => {
		// @ts-ignore
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // 440 Hz, A4 note
		gainNode.gain.setValueAtTime(0, audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
		gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.5);
	};

	const schedulePlayback = (audioBuffer: AudioBuffer) => {
		const audioContext = audioContextRef.current;
		if (!audioContext) return;

		const source = audioContext.createBufferSource();
		source.buffer = audioBuffer;
		const gainNode = gainNodeRef.current;
		if (!gainNode) {
			return;
		}
		source.connect(gainNode);

		const currentTime = audioContext.currentTime;
		const startTime = Math.max(currentTime, nextPlayTimeRef.current);
		source.start(startTime);
		nextPlayTimeRef.current = startTime + audioBuffer.duration;
		lastScheduledEndTimeRef.current = nextPlayTimeRef.current;

		// Cleanup: remove the source node when it's finished playing
		source.onended = () => {
			source.disconnect();
		};
	};

	const resampleAudio = async (
		audioBuffer: AudioBuffer,
		newSampleRate: number,
	): Promise<AudioBuffer> => {
		const ctx = new OfflineAudioContext(
			CHANNELS,
			audioBuffer.duration * newSampleRate,
			newSampleRate,
		);
		const source = ctx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(ctx.destination);
		source.start();
		return ctx.startRendering();
	};

	const processAudioChunk = async (chunk: ArrayBuffer) => {
		if (!audioContextRef.current) {
			initAudioPlayback();
		}

		const audioContext = audioContextRef.current;
		if (!audioContext) return;

		const pcmData = new Int16Array(chunk);
		const audioBuffer = audioContext.createBuffer(CHANNELS, pcmData.length, SAMPLE_RATE);
		const channelData = audioBuffer.getChannelData(0);

		// Convert Int16Array to Float32Array
		for (let i = 0; i < pcmData.length; i++) {
			channelData[i] = pcmData[i] / 32768.0;
		}

		// Always resample the audio to match the device's sample rate
		const resampledBuffer = await resampleAudio(audioBuffer, audioContext.sampleRate);
		schedulePlayback(resampledBuffer);

		if (recordingState !== RecordingState.PLAYBACK) {
			setRecordingState(RecordingState.PLAYBACK);
			checkPlaybackFinished();
		}
	};

	const initAudioPlayback = () => {
		audioContextRef.current?.close();
		const audioContext = new AudioContext();
		audioContextRef.current = audioContext;

		const gainNode = audioContext.createGain();
		gainNodeRef.current = gainNode;
		gainNode.connect(audioContext.destination);

		// Reset timing references
		nextPlayTimeRef.current = audioContext.currentTime;
		lastScheduledEndTimeRef.current = audioContext.currentTime;
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
			playStartSound();
		};

		websocket.onopen = () => {
			console.log("WebSocket connection opened");
			void onSocketOpen();
		};

		websocket.onmessage = (event) => {
			if (event.data instanceof Blob) {
				event.data.arrayBuffer().then(processAudioChunk);
			} else if (typeof event.data === "string") {
				const parsed = JSON.parse(event.data) as Array<{
					role?: string | null;
					content?: string | null;
					tool_name?: string | null;
					// biome-ignore lint/suspicious/noExplicitAny: could be anything
					tool_res?: any;
				}>;

				console.log("Message: ", parsed);

				for (const p of parsed) {
					if (p.role && p.content) {
						MESSAGES.push({
							role: p.role,
							content: p.content,
						});
					}

					if (p.role === "assistant") {
						if (p.tool_name === "would_you_rather") {
							const newUrl = `${import.meta.env.VITE_SCREEN_BASE_URL}/would-you-rather?option1=${encodeURIComponent(p.tool_res.option1)}&option2=${encodeURIComponent(p.tool_res.option2)}`;
							setUrl(newUrl);
						} else if (p.tool_name === "generate_image") {
							const newUrl = `${import.meta.env.VITE_SCREEN_BASE_URL}/generate_image?imageUrl=${encodeURIComponent(p.tool_res as string)}`;
							setUrl(newUrl);
						}
					}
				}
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

	const checkPlaybackFinished = useCallback(() => {
		const audioContext = audioContextRef.current;
		if (!audioContext) return;

		const currentTime = audioContext.currentTime;
		if (currentTime >= lastScheduledEndTimeRef.current) {
			setRecordingState(RecordingState.IDLING);
		} else {
			requestAnimationFrame(checkPlaybackFinished);
		}
	}, []);

	const handleClick: MouseEventHandler = (e) => {
		e.preventDefault();
		e.stopPropagation();

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
				comprehensiveCleanup();
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

	useEffect(() => {
		return () => {
			comprehensiveCleanup();
		};
	}, []);

	const handleChangingRecordingState = () => {
		const handlerMap: Record<RecordingState, string> = {
			[RecordingState.IDLING]: "/idling",
			[RecordingState.INITIALIZING]: "/processing",
			[RecordingState.RECORDING]: "/recording",
			[RecordingState.PROCESSING]: "/processing",
			[RecordingState.PLAYBACK]: "/playback",
		};

		const newPath = handlerMap[recordingState];
		setUrl(`${import.meta.env.VITE_SCREEN_BASE_URL}${newPath}`);
	};
	useEffect(handleChangingRecordingState, [recordingState]);

	return (
		showComponents && (
			<div className={"absolute bottom-8 left-1/2 transform -translate-x-1/2"} style={{ zIndex: "19999999"}}>
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
				<p className={"mt-4 text-white mx-auto font-medium"}>{SubtitleTextMap[recordingState]}</p>
			</div>
		)
	);
};
