import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TaskSearchProps {
  value: string;
  onChange: (val: string) => void;
}

export function TaskSearch({ value, onChange }: TaskSearchProps) {
  return (
    <div className="relative flex-1 min-w-[200px] md:max-w-xs">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/75" />
      <Input
        id="task-search-input"
        type="text"
        placeholder="Search tasks..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 pr-7 text-xs rounded-lg border border-border/80 bg-background placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-hidden"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground/80" />
        </button>
      )}
    </div>
  );
}
