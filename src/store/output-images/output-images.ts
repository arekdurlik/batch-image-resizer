import { create } from 'zustand';
import { InputImageData, OutputImageData, PicaFilter, SelectedItem } from '../types';
import { useInputImages } from '../input-images';
import { Log } from '../../lib/log';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    getOutputImagesWithIdCheck,
    getVariantsWithIdCheck,
    initialProgress,
    Progress,
    ResamplingSettings,
    SharpenSettings,
    startProgress,
} from '../utils';
import {
    generateOutputImage,
    generateOutputImageVariants,
    getUpToDateVariant,
    getVariantFilenameForOutputImage,
} from './utils';
import { openToast, ToastType } from '../toasts';
import { useApp } from '../app';
import { CropSettings } from '../../lib/config';

type OutputImagesState = {
    images: OutputImageData[];
    progress: Progress;
    api: {
        generate: (images: InputImageData[]) => void;
        generateVariant: (variantId: string) => void;
        regenerate: (imageId: string) => void;
        regenerateAll: () => void;
        regenerateVariant: (variantId: string) => void;
        regenerateFilenamesByInputImageIds: (ids: string[]) => void;
        updateVariantData: (variantId: string) => void;
        updateInputImageIndexesByIds: (ids: string[], newIndexImages: InputImageData[]) => void;
        setCropData: (imageId: string, cropData: CropSettings) => void;
        setResamplingData: (
            imageId: string,
            data: ResamplingSettings,
            regenerate?: boolean
        ) => void;
        setResamplingEnabled: (imageId: string, enabled: boolean, regenerate?: boolean) => void;
        setFilter: (imageId: string, filter: PicaFilter, regenerate?: boolean) => void;
        setQuality: (imageId: string, quality: number, regenerate?: boolean) => void;
        setSharpenData: (imageId: string, data: SharpenSettings, regenerate?: boolean) => void;
        setSharpenEnabled: (imageId: string, enabled: boolean) => void;
        setSharpenAmount: (imageId: string, amount: number, regenerate?: boolean) => void;
        setSharpenRadius: (imageId: string, radius: number, regenerate?: boolean) => void;
        setSharpenThreshold: (imageId: string, threshold: number, regenerate?: boolean) => void;
        deleteByInputImageIds: (ids: string[]) => void;
        deleteAll: () => void;
        selectAll: () => void;
    };
};

// global indexes to cancel current regeneration before starting new one
let regenerateVariantOutputImagesIndex = 0;
let regenerateIndex = 0;

