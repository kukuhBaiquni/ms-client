import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi,
} from "@heygen/streaming-avatar";

import { useMicVAD, utils } from "@ricky0123/vad-react";

import { useState, useRef, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

import useApi from "./hooks/useApi";
import clsx from "clsx";

const AVATAR = "josh_lite3_20230714";

const VOICE = {
  voice_id: "077ab11b14f04ce0b49b5f6e5cc20979",
  language: "English",
  gender: "Male",
  name: "Paul - Natural",
  preview_audio:
    "https://static.heygen.ai/voice_preview/k6dKrFe85PisZ3FMLeppUM.mp3",
  support_pause: true,
  emotion_support: false,
};

type Message = {
  role: "user" | "system";
  content: string;
};

export default function App() {
  const mediaStreamRef = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatarApi | null>(null);

  const [debug, setDebug] = useState<string>();
  const [stream, setStream] = useState<MediaStream>();
  const [data, setData] = useState<NewSessionData>();
  const [mute, setMute] = useState(true);
  const [initialize, setInitialize] = useState(false);
  const [transcription, setTranscription] = useState("listening...");
  const [messages, setMessages] = useState<
    { role: "user" | "system"; content: string }[]
  >([]);

  // const [query, setQuery] = useState("");

  const api = useApi();

  const afterStopSpeaking = async (audio: Float32Array) => {
    if (avatar.current && initialize) {
      setTranscription("transcripting...");
      const text = await api.transcribeAudio(utils.encodeWAV(audio));
      setTranscription(text);
      const msg: Message = {
        role: "user",
        content: text,
      };
      setMessages([...messages, msg]);
      getGPTResponse(msg);
    }
  };

  const debouncedAfterStopSpeaking = useDebouncedCallback(
    afterStopSpeaking,
    300
  );

  const startSession = async () => {
    try {
      const response = await avatar.current?.createStartAvatar(
        {
          newSessionRequest: {
            quality: "medium",
            avatarName: AVATAR,
            voice: { voiceId: VOICE.voice_id },
          },
        },
        setDebug
      );
      setData(response);
      setStream(avatar.current?.mediaStream);
    } catch (err) {
      console.error("Error starting avatar session:", err);
    }
  };

  const endSession = async () => {
    await avatar.current?.stopAvatar(
      {
        stopSessionRequest: {
          sessionId: data?.sessionId,
        },
      },
      setDebug
    );
    setStream(undefined);
  };

  const handleInterupt = async () => {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }

    await avatar.current
      ?.interrupt({
        interruptRequest: {
          sessionId: data?.sessionId,
        },
      })
      .catch((err) => {
        console.error("Failed interrupt:", err);
      });
  };

  const getGPTResponse = async (msg: Message) => {
    try {
      setDebug("Waiting for GPT response...");
      // const response = await api.chatCompletion([...messages, msg]);
      const response = await api.assistantCompletion(msg.content);
      console.log("RESPONSE", response);
      setMessages((old) => [
        ...old,
        {
          role: "system",
          content: response as string,
        },
      ]);
      speak(response as string);
    } catch (err) {
      console.error("Error get GPT response:", err);
    }
  };

  const speak = async (text: string) => {
    try {
      setTranscription("");
      await avatar.current?.speak({
        taskRequest: {
          text: text.slice(0, 999),
          sessionId: data?.sessionId,
        },
      });
      setTranscription("listening...");
    } catch (err) {
      console.error("Error speak", err);
    }
  };

  async function init() {
    const token = await api.getToken();

    avatar.current = new StreamingAvatarApi(
      new Configuration({ accessToken: token.data.token, jitterBuffer: 200 })
    );
    startSession();
  }

  useEffect(() => {
    if (stream && mediaStreamRef.current) {
      mediaStreamRef.current.srcObject = stream;
      mediaStreamRef.current.onloadedmetadata = () => {
        mediaStreamRef.current?.play();
      };
    }
  }, [mediaStreamRef, stream]);

  const toggleMute = () => {
    if (mute) {
      setMute(false);
    } else {
      setMute(true);
    }
  };

  useMicVAD({
    startOnLoad: true,
    onSpeechEnd: mute && avatar.current ? () => {} : debouncedAfterStopSpeaking,
    onSpeechStart: mute && avatar.current ? () => {} : handleInterupt,
  });

  // const onClick = async () => {
  //   const response = await api.assistantCompletion(query);
  //   setQuery(response);
  //   speak(response);
  // };

  return (
    <main className="w-screen h-screen">
      <div className="h-full mx-auto">
        <div className="w-full h-[calc(100vh-200px)] bg-slate-800 relative">
          <video
            ref={mediaStreamRef}
            autoPlay
            className={clsx(initialize ? "opacity-100" : "opacity-0")}
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          >
            <track kind="captions" />
          </video>
          {initialize && !mute && transcription && (
            <div className="absolute bottom-4 p-2 w-auto left-1/2 rounded -translate-x-1/2 fc bg-black bg-opacity-35 text-white">
              <span className="text-center">{transcription}</span>
            </div>
          )}
          {!initialize && (
            <button
              onClick={() => {
                setInitialize(true);
                init();
              }}
              className="p-2 bg-sky-500 text-white rounded absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
            >
              Start Session
            </button>
          )}
          {initialize && (
            <button
              onClick={() => {
                setInitialize(false);
                setMute(true);
                endSession();
              }}
              className="p-2 bg-red-500 text-white rounded absolute top-2 right-2"
            >
              End Session
            </button>
          )}
          {/* <input type="text" onChange={(e) => setQuery(e.target.value)} />
          <button type="button" onClick={onClick}>
            Assistant Request
          </button> */}
          <button
            onClick={toggleMute}
            className={clsx(
              "w-full p-2 text-white",
              mute ? "bg-sky-500" : "bg-red-500"
            )}
          >
            {mute ? "Unmute" : "Mute"}
          </button>
          <div className=" bg-black p-2 h-[160px]">
            <pre className="text-center text-green-500 mb-2">DEBUG</pre>
            <pre className="text-center text-wrap text-green-500 text-sm">
              {debug}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
