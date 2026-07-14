import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import DashboardLayout from "@/components/layout/DashboardLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<DashboardLayout />}>
      <Route index element={<DashboardPage />} />
    </Route>,
  ),
);