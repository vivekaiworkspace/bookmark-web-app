import { LoginForm } from "@/components/login-form";
import { Bookmark } from "lucide-react";

const ERRORS: Record<string, string> = {
  oauth:
    "Google sign-in is not enabled on this project. Use email and password instead.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bookmark className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Smart Bookmark Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Save links, organize with global tags, and keep notes in one
            workspace.
          </p>
        </div>
        <LoginForm
          nextPath={next && next.startsWith("/") ? next : "/"}
          errorMessage={error ? ERRORS[error] ?? "Sign-in failed. Try email and password." : undefined}
        />
      </div>
    </div>
  );
}
