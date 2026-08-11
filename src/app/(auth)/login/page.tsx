import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Login authenticates. It does not register.
//
// INV-08: there is no self-signup, so there is no link to a signup page and no signup page to link
// to. Accounts are created by a Manager or Admin. The note is rendered rather than left as a comment
// because a user arriving here without an account needs to know what to do next.
export default function LoginPage() {
  return (
    <main data-testid="login-page" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold">Sign in</h1>

        <form className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" data-testid="login-email" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <Input id="password" name="password" type="password" autoComplete="current-password" data-testid="login-password" />
          </div>
          <Button type="submit" className="w-full" data-testid="login-submit">
            Sign in
          </Button>
        </form>

        <p data-testid="login-no-signup" className="mt-6 text-xs text-muted">
          Accounts are created by a Manager or an Administrator. There is no self-registration.
        </p>
      </div>
    </main>
  );
}
