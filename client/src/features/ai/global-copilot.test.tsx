import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GlobalCopilotProvider } from "./context/GlobalCopilotProvider";
import { useGlobalCopilot } from "./context/GlobalCopilotContext";

function TestConsumer() {
  const { open, openCopilot, closeCopilot, context } = useGlobalCopilot();

  return (
    <div>
      <span data-testid="copilot-open-state">{open ? "OPEN" : "CLOSED"}</span>
      <span data-testid="copilot-context-type">{context.type}</span>
      <button data-testid="open-btn" onClick={() => openCopilot({ type: "project", projectId: "proj-123", projectName: "Alpha" })}>
        Open Copilot
      </button>
      <button data-testid="close-btn" onClick={closeCopilot}>
        Close Copilot
      </button>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalCopilotProvider>{ui}</GlobalCopilotProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("WP-03 Unified Global AI Copilot Component Tests", () => {
  it("1. GlobalCopilotProvider renders children and defaults to CLOSED state", () => {
    renderWithProviders(<TestConsumer />);

    expect(screen.getByTestId("copilot-open-state").textContent).toBe("CLOSED");
    expect(screen.getByTestId("copilot-context-type").textContent).toBe("workspace");
  });

  it("2. openCopilot() opens GlobalCopilotSheet and updates active context", () => {
    renderWithProviders(<TestConsumer />);

    const openBtn = screen.getByTestId("open-btn");
    fireEvent.click(openBtn);

    expect(screen.getByTestId("copilot-open-state").textContent).toBe("OPEN");
    expect(screen.getByTestId("copilot-context-type").textContent).toBe("project");
    expect(screen.getByText("AI Copilot")).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
  });

  it("3. Ctrl+J keyboard shortcut toggles GlobalCopilotSheet", () => {
    renderWithProviders(<TestConsumer />);

    expect(screen.getByTestId("copilot-open-state").textContent).toBe("CLOSED");

    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    expect(screen.getByTestId("copilot-open-state").textContent).toBe("OPEN");

    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    expect(screen.getByTestId("copilot-open-state").textContent).toBe("CLOSED");
  });
});
