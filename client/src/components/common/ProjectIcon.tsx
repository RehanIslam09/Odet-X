import { memo } from "react";
import {
  resolveProjectIcon,
  DEFAULT_PROJECT_COLOR,
} from "@/features/projects/config/project-identity.config.js";

export type ProjectIconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ProjectIconProps {
  /** Lucide icon name or legacy emoji character */
  icon?: string;
  /** Project accent color in hex or CSS color format */
  color?: string;
  /** Container size preset */
  size?: ProjectIconSize;
  /** Additional custom Tailwind class names */
  className?: string;
}

const SIZE_CONFIG: Record<
  ProjectIconSize,
  { container: string; icon: string }
> = {
  xs: {
    container: "h-5 w-5 rounded-md border text-xs",
    icon: "h-3 w-3",
  },
  sm: {
    container: "h-7 w-7 rounded-lg border text-xs",
    icon: "h-3.5 w-3.5",
  },
  md: {
    container: "h-9 w-9 rounded-lg border text-sm",
    icon: "h-4.5 w-4.5",
  },
  lg: {
    container: "h-11 w-11 rounded-xl border text-base",
    icon: "h-5.5 w-5.5",
  },
  xl: {
    container: "h-14 w-14 rounded-xl border text-lg",
    icon: "h-7 w-7",
  },
};

/**
 * Unified Single Source of Truth for Project Identity Icons.
 *
 * Renders a project's icon inside a rounded container with subtle
 * background tint and project accent styling. Handles legacy emoji
 * characters transparently via `resolveProjectIcon`.
 */
export const ProjectIcon = memo(function ProjectIcon({
  icon,
  color = DEFAULT_PROJECT_COLOR,
  size = "md",
  className = "",
}: ProjectIconProps) {
  const IconComponent = resolveProjectIcon(icon);
  const sizeStyle = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Format valid hex background tint & border color safely
  const accentColor = color || DEFAULT_PROJECT_COLOR;
  const isHex = accentColor.startsWith("#");

  const backgroundColor = isHex ? `${accentColor}18` : "var(--primary)/0.1";
  const borderColor = isHex ? `${accentColor}30` : "var(--primary)/0.2";

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center transition-colors shadow-2xs ${sizeStyle.container} ${className}`}
      style={{
        backgroundColor,
        borderColor,
        color: accentColor,
      }}
      aria-hidden="true"
    >
      <IconComponent className={`${sizeStyle.icon} shrink-0`} />
    </div>
  );
});

export default ProjectIcon;
