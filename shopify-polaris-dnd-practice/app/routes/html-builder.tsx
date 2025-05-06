import { useState, useCallback } from "react";
import { Page, Card, TextField, Icon } from "@shopify/polaris";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DeleteIcon } from "@shopify/polaris-icons";

// --- Block Registry ---
type BlockType = "section" | "text" | "textarea";
interface BlockDef {
  label: string;
  canHaveChildren: boolean;
  render: (props: any) => JSX.Element;
}
const BLOCKS: Record<BlockType, BlockDef> = {
  section: {
    label: "Section",
    canHaveChildren: true,
    render: ({ children }: any) => (
      <div
        style={{
          border: "2px solid #d1d1d1",
          borderRadius: 8,
          marginBottom: 24,
          padding: 16,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Section</div>
        <div>{children}</div>
      </div>
    ),
  },
  text: {
    label: "Text",
    canHaveChildren: false,
    render: ({ value, setValue }: any) => (
      <TextField
        label="Text"
        value={value}
        onChange={setValue}
        autoComplete="off"
      />
    ),
  },
  textarea: {
    label: "Text Area",
    canHaveChildren: false,
    render: ({ value, setValue }: any) => (
      <TextField
        label="Text Area"
        value={value}
        onChange={setValue}
        multiline
        autoComplete="off"
      />
    ),
  },
};

const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];

// --- Data Types ---
interface BlockData {
  id: string;
  type: BlockType;
  props?: any;
  children?: BlockData[];
}

type DragItem = {
  type: BlockType | "block" | "sidebar" | "trash";
  block?: BlockData;
  path?: string;
  fromSidebar?: boolean;
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// --- Sidebar ---
function Sidebar() {
  return (
    <div style={{ width: 200, padding: 16, background: "#f6f6f7" }}>
      <h3 style={{ marginBottom: 16 }}>Components</h3>
      {BLOCK_TYPES.map((type) => (
        <SidebarDraggableItem
          key={type}
          type={type}
          label={BLOCKS[type].label}
        />
      ))}
    </div>
  );
}

function SidebarDraggableItem({
  type,
  label,
}: {
  type: BlockType;
  label: string;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "sidebar",
    item: { type, fromSidebar: true },
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#d82c0d",
        fontWeight: 600,
      }}
    >
      <Icon source={DeleteIcon} tone="critical" />
      <span style={{ marginLeft: 8 }}>Drag here to delete</span>
    </div>
  );
}

// --- Editor ---
function Editor({
  blocks,
  setBlocks,
}: {
  blocks: BlockData[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
}) {
  // Remove block by path
  const handleRemove = useCallback(
    (path: string) => {
      setBlocks(removeBlockAtPath(blocks, path).newBlocks);
    },
    [blocks, setBlocks]
  );

  // Drop handler for root drop zones
  const handleDrop = useCallback(
    (item: DragItem, index: number) => {
      console.log("blocks", blocks);
      if (item.fromSidebar && item.type && typeof item.type === "string") {
        // Add new block from sidebar
        const newBlock: BlockData = {
          id: generateId(),
          type: item.type as BlockType,
          props: {},
          children: BLOCKS[item.type as BlockType].canHaveChildren
            ? []
            : undefined,
        };
        setBlocks((prevBlocks) =>
          insertBlockAt(prevBlocks, null, index, newBlock)
        );
      } else if (item.path) {
        // Move block
        setBlocks(moveBlockTo(blocks, item.path, null, index));
      }
    },
    [blocks, setBlocks]
  );

  // Root drop zone
  const [, drop] = useDrop(() => ({
    accept: ["sidebar", "block"],
    drop: (item: DragItem, monitor) => {
      if (!monitor.didDrop()) {
        handleDrop(item, blocks.length);
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
      {blocks.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", marginTop: 100 }}>
          Drag a Section here
        </div>
      )}
      {blocks.map((block, idx) => (
        <BlockWithDropZones
          key={block.id}
          block={block}
          path={String(idx)}
          parentPath={null}
          setBlocks={setBlocks}
          blocks={blocks}
          index={idx}
          handleRemove={handleRemove}
        />
      ))}
      <DropZone
        parentPath={null}
        index={blocks.length}
        setBlocks={setBlocks}
        blocks={blocks}
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
  setBlocks,
  blocks,
  index,
  handleRemove,
}: {
  block: BlockData;
  path: string;
  parentPath: string | null;
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
  blocks: BlockData[];
  index: number;
  handleRemove: (path: string) => void;
}) {
  // Drop zone before this block
  return (
    <>
      <DropZone
        parentPath={parentPath}
        index={index}
        setBlocks={setBlocks}
        blocks={blocks}
      />
      <BlockRenderer
        block={block}
        path={path}
        setBlocks={setBlocks}
        blocks={blocks}
        handleRemove={handleRemove}
      />
    </>
  );
}

// --- DropZone ---
function DropZone({
  parentPath,
  index,
  setBlocks,
  blocks,
  isLast,
}: {
  parentPath: string | null;
  index: number;
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
  blocks: BlockData[];
  isLast?: boolean;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["sidebar", "block"],
    drop: (item: DragItem, monitor) => {
      if (!monitor.didDrop()) {
        if (item.fromSidebar && item.type && typeof item.type === "string") {
          // Add new block from sidebar
          const newBlock: BlockData = {
            id: generateId(),
            type: item.type as BlockType,
            props: {},
            children: BLOCKS[item.type as BlockType].canHaveChildren
              ? []
              : undefined,
          };
          setBlocks((prevBlocks) =>
            insertBlockAt(prevBlocks, parentPath, index, newBlock)
          );
        } else if (item.path) {
          // Move block
          setBlocks(moveBlockTo(blocks, item.path, parentPath, index));
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }));
  return (
    <div
      ref={drop}
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
  setBlocks,
  blocks,
  handleRemove,
}: {
  block: BlockData;
  path: string;
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
  blocks: BlockData[];
  handleRemove: (path: string) => void;
}) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: "block",
      item: { type: "block", block, path },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [block, path]
  );

  const blockDef = BLOCKS[block.type];
  const [value, setValue] = useState(block.props?.value || "");
  const renderProps = blockDef.canHaveChildren ? {} : { value, setValue };
  const children = block.children || [];

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 8,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 4, right: 4, zIndex: 2 }}>
        <button
          onClick={() => handleRemove(path)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
          title="Delete"
        >
          <Icon source={DeleteIcon} tone="critical" />
        </button>
      </div>
      {blockDef.render({
        ...renderProps,
        children: blockDef.canHaveChildren ? (
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
                setBlocks={setBlocks}
                blocks={blocks}
                index={idx}
                handleRemove={handleRemove}
              />
            ))}
            <DropZone
              parentPath={path}
              index={children.length}
              setBlocks={setBlocks}
              blocks={blocks}
              isLast
            />
          </>
        ) : null,
      })}
    </div>
  );
}

