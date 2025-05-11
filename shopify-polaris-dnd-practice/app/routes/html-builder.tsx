import { useState, useCallback, memo } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  TextField,
} from "@shopify/polaris";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

/* ------------------------------------------------------------------
 Helper types & constants
-------------------------------------------------------------------*/

type NodeItemType = "row" | "column" | "text" | "image";

// BuilderNode is the type of the nodes in the layout tree.
interface BuilderNode {
  id: string;
  type: NodeItemType;
  children: BuilderNode[];
  content?: string; // for text component
  imageUrl?: string; // for image component
}

// Drag item shape
interface DragItem {
  id: string;
  type: NodeItemType;
  path?: string; // If dragging an existing node, path represents its position in the layout tree
  fromSidebar?: boolean; // Sidebar items set this true
}

const ItemTypes = {
  NODE: "NODE",
};

const NODE_ITEMS: { id: NodeItemType; label: string }[] = [
  { id: "row", label: "Row" },
  { id: "column", label: "Column" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
];

/* ------------------------------------------------------------------
 Utility helpers to manipulate the layout tree by path
-------------------------------------------------------------------*/

// Convert path string (e.g. "0-1-2") to array of numbers
const pathToIndices = (path: string): number[] =>
  path.split("-").map((n) => parseInt(n, 10));

const traverse = (
  tree: BuilderNode[],
  callback: (
    node: BuilderNode,
    idx: number,
    parent: BuilderNode[] | null
  ) => void,
  path: number[] = []
) => {
  const parentArr =
    path.length === 0 ? tree : getNodeByPath(tree, path.slice(0, -1))?.children;
  path.forEach(() => {}); // dummy to use path param (linter)
  if (!parentArr) return;
  parentArr.forEach((node, idx) => callback(node, idx, parentArr));
};

const getNodeByPath = (
  tree: BuilderNode[],
  path: number[]
): BuilderNode | null => {
  let current: BuilderNode | null = null;
  let arr: BuilderNode[] = tree;
  for (const idx of path) {
    current = arr[idx];
    if (!current) return null;
    arr = current.children;
  }
  return current;
};

const removeAtPath = (
  tree: BuilderNode[],
  path: number[]
): { removed: BuilderNode | null; newTree: BuilderNode[] } => {
  if (path.length === 0) return { removed: null, newTree: tree };
  const newTree = structuredClone(tree) as BuilderNode[];
  const parentPath = path.slice(0, -1);
  const idx = path[path.length - 1];
  const parent = parentPath.length ? getNodeByPath(newTree, parentPath) : null;
  const arr = parent ? parent.children : newTree;
  if (!arr || idx >= arr.length) return { removed: null, newTree };
  const [removed] = arr.splice(idx, 1);
  return { removed, newTree };
};

/**
 * Inserts a node at a specific path in the tree structure
 *
 * @param tree - The current tree structure of nodes (array of BuilderNodes)
 * @param path - Array of indices representing the insertion position
 *               If path is [0,1,2], inserts as 3rd child (index 2) of 2nd child (index 1) of 1st node (index 0)
 *               If path is empty, inserts at beginning of root level
 * @param item - The BuilderNode to insert at the specified position
 * @returns A new tree with the item inserted (original tree is not mutated)
 *
 * The function:
 * 1. Creates a deep clone of the tree
 * 2. Handles special case: empty path (insert at beginning of root)
 * 3. For non-empty paths: finds parent node, then inserts item at specified index in parent's children
 * 4. Returns the new tree with inserted node
 */
const insertAtPath = (
  tree: BuilderNode[],
  path: number[],
  item: BuilderNode
): BuilderNode[] => {
  const newTree = structuredClone(tree) as BuilderNode[];
  if (path.length === 0) {
    newTree.splice(0, 0, item);
    return newTree;
  }
  const parentPath = path.slice(0, -1); // parentPath = [0,1]
  const idx = path[path.length - 1]; // idx = 2
  console.log("insertAtPath", path, parentPath, idx);
  const parent = parentPath.length ? getNodeByPath(newTree, parentPath) : null; // parent = newTree[0].children[1]
  const beforeNewTree = structuredClone(newTree);
  const arr = parent ? parent.children : newTree; // arr = newTree[0].children[1].children
  arr.splice(idx, 0, item); // newTree[0].children[1].children = [item]
  console.log("insertAtPath", beforeNewTree, newTree);
  return newTree;
};

// generateId is a helper function to generate a unique id for a node
const generateId = () => Math.random().toString(36).substring(2, 9);

/* ------------------------------------------------------------------
 NodeItem
-------------------------------------------------------------------*/

const NodeItem = memo(function NodeItem({
  item,
}: {
  item: { id: NodeItemType; label: string };
}) {
  const [, drag] = useDrag<DragItem>(() => ({
    type: ItemTypes.NODE,
    item: () => ({ id: generateId(), type: item.id, fromSidebar: true }),
  }));
  return (
    <div
      ref={drag}
      className="cursor-pointer rounded border p-2 mb-2 bg-white hover:bg-gray-50 shadow-sm"
    >
      {item.label}
    </div>
  );
});

/* ------------------------------------------------------------------
 DropZone component
-------------------------------------------------------------------*/

interface DropZoneProps {
  path: string; // where to insert if dropped before this path
  onDrop: (item: DragItem, dropZonePath: string) => void;
  isLast?: boolean;
}

const DropZone = ({ path, onDrop, isLast }: DropZoneProps) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.NODE,
      drop: (item: DragItem, monitor) => {
        if (monitor.didDrop()) return;
        onDrop(item, path);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [path, onDrop]
  );
  return (
    <div
      ref={drop}
      data-path={path}
      className={`h-4 ${isLast ? "mb-2" : ""} ${
        isOver && canDrop ? "bg-blue-400" : "bg-transparent"
      }`}
    />
  );
};

