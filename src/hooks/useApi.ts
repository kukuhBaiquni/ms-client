import OpenAI from "openai";
import env from "../env";
import axios from "axios";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function useApi() {
  async function transcribeAudio(audioBlob: Blob | ArrayBuffer) {
    try {
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      });

      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      });

      const transcription = response.text;
      return transcription;
    } catch (err) {
      console.error("Error transcribing autio:", err);
      return "";
    }
  }

  async function getToken() {
    try {
      const response = await axios.post(
        "https://api.heygen.com/v1/streaming.create_token",
        {},
        {
          headers: {
            "x-api-key": env.HEYGEN_API_KEY,
          },
        }
      );

      return response.data;
    } catch (err) {
      console.error("Error retrieving access token:", err);
      return {};
    }
  }

  async function chatCompletion(
    messages: { role: "user" | "system"; content: string }[]
  ) {
    try {
      const response = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
      });

      return response.choices?.[0]?.message.content;
    } catch (err) {
      console.error("Error get chat completion");
      return "";
    }
  }

  async function assistantCompletion(instructions: string) {
    try {
      const response = await axios.post(
        env.ASSISTANT_API_URL,
        {
          bot_type: "assistant",
          bot_id: 57,
          user_id: 152091,
          query: instructions,
          location: "0.0",
          language: "id",
        },
        {
          auth: {
            username: "lenna",
            password: "w4rt36KHARISMA",
          },
        }
      );

      console.log("RESPONSE", response);

      // return "";
      return response.data.response?.[0]?.text;
    } catch {
      console.error("Failed to get response");
      return "";
    }

    // try {
    //   const assistant = await openai.beta.threads.runs.createAndPoll(
    //     thread.id,
    //     {
    //       assistant_id: env.ASSISTANT_ID,
    //       instructions,
    //     },
    //   );

    //   if (assistant.status === "completed") {
    //     const message = await openai.beta.threads.messages.list(
    //       assistant.thread_id
    //     );
    //     // console.log("ASSISNTAT RESPONSE", message);
    //     return message.data?.[0]?.content?.[0]?.text?.value;
    //   }
    // } catch (err) {
    //   console.error("Error getting message from assistant");
    //   return "";
    // }
  }

  return {
    transcribeAudio,
    getToken,
    chatCompletion,
    assistantCompletion,
  };
}
