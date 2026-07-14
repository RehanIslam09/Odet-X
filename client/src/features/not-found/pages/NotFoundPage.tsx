import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-bold tracking-tight text-primary">
          404
        </h1>

        <h2 className="text-3xl font-semibold">
          Page not found
        </h2>

        <p className="max-w-md text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}