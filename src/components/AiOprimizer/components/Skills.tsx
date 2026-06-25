import React from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SkillCategory {
    id: string;
    category: string;
    skills: string;
}

interface SkillsProps {
    data: SkillCategory[];
    onChange: (data: SkillCategory[]) => void;
}

const SKILLS_LINK_MARKER_REGEX = /<a>[\s\S]*?(?:<\/a>|<a\/>|$)/i;
const LINK_MARKER_GLOBAL = /<a>[\s\S]*?(?:<\/a>|<a\/>)/gi;

const parseSkillsLinkMarker = (text: string) => {
    const markerMatch = (text || "").match(/<a>([\s\S]*?)(?:<\/a>|<a\/>|$)/i);
    if (!markerMatch) return null;
    const content = markerMatch[1] || "";
    const pipeIndex = content.indexOf("|");
    return {
        fullMarker: markerMatch[0],
        label:
            pipeIndex === -1
                ? content.trim()
                : content.slice(0, pipeIndex).trim(),
        url:
            pipeIndex === -1
                ? content.trim()
                : content.slice(pipeIndex + 1).trim(),
    };
};

// Split a comma-separated skills string into tokens while keeping <a>...<a/> markers atomic.
const tokenizeSkills = (csv: string): string[] => {
    if (!csv) return [];
    const markers: string[] = [];
    const placeholderized = csv.replace(LINK_MARKER_GLOBAL, (m) => {
        markers.push(m);
        return `__SKILL_MARKER_${markers.length - 1}__`;
    });
    return placeholderized
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((t) =>
            t.replace(/__SKILL_MARKER_(\d+)__/g, (_m, i) => markers[Number(i)] || "")
        );
};

const detokenizeSkills = (tokens: string[]): string => tokens.join(", ");

// Render a token's display label (strip <a>...<a/> down to its label text for chip display).
const tokenDisplayLabel = (token: string): string => {
    const parsed = parseSkillsLinkMarker(token);
    if (parsed && parsed.fullMarker.trim() === token.trim()) return parsed.label;
    return token;
};

interface SortableSkillChipProps {
    id: string;
    token: string;
    onRemove: () => void;
}

const SortableSkillChip: React.FC<SortableSkillChipProps> = ({
    id,
    token,
    onRemove,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    const isLink = !!parseSkillsLinkMarker(token);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`inline-flex items-center gap-1 rounded-full border ${
                isLink ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white"
            } pl-1 pr-2 py-1 text-xs shadow-sm`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                title="Drag to reorder"
            >
                <GripVertical size={12} />
            </button>
            <span className={`max-w-[240px] truncate ${isLink ? "text-blue-700" : "text-gray-800"}`}>
                {tokenDisplayLabel(token)}
            </span>
            <button
                type="button"
                onClick={onRemove}
                className="text-gray-400 hover:text-red-600"
                title="Remove skill"
            >
                <X size={12} />
            </button>
        </div>
    );
};

interface SortableCategoryCardProps {
    category: SkillCategory;
    index: number;
    canRemove: boolean;
    onRemove: () => void;
    onUpdate: (field: keyof SkillCategory, value: string) => void;
    linkEditor: LinkEditorState;
    setLinkEditor: React.Dispatch<React.SetStateAction<LinkEditorState>>;
}

type LinkEditorState =
    | {
          id: string;
          start: number;
          end: number;
          selectedText: string;
          url: string;
          mode: "insert" | "edit";
      }
    | null;

