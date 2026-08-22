import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useActiveWorkspace } from "../context/WorkspaceContext.js";

export function DefaultWorkspaceRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWorkspace, isLoading, isError } = useActiveWorkspace();

  useEffect(() => {
    if (isLoading) return;

    if (currentWorkspace?.slug) {
      // Derive subpath if coming from un-prefixed URL e.g., /projects -> /w/:slug/projects
      const rawPath = location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname;
      const subpath = rawPath && rawPath !== "dashboard" ? `/${rawPath}` : "/dashboard";
      navigate(`/w/${currentWorkspace.slug}${subpath}`, { replace: true });
    }
  }, [currentWorkspace, isLoading, location.pathname, navigate]);

  if (isError || (!isLoading && !currentWorkspace)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            !
          </div>
          <h2 className="text-base font-semibold text-foreground">Workspace Recovery Required</h2>
          <p className="text-xs text-muted-foreground">
            We couldn't load your active workspace session. Please try refreshing or logging back in.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Reload Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs font-medium text-muted-foreground">Hydrating workspace session...</p>
    </div>
  );
}
