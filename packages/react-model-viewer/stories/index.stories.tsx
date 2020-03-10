import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import * as React from 'react';

import { Exception } from '../src/decorators/exception/Exception';

storiesOf('Exception', module).add(
  'with text',
  () => <Exception onClick={action('clicked')}>Hello Button</Exception>,
  {
    info: { inline: true }
  }
);
