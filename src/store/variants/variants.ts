import { create } from 'zustand';
import { PicaFilter, Variant } from '../types';
import { useOutputImages } from '../output-images';
import { DimensionMode } from '../../types';
import { Log } from '../../lib/log';
import { getVariantsWithIdCheck } from '../utils';
import { regenerateVariant } from '../utils/regenerate';
import { getDefaultVariantSettings } from './utils';
import { nanoid } from 'nanoid';
import { openToast, ToastType } from '../toasts';
import { validateVariants } from '../../features/settings/variants/utils';
import { useStorage } from '../storage';

type Variants = {
    activeVariantId: string | undefined;
    variants: Variant[];
    api: {
        set: (variants: Variant[]) => void;
        setActive: (variantId: string | undefined) => void;
        add: (variant: Variant) => void;
        regenerate: (variantId: string) => void;
        delete: (variantId: string) => void;
        deleteAll: () => void;
        rename: (variantId: string, name: string) => void;
        setFilenamePart: (part: 'prefix' | 'suffix', variantId: string, value: string) => void;
        setPattern: (variantId: string, pattern: string) => void;
        setFilter: (variantId: string, filter: PicaFilter) => void;
        setQuality: (variantId: string, quality: number, regenerate?: boolean) => void;
        setSharpenAmount: (variantId: string, sharpenAmount: number, regenerate?: boolean) => void;
        setSharpenRadius: (variantId: string, sharpenRadius: number, regenerate?: boolean) => void;
        setSharpenThreshold: (
            variantId: string,
            sharpenThreshold: number,
            regenerate?: boolean
        ) => void;
        setDimension: (
            dimension: 'width' | 'height',
            variantId: string,
            value: number | undefined
        ) => void;
        setDimensions: (
            variantId: string,
            width: number | undefined,
            height: number | undefined
        ) => void;
        setWidthMode: (variantId: string, mode: DimensionMode) => void;
        setHeightMode: (variantId: string, mode: DimensionMode) => void;
        toggleAspectRatioEnabled: (variantId: string) => void;
        setAspectRatioEnabled: (variantId: string, value: boolean) => void;
        setAspectRatioValue: (variantId: string, value: string) => void;
        flipAspectRatio: (variantId: string) => void;
    };
};

