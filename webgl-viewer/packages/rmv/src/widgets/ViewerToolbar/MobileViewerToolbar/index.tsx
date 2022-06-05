import cn from 'classnames';
import React from 'react';

export interface MobileViewerToolbarProps {
  className?: string;
  style?: Record<string, string | number>;
}

export const MobileViewerToolbar = ({
  className,
  style,
}: MobileViewerToolbarProps) => {
  return (
    <div id="MobileViewerToolbar" className={cn(className)} style={style}>
      MobileViewerToolbar
    </div>
  );
};

MobileViewerToolbar.displayName = 'MobileViewerToolbar';
