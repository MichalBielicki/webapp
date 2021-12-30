import { getScaleFromString } from '@consts/utils'
import { Button, Grid, Input, Typography } from '@material-ui/core'
import React, { useRef, CSSProperties } from 'react'
import useStyles from './style'

interface IProps {
  setValue: (value: string) => void
  pool: string
  value?: string
  placeholder?: string
  onMaxClick: () => void
  style?: CSSProperties
  decimalsLimit: number
  onBlur?: () => void
}

export const PoolInput: React.FC<IProps> = ({
  pool,
  value,
  setValue,
  placeholder,
  onMaxClick,
  style,
  onBlur,
  decimalsLimit
}) => {
  const classes = useStyles()

  const inputRef = useRef<HTMLInputElement>(null)

  const allowOnlyDigitsAndTrimUnnecessaryZeros: React.ChangeEventHandler<HTMLInputElement> = e => {
    const regex = /^\d*\.?\d*$/
    if (e.target.value === '' || regex.test(e.target.value)) {
      const startValue = e.target.value
      const caretPosition = e.target.selectionStart

      let parsed = e.target.value
      const zerosRegex = /^0+\d+\.?\d*$/
      if (zerosRegex.test(parsed)) {
        parsed = parsed.replace(/^0+/, '')
      }

      const dotRegex = /^\.\d*$/
      if (dotRegex.test(parsed)) {
        parsed = `0${parsed}`
      }

      if (getScaleFromString(parsed) > decimalsLimit) {
        const parts = parsed.split('.')

        parsed = parts[0] + '.' + parts[1].slice(0, decimalsLimit)
      }

      const diff = startValue.length - parsed.length

      setValue(parsed)
      if (caretPosition !== null && parsed !== startValue) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = Math.max(caretPosition - diff, 0)
            inputRef.current.selectionEnd = Math.max(caretPosition - diff, 0)
          }
        }, 0)
      }
    } else if (!regex.test(e.target.value)) {
      setValue('')
    }
  }

  return (
    <Grid container className={classes.wrapper} style={style}>
      <Input
        inputRef={inputRef}
        className={classes.root}
        type={'text'}
        value={value}
        disableUnderline={true}
        placeholder={placeholder}
        onChange={allowOnlyDigitsAndTrimUnnecessaryZeros}
        startAdornment={
          <Grid
            className={classes.currency}
            container
            justifyContent='center'
            alignItems='center'
            wrap='nowrap'>
              <Typography className={classes.noCurrencyText}>{pool}</Typography>
          </Grid>
        }
        endAdornment={
          <Button className={classes.maxButton} onClick={onMaxClick}>
            Max
          </Button>
        }
        onBlur={onBlur}
      />
    </Grid>
  )
}
export default PoolInput
