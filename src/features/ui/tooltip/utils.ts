import { Placement } from '../types';

const PADDING = 8;

export function getRenderParams(triggerRect: DOMRect, contentRect: DOMRect, placement: Placement) {
    let top = 0,
        left = 0;

    switch (placement) {
        case Placement.TOP: {
            top = triggerRect.top - triggerRect.height - PADDING;

            if (top < 0) {
                top = triggerRect.top + triggerRect.height + PADDING;
            }

            left = Math.max(
                PADDING,
                triggerRect.left + (triggerRect.width - contentRect.width) / 2
            );
            break;
        }
        default:
            top = triggerRect.top + triggerRect.height + PADDING;

            if (top + triggerRect.height > document.body.scrollHeight) {
                top = triggerRect.top - triggerRect.height - PADDING;
            }

            left = Math.max(
                PADDING,
                triggerRect.left + (triggerRect.width - contentRect.width) / 2
            );

            break;
    }

    return [left, top];
}