/* ------------------------------------------------------------------
 Builder Nodes Components
-------------------------------------------------------------------*/

interface NodeProps {
  node: BuilderNode;
  path: string;
  onDrop?: (item: DragItem, dropZonePath: string) => void;
  onClick?: () => void;
}

const RowNode = ({ node, path, onDrop, onClick }: NodeProps) => {
  const [, drag, preview] = useDrag<DragItem>(
    () => ({
      type: ItemTypes.NODE,
      item: { id: node.id, type: node.type, path },
    }),
    [node, path]
  );

  return (
    <div
      ref={preview}
      className="border rounded p-2 mb-2 bg-gray-100"
      onClick={onClick}
    >
      <div ref={drag} className="font-semibold mb-1 cursor-move">
        Row
      </div>
      {node.children.map((child, idx) => {
        const childPath = `${path}-${idx}`;
        return (
          <div key={child.id} className="pl-2">
            <DropZone
              key={`before-${child.id}`}
              path={childPath}
              onDrop={onDrop!}
            />
            <NodeRenderer node={child} path={childPath} onDrop={onDrop} />
            {idx === node.children.length - 1 && (
              <DropZone
                key={`after-${child.id}`}
                path={`${childPath}-end`}
                isLast
                onDrop={onDrop!}
              />
            )}
          </div>
        );
      })}
      {node.children.length === 0 && (
        <DropZone
          key={`empty-${node.id}`}
          path={`${path}-0`}
          isLast
          onDrop={onDrop!}
        />
      )}
    </div>
  );
};

const ColumnNode = ({ node, path, onDrop, onClick }: NodeProps) => {
  const [, drag, preview] = useDrag<DragItem>(() => ({
    type: ItemTypes.NODE,
    item: { id: node.id, type: node.type, path },
  }));

  return (
    <div
      ref={preview}
      className="border dashed rounded p-2 mb-2 bg-gray-50"
      onClick={onClick}
    >
      <div ref={drag} className="italic mb-1 cursor-move text-sm text-gray-700">
        Column
      </div>
      {node.children.map((child, idx) => {
        const childPath = `${path}-${idx}`;
        return (
          <div key={child.id}>
            <DropZone
              key={`before-${child.id}`}
              path={childPath}
              onDrop={onDrop!}
            />
            <NodeRenderer node={child} path={childPath} onDrop={onDrop} />
            {idx === node.children.length - 1 && (
              <DropZone
                key={`after-${child.id}`}
                path={`${childPath}-end`}
                isLast
                onDrop={onDrop!}
              />
            )}
          </div>
        );
      })}
      {node.children.length === 0 && (
        <DropZone
          key={`empty-${node.id}`}
          path={`${path}-0`}
          isLast
          onDrop={onDrop!}
        />
      )}
    </div>
  );
};

