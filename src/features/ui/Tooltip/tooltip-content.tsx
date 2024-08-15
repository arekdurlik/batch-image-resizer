import { ReactNode } from 'react'
import styled from 'styled-components'

export function TooltipContent({ children }: { children: ReactNode }) {
  return (
    <Wrapper>
      {children}
    </Wrapper>
  )
}

const Wrapper = styled.div`
background-color: var(--bgColor-inverse);
color: var(--fgColor-inverse);
border-radius: var(--borderRadius-default);
padding: var(--padding-default) var(--padding-large);
box-shadow: var(--shadow-default);
`