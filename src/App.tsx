import { useRef, useEffect } from "react";
import { Socket, io } from "socket.io-client";
import useSpeechToText from "react-hook-speech-to-text";
import { useMicVAD } from "@ricky0123/vad-react";

const API_URL = "http://127.0.0.1:3001";

export default function App() {
  const socketRef = useRef<Socket>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    console.log("ON STOP", interimResult);
    const lastMessage = results[results.length - 1];
    console.log("LASAT MES", results);
    socketRef.current!.emit(
      "ON_SPEECH_END",
      lastMessage?.transcript || interimResult
    );
    stopSpeechToText();
  };

  const onStartSpeech = () => {
    audioRef.current?.pause();
    startSpeechToText();
  };

  useEffect(() => {
    socketRef.current = io(API_URL);
    socketRef.current.on("SPEECH_RESULT", async (data) => {
      // console.log("DATA RESULT", data);
      // setSpeech(data.choices[0]?.message?.content);
      // querySpeechResult.refetch();
      const audioBlob = new Blob([data], { type: "audio/wav" });
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.play();
      audioRef.current = audio;
    });
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
        {results.map((result) => (
          <li key={result.timestamp}>
            {result.timestamp}
            {result.transcript}
          </li>
        ))}
        {interimResult && <li>{interimResult}</li>}
      </ul>
      <audio ref={audioRef} autoPlay playsInline className="hidden"></audio>
    </div>
  );
}
