import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { o } from "node_modules/react-router/dist/production/fog-of-war-BDQTYoRQ.mjs";
import React, { Suspense } from "react";
import { TranscriptResponse } from "youtube-transcript";

interface ScriptPanel {
  left: React.ReactNode;
  right: () => JSX.Element;
}

export const ScriptPanel: React.FC<ScriptPanel> = ({ right, left }) => {
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">{left}</ScrollArea>
          </CardContent>
        </Card>

        {/* Right column: Current word */}
        <Card>
          <CardHeader>
            <CardTitle>Current Word</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              <Suspense key={"recording"} fallback={<div>Loading...</div>}>
                {right()}
              </Suspense>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
