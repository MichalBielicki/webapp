import React from 'react'
import { storiesOf } from '@storybook/react'
import PoolInput from './PoolInput'
import { withKnobs } from '@storybook/addon-knobs'
import { colors } from '@static/theme'

storiesOf('newInputs/pool', module)
  .addDecorator(withKnobs)
  .add('default', () => (
    <div style={{ backgroundColor: colors.navy.component, padding: '10px', width: 400 }}>
      <PoolInput
        setValue={() => {}}
        placeholder={'0.0'}
        pool={'SNY-usdc'}
        onMaxClick={() => {}}
        decimalsLimit={6}
      />
    </div>
  ))
  .add('long ', () => (
    <div style={{ backgroundColor: colors.navy.component, padding: '10px', width: 400 }}>
      <PoolInput
        setValue={() => {}}
        placeholder={'0.0'}
        pool={'AERGO-qwertyuiopadfghj'}
        onMaxClick={() => {}}
        decimalsLimit={6}
      />
    </div>
  ))
