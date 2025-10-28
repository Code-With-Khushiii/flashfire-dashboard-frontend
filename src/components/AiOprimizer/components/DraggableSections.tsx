import React from "react";
import { GripVertical } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DraggableSectionProps {
    id: string;
    children: React.ReactNode;
    title: string;
    isEnabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    showToggle?: boolean;
}

const DraggableSection = ({
    id,
    children,
    title,
    isEnabled = true,
    onToggle,
    showToggle = false,
}: DraggableSectionProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border border-gray-200 rounded-lg p-4 bg-white ${
                isDragging ? "shadow-lg opacity-50" : ""
            }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <GripVertical size={20} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">{title}</h3>
                </div>
                {showToggle && onToggle && (
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => onToggle(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label className="text-sm font-medium text-gray-700">
                            Include {title} section
                        </label>
                    </div>
                )}
            </div>
            {children}
        </div>
    );
};

interface DraggableSectionsProps {
    sections: Array<{
        id: string;
        title: string;
        component: React.ReactNode;
        isEnabled?: boolean;
        onToggle?: (enabled: boolean) => void;
        showToggle?: boolean;
    }>;
    onSectionOrderChange: (newOrder: string[]) => void;
}

export const DraggableSections: React.FC<DraggableSectionsProps> = ({
    sections,
    onSectionOrderChange,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = sections.findIndex((section) => section.id === active.id);
            const newIndex = sections.findIndex((section) => section.id === over?.id);

            const newOrder = arrayMove(
                sections.map((section) => section.id),
                oldIndex,
                newIndex
            );

            onSectionOrderChange(newOrder);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={sections.map((section) => section.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-6">
                    {sections.map((section) => (
                        <DraggableSection
                            key={section.id}
                            id={section.id}
                            title={section.title}
                            isEnabled={section.isEnabled}
                            onToggle={section.onToggle}
                            showToggle={section.showToggle}
                        >
                            {section.component}
                        </DraggableSection>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
