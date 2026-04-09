declare module 'react-router-dom' {
  import type * as React from 'react';

  export type NavigateProps = { to: string; replace?: boolean; state?: unknown };

  export type BrowserRouterFuture = {
    v7_startTransition?: boolean;
    v7_relativeSplatPath?: boolean;
  };

  export type BrowserRouterProps = React.PropsWithChildren<{
    future?: BrowserRouterFuture;
  }>;

  export function BrowserRouter(props: BrowserRouterProps): React.JSX.Element;
  export function Routes(props: React.PropsWithChildren): React.JSX.Element;
  export function Route(props: any): React.JSX.Element;
  export function Navigate(props: NavigateProps): React.JSX.Element;
  export function Outlet(props: Record<string, never>): React.JSX.Element;
  export function NavLink(props: any): React.JSX.Element;
  export function Link(props: any): React.JSX.Element;

  export function useNavigate(): (to: string, opts?: { replace?: boolean; state?: unknown }) => void;
  export function useLocation(): { pathname: string; search: string; hash: string; state: unknown };
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
}