export const useVariants = create<Variants>((set, get) => ({
    ...getInitialVariants(),
    api: {
        set(variants: Variant[]) {
            set({ variants, activeVariantId: variants[0]?.id });

            useOutputImages.getState().api.deleteAll();
            variants.forEach(v => useOutputImages.getState().api.generateVariant(v.id));
        },
        setActive(variantId) {
            set({ activeVariantId: variantId });
        },
        add(variant) {
            const variants = [...get().variants];

            variants.push(variant);
            set({ variants, activeVariantId: variant.id });

            useOutputImages.getState().api.generateVariant(variant.id);
        },
        regenerate(variantId) {
            regenerateVariant(variantId);
        },
        delete(variantId) {
            const { variants, index } = getVariantsWithIdCheck(variantId);

            const outputImages = useOutputImages.getState().images;
            const filtered = outputImages.filter(i => i.variantId !== variantId);
            useOutputImages.setState({ images: filtered });

            variants.splice(index, 1);

            set({ variants });
        },
        deleteAll() {
            set({ variants: [], activeVariantId: undefined });
            useOutputImages.setState({ images: [] });
        },
        rename(variantId, name) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.name = name;

            set({ variants });
        },
        setFilenamePart(part, variantId, value) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);
            
            variant[part] = value;
            useOutputImages.getState().api.updateVariantData(variantId);
            
            set({ variants });
        },
        setPattern(variantId, pattern) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);
            
            variant.pattern = pattern;
            
            useOutputImages.getState().api.updateVariantData(variantId);
            set({ variants });
        },
        setFilter(variantId, filter) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.filter = filter;

            regenerateVariant(variant.id);

            set({ variants });
        },
        setQuality(variantId, quality, regenerate = true) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.quality = quality;

            regenerate && regenerateVariant(variant.id);

            set({ variants });
        },
        setSharpenAmount(variantId, sharpenAmount, regenerate = true) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.sharpenAmount = sharpenAmount;

            regenerate && regenerateVariant(variant.id);

            set({ variants });
        },
        setSharpenRadius(variantId, sharpenRadius, regenerate = true) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.sharpenRadius = sharpenRadius;

            regenerate && regenerateVariant(variant.id);

            set({ variants });
        },
        setSharpenThreshold(variantId, sharpenThreshold, regenerate = true) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.sharpenThreshold = sharpenThreshold;

            regenerate && regenerateVariant(variant.id);

            set({ variants });
        },
        setDimension(dimension, variantId, value) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            if (variant[dimension].value === value) return;

            variant[dimension].value = value;

            if (variant.aspectRatio.enabled && variant.width.mode === 'exact') {
                if (value !== undefined) {
                    const splitAspectRatio = variant.aspectRatio.value.split(':');
                    const ratio = Number(splitAspectRatio[0]) / Number(splitAspectRatio[1]);

                    if (dimension === 'height') {
                        const ratioedWidth = Math.floor(value * ratio);
                        variant.width.value = ratioedWidth;
                    } else {
                        const ratioedHeight = Math.floor(value / ratio);
                        variant.height.value = ratioedHeight;
                    }
                } else {
                    variant.width.value = value;
                    variant.height.value = value;
                }
            }

            set({ variants });

            regenerateVariant(variant.id);
        },
        setDimensions(variantId, width, height) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.width.value = width;
            variant.height.value = height;

            set({ variants });
        },
        setWidthMode(variantId, mode) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.width.mode = mode;

            if (variant.aspectRatio.enabled) {
                variant.height.mode = mode;

                if (variant.width.value && variant.width.mode === 'exact') {
                    const splitAspectRatio = variant.aspectRatio.value.split(':');
                    const ratio = Number(splitAspectRatio[0]) / Number(splitAspectRatio[1]);

                    const ratioedHeight = Math.floor(variant.width.value / ratio);
                    variant.height.value = ratioedHeight;
                }
            }

            if (variant.width.value) {
                regenerateVariant(variant.id);
            }

            set({ variants });
        },
        setHeightMode(variantId, mode) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.height.mode = mode;

            if (variant.aspectRatio.enabled) {
                variant.width.mode = mode;

                if (variant.width.value && variant.width.mode === 'exact') {
                    const splitAspectRatio = variant.aspectRatio.value.split(':');
                    const ratio = Number(splitAspectRatio[0]) / Number(splitAspectRatio[1]);

                    const ratioedHeight = Math.floor(variant.width.value / ratio);
                    variant.height.value = ratioedHeight;
                }
            }

            if (variant.height.value) {
                regenerateVariant(variant.id);
            }

            set({ variants });
        },
        toggleAspectRatioEnabled(variantId) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.aspectRatio.enabled = !variant.aspectRatio.enabled;

            handleAspectRatioChange(variants, variant);

            if (
                variant.width.mode === 'exact' &&
                variant.height.mode === 'exact' &&
                variant.width.value &&
                variant.height.value
            ) {
                return;
            }

            regenerateVariant(variant.id);
        },
        setAspectRatioEnabled(variantId, value) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            variant.aspectRatio.enabled = value;

            if (value) {
                handleAspectRatioChange(variants, variant);
            } else {
                set({ variants });
            }
        },
        setAspectRatioValue(variantId, value) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            if (variant.aspectRatio.value === value) return;

            variant.aspectRatio.value = value;

            if (value) {
                handleAspectRatioChange(variants, variant);

                if (variant.aspectRatio.enabled) {
                    regenerateVariant(variant.id);
                }
            } else {
                set({ variants });
            }
        },
        flipAspectRatio(variantId) {
            const { variants, variant } = getVariantsWithIdCheck(variantId);

            const split = variant.aspectRatio.value.split(':');

            if (split.length !== 2) {
                Log.error('Error flipping aspect ratio.');
                return;
            }

            const flipped = split[1] + ':' + split[0];
            variant.aspectRatio.value = flipped;

            if (variant.aspectRatio.enabled) {
                if (variant.width.mode === 'exact' && variant.height.mode === 'exact') {
                    const oldWidth = variant.width.value;
                    variant.width.value = variant.height.value;
                    variant.height.value = oldWidth;
                }

                if (Number(split[0]) !== Number(split[1])) {
                    regenerateVariant(variant.id);
                }
            }

            set({ variants });
        },
    },
}));

function getInitialVariants() {
    const storage = useStorage.getState();

    if (storage.settings.storeVariants) {
        try {
            validateVariants(storage.variants);

            return {
                activeVariantId: storage.variants[0]?.id,
                variants: storage.variants,
            };
        } catch {
            openToast(ToastType.ERROR, 'Invalid variant data. Using default settings.');
        }
    }

    const id = nanoid();

    return {
        activeVariantId: id,
        variants: [
            {
                id,
                name: 'Variant 1',
                ...getDefaultVariantSettings(),
            },
        ],
    };
}

function handleAspectRatioChange(newVariants: Variant[], variant: Variant) {
    if (variant.aspectRatio.enabled) {
        const oldWidth = variant.width.value;
        const oldHeight = variant.height.value;

        if (!variant.width.value && variant.height.value) {
            variant.width.mode = variant.height.mode;
        } else {
            variant.height.mode = variant.width.mode;
        }

        if (variant.width.value && variant.width.mode === 'exact') {
            const splitAspectRatio = variant.aspectRatio.value.split(':');
            const ratio = Number(splitAspectRatio[0]) / Number(splitAspectRatio[1]);

            const ratioedHeight = Math.floor(variant.width.value / ratio);
            variant.height.value = ratioedHeight;
        }

        if (oldWidth !== variant.width.value || oldHeight !== variant.height.value) {
            regenerateVariant(variant.id);
        }
    }

    useVariants.setState({ variants: newVariants });
}
