import './index.css';

import {
  CameraOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import cn from 'classnames';
import Dropdown from 'rc-dropdown';
import Menu, { Divider, Item as MenuItem } from 'rc-menu';
import Tooltip from 'rc-tooltip';
import React from 'react';

import { ThreeRenderer } from '../../engine';
import { i18nFormat } from '../../utils';
import { PaleteeSvg } from '../svgs/PaletteSvg';
import { TreeSvg } from '../svgs/TreeSvg';
import { FileImporter } from './importer';

export interface ViewerToolbarProps {
  className?: string;
  style?: Record<string, string | number>;

  threeRenderer: ThreeRenderer;
}

export const ViewerToolbar = ({
  className,
  style,
  threeRenderer,
}: ViewerToolbarProps) => {
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
              <MenuItem key="file">
                <FileImporter threeRenderer={threeRenderer} />
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
              <MenuItem key="stl" disabled={true}>
                {i18nFormat('导出为 STL')}
              </MenuItem>
              <Divider />
              <MenuItem key="zip" disabled={true}>
                {i18nFormat('压缩为 ZIP 格式')}
              </MenuItem>
              <MenuItem key="zlib" disabled={true}>
                {i18nFormat('压缩为 ZLIB 格式')}
              </MenuItem>
              <Divider />
              <MenuItem key="gcode" disabled={true}>
                {i18nFormat('Gcode 切片')}
              </MenuItem>
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
        {renderItem(
          <CameraOutlined />,
          <Tooltip overlay={i18nFormat('自动生成模型截图')} placement="bottom">
            <span>{i18nFormat('截图')}</span>
          </Tooltip>,
        )}
        <Dropdown
          overlayClassName="rmv-viewer-toolbar-dropdown"
          trigger={['click', 'hover']}
          overlay={
            <Menu>
              <MenuItem key="measure" disabled={true}>
                {i18nFormat('距离测量')}
              </MenuItem>
              <MenuItem key="estimate" disabled={true}>
                {i18nFormat('材料估价')}
              </MenuItem>
              <MenuItem key="wall-thickness" disabled={true}>
                {i18nFormat('壁厚分析')}
              </MenuItem>
              <MenuItem key="repair" disabled={true}>
                {i18nFormat('面片修复')}
              </MenuItem>
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
          () => {},
        )}
        {renderItem(
          <TreeSvg />,
          <Tooltip overlay={i18nFormat('查看模型结构')} placement="bottom">
            <span>{i18nFormat('结构')}</span>
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
