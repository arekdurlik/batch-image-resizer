import {
    Children,
    cloneElement,
    CSSProperties,
    isValidElement,
    ReactElement,
    ReactNode,
} from 'react';
import styled from 'styled-components';

export function Setting({
    label,
    suffix,
    noUnitSpace,
    unitWidth = 17,
    disabled,
    style,
    children,
}: {
    label?: string;
    suffix?: ReactNode;
    noUnitSpace?: boolean;
    unitWidth?: number;
    disabled?: boolean;
    style?: CSSProperties;
    children: ReactNode;
}) {
    const clonedChildren =
        disabled !== undefined
            ? Children.map(children, child => {
                  if (isValidElement(child)) {
                      return cloneElement(child as ReactElement<{ disabled?: boolean }>, {
                          disabled,
                      });
                  } else {
                      return child;
                  }
              })
            : children;

    return (
        <Wrapper style={style}>
            {label && <Label $disabled={disabled}>{label}:</Label>}
            {clonedChildren}
            {!noUnitSpace && <Suffix $width={unitWidth}>{suffix}</Suffix>}
        </Wrapper>
    );
}

const Wrapper = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--spacing-default);
    width: 100%;
`;

const Label = styled.span<{ $disabled?: boolean }>`
    cursor: default;
    position: relative;
    bottom: 2px;
    font-weight: 600;
    transition: color var(--transition-default);
    ${props => props.$disabled && 'color: var(--control-default-fgColor-disabled) !important;'}
`;

const Suffix = styled.span<{ $width: number }>`
    width: 100%;
    max-width: ${props => props.$width}px;
    cursor: default;
    
    svg {
        font-size: 16px;
    }
`;
