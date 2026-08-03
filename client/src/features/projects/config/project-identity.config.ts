/**
 * Phase 35 — Project Identity System Config & Legacy Migration Mapper
 *
 * Defines curated Lucide icon categories, elegant SaaS color palette,
 * and seamless runtime mapping for legacy emoji characters.
 */

import {
  Folder,
  Briefcase,
  Globe,
  Bookmark,
  Archive,
  Box,
  Code,
  Braces,
  Terminal,
  Server,
  Database,
  Cpu,
  Cloud,
  Layers,
  Palette,
  Sparkles,
  Brain,
  Layout,
  Compass,
  Feather,
  Rocket,
  Zap,
  CheckCircle2,
  Target,
  Flag,
  Flame,
  BarChart3,
  TrendingUp,
  Wallet,
  PieChart,
  Shield,
  Lock,
  Key,
  Activity,
  Monitor,
  FileText,
  FlaskConical,
  Megaphone,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Curated Icon Definition Types & Registry
// ---------------------------------------------------------------------------

export interface ProjectIconCategory {
  id: string;
  name: string;
  icons: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
  }>;
}

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  // General
  Folder,
  Briefcase,
  Globe,
  Bookmark,
  Archive,
  Box,
  FileText,
  ShoppingBag,
  // Engineering & Tech
  Code,
  Braces,
  Terminal,
  Server,
  Database,
  Cpu,
  Cloud,
  Layers,
  Monitor,
  FlaskConical,
  // Design & Product
  Palette,
  Sparkles,
  Brain,
  Layout,
  Compass,
  Feather,
  Megaphone,
  // Delivery & Execution
  Rocket,
  Zap,
  CheckCircle2,
  Target,
  Flag,
  Flame,
  // Analytics & Finance
  BarChart3,
  TrendingUp,
  Wallet,
  PieChart,
  // Security & Operations
  Shield,
  Lock,
  Key,
  Activity,
};

