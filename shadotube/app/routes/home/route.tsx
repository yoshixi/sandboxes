import type { Route } from "../+types/home";

import { YoutubeTranscript } from "youtube-transcript";
import {
  Suspense,
  useState,
  useCallback,
  useRef,
  lazy,
  useMemo,
  useEffect,
} from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScriptPanel } from "./script-panel";

// Need to use fetcher to make requests since fetch is not available in remix to make json requests
// https://github.com/remix-run/remix/discussions/8547
import { useFetcher } from "react-router";
import { useSpeechRecognition } from "./use-speech-recoginition";

const ReactPlayer = lazy(() => import("react-player"));
export async function action({ request }: Route.ActionArgs) {
  const body = await request.json();
  const transcripts = await YoutubeTranscript.fetchTranscript(body.url, {
    lang: "en",
  });
  return {
    transcripts,
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// useFetcher is wrapper
const useTranscriptFetcher = () => {
  const fetcher = useFetcher<typeof action>();

  return {
    fetch: async (url: string) => {
      return fetcher.submit(
        { url },
        {
          method: "POST",
          encType: "application/json",
        }
      );
    },
    ...fetcher,
  };
};

export default function Home({ actionData }: Route.ComponentProps) {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=UF8uR6Z6KLc");
  const transcriptFetcher = useTranscriptFetcher();
  const handleGetTranscript = useCallback(() => {
    transcriptFetcher.fetch(url);
  }, [url]);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);

  const { startRecognition, stopRecognition, finishTexts, interimTexts } =
    useSpeechRecognition();

  const transcriptLinks = useMemo(() => {
    if (!transcriptFetcher.data) {
      return null;
    }
    return transcriptFetcher.data?.transcripts.map((transcript, index) => (
      <Button
        className="px-1"
        key={index}
        variant={"link"}
        onClick={() => {
          console.log("seeking to", transcript.offset);
          playerRef.current?.seekTo(transcript.offset);
        }}
      >
        {transcript.text.replaceAll("&amp;#39;", "'")}
      </Button>
    ));
  }, [transcriptFetcher.data?.transcripts]);

  const speechRecognitionComp = useMemo(() => {
    return (
      <div>
        <div>
          <Button
            onClick={() =>
              startRecognition({
                lang: "en",
                interimResults: true,
                continuous: true,
              })
            }
          >
            Start Recognition
          </Button>
          <Button
            onClick={() => {
              console.log("stop recognition");
              stopRecognition();
            }}
          >
            Stop Recognition
          </Button>
        </div>
        <div>
          {finishTexts?.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>
        <div>
          {interimTexts?.map((text, index) => (
            <span className="text-gray-300" key={index}>
              {text}
            </span>
          ))}
        </div>
      </div>
    );
  }, [startRecognition, stopRecognition, finishTexts]);

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <div className="max-w-[300px] w-full space-y-6 px-4">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <Button
            onClick={async () => {
              handleGetTranscript();
            }}
          >
            Get Transcript
          </Button>
        </div>
        <div>
          <Suspense key={"video-player"} fallback={<div>Loading...</div>}>
            <ReactPlayer
              ref={playerRef}
              url={url}
              playing={true}
              config={{
                youtube: {
                  playerVars: { start: duration, controls: 1 },
                },
              }}
            />
          </Suspense>
        </div>
        <div>
          {transcriptFetcher.data && (
            <ScriptPanel left={transcriptLinks} right={speechRecognitionComp} />
          )}
        </div>
      </div>
    </main>
  );
}