const SortableCategoryCard: React.FC<SortableCategoryCardProps> = ({
    category,
    index,
    canRemove,
    onRemove,
    onUpdate,
    linkEditor,
    setLinkEditor,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    const tokens = tokenizeSkills(category.skills);

    const chipSensors = useSensors(useSensor(PointerSensor));

    const handleChipDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const fromIdx = tokens.findIndex((_, i) => `${category.id}-chip-${i}` === active.id);
        const toIdx = tokens.findIndex((_, i) => `${category.id}-chip-${i}` === over.id);
        if (fromIdx < 0 || toIdx < 0) return;
        const next = arrayMove(tokens, fromIdx, toIdx);
        onUpdate("skills", detokenizeSkills(next));
    };

    const handleRemoveChip = (idx: number) => {
        const next = tokens.filter((_, i) => i !== idx);
        onUpdate("skills", detokenizeSkills(next));
    };

    const insertSkillsLink = () => {
        if (!linkEditor || linkEditor.id !== category.id) return;
        const current = category.skills || "";
        if (linkEditor.mode === "insert" && SKILLS_LINK_MARKER_REGEX.test(current)) {
            window.alert("Only one hyperlink is allowed in this field.");
            return;
        }
        const selectedText = (linkEditor.selectedText || "").trim();
        if (!selectedText) {
            window.alert("Please enter link text.");
            return;
        }
        const rawUrl = (linkEditor.url || "").trim();
        if (!rawUrl) {
            window.alert("Please enter a hyperlink URL.");
            return;
        }
        const hasProtocol = /^(https?:\/\/|mailto:|tel:|#)/i.test(rawUrl);
        const normalizedUrl = hasProtocol ? rawUrl : `https://${rawUrl}`;
        const marker = `<a>${selectedText}|${normalizedUrl}<a/>`;
        const updated =
            linkEditor.mode === "edit"
                ? current.replace(SKILLS_LINK_MARKER_REGEX, marker)
                : current.slice(0, linkEditor.start) +
                  marker +
                  current.slice(linkEditor.end);
        onUpdate("skills", updated);
        setLinkEditor(null);
    };

    const handleSkillsSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const start = target.selectionStart ?? 0;
        const end = target.selectionEnd ?? 0;
        if (start === end) return;
        const selectedText = target.value.slice(start, end).trim();
        if (!selectedText) return;
        setLinkEditor({
            id: category.id,
            start,
            end,
            selectedText,
            url: "",
            mode: "insert",
        });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        title="Drag to reorder category"
                    >
                        <GripVertical size={18} />
                    </button>
                    <h4 className="text-md font-medium text-gray-800">
                        Category #{index + 1}
                    </h4>
                </div>
                {canRemove && (
                    <button
                        onClick={onRemove}
                        className="text-red-600 hover:text-red-800 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name
                    </label>
                    <input
                        type="text"
                        value={category.category}
                        onChange={(e) => onUpdate("category", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Product Management & Strategy"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Skills (comma-separated)
                    </label>
                    <textarea
                        value={category.skills}
                        onChange={(e) => onUpdate("skills", e.target.value)}
                        onSelect={handleSkillsSelection}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="e.g., Product Development, Go-To-Market Strategy, Product Marketing..."
                    />

                    {tokens.length > 0 && (
                        <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">
                                Drag chips to reorder skills:
                            </div>
                            <DndContext
                                sensors={chipSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleChipDragEnd}
                            >
                                <SortableContext
                                    items={tokens.map((_, i) => `${category.id}-chip-${i}`)}
                                    strategy={horizontalListSortingStrategy}
                                >
                                    <div className="flex flex-wrap gap-1.5">
                                        {tokens.map((token, i) => (
                                            <SortableSkillChip
                                                key={`${category.id}-chip-${i}`}
                                                id={`${category.id}-chip-${i}`}
                                                token={token}
                                                onRemove={() => handleRemoveChip(i)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {parseSkillsLinkMarker(category.skills) && (
                        <div className="mt-2 text-xs">
                            <span className="text-gray-600 mr-2">Linked text:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const parsed = parseSkillsLinkMarker(category.skills);
                                    if (!parsed) return;
                                    setLinkEditor({
                                        id: category.id,
                                        start: 0,
                                        end: 0,
                                        selectedText: parsed.label || "",
                                        url: parsed.url || "",
                                        mode: "edit",
                                    });
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                style={{ textDecoration: "none" }}
                            >
                                {parseSkillsLinkMarker(category.skills)?.label || "Edit Link"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const parsed = parseSkillsLinkMarker(category.skills);
                                    if (!parsed) return;
                                    onUpdate(
                                        "skills",
                                        category.skills.replace(parsed.fullMarker, parsed.label)
                                    );
                                    if (linkEditor?.id === category.id) {
                                        setLinkEditor(null);
                                    }
                                }}
                                className="ml-2 text-red-600 hover:text-red-800"
                                title="Remove hyperlink"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                    {linkEditor?.id === category.id && (
                        <div className="mt-2 p-2 border border-blue-200 bg-blue-50 rounded-md">
                            <div className="text-xs text-blue-700 mb-2">Edit hyperlink</div>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    value={linkEditor.selectedText}
                                    onChange={(e) =>
                                        setLinkEditor((prev) =>
                                            prev
                                                ? { ...prev, selectedText: e.target.value }
                                                : prev
                                        )
                                    }
                                    placeholder="Link text"
                                    className="flex-1 min-w-[180px] px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <input
                                    type="text"
                                    value={linkEditor.url}
                                    onChange={(e) =>
                                        setLinkEditor((prev) =>
                                            prev ? { ...prev, url: e.target.value } : prev
                                        )
                                    }
                                    placeholder="Enter URL (https://...)"
                                    className="flex-1 min-w-[220px] px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={insertSkillsLink}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 whitespace-nowrap"
                                >
                                    Insert Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLinkEditor(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 whitespace-nowrap"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const Skills: React.FC<SkillsProps> = ({ data, onChange }) => {
    const [linkEditor, setLinkEditor] = React.useState<LinkEditorState>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const addCategory = () => {
        const newCategory: SkillCategory = {
            id: Date.now().toString(),
            category: "",
            skills: "",
        };
        onChange([...data, newCategory]);
    };

    const removeCategory = (id: string) => {
        onChange(data.filter((item) => item.id !== id));
    };

    const updateCategory = (id: string, field: keyof SkillCategory, value: string) => {
        onChange(
            data.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const handleCategoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const fromIdx = data.findIndex((c) => c.id === active.id);
        const toIdx = data.findIndex((c) => c.id === over.id);
        if (fromIdx < 0 || toIdx < 0) return;
        onChange(arrayMove(data, fromIdx, toIdx));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 flex-1">
                    Skills
                </h3>
                <button
                    onClick={addCategory}
                    className="ml-4 flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                    <Plus size={16} />
                    Add Category
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
            >
                <SortableContext
                    items={data.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {data.map((category, index) => (
                            <SortableCategoryCard
                                key={category.id}
                                category={category}
                                index={index}
                                canRemove={data.length > 1}
                                onRemove={() => removeCategory(category.id)}
                                onUpdate={(field, value) =>
                                    updateCategory(category.id, field, value)
                                }
                                linkEditor={linkEditor}
                                setLinkEditor={setLinkEditor}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};
