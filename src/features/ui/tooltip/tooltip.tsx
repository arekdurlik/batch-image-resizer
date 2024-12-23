import React, {
    FocusEvent,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { OVERLAY_ID, OVERLAY_Z_INDEX } from '../../../lib/constants';
import styled, { css } from 'styled-components';
import { Placement } from '../types';
import { getRenderParams } from './utils';
import { useHoverIntent, useModifiersRef, useMouseInputRef } from '../../../hooks';
import { TooltipContent } from './tooltip-content';

type Props = {
    content: ReactNode;
    children: ReactNode;
    placement?: Placement;
    disabled?: boolean;
    openDelay?: number;
};

const FADEOUT_TIME = 150;
export function Tooltip({
    content,
    children,
    placement = Placement.BOTTOM,
    disabled,
    openDelay = 500,
}: Props) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const hoverIntended = useHoverIntent(isHovered && !disabled, openDelay);

    const [renderParams, setRenderParams] = useState({ x: 0, y: 0 });

    const contentRef = useRef<HTMLDivElement>(null);
    const overlay = useRef(document.querySelector(`#${OVERLAY_ID}`)!);
    const fadeOutTimeout = useRef<NodeJS.Timeout>();
    const focusTimeout = useRef<NodeJS.Timeout>();
    const modifiers = useModifiersRef();
    const mouse = useMouseInputRef();
    const targetElement = useRef<HTMLDivElement>(null!);

    useEffect(() => {
        let timeout = fadeOutTimeout.current;

        if (hoverIntended) {
            setIsOpen(true);
        } else {
            if (contentRef.current) {
                contentRef.current.style.opacity = '0';
            }

            timeout = setTimeout(() => {
                setIsOpen(false);
            }, FADEOUT_TIME);
        }

        return () => clearTimeout(timeout);
    }, [hoverIntended]);

    useEffect(() => {
        if (!contentRef.current) return;
        
        const child = targetElement.current.children[0];

        if (isOpen) {
            const [left, top] = getRenderParams(
                child.getBoundingClientRect(),
                contentRef.current.getBoundingClientRect(),
                placement
            );

            setRenderParams({ x: left, y: top });
            contentRef.current.style.opacity = '1';
        } else {
            contentRef.current.style.opacity = '0';
        }
    }, [isOpen, placement, targetElement]);

    function handleBlur() {
        clearTimeout(focusTimeout.current);
        if (mouse.lmb || !isOpen) return;

        if (contentRef.current) {
            contentRef.current.style.opacity = '0';
        }

        fadeOutTimeout.current = setTimeout(() => {
            setIsOpen(false);
        }, FADEOUT_TIME);
    }
    function handleFocus(event: FocusEvent) {
        if (mouse.lmb || !modifiers.tab) return;

        if (event.currentTarget instanceof HTMLElement) {
            focusTimeout.current = setTimeout(() => {
                setIsOpen(true);
            }, openDelay);
            clearTimeout(fadeOutTimeout.current);
        }
    }

    return (
        <>
            <ChildrenWrapper
                ref={targetElement}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {children}
            </ChildrenWrapper>
            {isOpen &&
                createPortal(
                    <ContentWrapper ref={contentRef} $renderParams={renderParams}>
                        {content}
                    </ContentWrapper>,
                    overlay.current
                )}
        </>
    );
}

Tooltip.Content = TooltipContent;

const ChildrenWrapper = styled.div`
    display: contents;
`;

const ContentWrapper = styled.div<{ $renderParams?: { x: number; y: number } }>`
    position: absolute;
    transition: opacity var(--transition-default);
    z-index: ${OVERLAY_Z_INDEX.TOOLTIP};
    opacity: 0;

    ${props =>
        props.$renderParams &&
        css`
            left: ${props.$renderParams.x}px;
            top: ${props.$renderParams.y}px;
        `}
`;
