import { useEffect } from "react";
import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { SettingsNavigation } from "../components/SettingsNavigation";

export default function SettingsPage() {
  const location = useLocation();

  // Reset primary vertical scroll owner (`main`) to top on route change
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);



  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-6xl mx-auto"
    >
      {/* Main Settings Layout */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
        {/* Navigation Sidebar */}
        <SettingsNavigation />

        {/* Content Modules */}
        <div className="flex-1 w-full space-y-6 pb-32">
          {/* Page Header (Now inside the scrolling content column) */}
          <div className="border-b pb-5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Manage your personal profile, locale preferences, notifications, theme appearance, and security.
            </p>
          </div>

          <div className="space-y-2">
            <Outlet />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
