/**
 * Metadata for organizing, versioning, and discovering prompts.
 */
export interface PromptMetadata {
  /** A unique identifier for this prompt template. */
  name: string;
  /** The version string (e.g., '1.0.0'). Used for observability. */
  version: string;
  /** A brief description of what this prompt accomplishes. */
  description: string;
}

/**
 * Represents a discrete section of a prompt.
 */
export interface PromptSection {
  /** The internal identifier, used for the structural XML delimiter (e.g., 'context'). */
  identifier: string;
  /** Optional human-readable title for internal documentation. */
  title?: string;
  /** The text content of the section. */
  content: string;
}

/**
 * The flexible template structure for any AI prompt.
 */
export interface PromptTemplate {
  metadata: PromptMetadata;
  sections: PromptSection[];
}
