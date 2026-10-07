import { useEffect } from 'react';

export default function useImageRefresh(refresh) {
  useEffect(() => {
    const timer = setInterval(refresh, 45 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
}
