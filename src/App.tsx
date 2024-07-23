import { useRef, useEffect } from "react";
import { Socket, io } from "socket.io-client";
import useSpeechToText from "react-hook-speech-to-text";
// import { useMicVAD } from "@ricky0123/vad-react";
// import { useDebouncedCallback } from "use-debounce";

const API_URL = import.meta.env.VITE_API_URL; // "http://127.0.0.1:3001";
type Messages = {
  role: "system" | "user";
  content: string;
};

export default function App() {
  const socketRef = useRef<Socket>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageRef = useRef<Messages[]>([]);
  const sliceTotal = useRef(0);

  // useMicVAD({
  //   startOnLoad: true,
  //   onSpeechStart: () => {
  //     console.log("START");
  //     audioRef.current?.pause();
  //     audioRef.current = null;
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
    googleApiKey: "AIzaSyApd5D0KEiQIl6GO0fxi7TkfAVHXk2bzLA",
    crossBrowser: true,
    timeout: 3000,
  });

  const onStopSpeech = () => {
    console.log("RESULTS", results);
    console.log("INTERIM", interimResult);
    audioRef.current = null;
    if (interimResult) {
      messageRef.current.push({
        role: "user",
        content: interimResult,
      });
    } else {
      const lastMessage = results[results.length - 1];
      const lastMessageContent =
        typeof lastMessage === "string" ? lastMessage : lastMessage?.transcript;
      if (lastMessageContent) {
        messageRef.current.push({
          role: "user",
          content: results
            .map((item) => (typeof item === "string" ? item : item.transcript))
            .slice(sliceTotal.current)
            .join(" "),
        });
      }
    }
    stopSpeechToText();
    sliceTotal.current = results.length;
    socketRef.current!.emit("ON_SPEECH_END", messageRef.current);
  };

  // const requestAnswer = useDebouncedCallback(onStopSpeech, 3000);

  // useEffect(() => {
  //   requestAnswer();
  //   const player = document.getElementById("player");
  //   player?.setAttribute("src", "");
  //   console.log("INTERUPT");
  // }, [results, interimResult, requestAnswer]);

  const onStartSpeech = () => {
    audioRef.current?.pause();
    startSpeechToText();
  };

  // const debounceStartSpeech = useDebouncedCallback(startSpeechToText, 1000);

  // useEffect(() => {
  //   console.log("IS RECORDING?", isRecording);
  //   if (!isRecording) {
  //     debounceStartSpeech();
  //   }
  // }, [isRecording, debounceStartSpeech]);

  useEffect(() => {
    socketRef.current = io(API_URL, {
      withCredentials: true,
    });
    socketRef.current.on("SPEECH_RESULT", async (data) => {
      const audioBlob = new Blob([data.buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      const newMessage = [
        ...messageRef.current,
        {
          role: "system",
          content: data.text,
        },
      ] as Messages[];
      console.log("REsPONSE BOT", newMessage);
      messageRef.current = newMessage;
      audioRef.current = audio;
      // audioRef.current.play();
      const player = document.getElementById("player");
      if (player) {
        player.setAttribute("src", url);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {results.map((result, i) => (
          <li key={i}>
            {typeof result === "string" ? result : result.timestamp}
            {typeof result === "string" ? result : result.transcript}
          </li>
        ))}
        {interimResult && <li>{interimResult}</li>}
      </ul>
      <audio
        id="player"
        ref={audioRef}
        autoPlay
        playsInline
        controls
        hidden
      ></audio>
    </div>
  );
}
