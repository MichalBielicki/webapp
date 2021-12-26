import React, { useState, useMemo, useEffect } from 'react'
import NewPosition from '@components/NewPosition/NewPosition'
import { actions } from '@reducers/positions'
import { useDispatch, useSelector } from 'react-redux'
import { SwapToken, swapTokens, status } from '@selectors/solanaWallet'
import { FEE_TIERS } from '@invariant-labs/sdk/lib/utils'
import { createPlaceholderLiquidityPlot, printBN, tickIndexFromNumber, tickNumberFromIndex } from '@consts/utils'
import { pools } from '@selectors/pools'
import { getLiquidityByX, getLiquidityByY } from '@invariant-labs/sdk/src/math'
import { Decimal } from '@invariant-labs/sdk/lib/market'
import { initPosition, plotTicks } from '@selectors/positions'
import { BN } from '@project-serum/anchor'
import { PRICE_DECIMAL } from '@consts/static'
import { Status, actions as walletActions } from '@reducers/solanaWallet'
import { ProgressState } from '@components/AnimatedButton/AnimatedButton'
import { network } from '@selectors/solanaConnection'

export const NewPositionWrapper = () => {
  const dispatch = useDispatch()

  const tokens = useSelector(swapTokens)
  const walletStatus = useSelector(status)
  const allPools = useSelector(pools)
  const { success, inProgress } = useSelector(initPosition)
  const { data: ticksData, loading: ticksLoading } = useSelector(plotTicks)
  const networkType = useSelector(network)

  const [poolIndex, setPoolIndex] = useState<number | null>(null)

  const [liquidity, setLiquidity] = useState<Decimal>({ v: new BN(0) })

  const [progress, setProgress] = useState<ProgressState>('none')

  useEffect(() => {
    setProgress('none')
  }, [poolIndex])

  useEffect(() => {
    if (!inProgress && progress === 'progress') {
      setProgress(success ? 'approvedWithSuccess' : 'approvedWithFail')

      setTimeout(() => {
        setProgress(success ? 'success' : 'failed')
      }, 1500)

      setTimeout(() => {
        setProgress('none')
      }, 3000)
    }
  }, [success, inProgress])

  const [tokenAIndex, setTokenAIndex] = useState<number | null>(null)

  const midPriceIndex = useMemo(() => {
    if (poolIndex !== null && ticksData.length) {
      return tickNumberFromIndex(allPools[poolIndex].currentTickIndex, allPools[poolIndex].tickSpacing)
    }

    return 0
  }, [ticksData.length, poolIndex, tokenAIndex])

  const tokensB = useMemo(() => {
    if (tokenAIndex === null) {
      return []
    }

    const tokensByKey: Record<string, SwapToken> = tokens.reduce((prev, token) => {
      return {
        [token.address.toString()]: token,
        ...prev
      }
    }, {})

    const poolsForTokenA = allPools.filter((pool) => pool.tokenX.equals(tokens[tokenAIndex].assetAddress) || pool.tokenY.equals(tokens[tokenAIndex].assetAddress))

    return poolsForTokenA.map(
      (pool) => tokensByKey[pool.tokenX.equals(tokens[tokenAIndex].assetAddress) ? pool.tokenY.toString() : pool.tokenX.toString()]
    )
  }, [tokenAIndex, allPools.length])

  return (
    <NewPosition
      tokens={tokens}
      tokensB={tokensB}
      onChangePositionTokens={
        (tokenA, tokenB, fee) => {
          setTokenAIndex(tokenA)
          if (tokenA !== null && tokenB !== null) {
            const index = allPools.findIndex(
              (pool) =>
                pool.fee.v.eq(FEE_TIERS[fee].fee) &&
                (
                  (pool.tokenX.equals(tokens[tokenA].assetAddress) && pool.tokenY.equals(tokens[tokenB].assetAddress)) ||
                  (pool.tokenX.equals(tokens[tokenB].assetAddress) && pool.tokenY.equals(tokens[tokenA].assetAddress))
                )
            )

            setPoolIndex(index !== -1 ? index : null)

            if (index !== -1) {
              dispatch(actions.getCurrentPlotTicks({
                poolIndex: index,
                isXtoY: allPools[index].tokenX.equals(tokens[tokenA].assetAddress),
                tmpData: createPlaceholderLiquidityPlot(allPools[index], allPools[index].tokenX.equals(tokens[tokenA].assetAddress), 10, networkType)
              }))
            }
          }
        }
      }
      feeTiers={FEE_TIERS.map((tier) => +printBN(tier.fee, PRICE_DECIMAL - 2))}
      data={ticksData}
      midPriceIndex={midPriceIndex}
      addLiquidityHandler={(leftTickIndex, rightTickIndex) => {
        if (poolIndex === null) {
          return
        }

        if (progress === 'none') {
          setProgress('progress')
        }

        const lowerTick = Math.min(tickIndexFromNumber(leftTickIndex, allPools[poolIndex].tickSpacing), tickIndexFromNumber(rightTickIndex, allPools[poolIndex].tickSpacing))
        const upperTick = Math.max(tickIndexFromNumber(leftTickIndex, allPools[poolIndex].tickSpacing), tickIndexFromNumber(rightTickIndex, allPools[poolIndex].tickSpacing))

        dispatch(actions.initPosition({
          poolIndex,
          lowerTick,
          upperTick,
          liquidityDelta: liquidity
        }))
      }}
      isCurrentPoolExisting={poolIndex !== null}
      calcAmount={(amount, left, right, tokenAddress) => {
        if (poolIndex === null) {
          return new BN(0)
        }

        const byX = tokenAddress.equals(allPools[poolIndex].tokenX)
        const lowerTick = Math.min(tickIndexFromNumber(left, allPools[poolIndex].tickSpacing), tickIndexFromNumber(right, allPools[poolIndex].tickSpacing))
        const upperTick = Math.max(tickIndexFromNumber(left, allPools[poolIndex].tickSpacing), tickIndexFromNumber(right, allPools[poolIndex].tickSpacing))

        console.log('liquidity calc by:', tokenAddress.toString())
        console.log('pool token x:', allPools[poolIndex].tokenX.toString())

        try {
          if (byX) {
            const result = getLiquidityByX(amount, lowerTick, upperTick, allPools[poolIndex].sqrtPrice, true)
            setLiquidity(result.liquidity)

            console.log('x:', amount.toString(), 'y:', result.y.toString(), 'ticks:', lowerTick, upperTick, 'liquidity', result.liquidity.v.toString())

            return result.y
          }

          const result = getLiquidityByY(amount, lowerTick, upperTick, allPools[poolIndex].sqrtPrice, true)
          setLiquidity(result.liquidity)

          console.log('y:', amount.toString(), 'x:', result.x.toString(), 'ticks:', lowerTick, upperTick, 'liquidity', result.liquidity.v.toString())

          return result.x
        } catch (error) {
          const result = (byX ? getLiquidityByY : getLiquidityByX)(amount, lowerTick, upperTick, allPools[poolIndex].sqrtPrice, true)
          setLiquidity(result.liquidity)

          console.log('err', byX ? 'x:' : 'y:', amount.toString(), 'ticks:', lowerTick, upperTick, 'liquidity:', result.liquidity.v.toString())
        }

        return new BN(0)
      }}
      ticksLoading={ticksLoading}
      isTokenXFirst={poolIndex !== null && tokenAIndex !== null && allPools[poolIndex].tokenX.equals(tokens[tokenAIndex].assetAddress)}
      onZoomOutOfData={(min, max) => {
        if (poolIndex !== null && tokenAIndex !== null) {
          dispatch(actions.getCurrentPlotTicks({
            poolIndex,
            isXtoY: allPools[poolIndex].tokenX.equals(tokens[tokenAIndex].assetAddress),
            min,
            max
          }))
        }
      }}
      showNoConnected={walletStatus !== Status.Initialized}
      noConnectedBlockerProps={{
        onConnect: (type) => { dispatch(walletActions.connect(type)) },
        onDisconnect: () => { dispatch(walletActions.disconnect()) },
        descCustomText: 'Cannot add any liquidity.'
      }}
      progress={progress}
    />
  )
}

export default NewPositionWrapper
