import './index.css';

import cn from 'classnames';
import React from 'react';

export interface BoxSpinProps {
  className?: string;
  style?: Record<string, string | number>;
}

export const BoxSpin = ({ className, style }: BoxSpinProps) => {
  return (
    <div
      id="BoxSpin"
      className={cn(className, 'cssload-box-loading')}
      style={style}
    />
  );
};

BoxSpin.displayName = 'BoxSpin';
