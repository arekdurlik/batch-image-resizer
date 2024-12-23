import { Variant } from '../types';

export const QUALITY_MIN = 0;
export const QUALITY_MAX = 1;

export const SHARPEN_AMOUNT_MIN = 0;
export const SHARPEN_AMOUNT_MAX = 500;

export const SHARPEN_RADIUS_MIN = 0.5;
export const SHARPEN_RADIUS_MAX = 2;

export const SHARPEN_THRESHOLD_MIN = 0;
export const SHARPEN_THRESHOLD_MAX = 255;

const defaultVariantSettings: Omit<Variant, 'id' | 'index' | 'name'> = {
    width: {
        mode: 'exact',
        value: undefined,
    },
    height: {
        mode: 'exact',
        value: undefined,
    },
    prefix: '',
    suffix: '',
    pattern: '',
    crop: false,
    filter: 'mks2013',
    quality: 1,
    sharpenAmount: 0,
    sharpenRadius: 0.5,
    sharpenThreshold: 0,
    aspectRatio: {
        enabled: false,
        value: '1:1',
    },
};

export function getDefaultVariantSettings() {
    return structuredClone(defaultVariantSettings);
}