const TextNode = ({ node, path, onClick }: NodeProps) => {
  const [, drag, preview] = useDrag<DragItem>(() => ({
    type: ItemTypes.NODE,
    item: { id: node.id, type: node.type, path },
  }));
  return (
    <div
      ref={preview}
      className="p-2 bg-white rounded shadow-sm mb-2"
      onClick={onClick}
    >
      <div ref={drag} className="cursor-move text-gray-500 text-xs">
        Text
      </div>
      <p className="mt-1">Sample text content</p>
    </div>
  );
};

const ImageNode = ({ node, path, onClick }: NodeProps) => {
  const [, drag, preview] = useDrag<DragItem>(() => ({
    type: ItemTypes.NODE,
    item: { id: node.id, type: node.type, path },
  }));

  return (
    <div
      ref={preview}
      className="p-2 bg-white rounded shadow-sm mb-2"
      onClick={onClick}
    >
      <div ref={drag} className="cursor-move text-gray-500 text-xs">
        Image
      </div>
      <div className="flex justify-center items-center mt-2 bg-gray-100 p-2 rounded">
        {node.imageUrl ? (
          <img
            src={node.imageUrl}
            alt="User selected content"
            className="max-w-full max-h-48 object-contain"
          />
        ) : (
          <div className="w-32 h-32 border-2 border-gray-300 flex items-center justify-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

// NodeRenderer is a component that renders a BuilderNode based on its type.
const NodeRenderer = ({ node, path, onDrop, onClick }: NodeProps) => {
  const handleClick = () => {
    if (onClick) onClick();
  };

  switch (node.type) {
    case "row":
      return (
        <RowNode
          node={node}
          path={path}
          onDrop={onDrop}
          onClick={handleClick}
        />
      );
    case "column":
      return (
        <ColumnNode
          node={node}
          path={path}
          onDrop={onDrop}
          onClick={handleClick}
        />
      );
    case "image":
      return <ImageNode node={node} path={path} onClick={handleClick} />;
    case "text":
    default:
      return <TextNode node={node} path={path} onClick={handleClick} />;
  }
};

/* ------------------------------------------------------------------
 Node Settings Panel Components
-------------------------------------------------------------------*/

interface NodeSettingsProps {
  selectedNode: BuilderNode | null;
  onUpdateNode: (updatedNode: Partial<BuilderNode>) => void;
}

const ImageNodeSettings = ({
  selectedNode,
  onUpdateNode,
}: NodeSettingsProps) => {
  const [imageUrl, setImageUrl] = useState(selectedNode?.imageUrl || "");

  const handleImageChange = (value: string) => {
    setImageUrl(value);
    onUpdateNode({ imageUrl: value });
  };

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Image Settings
      </Text>
      <TextField
        label="Image URL"
        value={imageUrl}
        onChange={handleImageChange}
        autoComplete="off"
        placeholder="https://example.com/image.jpg"
      />
      <Button
        onClick={() => {
          if (imageUrl) return;
          // Default placeholder image URL
          const placeholderUrl = "https://placekitten.com/300/200";
          setImageUrl(placeholderUrl);
          onUpdateNode({ imageUrl: placeholderUrl });
        }}
      >
        {imageUrl ? "Update Image" : "Use Default Image"}
      </Button>
      {imageUrl && (
        <Button
          variant="plain"
          tone="critical"
          onClick={() => {
            setImageUrl("");
            onUpdateNode({ imageUrl: "" });
          }}
        >
          Remove Image
        </Button>
      )}
    </BlockStack>
  );
};

const NodeSettings = ({ selectedNode, onUpdateNode }: NodeSettingsProps) => {
  if (!selectedNode) {
    return (
      <Text as="p" alignment="center" tone="subdued">
        Select a node to configure
      </Text>
    );
  }

  switch (selectedNode.type) {
    case "image":
      return (
        <ImageNodeSettings
          selectedNode={selectedNode}
          onUpdateNode={onUpdateNode}
        />
      );
    case "text":
      return <Text as="p">Text settings coming soon</Text>;
    case "row":
      return <Text as="p">Row settings coming soon</Text>;
    case "column":
      return <Text as="p">Column settings coming soon</Text>;
    default:
      return <Text as="p">No settings available</Text>;
  }
};

/* ------------------------------------------------------------------
 Main Builder component
-------------------------------------------------------------------*/

export default function HtmlBuilderRoute() {
  const [layout, setLayout] = useState<BuilderNode[]>([]);
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);

  const selectedNode = selectedNodePath
    ? getNodeByPath(layout, pathToIndices(selectedNodePath))
    : null;

  const handleDrop = useCallback(
    (dragItem: DragItem, dropZonePathStr: string) => {
      const dropPathIndices = dropZonePathStr.includes("end")
        ? pathToIndices(dropZonePathStr.replace("-end", ""))
        : pathToIndices(dropZonePathStr);

      // Use functional setState to guarantee we're using the latest state
      setLayout((currentLayout) => {
        // Create a clone of current layout to avoid mutation
        let newTree = structuredClone(currentLayout);
        let itemNode: BuilderNode;

        if (dragItem.fromSidebar) {
          // create new node from sidebar
          console.log("from sidebar", dragItem);
          itemNode = {
            id: dragItem.id,
            type: dragItem.type,
            children:
              dragItem.type === "text" || dragItem.type === "image" ? [] : [],
          };
        } else if (dragItem.path) {
          console.log("from existing", dragItem);
          // moving existing node
          const removeRes = removeAtPath(newTree, pathToIndices(dragItem.path));
          itemNode = removeRes.removed!;
          newTree = removeRes.newTree;
        } else {
          return currentLayout;
        }

        // For simplicity, we always insert as sibling at dropPath index
        const insertPath = dropPathIndices;
        const updated = insertAtPath(newTree, insertPath, itemNode);
        console.log("handleDrop", newTree, updated);
        return [...updated];
      });
    },
    [] // No dependencies needed since we're using the function form of setState
  );

  const handleNodeSelect = useCallback((path: string) => {
    setSelectedNodePath(path);
  }, []);

  const handleNodeUpdate = useCallback(
    (updates: Partial<BuilderNode>) => {
      if (!selectedNodePath) return;

      setLayout((currentLayout) => {
        const newLayout = structuredClone(currentLayout);
        const node = getNodeByPath(newLayout, pathToIndices(selectedNodePath));
        if (node) {
          Object.assign(node, updates);
        }
        return newLayout;
      });
    },
    [selectedNodePath]
  );

  return (
    <Page title="HTML Builder">
      <DndProvider backend={HTML5Backend}>
        <Layout>
          {/* Left Sidebar that shows the available node items`*/}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              {NODE_ITEMS.map((item) => (
                <NodeItem key={item.id} item={item} />
              ))}
            </Card>
          </Layout.Section>
          {/* Center section that shows the layout tree */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              {/* initial dropzone */}
              {layout.length === 0 && (
                <DropZone
                  key="initial-dropzone"
                  path="0"
                  onDrop={handleDrop}
                  isLast
                />
              )}
              {layout.map((node, idx) => {
                const path = `${idx}`;
                return (
                  <div key={node.id}>
                    <DropZone
                      key={`dropzone-before-${node.id}`} // dropzone is rendered every time the layout changes and using {prefixed} keys avoid to conflict with the previous dropzones
                      data-path={path}
                      path={path}
                      onDrop={handleDrop}
                    />
                    <NodeRenderer
                      node={node}
                      path={path}
                      onDrop={handleDrop}
                      onClick={() => handleNodeSelect(path)}
                    />
                    {/* last dropzone */}
                    {idx === layout.length - 1 && (
                      <DropZone
                        key={`dropzone-after-${node.id}`}
                        path={`${idx + 1}-end`}
                        isLast
                        onDrop={handleDrop}
                      />
                    )}
                  </div>
                );
              })}
            </Card>
          </Layout.Section>
          {/* Right section for node settings */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <NodeSettings
                selectedNode={selectedNode}
                onUpdateNode={handleNodeUpdate}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </DndProvider>
    </Page>
  );
}

export const meta: MetaFunction = () => [{ title: "HTML Builder" }];
