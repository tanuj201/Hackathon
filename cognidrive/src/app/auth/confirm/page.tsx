import { Suspense } from "react";
import { AuthConfirmPage } from "@/components/auth/auth-confirm-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">Signing in...</div>
      }
    >
      <AuthConfirmPage />
    </Suspense>
  );
}
