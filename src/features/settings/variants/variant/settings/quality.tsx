import { PicaFilter, Variant } from '../../../../../store/types'
import { SelectInput } from '../../../../ui/inputs/select-input'
import { VerticalInputGroup } from '../../../../ui/inputs/styled'
import { TextInput } from '../../../../ui/inputs/text-input'
import { Bold } from './styled'
import { Setting } from './setting'
import { useVariants } from '../../../../../store/variants'
import { ChangeEvent } from 'react'
import { RangeInput } from '../../../../ui/inputs/range-input'
import { NumberInput } from '../../../../ui/inputs/number-input'

export function Quality({ variant }: { variant: Variant }) {
  const api = useVariants(state => state.api);
  const qualityPercentage = Math.round(variant.quality * 100);

  function handleQuality(percentage: number) {
    api.setQuality(variant.id, percentage / 100);
  }

  return (
    <>
      <Bold>Resampling</Bold>
      <VerticalInputGroup>
        <Setting label='Filter'>
          <SelectInput 
            options={[
              { label: 'Nearest neighbor', value: 'box' },
              { label: 'Hamming', value: 'hamming' },
              { label: 'Lanczos 2', value: 'lanczos2' },
              { label: 'Lanczos 3', value: 'lanczos3' },
              { label: 'MKS 2013', value: 'mks2013' },
            ]}
            value={variant.filter}
            onChange={v => api.setFilter(variant.id, (v as PicaFilter))}
            style={{ maxWidth: 144 }}
          />
        </Setting>
        <Setting label='Quality' unit='%'>
          <RangeInput 
            value={qualityPercentage}
            min={0}
            max={100}
            step={1}
            onChange={handleQuality}
            style={{ maxWidth: 98 }}
          />
          <NumberInput 
            value={qualityPercentage}
            min={0}
            max={100}
            step={1}
            onChange={handleQuality}
            align='end'
            style={{ maxWidth: 41 }} 
          />
        </Setting>
      </VerticalInputGroup>
    </>
  )
}


