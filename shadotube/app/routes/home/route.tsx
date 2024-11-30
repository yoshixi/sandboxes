import type { Route } from "../+types/home";

import { YoutubeTranscript } from "youtube-transcript";
import { Suspense, useState, useCallback, useRef, lazy } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ReactPlayerProps } from "react-player/";
import { ScriptPanel } from "./script-panel";

const ReactPlayer = lazy(() => import("react-player"));

// Need to use fetcher to make requests since fetch is not available in remix to make json requests
// https://github.com/remix-run/remix/discussions/8547
import { useFetcher } from "react-router";

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

interface VideoPlayerProps extends ReactPlayerProps {}
const VideoPlayer: React.FC<VideoPlayerProps> = (config) => {
  return (
    <Suspense key={"video-player"} fallback={<div>Loading...</div>}>
      <ReactPlayer {...config} />;
    </Suspense>
  );
};

export default function Home({ actionData }: Route.ComponentProps) {
  const [url, setUrl] = useState("");
  const transcriptFetcher = useTranscriptFetcher();
  const handleGetTranscript = useCallback(() => {
    transcriptFetcher.fetch(url);
  }, [url]);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);

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
            <ScriptPanel
              transcripts={transcriptFetcher.data?.transcripts || []}
              currentWord={""}
              onClickScript={(script) => {
                setDuration(script.offset);
                playerRef.current?.seekTo(script.offset);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
