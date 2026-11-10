import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Minimal data-loading hook: keeps the latest loader in a ref so callers can
 * pass inline closures without causing an infinite refetch loop.
 */
export function useAsync<T>(loader: () => Promise<T>, key = '') {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Something went wrong.',
          loading: false,
        });
      });
    return () => {
      active = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload, setData: (data: T) => setState({ data, error: null, loading: false }) };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
