import { ChangeEvent, ReactNode } from 'react';
import { Variant } from '../../../../../store/types';
import { VerticalInputGroup } from '../../../../ui/inputs/styled';
import { Bold } from './styled';
import { useVariants } from '../../../../../store/variants/variants';
import { TextInput } from '../../../../ui/inputs/text-input';
import { Setting } from './setting';
import { IoMdInformationCircle } from 'react-icons/io';
import { Tooltip } from '../../../../ui/tooltip';
import styled from 'styled-components';
import { MAX_PAD } from '../../../../../store/output-images/utils';

function PatternEnabledTooltip({
    disabled,
    children,
}: {
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Tooltip
            disabled={disabled}
            content={<Tooltip.Content>Only used if no pattern is set</Tooltip.Content>}
        >
            {children}
        </Tooltip>
    );
}

export function Filename({ variant }: { variant: Variant }) {
    const api = useVariants(state => state.api);

    function handleFilenamePart(part: 'prefix' | 'suffix', variantId: string) {
        return (e: ChangeEvent<HTMLInputElement>) => {
            api.setFilenamePart(part, variantId, e.target.value);
        };
    }

    const tooltipContent = (
        <Tooltip.Content align="left">
            <>
                <p>
                    Use keywords enclosed within curly brackets {'\n'}to dynamically generate parts
                    of the filename.
                </p>
                <br />
                <p>Available keywords:</p>
                <KeywordLine>
                    <Keyword>{`{index}`}</Keyword> - Input image order (e.g. 1, 2)
                </KeywordLine>
                <KeywordLine>
                    <Keyword>{`{index, 2..${MAX_PAD}}`}</Keyword> - Padded index (e.g. 01, 02)
                </KeywordLine>
                <KeywordLine>
                    <Keyword>{`{filename}`}</Keyword> - Original filename
                </KeywordLine>
                <KeywordLine>
                    <Keyword>{`{width}`}</Keyword> - Image width
                </KeywordLine>
                <KeywordLine>
                    <Keyword>{`{height}`}</Keyword> - Image height
                </KeywordLine>
                <br />
                <p>Example:</p>
                <p>
                    img_<Keyword $even={false}>{`{index, 3}`}</Keyword> → img_
                    <Result>001</Result>.png
                </p>
            </>
        </Tooltip.Content>
    );

    return (
        <>
            <Bold>Filename</Bold>
            <VerticalInputGroup>
                <PatternEnabledTooltip disabled={variant.pattern?.length === 0}>
                    <Setting label="Prefix" disabled={variant.pattern?.length > 0}>
                        <TextInput
                            value={variant.prefix}
                            onChange={handleFilenamePart('prefix', variant.id)}
                            style={{ maxWidth: 166 }}
                            spellCheck={false}
                        />
                    </Setting>
                </PatternEnabledTooltip>
                <PatternEnabledTooltip disabled={variant.pattern?.length === 0}>
                    <Setting label="Suffix" disabled={variant.pattern?.length > 0}>
                        <TextInput
                            value={variant.suffix}
                            onChange={handleFilenamePart('suffix', variant.id)}
                            style={{ maxWidth: 166 }}
                            spellCheck={false}
                        />
                    </Setting>
                </PatternEnabledTooltip>

                <Setting
                    label="Pattern"
                    suffix={
                        <Tooltip content={tooltipContent}>
                            <IoMdInformationCircle />
                        </Tooltip>
                    }
                >
                    <TextInput
                        value={variant.pattern}
                        onChange={e => api.setPattern(variant.id, e.target.value)}
                        style={{ maxWidth: 166 }}
                        spellCheck={false}
                    />
                </Setting>
            </VerticalInputGroup>
        </>
    );
}

const KeywordLine = styled.p`
    width: 100%;
    white-space: nowrap;
`;
const Keyword = styled.span<{ $even?: boolean }>`
    display: inline-block;
    ${props => props.$even !== false && 'width: 100%;'}
    max-width: 77px;
    color: var(--color-blue-4);
`;

const Result = styled.span`
    color: var(--color-blue-2);
`;
