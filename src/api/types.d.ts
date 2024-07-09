import { AxiosError } from "axios";

export type ApiError<T> = AxiosError<Omit<T, "data">>;

export type TextToSpeechReq = {
  text: string;
};

export type TextToSpeechRes = {
  data;
};
