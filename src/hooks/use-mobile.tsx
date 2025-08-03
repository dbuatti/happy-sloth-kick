import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    
    mql.addEventListener("change", onChange);
    
    // Re-check on mount in case the window size changed between initial render and effect execution
    if (mql.matches !== isMobile) {
        setIsMobile(mql.matches);
    }

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}