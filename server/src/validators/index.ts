export {
  bioSchema,
  loginSchema,
  registerSchema,
  type LoginUserDto,
  type RegisterUserDto,
} from "@/validators/auth.validator.js";

export {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  type CreateProjectDto,
  type UpdateProjectDto,
  type ProjectQueryDto,
} from "@/validators/project.validator.js";
