import { forwardRef, useRef, useEffect, MouseEvent, useState, DragEvent, RefObject } from 'react';
import { bytesToSizeFormatted } from '../../../../lib/helpers';
import { useApp } from '../../../../store/app';
import { SortOption } from '../../types';
import { ImageData, OutputImageData } from '../../../../store/types';
import { PercentageChange } from '../../../active-image/output-image-details';
import { useInputImages } from '../../../../store/input-images';
import { DragOverlay, Image, ImageWrapper, StyledItem, Title } from '../styled';
import { ContextMenu } from './context-menu';

type Props = {
    type: 'input' | 'output';
    index: number;
    image: ImageData;
    listFocused: boolean;
    sortBy?: SortOption;
    onClick?: (e: MouseEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    toFocusOnClose?: RefObject<HTMLElement>;
};

export const Item = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const { type, index, image, listFocused, sortBy, toFocusOnClose, onClick, onMouseDown } = props;
    const item = useRef<HTMLDivElement>(null!);
    const [lastSelected, setLastSelected] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null!);

    function getPercentageValue() {
        const inputImage = image as unknown as OutputImageData;
        const inputSize = inputImage.inputImage.size;
        const outputSize = inputImage.image.full.file.size;
        const increase = outputSize > inputSize;
        return increase ? 1 : undefined;
    }

    useEffect(() => {
        useApp.subscribe(
            state => ({
                selectedItems: state.selectedItems,
                latestSelected: state.latestSelectedItem,
            }),
            ({ selectedItems, latestSelected }) => {
                const isActive = selectedItems.find(i => i.id === image.id);
                if (isActive) {
                    item.current.classList.add('list-item--active');
                } else {
                    item.current.classList.remove('list-item--active');
                }

                const isPreviousActive = latestSelected?.id === image.id;
                if (isPreviousActive) {
                    item.current.focus();
                    item.current.classList.add('list-item--previous-active');
                } else {
                    if (item.current.classList.contains('list-item--previous-active')) {
                        item.current.classList.remove('list-item--previous-active');
                    }
                }

                if (
                    item.current.classList.contains('list-item--active') &&
                    item.current.classList.contains('list-item--previous-active')
                ) {
                    setLastSelected(true);
                } else {
                    if (lastSelected) {
                        setLastSelected(false);
                    }
                }
            }
        );
    }, [image.id, lastSelected]);

    function handleDragStart(event: DragEvent) {
        event.dataTransfer.setData('text/plain', index.toString());
        const imageBounds = imageRef.current.getBoundingClientRect();
        const x = event.clientX - imageBounds.left;
        const y = event.clientY - imageBounds.top;
        event.dataTransfer.setDragImage(imageRef.current, x, y);
    }

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
        if (type === 'input') {
            const dropTargetIndex = index;
            const draggedIndex = parseInt(event.dataTransfer.getData('text/plain'));
            const images = useInputImages.getState().images;
            const selectedIds = useApp.getState().selectedItems.map(i => i.id);
            const firstSelected = images.find(i => selectedIds.includes(i.id));

            if (firstSelected) {
                const offset = dropTargetIndex - draggedIndex;
                useInputImages.getState().api.shiftOrderByIds(selectedIds, offset);
            }
        }
    };

    return (
        <>
            <StyledItem
                ref={node => {
                    node && (item.current = node);
                    if (typeof ref === 'function') {
                        ref(node);
                    } else if (ref) {
                        ref.current = node;
                    }
                }}
                data-id={image.id}
                onClick={onClick}
                onMouseDown={onMouseDown}
            >
                {type === 'input' && (
                    <DragOverlay
                        draggable
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    />
                )}
                <ImageWrapper>
                    <Image
                        ref={imageRef}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        draggable={true}
                        src={image.image.thumbnail.src}
                        onDoubleClick={() => window.open(image.image.full.src, '_blank')}
                    />
                </ImageWrapper>
                <Title>
                    {sortBy === SortOption.FILESIZE ? (
                        <PercentageChange $value={getPercentageValue()}>
                            {bytesToSizeFormatted(image.image.full.file.size)}
                        </PercentageChange>
                    ) : (
                        image.filename
                    )}
                </Title>
            </StyledItem>
            <ContextMenu
                actuator={item}
                type={type}
                image={image}
                lastSelected={lastSelected}
                listFocused={listFocused}
                onClose={() => {
                    toFocusOnClose?.current?.focus();
                }}
            />
        </>
    );
});
