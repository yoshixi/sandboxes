import React, { useState, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// --- Block Types and Registry ---
const BLOCK_TYPES: Array<{
  type: BlockType;
  label: string;
  canHaveChildren: boolean;
}> = [
  { type: "section", label: "Section", canHaveChildren: true },
  { type: "text", label: "Text", canHaveChildren: false },
  { type: "textarea", label: "Text Area", canHaveChildren: false },
];

// --- Data Types ---
type BlockType = "section" | "text" | "textarea";
interface BlockData {
  id: string;
  type: BlockType;
  children?: BlockData[];
}

type DragItem = {
  type: "sidebar" | "block";
  blockType?: BlockType;
  path?: string;
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// --- Sidebar ---
function Sidebar() {
  return (
    <div style={{ width: 200, padding: 16, background: "#f6f6f7" }}>
      <h3 style={{ marginBottom: 16 }}>Components</h3>
      {BLOCK_TYPES.map((block) => (
        <SidebarItem key={block.type} block={block} />
      ))}
    </div>
  );
}

function SidebarItem({ block }: { block: { type: BlockType; label: string } }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "sidebar",
    item: { type: "sidebar", blockType: block.type },
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
      {block.label}
    </div>
  );
}

// --- Trash Drop Zone ---
function TrashDropZone({ onDrop }: { onDrop: (path: string) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["block"],
    drop: (item: DragItem) => {
      if (item.path) onDrop(item.path);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));
  return (
    <div
      ref={drop}
      style={{
        margin: 16,
        padding: 16,
        background: isOver && canDrop ? "#ffeaea" : "#fff",
        border: `2px dashed ${isOver && canDrop ? "#d82c0d" : "#d1d1d1"}`,
        borderRadius: 8,
        textAlign: "center",
        color: "#d82c0d",
        fontWeight: 600,
      }}
    >
      🗑️ Drag here to delete
    </div>
  );
}

// --- Editor ---
function Editor({
  layout,
  setLayout,
}: {
  layout: BlockData[];
  setLayout: React.Dispatch<React.SetStateAction<BlockData[]>>;
}) {
  // Remove block by path
  const handleRemove = useCallback(
    (path: string) => {
      setLayout((prev) => removeBlockAtPath(prev, path).newLayout);
    },
    [setLayout]
  );

  // Drop handler for root drop zones
  const handleDrop = useCallback(
    (item: DragItem, index: number) => {
      setLayout((prev) => {
        if (item.type === "sidebar" && item.blockType) {
          const newBlock: BlockData = {
            id: generateId(),
            type: item.blockType,
            children: BLOCK_TYPES.find((b) => b.type === item.blockType)
              ?.canHaveChildren
              ? []
              : undefined,
          };
          return insertBlockAt(prev, null, index, newBlock);
        } else if (item.type === "block" && item.path) {
          return moveBlockTo(prev, item.path, null, index);
        }
        return prev;
      });
    },
    [setLayout]
  );

  // Root drop zone
  const [, drop] = useDrop(() => ({
    accept: ["sidebar", "block"],
    drop: (item: DragItem, monitor) => {
      if (!monitor.didDrop()) {
        handleDrop(item, layout.length);
      }
    },
  }));

  return (
    <div
      ref={drop}
      style={{
        flex: 1,
        minHeight: 500,
        margin: 32,
        background: "#fff",
        borderRadius: 8,
        padding: 24,
        position: "relative",
      }}
    >
      {layout.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", marginTop: 100 }}>
          Drag a Section here
        </div>
      )}
      {layout.map((block, idx) => (
        <BlockWithDropZones
          key={block.id}
          block={block}
          path={String(idx)}
          parentPath={null}
          setLayout={setLayout}
          layout={layout}
          index={idx}
          handleRemove={handleRemove}
        />
      ))}
      <DropZone
        parentPath={null}
        index={layout.length}
        setLayout={setLayout}
        layout={layout}
        isLast
      />
      <TrashDropZone onDrop={handleRemove} />
    </div>
  );
}

// --- Block With Drop Zones ---
function BlockWithDropZones({
  block,
  path,
  parentPath,
  setLayout,
  layout,
  index,
  handleRemove,
}: {
  block: BlockData;
  path: string;
  parentPath: string | null;
  setLayout: React.Dispatch<React.SetStateAction<BlockData[]>>;
  layout: BlockData[];
  index: number;
  handleRemove: (path: string) => void;
}) {
  return (
    <>
      <DropZone
        parentPath={parentPath}
        index={index}
        setLayout={setLayout}
        layout={layout}
      />
      <BlockRenderer
        block={block}
        path={path}
        setLayout={setLayout}
        layout={layout}
        handleRemove={handleRemove}
      />
    </>
  );
}

