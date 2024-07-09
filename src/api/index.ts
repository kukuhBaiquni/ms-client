import axios, { ResponseType } from "axios";
import env from "../env";

const { API_URL } = env;

type Args<T> = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: object;
  data?: T;
  responseType?: ResponseType;
};

axios.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    if (err.response.status === 401) {
      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/") {
          // code handler for unauthorized
        }
        return err.response;
      }
    }
  }
);

const API = async <T, U>(props: Args<T>): Promise<U> => {
  const {
    path,
    method = "GET",
    params = {},
    data,
    responseType = "json",
  } = props;
  const timeout = 15e3;
  let token;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("access_token");
  }
  const config = {
    timeout,
    baseURL: API_URL,
    url: path,
    method,
    data,
    responseType,
    params: {
      ...params,
    },
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  };
  const response = await axios(config);
  return response.data;
};

export default API;