export const PROJECT_ICON_CATEGORIES: ProjectIconCategory[] = [
  {
    id: "general",
    name: "General & Org",
    icons: [
      { id: "Folder", label: "Folder", icon: Folder },
      { id: "Briefcase", label: "Briefcase", icon: Briefcase },
      { id: "Globe", label: "Globe", icon: Globe },
      { id: "Bookmark", label: "Bookmark", icon: Bookmark },
      { id: "Archive", label: "Archive", icon: Archive },
      { id: "Box", label: "Box", icon: Box },
      { id: "FileText", label: "File", icon: FileText },
      { id: "ShoppingBag", label: "Store", icon: ShoppingBag },
    ],
  },
  {
    id: "tech",
    name: "Engineering & Tech",
    icons: [
      { id: "Code", label: "Code", icon: Code },
      { id: "Braces", label: "Braces", icon: Braces },
      { id: "Terminal", label: "Terminal", icon: Terminal },
      { id: "Server", label: "Server", icon: Server },
      { id: "Database", label: "Database", icon: Database },
      { id: "Cpu", label: "CPU", icon: Cpu },
      { id: "Cloud", label: "Cloud", icon: Cloud },
      { id: "Layers", label: "Layers", icon: Layers },
      { id: "Monitor", label: "Monitor", icon: Monitor },
      { id: "FlaskConical", label: "Lab", icon: FlaskConical },
    ],
  },
  {
    id: "design",
    name: "Design & Product",
    icons: [
      { id: "Palette", label: "Palette", icon: Palette },
      { id: "Sparkles", label: "Sparkles", icon: Sparkles },
      { id: "Brain", label: "AI / Brain", icon: Brain },
      { id: "Layout", label: "Layout", icon: Layout },
      { id: "Compass", label: "Compass", icon: Compass },
      { id: "Feather", label: "Feather", icon: Feather },
      { id: "Megaphone", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    id: "delivery",
    name: "Execution & Delivery",
    icons: [
      { id: "Rocket", label: "Rocket", icon: Rocket },
      { id: "Zap", label: "Zap", icon: Zap },
      { id: "CheckCircle2", label: "Complete", icon: CheckCircle2 },
      { id: "Target", label: "Target", icon: Target },
      { id: "Flag", label: "Milestone", icon: Flag },
      { id: "Flame", label: "Flame", icon: Flame },
    ],
  },
  {
    id: "analytics",
    name: "Analytics & Finance",
    icons: [
      { id: "BarChart3", label: "Bar Chart", icon: BarChart3 },
      { id: "TrendingUp", label: "Growth", icon: TrendingUp },
      { id: "Wallet", label: "Wallet", icon: Wallet },
      { id: "PieChart", label: "Metrics", icon: PieChart },
    ],
  },
  {
    id: "security",
    name: "Security & Operations",
    icons: [
      { id: "Shield", label: "Shield", icon: Shield },
      { id: "Lock", label: "Lock", icon: Lock },
      { id: "Key", label: "Key", icon: Key },
      { id: "Activity", label: "Activity", icon: Activity },
    ],
  },
];

// ---------------------------------------------------------------------------
// Curated Color Palette
// ---------------------------------------------------------------------------

export interface ProjectColorOption {
  hex: string;
  name: string;
}

export const PROJECT_COLOR_PALETTE: ProjectColorOption[] = [
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#0284c7", name: "Sky" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#64748b", name: "Slate" },
];

export const DEFAULT_PROJECT_COLOR = "#6366f1";
export const DEFAULT_PROJECT_ICON = "Folder";

// ---------------------------------------------------------------------------
// Legacy Emoji Mapping (Transparent Runtime Migration)
// ---------------------------------------------------------------------------

const LEGACY_EMOJI_TO_ICON: Record<string, string> = {
  "📁": "Folder",
  "📂": "Folder",
  "📋": "FileText",
  "🚀": "Rocket",
  "⚡": "Zap",
  "🎯": "Target",
  "🔥": "Flame",
  "💡": "Sparkles",
  "🌟": "Sparkles",
  "⭐": "Sparkles",
  "🛠️": "Code",
  "🛠": "Code",
  "📊": "BarChart3",
  "📈": "TrendingUp",
  "🎨": "Palette",
  "🤖": "Brain",
  "🧠": "Brain",
  "💻": "Monitor",
  "🖥️": "Monitor",
  "🌐": "Globe",
  "🔒": "Lock",
  "🛡️": "Shield",
  "💼": "Briefcase",
  "💰": "Wallet",
  "🧪": "FlaskConical",
};

/**
 * Resolves an icon key or legacy emoji string to a verified LucideIcon component.
 * Defaults cleanly to `Folder` if unmapped or unknown.
 */
export function resolveProjectIcon(rawIconOrEmoji?: string): LucideIcon {
  if (!rawIconOrEmoji) return Folder;

  const trimmed = rawIconOrEmoji.trim();

  // 1. Direct match in icon map
  if (PROJECT_ICON_MAP[trimmed]) {
    return PROJECT_ICON_MAP[trimmed];
  }

  // 2. Legacy emoji lookup
  const mappedIconName = LEGACY_EMOJI_TO_ICON[trimmed];
  if (mappedIconName && PROJECT_ICON_MAP[mappedIconName]) {
    return PROJECT_ICON_MAP[mappedIconName];
  }

  // 3. Case-insensitive fallback check
  const pascalName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (PROJECT_ICON_MAP[pascalName]) {
    return PROJECT_ICON_MAP[pascalName];
  }

  // 4. Default fallback
  return Folder;
}

/**
 * Returns the resolved icon identifier string (e.g. "Palette", "Rocket", "Folder").
 */
export function resolveProjectIconName(rawIconOrEmoji?: string): string {
  if (!rawIconOrEmoji) return DEFAULT_PROJECT_ICON;
  const trimmed = rawIconOrEmoji.trim();
  if (PROJECT_ICON_MAP[trimmed]) return trimmed;
  if (LEGACY_EMOJI_TO_ICON[trimmed]) return LEGACY_EMOJI_TO_ICON[trimmed];
  return DEFAULT_PROJECT_ICON;
}
