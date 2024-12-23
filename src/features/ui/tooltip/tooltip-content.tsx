import { ReactNode } from 'react';
import styled, { CSSProperties } from 'styled-components';

export function TooltipContent({
    align = 'center',
    children,
    style,
}: {
    align?: 'left' | 'center' | 'right';
    children: ReactNode;
    style?: CSSProperties;
}) {
    return <Wrapper style={style} $align={align}>{children}</Wrapper>;
}

const Wrapper = styled.div<{ $align?: string }>`
    background-color: var(--bgColor-inverse);
    color: var(--fgColor-inverse);
    border-radius: var(--borderRadius-default);
    padding: var(--spacing-default) var(--spacing-large);
    box-shadow: var(--shadow-large);
    text-align: ${props => props.$align};
    white-space: pre-wrap;
    
    * {
        color: var(--fgColor-inverse);
    }
`;
