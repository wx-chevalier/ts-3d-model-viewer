import { CloseOutlined } from '@ant-design/icons';
import cn from 'classnames';
import React from 'react';

import { Divider } from '../decorators';

export interface RendererAttrPanelProps {
  className?: string;
  style?: Record<string, string | number>;

  children?: React.ReactNode;
}

export const RendererAttrPanel = ({
  className,
  style,
  children,
}: RendererAttrPanelProps) => {
  return (
    <div className="rmv-drawer-panel">
      <div className="rmv-drawer-panel-header">
        <span>1</span>
        <CloseOutlined />
      </div>
      <Divider />
    </div>
  );
};

RendererAttrPanel.displayName = 'RendererAttrPanel';
