import { useEffect, useState } from 'react';

/**
 * Returns true if the current viewport matches the given media query.
 * Common pattern: const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia(query).matches);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsMobile = (bp = 768) => useMediaQuery(`(max-width: ${bp}px)`);
