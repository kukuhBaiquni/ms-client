import { useRef, useEffect, useState, FormEvent } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = "http://127.0.0.1:3001";

function Draft() {
  const socketRef = useRef<Socket>();
  const peer = useRef<RTCPeerConnection | null>(null);
  const localMedia = useRef<HTMLVideoElement | null>(null);
  const remoteMedia = useRef<HTMLVideoElement | null>(null);
  const localStream = useRef<MediaStream>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string[]>([]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputRef.current?.value) {
      socketRef.current?.emit("MESSAGE", inputRef.current.value);
      inputRef.current.value = "";
    }
  };

  const onIceCandidate = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      console.log("SEND ICE CANDIDATE");
      socketRef.current?.emit("ICE_CANDIDATE", { iceCandidate: e.candidate });
    }
  };

  const onTrack = (e: RTCTrackEvent) => {
    console.log("TRACK");
    const [stream] = e.streams;
    if (remoteMedia.current) {
      remoteMedia.current.srcObject = stream;
    }
  };

  const onNegotiation = async () => {
    if (peer.current) {
      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);
      console.log("SEND OFFER");
      socketRef.current?.emit("OFFER", { offer });
    }
  };

  const createPeerConnection = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (localMedia.current) {
        localMedia.current.srcObject = localStream.current;
        localMedia.current.onloadedmetadata = () => {
          localMedia.current!.muted = true;
        };
      }

      peer.current = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      peer.current.onicecandidate = onIceCandidate;
      peer.current.ontrack = onTrack;
      peer.current.onnegotiationneeded = onNegotiation;

      localStream.current?.getTracks().forEach((track) => {
        peer.current?.addTrack(track, localStream.current!);
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    socketRef.current = io(API_URL);

    socketRef.current.on("PAOK", async () => {
      await createPeerConnection();
    });

    socketRef.current.on(
      "OFFER",
      async (data: { offer: RTCSessionDescription }) => {
        console.log("OFFER");
        if (!peer.current) {
          await createPeerConnection();
        }
        await peer.current!.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        const answer = await peer.current!.createAnswer();
        await peer.current!.setLocalDescription(answer);

        console.log("SEND ANSWER");
        socketRef.current?.emit("ANSWER", { answer });
      }
    );

    socketRef.current.on(
      "ANSWER",
      async (data: { answer: RTCSessionDescription }) => {
        console.log("ACCEPT ANSWER");
        if (peer.current) {
          await peer.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    );

    socketRef.current.on(
      "ICE_CANDIDATE",
      async (data: { iceCandidate: RTCIceCandidate }) => {
        console.log("ICE CANDIDATE");
        try {
          if (peer.current) {
            const candidate = new RTCIceCandidate(data.iceCandidate);
            await peer.current.addIceCandidate(candidate);
            console.log("%cSuccess add ice candidate", "color: #03fc4e");
          }
        } catch {
          console.log("%cError add ice candidate", "color: #fc0320");
        }
      }
    );
  }, []);

  useEffect(() => {
    socketRef.current?.on("MESSAGE", (data) => {
      setMessage((prevMessages) => [...prevMessages, data]);
    });
  }, []);

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          className="border border-black text-black"
          type="text"
          ref={inputRef}
        />
      </form>
      {message.map((msg, i) => (
        <div className="block text-black" key={i}>
          {msg}
        </div>
      ))}
      <video
        className="w-[300px] h-[300px]"
        ref={localMedia}
        autoPlay
        playsInline
        id="local-video"
      ></video>
      <video
        className="w-[300px] h-[300px]"
        ref={remoteMedia}
        autoPlay
        playsInline
        id="remote-video"
      ></video>
      <button onClick={createPeerConnection} className="bg-red-400">
        Start
      </button>
    </div>
  );
}

export default Draft;
