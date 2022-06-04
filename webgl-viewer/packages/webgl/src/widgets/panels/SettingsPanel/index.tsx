import { CloseOutlined } from '@ant-design/icons';
import * as U from '@m-fe/utils';
import Descriptions from 'antd/lib/descriptions';
import Radio from 'antd/lib/radio';
import React from 'react';

import { useViewerStateStore } from '../../../stores';
import { getLocale, i18nFormat } from '../../../utils';
import { Divider } from '../../decorators';

export interface SettingsPanelProps {
  className?: string;
  style?: Record<string, string | number>;

  children?: React.ReactNode;
}

export const SettingsPanel = ({
  className,
  style,
  children,
}: SettingsPanelProps) => {
  const viewerStateStore = useViewerStateStore();

  const { threeRenderer, unit } = viewerStateStore;

  if (!threeRenderer || !threeRenderer.context) {
    return <></>;
  }

  const { topology } = threeRenderer.context;

  return (
    <div className="rmv-drawer-panel">
      <div className="rmv-drawer-panel-header">
        <span>{i18nFormat('设置')}</span>
        <CloseOutlined
          onClick={() => {
            viewerStateStore.setPartialState({ isSettingsPanelVisible: false });
          }}
        />
      </div>
      <Divider />
      <div className="rmv-drawer-panel-body">
        <Descriptions title={i18nFormat('个性化')} column={1}>
          <Descriptions.Item label={i18nFormat('语言')}>
            <Radio.Group value={getLocale()} buttonStyle="solid" size="small">
              <Radio.Button value="en">En</Radio.Button>
              <Radio.Button value="zh">中</Radio.Button>
            </Radio.Group>
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('单位')}>
            <Radio.Group value={unit} buttonStyle="solid" size="small">
              <Radio.Button value="mm">mm</Radio.Button>
              <Radio.Button value="cm">cm</Radio.Button>
              <Radio.Button value="in">in</Radio.Button>
            </Radio.Group>
          </Descriptions.Item>
        </Descriptions>
        <div style={{ position: 'absolute', bottom: 16, fontSize: 12 }}>
          Powered by Unionfab
        </div>
      </div>
    </div>
  );
};

SettingsPanel.displayName = 'SettingsPanel';
