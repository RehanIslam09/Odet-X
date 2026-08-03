import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { ProjectIcon } from "@/components/common/ProjectIcon";
import {
  PROJECT_ICON_CATEGORIES,
  PROJECT_COLOR_PALETTE,
  resolveProjectIconName,
} from "../config/project-identity.config";

interface ProjectIdentityPickerProps {
  selectedIcon?: string;
  selectedColor?: string;
  projectName?: string;
  projectDescription?: string;
  onIconChange: (iconId: string) => void;
  onColorChange: (colorHex: string) => void;
}

export function ProjectIdentityPicker({
  selectedIcon = "Folder",
  selectedColor = "#6366f1",
  projectName = "",
  projectDescription = "",
  onIconChange,
  onColorChange,
}: ProjectIdentityPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const currentIconId = resolveProjectIconName(selectedIcon);

  // Filter icons based on search query or category
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      if (activeCategory === "all") return PROJECT_ICON_CATEGORIES;
      return PROJECT_ICON_CATEGORIES.filter((c) => c.id === activeCategory);
    }

    return PROJECT_ICON_CATEGORIES.map((category) => ({
      ...category,
      icons: category.icons.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.label.toLowerCase().includes(query)
      ),
    })).filter((category) => category.icons.length > 0);
  }, [searchQuery, activeCategory]);

  return (
    <div className="space-y-4">
      {/* Live Preview Card */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {currentIconId} • {selectedColor}
          </span>
        </div>

        <div
          className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-2xs transition-all"
          style={{ borderLeftColor: selectedColor, borderLeftWidth: 3 }}
        >
          <ProjectIcon icon={currentIconId} color={selectedColor} size="md" />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-foreground">
              {projectName.trim() || "Untitled Project"}
            </h4>
            <p className="truncate text-[11px] text-muted-foreground mt-0.5">
              {projectDescription.trim() || "Project preview card description"}
            </p>
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Accent Color</Label>
          <span className="text-[11px] text-muted-foreground font-mono">
            {PROJECT_COLOR_PALETTE.find((c) => c.hex === selectedColor)?.name || selectedColor}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLOR_PALETTE.map(({ hex, name }) => {
            const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onColorChange(hex)}
                className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 scale-105" : "hover:opacity-90"
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select ${name} color`}
                title={`${name} (${hex})`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Project Icon</Label>
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Category Tabs if search is empty */}
        {!searchQuery && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="h-7 w-full justify-start overflow-x-auto bg-muted/40 p-0.5 text-xs">
              <TabsTrigger value="all" className="h-6 px-2 text-[11px]">
                All
              </TabsTrigger>
              {PROJECT_ICON_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="h-6 px-2 text-[11px]">
                  {cat.name.split(" ")[0]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Icon Grid */}
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70 bg-card p-2 space-y-3">
          {filteredCategories.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching icons found.
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="space-y-1.5">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {category.name}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {category.icons.map(({ id, label }) => {
                    const isSelected = currentIconId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onIconChange(id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                            : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                        }`}
                        title={label}
                        aria-label={`Select ${label} icon`}
                      >
                        <ProjectIcon icon={id} color={isSelected ? selectedColor : undefined} size="xs" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
