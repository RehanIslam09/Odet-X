import { type Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import { BrainCircuit, Layers, Zap, Users } from "lucide-react";

// ---------------------------------------------------------------------------
// Feature highlights shown on the left brand panel
// ---------------------------------------------------------------------------

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Planning",
    description: "Generate tasks and sprints from a single project description.",
  },
  {
    icon: Layers,
    title: "Kanban & Timeline",
    description: "Visualize work across boards, lists, and calendar views.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Real-time updates, comments, and presence indicators.",
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description: "Automate recurring tasks and status transitions.",
  },
];

// ---------------------------------------------------------------------------
// Animation variants — typed as Variants for Framer Motion v12 compatibility
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ---------------------------------------------------------------------------
// Left Panel — Brand
// ---------------------------------------------------------------------------

function BrandPanel() {
  return (
    <div className="relative hidden w-[40%] shrink-0 overflow-hidden lg:flex lg:flex-col">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[oklch(0.145_0_0)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.3_0.15_264)_0%,transparent_60%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.25_0.1_300)_0%,transparent_60%)] opacity-40" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex h-full flex-col justify-between px-10 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            AI Project Manager
          </span>
        </motion.div>

        {/* Center copy */}
        <div className="space-y-10">
          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="text-3xl font-semibold leading-snug tracking-tight text-white">
              Projects move faster
              <br />
              <span className="text-white/60">with the right tools.</span>
            </h1>
            <p className="text-sm leading-relaxed text-white/50">
              AI-driven project management built for modern engineering teams.
            </p>
          </motion.div>

          {/* Feature highlights */}
          <motion.ul variants={containerVariants} className="space-y-5">
            {features.map(({ icon: Icon, title, description }) => (
              <motion.li
                key={title}
                variants={itemVariants}
                className="flex items-start gap-3.5"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/12">
                  <Icon className="h-3.5 w-3.5 text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/40">
                    {description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-xs text-white/25">
          © {new Date().getFullYear()} AI Project Manager. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel — Auth Form
// ---------------------------------------------------------------------------

const formPanelVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut", delay: 0.1 },
  },
};

function FormPanel() {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12"
      variants={formPanelVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Mobile-only logo */}
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          AI
        </div>
        <span className="text-sm font-semibold tracking-tight">
          AI Project Manager
        </span>
      </div>

      <div className="w-full max-w-[380px]">
        <Outlet />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Two-column authentication layout.
 *
 * Desktop: Left brand panel (40%) + right form panel (60%).
 * Mobile: Single centered form panel (brand panel hidden).
 *
 * The `Outlet` inside `FormPanel` renders the active auth route
 * (LoginPage or RegisterPage). Both panels use Framer Motion for a
 * polished entrance animation on initial load.
 */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />
      <FormPanel />
    </div>
  );
}
