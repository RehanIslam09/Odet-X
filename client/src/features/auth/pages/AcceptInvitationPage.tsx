import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Building2, Clock, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import { useAuthStore } from "@/store/auth.store.js";
import {
  useAcceptInvitation,
  useValidateInvitation,
} from "@/features/workspaces/hooks/useWorkspaces.js";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: details, isLoading, isError, error } = useValidateInvitation(token);
  const acceptMutation = useAcceptInvitation();

  const handleAccept = () => {
    if (!token) return;

    if (!isAuthenticated) {
      toast.info("Please login or register to accept this workspace invitation.");
      navigate(`/auth/login?redirect=/invitations/${token}`);
      return;
    }

    acceptMutation.mutate(token, {
      onSuccess: (data) => {
        toast.success(`Joined workspace "${details?.workspaceName || "Workspace"}"!`);
        navigate(`/w/${data.workspaceSlug}/dashboard`);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to accept invitation.";
        toast.error(msg);
      },
    });
  };

  const errorResponse = (error as { response?: { status?: number; data?: { code?: string; message?: string } } })?.response;
  const isExpired = errorResponse?.status === 410 || errorResponse?.data?.code === "INVITATION_EXPIRED";
  const validationErrorMessage = errorResponse?.data?.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
              isExpired
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isExpired ? <Clock className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {isExpired ? "Invitation Link Expired" : "Workspace Invitation"}
          </CardTitle>
          <CardDescription>
            {isExpired
              ? "This invitation token is no longer valid."
              : "You have been invited to collaborate on AI Project Manager."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Validating invitation token...</p>
            </div>
          ) : isExpired ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300 space-y-2">
              <Clock className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="font-semibold text-foreground">Link Expired for Security</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Workspace invitation links automatically expire 7 days after issuance. Please request a new invitation from your workspace administrator or primary owner.
              </p>
            </div>
          ) : isError || !details ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 shrink-0" />
              <p className="font-semibold">Invalid Invitation</p>
              <p className="mt-1 text-xs text-destructive/80">
                {validationErrorMessage ||
                  "This invitation token is invalid, expired, or has already been revoked."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-semibold text-foreground">{details.workspaceName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Role Granted</span>
                <span className="font-medium capitalize text-primary">
                  {details.invitation.role.toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invited By</span>
                <span className="font-medium text-foreground">
                  {details.invitation.invitedBy.name}
                </span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {details && !isError && !isExpired && (
            <Button
              className="w-full gap-2"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining Workspace...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Accept Invitation & Join
                </>
              )}
            </Button>
          )}

          {isExpired && (
            <Button
              variant="default"
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                toast.info("Please request a new invitation from your workspace admin.");
                navigate("/auth/login");
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Request New Invitation Link
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Return to Homepage
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
