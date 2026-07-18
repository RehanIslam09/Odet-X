import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { SettingsNavigation } from "../components/SettingsNavigation";
import { ProfileSettings } from "../components/ProfileSettings";
import { AccountSettings } from "../components/AccountSettings";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { NotificationSettings } from "../components/NotificationSettings";
import { SecuritySettings } from "../components/SecuritySettings";
import { DangerZone } from "../components/DangerZone";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const isScrollingRef = useRef(false);

  // Scroll spy: highlight section as user scrolls
  useEffect(() => {
    const observerOptions = {
      root: null, // relative to document viewport
      rootMargin: "-15% 0px -65% 0px", // triggers when element occupies upper-middle third of screen
      threshold: 0,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Ignore intersection updates during programmatic smooth scrolls to prevent active tab flickering
      if (isScrollingRef.current) return;

      const visibleEntry = entries.find((entry) => entry.isIntersecting);
      if (visibleEntry) {
        setActiveSection(visibleEntry.target.id);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    const sectionIds = ["profile", "account", "appearance", "notifications", "security", "danger-zone"];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(id);

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // Lock observer callbacks during scroll animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Page Header */}
      <div className="border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Manage your personal profile, locale preferences, notifications, theme appearance, and security.
        </p>
      </div>

      {/* Main Settings Layout */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
        {/* Navigation Sidebar */}
        <SettingsNavigation
          activeSection={activeSection}
          onItemClick={handleItemClick}
        />

        {/* Content Modules */}
        <div className="flex-1 w-full space-y-2 pb-32">
          <ProfileSettings />
          <AccountSettings />
          <AppearanceSettings />
          <NotificationSettings />
          <SecuritySettings />
          <DangerZone />
        </div>
      </div>
    </motion.div>
  );
}
