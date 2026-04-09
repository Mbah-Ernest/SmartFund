import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { login } from '../api/authApi';
import { toApiClientError } from '../api/apiError';
import { getAuthToken, setAuthToken } from '../auth/authStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmartFundLogo } from '@/components/smart-fund-logo';

export default function LoginPage() {
  const existing = getAuthToken();
  const location = useLocation();
  const registered = (location.state as { registered?: boolean } | null)?.registered === true;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !saving;
  }, [password, saving, username]);

  async function submit() {
    setError(null);
    if (!canSubmit) return;

    setSaving(true);
    try {
      const result = await login({
        username: username.trim(),
        password
      });

      setAuthToken(result.token);

      window.location.assign('/');
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  if (existing) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <Card className="w-full max-w-md relative glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <SmartFundLogo />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to manage your finances</CardDescription>
        </CardHeader>

        <CardContent>
          {registered && (
            <Alert className="mb-6 border-success/50 bg-success/10 text-success">
              <AlertDescription>Account created successfully! Please sign in.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="mb-6 border-destructive/50 bg-destructive/10 text-destructive" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={saving}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={saving}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={saving}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {password && password.length < 6 && (
                  <FieldError>Password must be at least 6 characters</FieldError>
                )}
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full mt-6" disabled={!canSubmit}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
              ) : 'Sign In'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link to="/register" className="text-primary hover:underline font-medium">Create one</Link>
          </p>
          <p className="text-xs text-muted-foreground">Admin credentials in appsettings.json</p>
        </CardFooter>
      </Card>
    </div>
  );
}
