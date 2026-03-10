declare module 'react-router-dom' {
  import type * as React from 'react';

  export type NavigateProps = { to: string; replace?: boolean };

  export function BrowserRouter(props: React.PropsWithChildren): React.JSX.Element;
  export function Routes(props: React.PropsWithChildren): React.JSX.Element;
  export function Route(props: any): React.JSX.Element;
  export function Navigate(props: NavigateProps): React.JSX.Element;
  export function Outlet(props: Record<string, never>): React.JSX.Element;
  export function NavLink(props: any): React.JSX.Element;
  export function Link(props: any): React.JSX.Element;
}
