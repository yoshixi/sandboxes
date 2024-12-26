import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";

export interface Recording {
  audioURL: string;
  blob: Blob;
  id: string;
  recDate: string;
}

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
  const recorder = useRef<RecordRTC | undefined>();
  const [recordings, setRecordings] = useState<Recording[]>();

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

  const startRecognition = async ({
    lang,
    interimResults,
    continuous,
  }: IUseSpeechRecognition) => {
    if (window === undefined) {
      return;
    }
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.current?.start();
      setIsRecording(true);
      const newRecorder = new RecordRTC(stream, { type: "audio" });
      newRecorder.startRecording();
      recorder.current = newRecorder;
    } catch (e) {
      console.error("error", e);
    }
  };

  const stopRecognition = () => {
    recognition.current?.stop();
    recognition.current = undefined;
    if (recorder.current) {
      recorder.current.stopRecording(() => {
        const blob = recorder.current?.getBlob();
        if (!blob) {
          console.error("failed to get recording blob");
          return;
        }
        const audioURL = URL.createObjectURL(blob);
        const id =
          Math.random().toString(32).substring(2) +
          new Date().getTime().toString(32);

        const newRecording: Recording = {
          audioURL,
          blob,
          id,
          recDate: new Date().toISOString(),
        };
        setRecordings((prev) => [...(prev ? prev : []), newRecording]);
      });
    }
    setIsRecording(false);
  };

  return {
    startRecognition,
    stopRecognition,
    finishTexts,
    interimTexts,
    isRecording,
    recordings,
  };
};
