import { Outlet } from "react-router-dom";

import {
  DashboardNavbar,
  DashboardSidebar,
} from "@/components/layout";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />

      <div className="flex flex-1 flex-col">
        <DashboardNavbar />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}