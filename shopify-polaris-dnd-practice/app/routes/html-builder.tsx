import { useState } from "react";
import { Page, Card, TextField } from "@shopify/polaris";

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
  return (
    <div
      draggable
      style={{
        padding: 8,
        marginBottom: 8,
        background: "white",
        border: "1px solid #d1d1d1",
        borderRadius: 4,
        cursor: "grab",
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("block-type", type);
        e.dataTransfer.setData("from-sidebar", "true");
      }}
    >
      {label}
    </div>
  );
}

// --- Editor ---
function Editor({
  blocks,
  setBlocks,
}: {
  blocks: BlockData[];
  setBlocks: (b: BlockData[]) => void;
}) {
  // Drag state for moving blocks
  const [draggedBlockPath, setDraggedBlockPath] = useState<string | null>(null);

  // Drop new block from sidebar
  const handleDropNewBlock = (
    e: React.DragEvent,
    parentPath: string | null = null
  ) => {
    const type = e.dataTransfer.getData("block-type") as BlockType;
    const fromSidebar = e.dataTransfer.getData("from-sidebar");
    if (!type || !(type in BLOCKS)) return;
    if (fromSidebar === "true") {
      // Add new block
      const newBlock: BlockData = {
        id: generateId(),
        type,
        props: {},
        children: BLOCKS[type].canHaveChildren ? [] : undefined,
      };
      if (parentPath === null) {
        setBlocks([...blocks, newBlock]);
      } else {
        setBlocks(addBlockAtPath(blocks, parentPath, newBlock));
      }
    } else if (draggedBlockPath) {
      // Move existing block
      setBlocks(moveBlock(blocks, draggedBlockPath, parentPath));
      setDraggedBlockPath(null);
    }
  };

  // Recursive renderer
  return (
    <div
      style={{
        flex: 1,
        minHeight: 500,
        margin: 32,
        background: "#fff",
        borderRadius: 8,
        padding: 24,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDropNewBlock(e, null)}
    >
      {blocks.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", marginTop: 100 }}>
          Drag a Section here
        </div>
      )}
      {blocks.map((block, idx) => (
        <BlockRenderer
          key={block.id}
          block={block}
          path={String(idx)}
          setDraggedBlockPath={setDraggedBlockPath}
          handleDropNewBlock={handleDropNewBlock}
        />
      ))}
    </div>
  );
}

// --- Block Renderer ---
function BlockRenderer({
  block,
  path,
  setDraggedBlockPath,
  handleDropNewBlock,
}: {
  block: BlockData;
  path: string;
  setDraggedBlockPath: (p: string | null) => void;
  handleDropNewBlock: (e: React.DragEvent, parentPath: string) => void;
}) {
  const [value, setValue] = useState(block.props?.value || "");
  const blockDef = BLOCKS[block.type];
  // For leaf blocks, update value in local state only (for demo)
  const renderProps = blockDef.canHaveChildren ? {} : { value, setValue };

  return (
    <div
      draggable
      onDragStart={() => setDraggedBlockPath(path)}
      onDrop={(e) => {
        e.stopPropagation();
        handleDropNewBlock(e, path);
      }}
      onDragOver={(e) => e.preventDefault()}
      style={{ marginBottom: 8 }}
    >
      {blockDef.render({
        ...renderProps,
        children:
          blockDef.canHaveChildren && block.children ? (
            block.children.length === 0 ? (
              <div style={{ color: "#bbb", fontSize: 13, minHeight: 32 }}>
                Drag elements here
              </div>
            ) : (
              block.children.map((child, idx) => (
                <BlockRenderer
                  key={child.id}
                  block={child}
                  path={path + "." + idx}
                  setDraggedBlockPath={setDraggedBlockPath}
                  handleDropNewBlock={handleDropNewBlock}
                />
              ))
            )
          ) : null,
      })}
    </div>
  );
}

// --- Helpers for block tree manipulation ---
function addBlockAtPath(
  blocks: BlockData[],
  path: string,
  newBlock: BlockData
): BlockData[] {
  const parts = path.split(".").map(Number);
  if (parts.length === 1) {
    const idx = parts[0];
    const updated = [...blocks];
    if (!BLOCKS[blocks[idx].type].canHaveChildren) return blocks;
    updated[idx] = {
      ...blocks[idx],
      children: [...(blocks[idx].children || []), newBlock],
    };
    return updated;
  }
  const idx = parts[0];
  return [
    ...blocks.slice(0, idx),
    {
      ...blocks[idx],
      children: addBlockAtPath(
        blocks[idx].children || [],
        parts.slice(1).join("."),
        newBlock
      ),
    },
    ...blocks.slice(idx + 1),
  ];
}

function moveBlock(
  blocks: BlockData[],
  fromPath: string,
  toPath: string | null
): BlockData[] {
  // Remove block from fromPath
  const { block: movingBlock, newBlocks } = removeBlockAtPath(blocks, fromPath);
  if (!movingBlock) return blocks;
  if (toPath === null) {
    // Move to root
    return [...newBlocks, movingBlock];
  }
  return addBlockAtPath(newBlocks, toPath, movingBlock);
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
    <div style={{ display: "flex", height: "100vh", background: "#f9fafb" }}>
      <Sidebar />
      <Page title="No-code HTML Builder">
        <Card>
          <Editor blocks={blocks} setBlocks={setBlocks} />
        </Card>
      </Page>
    </div>
  );
}
