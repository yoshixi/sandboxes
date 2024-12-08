import { o } from "node_modules/react-router/dist/production/fog-of-war-BDQTYoRQ.mjs";
import { useEffect, useRef, useState } from "react";

interface ISpeechRecognitionEventResultItem {
  isFinal: boolean;
  [key: number]:
    | undefined
    | {
        transcript: string;
      };
}

interface ISpeechRecognitionEvent {
  isTrusted?: boolean;
  resultIndex: number;
  results: ISpeechRecognitionEventResultItem[];
}

interface ISpeechRecognition extends EventTarget {
  grammars: string;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;
  onaudiostart: () => void;
  onaudioend: () => void;
  onend: () => void;
  onerror: () => void;
  onnomatch: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onsoundstart: () => void;
  onsoundend: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  onstart: () => void;
  abort(): void;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
// declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

interface IUseSpeechRecognition {
  lang: "ja" | "en";
  continuous: boolean; // 連続的に音声認識
  interimResults: boolean; // 途中結果の出力
}

interface ISpeechRecognitionResult {
  finishText: string;
  interimText: string;
}

/**
 * 音声認識ReactHook
 * @param props
 * @returns
 */
export const useSpeechRecognition = () => {
  const recognition = useRef<ISpeechRecognition | undefined>();

  const [finishTexts, setFinishTexts] = useState<string[]>([]);
  const [interimTexts, setInterimTexts] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    console.dir("recognition.current", recognition.current);
    if (recognition.current) {
      recognition.current.onresult = (event: ISpeechRecognitionEvent) => {
        console.dir(event);

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const t = event.results[i][0]?.transcript;
            const transcript = t ? t : "";
            setFinishTexts((prev) => [...prev, transcript]);
            setInterimTexts([]);
          } else {
            const t = event.results[i][0]?.transcript;
            const transcript = t ? t : "";
            setInterimTexts((prev) => [...prev, transcript]);
          }
        }
      };
    }
  }, [recognition, isRecording]);

  const startRecognition = ({
    lang,
    interimResults,
    continuous,
  }: IUseSpeechRecognition) => {
    window.SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    if (!recognition.current) {
      console.error("SpeechRecognition is not supported");
      return;
    }

    recognition.current.lang = lang;
    recognition.current.interimResults = interimResults;
    recognition.current.continuous = continuous;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        recognition.current?.start();
        console.log("Recognition started");
        setIsRecording(true);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const stopRecognition = () => {
    recognition.current?.stop();
    recognition.current = undefined;
    setIsRecording(false);
  };

  return {
    startRecognition,
    stopRecognition,
    finishTexts,
    interimTexts,
    isRecording,
  };
};
