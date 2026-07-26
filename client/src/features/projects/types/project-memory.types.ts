export interface ProjectMemory {
  id: string;
  content: string;
  sourceType: "USER";
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListProjectMemoriesResponseData {
  items: ProjectMemory[];
  pagination: PaginationMetadata;
}

export interface ProjectMemoryResponseData {
  memory: ProjectMemory;
}

export interface CreateProjectMemoryDto {
  content: string;
}

export interface UpdateProjectMemoryDto {
  content: string;
  expectedVersion: number;
}

export interface ProjectMemoryQueryParams {
  page?: number;
  limit?: number;
}
