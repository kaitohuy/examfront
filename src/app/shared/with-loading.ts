import { finalize, MonoTypeOperatorFunction } from 'rxjs';

/** Bật/tắt loading quanh 1 Observable */
export function withLoading(setter: (v: boolean) => void): MonoTypeOperatorFunction<any> {
  return (source$) => {
    setter(true);
    return source$.pipe(finalize(() => setter(false)));
  };
}