// --- Helpers for block tree manipulation ---
function insertBlockAt(
  blocks: BlockData[],
  parentPath: string | null,
  index: number,
  newBlock: BlockData
): BlockData[] {
  if (parentPath === null) {
    const updated = [...blocks];
    updated.splice(index, 0, newBlock);
    return updated;
  }
  const parts = parentPath.split(".").map(Number);
  const idx = parts[0];
  if (parts.length === 1) {
    const updated = [...blocks];
    const parent = updated[idx];
    if (!BLOCKS[parent.type].canHaveChildren) return blocks;
    const children = parent.children ? [...parent.children] : [];
    children.splice(index, 0, newBlock);
    updated[idx] = { ...parent, children };
    return updated;
  }
  return [
    ...blocks.slice(0, idx),
    {
      ...blocks[idx],
      children: insertBlockAt(
        blocks[idx].children || [],
        parts.slice(1).join("."),
        index,
        newBlock
      ),
    },
    ...blocks.slice(idx + 1),
  ];
}

function moveBlockTo(
  blocks: BlockData[],
  fromPath: string,
  toParentPath: string | null,
  toIndex: number
): BlockData[] {
  // Remove block from fromPath
  const { block: movingBlock, newBlocks } = removeBlockAtPath(blocks, fromPath);
  if (!movingBlock) return blocks;
  return insertBlockAt(newBlocks, toParentPath, toIndex, movingBlock);
}

function removeBlockAtPath(
  blocks: BlockData[],
  path: string
): { block: BlockData | null; newBlocks: BlockData[] } {
  const parts = path.split(".").map(Number);
  if (parts.length === 1) {
    const idx = parts[0];
    const block = blocks[idx];
    return {
      block,
      newBlocks: [...blocks.slice(0, idx), ...blocks.slice(idx + 1)],
    };
  }
  const idx = parts[0];
  const { block, newBlocks } = removeBlockAtPath(
    blocks[idx].children || [],
    parts.slice(1).join(".")
  );
  return {
    block,
    newBlocks: [
      ...blocks.slice(0, idx),
      { ...blocks[idx], children: newBlocks },
      ...blocks.slice(idx + 1),
    ],
  };
}

// --- Main ---
export default function HtmlBuilder() {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: "flex", height: "100vh", background: "#f9fafb" }}>
        <Sidebar />
        <Page title="No-code HTML Builder">
          <Card>
            <Editor blocks={blocks} setBlocks={setBlocks} />
          </Card>
        </Page>
      </div>
    </DndProvider>
  );
}
