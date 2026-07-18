import { Bell, Palette, Shield, Trash2, User, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

const navigationItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: UserCog },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "danger-zone", label: "Danger Zone", icon: Trash2, destructive: true },
];

interface SettingsNavigationProps {
  activeSection: string;
  onItemClick: (id: string) => void;
}

export function SettingsNavigation({ activeSection, onItemClick }: SettingsNavigationProps) {
  return (
    <nav className="flex flex-col sm:flex-row md:flex-col gap-1 border-b border-border/40 sm:border-b-0 pb-4 sm:pb-0 mb-6 md:mb-0 md:sticky md:top-6 w-full md:w-56 shrink-0">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => onItemClick(item.id)}
            className={cn(
              "justify-start gap-2.5 px-3 py-2 h-9 text-sm font-medium transition-all rounded-md relative",
              isActive
                ? item.destructive
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary"
                : item.destructive
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              // Desktop-specific active indicator line (optional, but looks nice and premium)
              "md:before:absolute md:before:left-0 md:before:top-1.5 md:before:h-6 md:before:w-0.5 md:before:rounded-r md:before:bg-primary md:before:opacity-0 md:before:transition-all",
              isActive && !item.destructive && "md:before:opacity-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