// --- DropZone ---
function DropZone({
  parentPath,
  index,
  setLayout,
  layout,
  isLast,
}: {
  parentPath: string | null;
  index: number;
  setLayout: React.Dispatch<React.SetStateAction<BlockData[]>>;
  layout: BlockData[];
  isLast?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [calculatedIndex, setCalculatedIndex] = useState(index);
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["sidebar", "block"],
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;

      const position = getDropPosition(monitor, ref.current);
      const newIndex = position === "before" ? index : index + 1;
      setCalculatedIndex(newIndex);
    },
    drop: (item: DragItem, monitor) => {
      if (!monitor.didDrop()) {
        // Use the calculated index from hover
        setLayout((prev) => {
          if (item.type === "sidebar" && item.blockType) {
            const newBlock: BlockData = {
              id: generateId(),
              type: item.blockType,
              children: BLOCK_TYPES.find((b) => b.type === item.blockType)
                ?.canHaveChildren
                ? []
                : undefined,
            };
            return insertBlockAt(prev, parentPath, calculatedIndex, newBlock);
          } else if (item.type === "block" && item.path) {
            return moveBlockTo(prev, item.path, parentPath, calculatedIndex);
          }
          return prev;
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }));
  return (
    <div
      ref={(node) => {
        ref.current = node;
        drop(node);
      }}
      style={{
        height: 10,
        margin: "4px 0",
        background: isOver && canDrop ? "#b6e0fe" : "transparent",
        borderTop:
          isOver && canDrop ? "2px solid #007ace" : "2px solid transparent",
        transition: "background 0.15s, border 0.15s",
      }}
    />
  );
}

// --- Block Renderer ---
function BlockRenderer({
  block,
  path,
  setLayout,
  layout,
  handleRemove,
}: {
  block: BlockData;
  path: string;
  setLayout: React.Dispatch<React.SetStateAction<BlockData[]>>;
  layout: BlockData[];
  handleRemove: (path: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "block",
      item: { type: "block", path },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [block, path]
  );

  const children = block.children || [];

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 8,
        position: "relative",
        border: "1px solid #e3e3e3",
        borderRadius: 4,
        padding: 8,
        background: "#fff",
      }}
    >
      <div style={{ position: "absolute", top: 4, right: 4, zIndex: 2 }}>
        <button
          onClick={() => handleRemove(path)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
      <BlockContent block={block} />
      {BLOCK_TYPES.find((b) => b.type === block.type)?.canHaveChildren && (
        <>
          {children.length === 0 && (
            <div style={{ color: "#bbb", fontSize: 13, minHeight: 32 }}>
              Drag elements here
            </div>
          )}
          {children.map((child, idx) => (
            <BlockWithDropZones
              key={child.id}
              block={child}
              path={path + "." + idx}
              parentPath={path}
              setLayout={setLayout}
              layout={layout}
              index={idx}
              handleRemove={handleRemove}
            />
          ))}
          <DropZone
            parentPath={path}
            index={children.length}
            setLayout={setLayout}
            layout={layout}
            isLast
          />
        </>
      )}
    </div>
  );
}

// --- Block Content ---
function BlockContent({ block }: { block: BlockData }) {
  const [value, setValue] = useState("");
  if (block.type === "text") {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Text"
        style={{ width: "100%" }}
      />
    );
  }
  if (block.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Text Area"
        style={{ width: "100%" }}
      />
    );
  }
  if (block.type === "section") {
    return <div style={{ fontWeight: 600, marginBottom: 8 }}>Section</div>;
  }
  return null;
}

// --- Helpers for block tree manipulation ---
function insertBlockAt(
  layout: BlockData[],
  parentPath: string | null,
  index: number,
  newBlock: BlockData
): BlockData[] {
  if (parentPath === null) {
    return [...layout.slice(0, index), newBlock, ...layout.slice(index)];
  }
  const parts = parentPath.split(".").map(Number);
  const idx = parts[0];
  if (parts.length === 1) {
    const updated = [...layout];
    const parent = updated[idx];
    if (!BLOCK_TYPES.find((b) => b.type === parent.type)?.canHaveChildren)
      return layout;
    const children = parent.children ? [...parent.children] : [];
    children.splice(index, 0, newBlock);
    updated[idx] = { ...parent, children };
    return updated;
  }
  return [
    ...layout.slice(0, idx),
    {
      ...layout[idx],
      children: insertBlockAt(
        layout[idx].children || [],
        parts.slice(1).join("."),
        index,
        newBlock
      ),
    },
    ...layout.slice(idx + 1),
  ];
}

function moveBlockTo(
  layout: BlockData[],
  fromPath: string,
  toParentPath: string | null,
  toIndex: number
): BlockData[] {
  const { block: movingBlock, newLayout } = removeBlockAtPath(layout, fromPath);
  if (!movingBlock) return layout;
  return insertBlockAt(newLayout, toParentPath, toIndex, movingBlock);
}

function removeBlockAtPath(
  layout: BlockData[],
  path: string
): { block: BlockData | null; newLayout: BlockData[] } {
  const parts = path.split(".").map(Number);
  if (parts.length === 1) {
    const idx = parts[0];
    const block = layout[idx];
    return {
      block,
      newLayout: [...layout.slice(0, idx), ...layout.slice(idx + 1)],
    };
  }
  const idx = parts[0];
  const { block, newLayout } = removeBlockAtPath(
    layout[idx].children || [],
    parts.slice(1).join(".")
  );
  return {
    block,
    newLayout: [
      ...layout.slice(0, idx),
      { ...layout[idx], children: newLayout },
      ...layout.slice(idx + 1),
    ],
  };
}

function getDropPosition(
  monitor: DropTargetMonitor,
  element: HTMLElement
): "before" | "after" {
  const hoverBoundingRect = element.getBoundingClientRect();
  const clientOffset = monitor.getClientOffset();

  if (!clientOffset) return "after";

  const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
  const hoverClientY = clientOffset.y - hoverBoundingRect.top;

  return hoverClientY < hoverMiddleY ? "before" : "after";
}

// --- Main ---
export default function HtmlBuilder2() {
  const [layout, setLayout] = useState<BlockData[]>([]);
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: "flex", height: "100vh", background: "#f9fafb" }}>
        <Sidebar />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 24 }}>
            No-code HTML Builder (React DnD Example)
          </h2>
          <Editor layout={layout} setLayout={setLayout} />
        </div>
      </div>
    </DndProvider>
  );
}
