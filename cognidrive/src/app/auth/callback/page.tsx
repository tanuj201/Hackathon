import { Suspense } from "react";
import { AuthCallbackPage } from "@/components/auth/auth-callback-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">Signing in...</div>
      }
    >
      <AuthCallbackPage />
    </Suspense>
  );
}
