import React from 'react';

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  React.useEffect(() => {
    console.log('>>>OccWebGLViewer>>>', error.message);
  });

  return (
    <div role="alert">
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
