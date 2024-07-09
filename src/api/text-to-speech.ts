import API from ".";
import { TextToSpeechReq, TextToSpeechRes } from "./types";

//  "?text=$paramtext&gender=female&lang=id&speaking_rate=1&pitch=1&uniqueId="

export const textToSpeech = async (params: TextToSpeechReq) => {
  const response = await API<TextToSpeechReq, TextToSpeechRes>({
    path: "",
    params: {
      text: params.text,
      gender: "female",
      lang: "id",
      speaking_rate: 1,
      pitch: 1,
    },
  });

  return response;
};
