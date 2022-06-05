import React from 'react';

export function useAsyncEffect<V>(
  effect: (isMounted: () => boolean) => V | Promise<V>,
  inputs?: any[],
  destroy?: (result?: V) => void,
): void {
  const hasDestroy = typeof destroy === 'function';

  React.useEffect(
    function () {
      let result: V;
      let mounted = true;
      const maybePromise = effect(function () {
        return mounted;
      });

      Promise.resolve(maybePromise)
        .then(function (value) {
          result = value;
        })
        .catch(err => {
          console.error(
            '>>>useAsyncEffect>>>error:',
            err,
            '>>>inputs: ',
            inputs,
          );
        });

      return function () {
        mounted = false;

        if (hasDestroy) {
          destroy(result);
        }
      };
    },

    inputs,
  );
}
