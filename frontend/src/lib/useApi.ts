import { useCallback, useEffect, useState } from "react";

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Executa `fn` quando as dependências mudam e expõe estado de carregamento. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => ativo && setData(d))
      .catch((e: unknown) => ativo && setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { data, loading, error, reload: run };
}
