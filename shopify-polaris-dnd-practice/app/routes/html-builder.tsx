import { useState, useCallback, memo } from "react";
import {
  Page,
  Layout,
  Text,
  BlockStack,
  Button,
  TextField,
  Grid,
} from "@shopify/polaris";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { cn } from "~/lib/utils";
import {
  LayoutGrid,
  Columns,
  Type,
  Image as ImageIcon,
  GripVertical,
  Pencil,
} from "lucide-react";

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

const NODE_ITEMS: { id: NodeItemType; label: string; icon: React.ReactNode }[] =
  [
    { id: "row", label: "Row", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "column", label: "Column", icon: <Columns className="h-4 w-4" /> },
    { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
    { id: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
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
  item: { id: NodeItemType; label: string; icon: React.ReactNode };
}) {
  const [, drag] = useDrag<DragItem>(() => ({
    type: ItemTypes.NODE,
    item: () => ({ id: generateId(), type: item.id, fromSidebar: true }),
  }));
  return (
    <div
      ref={drag}
      className={cn(
        "cursor-pointer rounded-md border p-3 mb-3 bg-card hover:bg-accent/50 shadow-sm",
        "flex items-center gap-2 transition-colors duration-200"
      )}
    >
      <div className="text-muted-foreground">{item.icon}</div>
      <span className="font-medium">{item.label}</span>
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
      className={cn(
        "h-2 transition-colors duration-200 rounded-sm",
        isLast ? "mb-2" : "",
        isOver && canDrop
          ? "bg-primary/70"
          : "bg-transparent hover:bg-primary/20"
      )}
      style={{ minHeight: "8px" }} // Ensure minimum height for better drag target
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
      className="border rounded-md p-3 mb-3 bg-secondary/50 shadow-sm"
      onClick={onClick}
    >
      <div
        ref={drag}
        className="font-medium mb-2 cursor-move flex items-center gap-2 text-sm"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" />
          Row
        </span>
      </div>
      {node.children.map((child, idx) => {
        const childPath = `${path}-${idx}`;
        return (
          <div key={child.id} className="pl-3">
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
        <div className="py-3 px-2 border border-dashed rounded-md border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground mb-2">Drop items here</p>
          <DropZone
            key={`empty-${node.id}`}
            path={`${path}-0`}
            isLast
            onDrop={onDrop!}
          />
        </div>
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
      className="border border-dashed rounded-md p-3 mb-3 bg-background shadow-sm"
      onClick={onClick}
    >
      <div
        ref={drag}
        className="mb-2 cursor-move flex items-center gap-2 text-sm"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Columns className="h-3.5 w-3.5" />
          Column
        </span>
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
        <div className="py-3 px-2 border border-dashed rounded-md border-muted-foreground/30 bg-muted/10 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground mb-2">Drop items here</p>
          <DropZone
            key={`empty-${node.id}`}
            path={`${path}-0`}
            isLast
            onDrop={onDrop!}
          />
        </div>
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
      className="p-3 bg-card rounded-md shadow-sm mb-3 border"
      onClick={onClick}
    >
      <div
        ref={drag}
        className="cursor-move text-muted-foreground text-xs flex items-center gap-1.5 mb-2"
      >
        <GripVertical className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1">
          <Type className="h-3 w-3" />
          Text
        </span>
        <div className="ml-auto">
          <Pencil className="h-3 w-3" />
        </div>
      </div>
      <p className="mt-1 text-sm">{node.content || "Sample text content"}</p>
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
      className="p-3 bg-card rounded-md shadow-sm mb-3 border"
      onClick={onClick}
    >
      <div
        ref={drag}
        className="cursor-move text-muted-foreground text-xs flex items-center gap-1.5 mb-2"
      >
        <GripVertical className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          Image
        </span>
        <div className="ml-auto">
          <Pencil className="h-3 w-3" />
        </div>
      </div>
      <div className="flex justify-center items-center mt-2 bg-muted/30 p-2 rounded-md">
        {node.imageUrl ? (
          <img
            src={node.imageUrl}
            alt="User selected content"
            className="max-w-full max-h-48 object-contain rounded-sm"
          />
        ) : (
          <div className="w-32 h-32 border-2 border-border flex items-center justify-center rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
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
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
        <div className="mb-3">
          <Pencil className="h-8 w-8 opacity-30" />
        </div>
        <Text as="p" alignment="center" tone="subdued">
          Select a node to configure
        </Text>
      </div>
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
      console.log("handleDrop", dragItem, dropPathIndices);

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
    <Page title="HTML Builder" fullWidth>
      <DndProvider backend={HTML5Backend}>
        <Grid columns={{ lg: 8, xl: 8 }}>
          {/* Left Sidebar that shows the available node items - 2 columns */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Components</CardTitle>
                <CardDescription>
                  Drag and drop to build your layout
                </CardDescription>
              </CardHeader>
              <CardContent>
                {NODE_ITEMS.map((item) => (
                  <NodeItem key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          </Grid.Cell>

          {/* Center section that shows the layout tree - 4 columns */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 6, lg: 4, xl: 4 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Canvas</CardTitle>
                <CardDescription>Your layout will appear here</CardDescription>
              </CardHeader>
              <CardContent className="min-h-[400px]">
                {/* initial dropzone */}
                {layout.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/5">
                    <p className="text-muted-foreground mb-4">
                      Drag components here to start building
                    </p>
                    <div className="w-full h-8 flex items-center justify-center">
                      <DropZone
                        key="initial-dropzone"
                        path="0"
                        onDrop={handleDrop}
                        isLast
                      />
                    </div>
                  </div>
                )}
                {layout.map((node, idx) => {
                  const path = `${idx}`;
                  return (
                    <div key={node.id}>
                      <DropZone
                        key={`dropzone-before-${node.id}`}
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
                          path={`${idx + 1}`}
                          isLast
                          onDrop={handleDrop}
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </Grid.Cell>

          {/* Right section for node settings - 2 columns */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Configure selected component</CardDescription>
              </CardHeader>
              <CardContent>
                <NodeSettings
                  selectedNode={selectedNode}
                  onUpdateNode={handleNodeUpdate}
                />
              </CardContent>
            </Card>
          </Grid.Cell>
        </Grid>
      </DndProvider>
    </Page>
  );
}

export const meta: MetaFunction = () => [{ title: "HTML Builder" }];
