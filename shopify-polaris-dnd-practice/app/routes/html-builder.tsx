import { useState } from "react";
import { Page, Card, TextField } from "@shopify/polaris";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const COMPONENTS = [
  { type: "text", label: "Text" },
  { type: "textarea", label: "Text Area" },
];

function Sidebar() {
  return (
    <div style={{ width: 200, padding: 16, background: "#f6f6f7" }}>
      <h3 style={{ marginBottom: 16 }}>Components</h3>
      {COMPONENTS.map((comp) => (
        <DraggableItem key={comp.type} type={comp.type} label={comp.label} />
      ))}
    </div>
  );
}

function DraggableItem({ type, label }: { type: string; label: string }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "COMPONENT",
    item: { type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: 8,
        marginBottom: 8,
        background: "white",
        border: "1px solid #d1d1d1",
        borderRadius: 4,
        cursor: "grab",
      }}
    >
      {label}
    </div>
  );
}

function Canvas({
  components,
  onDrop,
}: {
  components: any[];
  onDrop: (type: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "COMPONENT",
    drop: (item: { type: string }) => onDrop(item.type),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));
  return (
    <div
      ref={drop}
      style={{
        flex: 1,
        minHeight: 500,
        margin: 32,
        background: isOver ? "#e0f7fa" : "#fff",
        border: "2px dashed #d1d1d1",
        borderRadius: 8,
        padding: 24,
        transition: "background 0.2s",
      }}
    >
      {components.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", marginTop: 100 }}>
          Drag components here
        </div>
      )}
      {components.map((comp, idx) => (
        <DroppedComponent key={idx} type={comp.type} />
      ))}
    </div>
  );
}

function DroppedComponent({ type }: { type: string }) {
  const [value, setValue] = useState("");
  if (type === "text") {
    return (
      <div style={{ marginBottom: 16 }}>
        <TextField
          label="Text"
          value={value}
          onChange={setValue}
          autoComplete="off"
        />
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <div style={{ marginBottom: 16 }}>
        <TextField
          label="Text Area"
          value={value}
          onChange={setValue}
          multiline
          autoComplete="off"
        />
      </div>
    );
  }
  return null;
}

export default function HtmlBuilder() {
  const [components, setComponents] = useState<{ type: string }[]>([]);
  const handleDrop = (type: string) =>
    setComponents((prev) => [...prev, { type }]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: "flex", height: "100vh", background: "#f9fafb" }}>
        <Sidebar />
        <Page title="No-code HTML Builder">
          <Card>
            <Canvas components={components} onDrop={handleDrop} />
          </Card>
        </Page>
      </div>
    </DndProvider>
  );
}
