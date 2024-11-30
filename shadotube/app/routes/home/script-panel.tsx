import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { o } from "node_modules/react-router/dist/production/fog-of-war-BDQTYoRQ.mjs";
import React from "react";
import { TranscriptResponse } from "youtube-transcript";

interface ScriptPanel {
  transcripts: TranscriptResponse[];
  currentWord: string;
  onClickScript: (script: TranscriptResponse) => void;
}

export const ScriptPanel: React.FC<ScriptPanel> = ({
  transcripts,
  currentWord,
  onClickScript,
}) => {
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              {transcripts.map((transcript, index) => (
                <Button
                  className="px-1"
                  key={index}
                  variant={"link"}
                  onClick={() => {
                    onClickScript(transcript);
                  }}
                >
                  {transcript.text.replaceAll("&amp;#39;", "'")}
                </Button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right column: Current word */}
        <Card>
          <CardHeader>
            <CardTitle>Current Word</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[70vh]">
              <h2 className="text-4xl font-bold">{currentWord}</h2>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
