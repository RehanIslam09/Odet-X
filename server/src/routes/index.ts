import { Router } from "express";

import authRoutes from "@/routes/auth.routes.js";
import projectRoutes from "@/routes/project.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running.",
  });
});

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);

export default router;