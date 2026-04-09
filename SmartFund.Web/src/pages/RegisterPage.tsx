import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { register } from '../api/authApi';
import { toApiClientError } from '../api/apiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmartFundLogo } from '@/components/smart-fund-logo';

function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${met ? 'text-success' : 'text-muted-foreground'}`}>
      {met ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqs = {
    length: password.length >= 6,
    match: password.length > 0 && password === confirm,
  };
  const canSubmit = !saving && fullName.trim().length > 0 && email.trim().length > 0 && reqs.length && reqs.match;

  async function submit() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      navigate('/login', { state: { registered: true } });
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <Card className="w-full max-w-md relative glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <SmartFundLogo />
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Join SmartFund to manage your finances</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-6 border-destructive/50 bg-destructive/10 text-destructive" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input id="fullName" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" disabled={saving} />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={saving} />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" disabled={saving} className="pr-10" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={saving}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {password && <div className="mt-2 space-y-1"><Req met={reqs.length} label="At least 6 characters" /></div>}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                <div className="relative">
                  <Input id="confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" disabled={saving} className="pr-10" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirm(!showConfirm)} disabled={saving}>
                    {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {confirm && !reqs.match && <FieldError>Passwords do not match</FieldError>}
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full mt-6" disabled={!canSubmit}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : 'Create account'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
