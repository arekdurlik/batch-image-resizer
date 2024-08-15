import { useState, ChangeEvent } from 'react'
import { useApp } from '../../store/app'
import { SectionHeader, SectionTitle, SectionGroup } from '../layout/styled'
import { Rename } from './rename'

export function Global() {
  const [quality, setQuality] = useState(1);
  const api = useApp(state => state.api);

  function handleQuality(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuality(Number(value));
  }
  
  function setValue() {
    api.setQuality(quality);
  }

  return <>
    <SectionHeader>
      <SectionTitle>Settings</SectionTitle>
    </SectionHeader>
    <SectionGroup>
      <Rename/>
      <input type='range' min={0} max={1} step={0.01} value={quality} onChange={handleQuality} onMouseUp={setValue} style={{ width: '100%' }}/>
    </SectionGroup>
  </>
}

