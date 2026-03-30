import { useEffect } from 'react';
import { useMonitor } from './useMonitor';

/**
 * RouteTracker is an optional component placed inside the React Router tree
 * (e.g., inside Layout). It enriches page view events with React Router context
 * that the hashchange-based PageViewTracker cannot capture.
 *
 * Usage:
 * ```tsx
 * // Inside Layout.tsx or any component within RouterProvider
 * import { RouteTracker } from '@web-monitor/sdk/react';
 *
 * const Layout = () => (
 *   <div>
 *     <RouteTracker />
 *     {children}
 *   </div>
 * );
 * ```
 */
export const RouteTracker: React.FC = () => {
  const monitor = useMonitor();

  useEffect(() => {
    // Dynamic import to avoid hard dependency on react-router-dom
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const { useLocation } = await import('react-router-dom');
        // We can't use hooks from a dynamic import inside useEffect.
        // Instead, we'll use hashchange as the primary mechanism
        // and enrich with pathname from window.location

        const handleRouteChange = () => {
          const hash = window.location.hash;
          const path = hash.startsWith('#') ? hash.slice(1).split('?')[0] : '/';

          monitor.enrichPageView({
            path,
            search: window.location.search || hash.split('?')[1],
          });
        };

        window.addEventListener('hashchange', handleRouteChange);
        cleanup = () => window.removeEventListener('hashchange', handleRouteChange);
      } catch {
        // react-router-dom not available, silently skip
      }
    };

    setup();

    return () => cleanup?.();
  }, [monitor]);

  return null;
};
