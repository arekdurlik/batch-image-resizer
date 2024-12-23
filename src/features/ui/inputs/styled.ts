import styled, { css } from 'styled-components';
import { TextInputContainer, TextInputLabel, TextInputWrapper } from './text-input';
import { StyledButton } from './button';

export const HorizontalInputGroup = styled.div`
    display: flex;
    gap: var(--spacing-large);
    align-items: center;
`;

export const VerticalInputGroup = styled(HorizontalInputGroup)<{
    $labelWidth?: number;
}>`
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-default);
    margin-left: var(--spacing-large);

    ${TextInputWrapper} {
        justify-content: flex-end;
    }
    ${props =>
        props.$labelWidth &&
        css`
            ${TextInputLabel} {
                width: ${props.$labelWidth}px;
            }
        `}
`;

export const ButtonGroup = styled.div`
    display: flex;

    & > {
        &:first-child,
        &:first-child > ${StyledButton} {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;

            ${TextInputContainer} {
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
            }
        }

        &:last-child,
        &:last-child > ${StyledButton} {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;

            ${TextInputContainer} {
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
            }
        }

        &:not(:first-child),
        &:not(:first-child) > ${StyledButton} {
            margin-left: -1px;
        }

        &:not(:first-child):not(:last-child),
        &:not(:first-child):not(:last-child) > ${StyledButton} {
            border-radius: 0;

            ${TextInputContainer} {
                border-radius: 0;
            }
        }
    }
`;
