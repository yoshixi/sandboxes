import { useSpeechRecognition, Recording } from "./use-speech-recoginition";
import { Button } from "@/components/ui/button";

export const speechRecognitionComp = () => {
  const {
    startRecognition,
    stopRecognition,
    finishTexts,
    interimTexts,
    recordings,
  } = useSpeechRecognition();

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
        {recordings &&
          recordings.map((recording, index) => (
            <RecordAudioBox key={index} recording={recording} />
          ))}
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
};

const RecordAudioBox = ({ recording }: { recording: Recording }) => {
  return (
    <article className="border-b border-black-10 py-4">
      <div className="p-12">
        <audio src={recording.audioURL} controls />
        <p className="text-12 text-right pt-4">{recording.recDate}</p>
      </div>
    </article>
  );
};
