import './index.css';

import cn from 'classnames';
import React from 'react';

export interface DividerProps {
  className?: string;
  style?: Record<string, string | number>;
}

export const Divider = ({ className, style }: DividerProps) => {
  return (
    <div id="Divider" className={cn(className, 'rmv-divider')} style={style} />
  );
};

Divider.displayName = 'Divider';
