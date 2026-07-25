import { BadRequestError } from "@/utils/app-error.js";
import { AllowedActionType, ProposedAction } from "./action.types.js";
import { ActionHandler } from "./handlers/index.js";

/**
 * Registry for managing AI action handlers.
 * Provides O(1) lookup and enforces type safety and unique registration.
 * Pure in-memory registry: zero Express, MongoDB, or AIService dependencies.
 */
export class ActionRegistry {
  private handlers = new Map<AllowedActionType, ActionHandler<ProposedAction>>();

  /**
   * Registers a new action handler.
   * Throws error if a handler for the same action type is already registered.
   */
  public register<T extends ProposedAction>(handler: ActionHandler<T>): void {
    if (!handler || !handler.actionType) {
      throw new BadRequestError("Invalid action handler provided.");
    }

    if (this.handlers.has(handler.actionType)) {
      throw new BadRequestError(`Action handler for type '${handler.actionType}' is already registered.`);
    }

    this.handlers.set(handler.actionType, handler as unknown as ActionHandler<ProposedAction>);
  }

  /**
   * Retrieves an action handler by action type.
   * Throws BadRequestError if the action type is unknown or unregistered.
   */
  public get<T extends ProposedAction = ProposedAction>(actionType: AllowedActionType): ActionHandler<T> {
    const handler = this.handlers.get(actionType);
    if (!handler) {
      throw new BadRequestError(`Unsupported or unregistered AI action type: '${actionType}'.`);
    }
    return handler as unknown as ActionHandler<T>;
  }

  /**
   * Checks if an action handler is registered for the given action type.
   */
  public has(actionType: string): boolean {
    return this.handlers.has(actionType as AllowedActionType);
  }

  /**
   * Clears all registered handlers. (Primarily for testing environments).
   */
  public clear(): void {
    this.handlers.clear();
  }

  /**
   * Returns a list of all currently registered action types.
   */
  public registeredTypes(): AllowedActionType[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Singleton instance of ActionRegistry.
 */
export const actionRegistry = new ActionRegistry();
