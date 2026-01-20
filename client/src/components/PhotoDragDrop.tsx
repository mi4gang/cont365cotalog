import { useState, useEffect } from "react";
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
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: number;
  url: string;
  displayOrder: number;
  isMain: boolean;
}

interface SortablePhotoProps {
  photo: Photo;
  isSettingMain: boolean;
  onSetMain: (photoId: number) => void;
}

function SortablePhoto({ photo, isSettingMain, onSetMain }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex-shrink-0 cursor-grab active:cursor-grabbing",
        isDragging && "z-50 opacity-80"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Photo thumbnail */}
      <div
        className={cn(
          "w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
          photo.isMain
            ? "border-yellow-400 ring-2 ring-yellow-400/50"
            : "border-gray-200 hover:border-blue-400"
        )}
      >
        <img
          src={photo.url}
          alt={`Фото ${photo.displayOrder}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Main photo indicator */}
      {photo.isMain && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
          <Star className="w-3 h-3 text-yellow-900 fill-current" />
        </div>
      )}

      {/* Set as main button (on hover) */}
      {!photo.isMain && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetMain(photo.id);
          }}
          disabled={isSettingMain}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
          title="Сделать главным"
        >
          {isSettingMain ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Star className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {/* Order number */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b-lg">
        #{photo.displayOrder}
      </div>
    </div>
  );
}

interface PhotoDragDropProps {
  photos: Photo[];
  isReordering: boolean;
  isSettingMain: boolean;
  onReorder: (photoIds: number[]) => void;
  onSetMain: (photoId: number) => void;
}

export default function PhotoDragDrop({
  photos,
  isReordering,
  isSettingMain,
  onReorder,
  onSetMain,
}: PhotoDragDropProps) {
  const [items, setItems] = useState(photos);

  // Update items when photos prop changes (including isMain flag)
  useEffect(() => {
    setItems(photos);
  }, [photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      
      // Call onReorder with new order
      onReorder(newItems.map((item) => item.id));
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic py-2">
        Нет фотографий
      </div>
    );
  }

  return (
    <div className="relative">
      {isReordering && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 overflow-x-auto py-2 px-1">
            {items.map((photo) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                isSettingMain={isSettingMain}
                onSetMain={onSetMain}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <p className="text-xs text-gray-500 mt-1">
        Перетащите фото для изменения порядка. Нажмите на фото для выбора главного.
      </p>
    </div>
  );
}
