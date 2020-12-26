import { get } from '@m-fe/utils';

let locale: string;

export function getDefaultLocale() {
  let i = window.navigator.language;

  if (i === 'en' || (i.startsWith && i.startsWith('en'))) {
    i = 'en';
  }
  if (i === 'zh' || (i.startsWith && i.startsWith('zh'))) {
    i = 'zh';
  }
  return i;
}

export function setLocale(_i: string) {
  let i = _i;

  if (!i) {
    i = get(null, () => localStorage.getItem('3d_model_viewer_lang')) || getDefaultLocale();
  }

  if (localStorage) {
    localStorage.setItem('3d_model_viewer_lang', i);
  }

  locale = i;
}

export function getLocale() {
  if (!locale) {
    // en/en, zh/zh
    return get(null, () => localStorage.getItem('3d_model_viewer_lang')) || getDefaultLocale();
  }
  return locale;
}

const zhMessages = {};
const enMessages = {
  着色: 'Color',
  线框: 'Wireframe',
  框体: 'Outline',
  色盘: 'Color Picker',
  剖切: 'Cross Section',
  名称: 'Name',
  尺寸: 'Size',
  体积: 'Volume',
  面积: 'Area',
  面片: 'Facets',
  破损: 'Broken',
  个: ''
};

// 这里的 id 就是中文键名
export function i18nFormat(id: string) {
  if (getLocale() === 'zh') {
    return zhMessages[id] || id;
  }

  return enMessages[id] || id;
}

/** Mock i18n 相关操作，详情参考 */
export function formatMessage({ id, defaultMessage }: { id: string; defaultMessage?: string }) {
  return defaultMessage || id;
}
