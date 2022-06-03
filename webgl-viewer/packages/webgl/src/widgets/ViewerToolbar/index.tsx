import './index.css';

import {
  FolderOpenOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import cn from 'classnames';
import Dropdown from 'rc-dropdown';
import Menu, { Divider, Item as MenuItem } from 'rc-menu';
import Tooltip from 'rc-tooltip';
import React from 'react';

import { i18nFormat } from '../../utils';
import { PaleteeSvg } from '../svgs/PaletteSvg';

export interface ViewerToolbarProps {
  className?: string;
  style?: Record<string, string | number>;
}

export const ViewerToolbar = ({ className, style }: ViewerToolbarProps) => {
  const renderItem = (
    icon: React.ReactElement,
    label: React.ReactElement | string,
    onClick: () => void = () => {},
  ) => {
    return (
      <div className="rmv-viewer-toolbar-item" onClick={onClick}>
        <span className="rmv-viewer-toolbar-item-icon">{icon}</span>
        <span className="rmv-viewer-toolbar-item-label">{label}</span>
      </div>
    );
  };

  return (
    <div
      id="ViewerToolbar"
      className={cn(className, 'rmv-viewer-toolbar')}
      style={style}
    >
      <div className="rmv-viewer-toolbar-left">
        <Dropdown
          overlayClassName="rmv-viewer-toolbar-dropdown"
          trigger={['click', 'hover']}
          overlay={
            <Menu>
              <MenuItem key="file" disabled={true}>
                {i18nFormat('打开本地文件')}
              </MenuItem>
              <MenuItem key="url">{i18nFormat('打开网络地址')}</MenuItem>
              <MenuItem key="zip-dir" disabled={true}>
                {i18nFormat('打开 ZIP 压缩文件夹')}
              </MenuItem>
            </Menu>
          }
          animation="slide-up"
        >
          {renderItem(<FolderOpenOutlined />, i18nFormat('打开'))}
        </Dropdown>
        <Dropdown
          overlayClassName="rmv-viewer-toolbar-dropdown"
          trigger={['click', 'hover']}
          overlay={
            <Menu>
              <MenuItem key="stl">{i18nFormat('导出为 STL')}</MenuItem>
              <Divider />
              <MenuItem key="zip">{i18nFormat('使用 ZIP 压缩')}</MenuItem>
              <MenuItem key="zlib">{i18nFormat('使用 ZLIB 压缩')}</MenuItem>
            </Menu>
          }
          animation="slide-up"
        >
          {renderItem(<FolderOpenOutlined />, i18nFormat('导出'))}
        </Dropdown>
      </div>
      <div className="rmv-viewer-toolbar-middle">
        {renderItem(
          <PaleteeSvg />,
          <Tooltip overlay={i18nFormat('配置渲染选项')} placement="bottom">
            <span>{i18nFormat('渲染')}</span>
          </Tooltip>,
        )}
        <Dropdown
          overlayClassName="rmv-viewer-toolbar-dropdown"
          trigger={['click', 'hover']}
          overlay={
            <Menu>
              <MenuItem key="1">{i18nFormat('导出为 STL')}</MenuItem>
              <Divider />
              <MenuItem key="2">{i18nFormat('使用 ZIP 压缩')}</MenuItem>
              <MenuItem key="2">{i18nFormat('使用 ZLIB 压缩')}</MenuItem>
            </Menu>
          }
          animation="slide-up"
        >
          {renderItem(<FolderOpenOutlined />, i18nFormat('视图'))}
        </Dropdown>
        <Dropdown
          overlayClassName="rmv-viewer-toolbar-dropdown"
          trigger={['click', 'hover']}
          overlay={
            <Menu>
              <MenuItem key="1">{i18nFormat('截图')}</MenuItem>
              <MenuItem key="1">{i18nFormat('测量')}</MenuItem>
            </Menu>
          }
          animation="slide-up"
        >
          {renderItem(<FolderOpenOutlined />, i18nFormat('工具'))}
        </Dropdown>
      </div>
      <div className="rmv-viewer-toolbar-right">
        {renderItem(
          <InfoCircleOutlined />,
          <Tooltip overlay={i18nFormat('查看模型属性')} placement="bottom">
            <span>{i18nFormat('查看')}</span>
          </Tooltip>,
        )}
        {renderItem(
          <SettingOutlined />,
          <Tooltip overlay={i18nFormat('设置个性化偏好')} placement="bottom">
            <span>{i18nFormat('设置')}</span>
          </Tooltip>,
        )}
      </div>
    </div>
  );
};

ViewerToolbar.displayName = 'ViewerToolbar';
