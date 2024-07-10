import { useRef, useEffect } from "react";
import { Socket, io } from "socket.io-client";
import useSpeechToText from "react-hook-speech-to-text";
// import { useMicVAD } from "@ricky0123/vad-react";

const API_URL = "http://127.0.0.1:3001";
type Messages = {
  role: "system" | "user";
  content: string;
};

export default function App() {
  const socketRef = useRef<Socket>();
  const audioContextRef = useRef<AudioContext | null>(null);
  // const sourceRef = useRef(null)
  const bufferQueue = useRef<ArrayBufferLike[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageRef = useRef<Messages[]>([]);

  // useMicVAD({
  //   startOnLoad: true,
  //   onSpeechStart: () => {
  //     console.log("START");
  //     if (!isRecording) {
  //       startSpeechToText();
  //     }
  //   },
  //   onSpeechEnd: () => {
  //     console.log("STOP");
  //     socketRef.current!.emit("ON_SPEECH_END", results);
  //   },
  // });

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const onStopSpeech = () => {
    const lastMessage = results[results.length - 1];
    const messageContent =
      typeof lastMessage === "string" ? lastMessage : lastMessage.transcript;
    const newMessage = [
      ...messageRef.current,
      {
        role: "user",
        content: messageContent,
      },
    ] as Messages[];
    console.log("USER QUESTION", newMessage);
    messageRef.current = newMessage;
    socketRef.current!.emit("ON_SPEECH_END", newMessage);
    stopSpeechToText();
  };

  const onStartSpeech = () => {
    audioRef.current?.pause();
    startSpeechToText();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const playAudio = () => {
    console.log("AUDIO PLAY");
    if (
      bufferQueue.current.length === 0 ||
      audioContextRef.current?.state !== "running"
    ) {
      return;
    }
    const audioBuffer = bufferQueue.current.shift();
    console.log("AUDIO BUFFER", bufferQueue.current);
    audioContextRef.current.decodeAudioData(
      audioBuffer as ArrayBufferLike,
      (buffer) => {
        const source = audioContextRef.current!.createBufferSource();
        console.log("SOURCE___", source);
        source!.buffer = buffer;
        source.connect(audioContextRef.current?.destination as AudioNode);
        source.start(0);

        source.onended = () => {
          playAudio();
        };
      }
    );
  };

  useEffect(() => {
    audioContextRef.current = new window.AudioContext();
    socketRef.current = io(API_URL);

    socketRef.current.on("SPEECH_RESULT_QUEUE", (data) => {
      console.log("QUEUE", data);
      const audioBuffer = new Uint8Array(data).buffer;
      console.log("BUFFER____", audioBuffer);
      bufferQueue.current.push(audioBuffer);
      playAudio();
    });

    // socketRef.current.on("SPEECH_RESULT", async (data) => {
    //   const audioBlob = new Blob([data.buffer], { type: "audio/wav" });
    //   const url = URL.createObjectURL(audioBlob);
    //   const audio = new Audio(url);
    //   const newMessage = [
    //     ...messageRef.current,
    //     {
    //       role: "user",
    //       content: data.text,
    //     },
    //   ] as Messages[];
    //   console.log("REsPONSE BOT", newMessage);
    //   messageRef.current = newMessage;
    //   audio.play();
    //   audioRef.current = audio;
    //   // console.log("DATA RESULT", data);
    //   // setSpeech(data.choices[0]?.message?.content);
    //   // querySpeechResult.refetch();
    // });
  }, [playAudio]);

  if (error) {
    return <p>Web Speech API is not available in this browser</p>;
  }

  return (
    <div>
      <h1>Recording: {isRecording.toString()}</h1>
      <button onClick={isRecording ? onStopSpeech : onStartSpeech}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <ul>
        {results.map((result) => (
          <li key={typeof result === "string" ? result : result.timestamp}>
            {typeof result === "string" ? result : result.timestamp}
            {typeof result === "string" ? result : result.transcript}
          </li>
        ))}
        {interimResult && <li>{interimResult}</li>}
      </ul>
      <audio ref={audioRef} autoPlay playsInline className="hidden"></audio>
    </div>
  );
}
