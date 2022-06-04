import { CloseOutlined } from '@ant-design/icons';
import * as U from '@m-fe/utils';
import { isLanIp } from '@m-fe/utils';
import Descriptions from 'antd/lib/descriptions';
import React from 'react';

import { useViewerStateStore } from '../../../stores';
import { i18nFormat } from '../../../utils';
import { Divider } from '../../decorators';

export interface RendererAttrPanelProps {
  className?: string;
  style?: Record<string, string | number>;

  children?: React.ReactNode;
}

export const ModelAttrPanel = ({
  className,
  style,
  children,
}: RendererAttrPanelProps) => {
  const viewerStateStore = useViewerStateStore();

  const { threeRenderer, unit } = viewerStateStore;

  if (!threeRenderer || !threeRenderer.context) {
    return <></>;
  }

  const { topology, viewerProps } = threeRenderer.context;

  return (
    <div className="rmv-drawer-panel">
      <div className="rmv-drawer-panel-header">
        <span>{U.get(threeRenderer, r => r.viewerProps.fileName)}</span>
        <CloseOutlined
          onClick={() => {
            viewerStateStore.setPartialState({ isAttrPanelVisible: false });
          }}
        />
      </div>
      <Divider />
      <div className="rmv-drawer-panel-body">
        <Descriptions title={i18nFormat('尺寸')} column={1}>
          <Descriptions.Item label={i18nFormat('体积')}>
            {topology.volume ? topology.volume.toFixed(2) : 0} {unit}
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('面积')}>
            {topology.area ? topology.area.toFixed(2) : 0} {unit}
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('包围盒')}>
            {topology.sizeX ? topology.sizeX.toFixed(2) : 0}*
            {topology.sizeY ? topology.sizeY.toFixed(2) : 0}*
            {topology.sizeZ ? topology.sizeZ.toFixed(2) : 0} {unit}
          </Descriptions.Item>
        </Descriptions>
        <Descriptions title={i18nFormat('拓扑')} column={1}>
          <Descriptions.Item label={i18nFormat('面片')}>
            {`${topology.triangleCnt}`}
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('顶点')}>
            {`${topology.vertexCnt || '-'}`}
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('边')}>
            {`${topology.edgeCnt || '-'}`}
          </Descriptions.Item>
        </Descriptions>
        <Descriptions title={i18nFormat('其他')} column={1}>
          <Descriptions.Item label={i18nFormat('来源')}>
            {typeof viewerProps.src === 'string' && isLanIp(viewerProps.src)
              ? i18nFormat('内网')
              : i18nFormat('公网')}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
};

ModelAttrPanel.displayName = 'ModelAttrPanel';
