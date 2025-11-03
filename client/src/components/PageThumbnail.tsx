import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface PageThumbnailProps {
  pageNumber: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  isDragging?: boolean;
}

export function PageThumbnail({
  pageNumber,
  isSelected,
  onToggleSelect,
  isDragging = false,
}: PageThumbnailProps) {
  return (
    <Card
      className={`relative cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isDragging ? "opacity-50 scale-95" : "hover:scale-105"}`}
      onClick={onToggleSelect}
      data-testid={`thumbnail-page-${pageNumber}`}
    >
      <div className="aspect-[8.5/11] flex items-center justify-center bg-muted rounded-t-md">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="p-2 flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Page {pageNumber}
        </Badge>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-page-${pageNumber}`}
        />
      </div>
    </Card>
  );
}