export const useOutputImages = create<OutputImagesState>()(
    subscribeWithSelector((set, get) => ({
        images: [],
        progress: initialProgress,
        api: {
            async generate(images) {
                Log.debug('Generating output images.');

                const progress = startProgress(useOutputImages, images.length);

                try {
                    for (let i = 0; i < images.length; i++) {
                        const newImages = await generateOutputImageVariants(images[i]);

                        const outputImages = [...get().images];
                        outputImages.push(...newImages);
                        get().api.updateInputImageIndexesByIds(
                            images.map(i => i.id),
                            images
                        );
                        set({ images: outputImages });

                        progress.advance();
                    }
                } catch (error) {
                    progress.cancel();
                    Log.error('Error generating output images.', error);
                    openToast(ToastType.ERROR, 'Error generating output images. Please try again.');
                }
            },
            async regenerate(imageId) {
                const outputImages = [...get().images];
                const index = outputImages.findIndex(i => i.id === imageId);
                if (index === -1) {
                    throw new Error(`No output image with id ${imageId} found.`);
                }

                const outputImage = outputImages[index];
                const progress = startProgress(useOutputImages, 1);

                try {
                    const inputImages = useInputImages.getState().images;
                    const inputImage = inputImages.find(i => i.id === outputImage.inputImage.id);

                    if (!inputImage) {
                        throw new Error(
                            `No input image with id "${outputImage.inputImage.id}" found.`
                        );
                    }
                    const image = await generateOutputImage(
                        inputImage,
                        outputImage.variantId,
                        false,
                        outputImage
                    );

                    if (image) {
                        progress.advance();
                        outputImages[index] = image;
                        set({ images: outputImages });
                    }
                } catch (error) {
                    progress.cancel();

                    Log.error('Error generating output image.', error);
                    openToast(ToastType.ERROR, 'Error generating output image. Please try again.');
                }
            },
            async regenerateAll() {
                Log.debug('Regenerating output images.');
                const out = [...get().images];

                regenerateIndex++;
                const currentIndex = regenerateIndex;
                const inputImages = useInputImages.getState().images;
                const outputImages: OutputImageData[] = [];

                const progress = startProgress(useOutputImages, inputImages.length);

                try {
                    for (let i = 0; i < inputImages.length; i++) {
                        const images = await generateOutputImageVariants(
                            inputImages[i],
                            false,
                            out
                        );
                        outputImages.push(...images);

                        progress.advance();

                        if (currentIndex !== regenerateIndex) {
                            progress.cancel();
                            return;
                        }
                    }

                    set({ images: outputImages });
                } catch (error) {
                    progress.cancel();
                    Log.error('Error generating output images.', error);
                    openToast(ToastType.ERROR, 'Error generating output images. Please try again.');
                }
            },
            async generateVariant(variantId) {
                Log.debug('Generating output images for variant.', {
                    variantId,
                });

                const inputImages = useInputImages.getState().images;
                const progress = startProgress(useOutputImages, inputImages.length);

                try {
                    for (let i = 0; i < inputImages.length; i++) {
                        const image = await generateOutputImage(inputImages[i], variantId);

                        try {
                            getUpToDateVariant(variantId);
                        } catch (error) {
                            progress.cancel();
                            return;
                        }

                        const currentInputImages = useInputImages.getState().images;
                        if (!currentInputImages.some(img => img.id === inputImages[i].id)) {
                            progress.advance();
                            continue;
                        }

                        if (image) {
                            const outputImages = [...get().images];
                            outputImages.push(image);
                            set({ images: outputImages });
                        }

                        progress.advance();
                    }
                } catch (error) {
                    progress.cancel();

                    // probably deleted variant during generation
                    if (String(error).includes('not found')) return;

                    Log.error('Error generating output images for variant.', error);
                    openToast(ToastType.ERROR, 'Error generating output images. Please try again.');
                }
            },
            async regenerateVariant(variantId) {
                Log.debug('Regenerating output images for variant.', {
                    variantId,
                });

                if (get().images.length === 0) {
                    Log.debug('No images to regenerate.', { variantId });
                    return;
                }

                regenerateVariantOutputImagesIndex += 1;
                const currentIndex = regenerateVariantOutputImagesIndex;
                const inputImages = useInputImages.getState().images;
                const out = get().images;

                const progress = startProgress(useOutputImages, inputImages.length);

                try {
                    const outputImages: OutputImageData[] = [];
                    const urlsToRevoke: string[] = [];

                    let i = 0;
                    let outputImage = out[i];
                    do {
                        if (outputImage.variantId === variantId) {
                            const inputImage = inputImages.find(
                                img => img.id === outputImage.inputImage.id
                            );

                            if (!inputImage) {
                                throw new Error(`Variant with id ${variantId} not found.`);
                            }

                            const image = await generateOutputImage(
                                inputImage,
                                variantId,
                                false,
                                outputImage
                            );

                            if (image) {
                                urlsToRevoke.push(outputImage.image.full.src);
                                urlsToRevoke.push(outputImage.image.thumbnail.src);
                                outputImages.push(image);
                            }

                            if (currentIndex !== regenerateVariantOutputImagesIndex) {
                                Log.debug('Variant regeneration cancelled.');
                                progress.cancel();
                                return;
                            }

                            progress.advance();
                        }

                        i++;
                        outputImage = get().images[i];
                    } while (outputImage !== undefined);

                    const variant = getUpToDateVariant(variantId);

                    for (let i = 0; i < outputImages.length; i++) {
                        if (outputImages[i].variantId === variantId) {
                            const image = outputImages[i];

                            outputImages[i].filename = getVariantFilenameForOutputImage(
                                variant,
                                image
                            );
                        }
                    }

                    const updates = Object.fromEntries(outputImages.map(i => [i.id, i]));
                    const result = [...get().images].map(i => updates[i.id] || i);

                    urlsToRevoke.forEach(url => {
                        URL.revokeObjectURL(url);
                    });

                    set({ images: result });
                } catch (error) {
                    progress.cancel();
                    Log.error('Error regenerating output images.', error);
                    openToast(
                        ToastType.ERROR,
                        'Error regenerating output images. Please try again.'
                    );
                }
            },

            updateVariantData(variantId) {
                Log.debug('Updating variant data.', { variantId });
                const { variant } = getVariantsWithIdCheck(variantId);
                const images = [...get().images];

                images.forEach(image => {
                    if (image.variantId === variant.id) {
                        image.filename = getVariantFilenameForOutputImage(variant, image);
                    }
                });

                set({ images });
            },
            regenerateFilenamesByInputImageIds(ids) {
                const images = [...get().images];

                for (let i = 0; i < ids.length; i++) {
                    const id = ids[i];

                    for (let j = 0; j < images.length; j++) {
                        if (images[j].inputImage.id === id) {
                            const image = images[j];

                            image.filename = getVariantFilenameForOutputImage(
                                getUpToDateVariant(image.variantId),
                                image
                            );
                        }
                    }
                }
            },
            updateInputImageIndexesByIds(ids, newIndexImages) {
                const images = [...get().images];

                for (let i = 0; i < ids.length; i++) {
                    const id = ids[i];
                    const index = newIndexImages.findIndex(img => img.id === id);

                    for (let j = 0; j < images.length; j++) {
                        const image = images[j];

                        if (image.inputImage.id === id) {
                            image.inputImage.index = index;
                        }
                    }
                }

                set({ images });

                useOutputImages.getState().api.regenerateFilenamesByInputImageIds(ids);
            },
            setCropData(imageId, cropData) {
                const outputImages = [...get().images];
                const index = outputImages.findIndex(i => i.id === imageId);

                if (index === -1) {
                    Log.error(`No output image with id "${imageId}" found.`);
                    openToast(ToastType.ERROR, `No output image with id "${imageId}" found.`);
                    return;
                }

                outputImages[index].crop = cropData;

                set({ images: outputImages });
                useOutputImages.getState().api.regenerate(imageId);
            },
            setResamplingData: (imageId, data, regenerate = true) => {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                image.resampling.enabled = data.enabled;
                image.resampling.filter = data.filter;
                image.resampling.quality = data.quality;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setResamplingEnabled(imageId, enabled, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                image.resampling.enabled = enabled;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setFilter(imageId, filter, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                if (!image.resampling.enabled) {
                    image.resampling.enabled = true;
                    const { variant } = getVariantsWithIdCheck(image.variantId);

                    image.resampling.quality = variant.quality;
                }

                image.resampling.filter = filter;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setQuality(imageId, quality, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                if (!image.resampling.enabled) {
                    image.resampling.enabled = true;
                    const { variant } = getVariantsWithIdCheck(image.variantId);

                    image.resampling.filter = variant.filter;
                }

                image.resampling.quality = quality;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setSharpenData(imageId, data, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                image.sharpening.enabled = data.enabled;
                image.sharpening.amount = data.amount;
                image.sharpening.radius = data.radius;
                image.sharpening.threshold = data.threshold;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setSharpenEnabled(imageId, enabled, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                image.sharpening.enabled = enabled;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setSharpenAmount(imageId, amount, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                if (!image.sharpening.enabled) {
                    image.sharpening.enabled = true;
                    const { variant } = getVariantsWithIdCheck(image.variantId);

                    image.sharpening.radius = variant.sharpenRadius;
                    image.sharpening.threshold = variant.sharpenThreshold;
                }

                image.sharpening.amount = amount;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setSharpenRadius(imageId, radius, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                if (!image.sharpening.enabled) {
                    image.sharpening.enabled = true;
                    const { variant } = getVariantsWithIdCheck(image.variantId);

                    image.sharpening.amount = variant.sharpenAmount;
                    image.sharpening.threshold = variant.sharpenThreshold;
                }

                image.sharpening.radius = radius;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            setSharpenThreshold(imageId, threshold, regenerate = true) {
                const { outputImages, image } = getOutputImagesWithIdCheck(imageId);

                if (!image.sharpening.enabled) {
                    image.sharpening.enabled = true;
                    const { variant } = getVariantsWithIdCheck(image.variantId);

                    image.sharpening.amount = variant.sharpenAmount;
                    image.sharpening.radius = variant.sharpenRadius;
                }

                image.sharpening.threshold = threshold;

                set({ images: outputImages });

                regenerate && get().api.regenerate(imageId);
            },
            deleteByInputImageIds: ids => {
                let outputImages = [...get().images];

                ids.forEach(id => {
                    outputImages = outputImages.filter(img => img.inputImage.id !== id);
                });

                set({ images: outputImages });
            },
            deleteAll() {
                set({ images: [] });
            },
            selectAll() {
                const images = get().images;
                const toSelect = images.map(i => ({
                    type: 'output',
                    id: i.id,
                })) as SelectedItem[];
                useApp.setState({ selectedItems: toSelect });
            },
        },
    }))
);
