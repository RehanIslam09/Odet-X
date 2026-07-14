import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { DashboardLayout } from "@/components/layout";

import ProtectedRoute from "@/routes/ProtectedRoute";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import NotFoundPage from "@/features/not-found/pages/NotFoundPage";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
);