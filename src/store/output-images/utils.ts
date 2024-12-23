import { useOutputImages } from '.';
import { THUMBNAIL_SIZE } from '../../lib/constants';
import {
    filenameToJpg,
    getFileExtension,
    getFileNameWithoutExtension,
    isJpg,
} from '../../lib/helpers';
import { Log } from '../../lib/log';
import {
    calculateOuputDimensions,
    loadImage,
    processImage,
    ResamplingSettings,
    SharpenSettings,
} from '../utils';
import { InputImageData, OutputImageData, PatternKeyword, Variant } from '../types';
import { useVariants } from '../variants/variants';
import { DEFAULT_CROP_SETTINGS } from '../../lib/config';
import { useInputImages } from '../input-images';

function alreadyExists(id: string, images: OutputImageData[]) {
    const alreadyExists = images.findIndex(i => i.id === id) > -1;
    if (alreadyExists) {
        Log.warn(`Output image "${id}" already exists.`);
        return true;
    } else {
        return false;
    }
}

export async function generateOutputImageVariants(
    inputImage: InputImageData,
    checkForDuplicate = true,
    outputImages?: OutputImageData[]
) {
    Log.debug_verbose('Generating output image variants', { inputImage });

    const variants = useVariants.getState().variants;
    const newOutputImages = [];

    for (let j = 0; j < variants.length; j++) {
        const variant = variants[j];

        const oldOutputImage = outputImages?.find(
            i => i.inputImage.id === inputImage.id && i.variantId === variant.id
        );

        const image = await generateOutputImage(
            inputImage,
            variant.id,
            checkForDuplicate,
            oldOutputImage
        );

        if (image) {
            newOutputImages.push(image);
        }
    }
    return newOutputImages;
}

export function getUpToDateVariant(variantId: string) {
    const variant = useVariants.getState().variants.find(v => v.id === variantId);

    if (!variant) {
        throw new Error(`Variant with id ${variantId} not found.`);
    }

    return variant;
}

export async function generateOutputImage(
    inputImage: InputImageData,
    variantId: string,
    checkForDuplicate = true,
    outputImage?: OutputImageData
): Promise<OutputImageData | undefined> {
    Log.debug_verbose('Generating output image', { inputImage, variantId });

    const id = `${inputImage.id}-${variantId}`;

    if (checkForDuplicate) {
        const currentImages = useOutputImages.getState().images;
        if (alreadyExists(id, currentImages)) return undefined;
    }

    let variant = getUpToDateVariant(variantId);

    const image = await loadImage(inputImage.image.full.file);
    const finalDimensions = calculateOuputDimensions(image, {
        widthMode: variant.width.mode,
        width: variant.width.value,
        heightMode: variant.height.mode,
        height: variant.height.value,
        aspectRatioEnabled: variant.aspectRatio.enabled,
        aspectRatio: variant.aspectRatio.value,
    });

    let cropData = { ...DEFAULT_CROP_SETTINGS };
    let sharpeningData: SharpenSettings = {
        enabled: false,
        amount: variant.sharpenAmount,
        radius: variant.sharpenRadius,
        threshold: variant.sharpenThreshold,
    };
    let resamplingData: ResamplingSettings = {
        enabled: false,
        filter: variant.filter,
        quality: variant.quality,
    };

    if (outputImage) {
        cropData = {
            x: outputImage.crop.x,
            y: outputImage.crop.y,
            zoom: outputImage.crop.zoom,
            minZoom: outputImage.crop.minZoom,
        };
    }

    if (outputImage?.resampling.enabled) {
        resamplingData = {
            enabled: true,
            filter: outputImage.resampling.filter,
            quality: outputImage.resampling.quality,
        };
    }

    if (outputImage?.sharpening.enabled) {
        sharpeningData = {
            enabled: true,
            amount: outputImage.sharpening.amount,
            radius: outputImage.sharpening.radius,
            threshold: outputImage.sharpening.threshold,
        };
    }

    const extension = resamplingData.quality < 1 ? 'jpeg' : getFileExtension(inputImage.filename);

    const processedFull = await processImage(
        image,
        extension,
        finalDimensions.width,
        finalDimensions.height,
        { ...cropData, zoom: cropData.zoom / cropData.minZoom },
        resamplingData,
        sharpeningData
    );

    variant = getUpToDateVariant(variantId);

    const processedFile = new File([processedFull.blob], inputImage.filename);

    // generate thumbnail - use full pic if smaller than THUMBNAIL_SIZE
    let processedThumbnail = { ...processedFull };
    const { width, height } = processedFull.dimensions;
    const needsThumbnail = width > THUMBNAIL_SIZE || height > THUMBNAIL_SIZE;

    if (needsThumbnail) {
        const image = await loadImage(processedFile);
        const finalDimensions = calculateOuputDimensions(image, {
            widthMode: 'upto',
            width: THUMBNAIL_SIZE,
            heightMode: 'upto',
            height: THUMBNAIL_SIZE,
            aspectRatioEnabled: variant.aspectRatio.enabled,
            aspectRatio: variant.aspectRatio.value,
        });

        processedThumbnail = await processImage(
            image,
            processedFile.name,
            finalDimensions.width,
            finalDimensions.height,
            undefined,
            {
                enabled: true,
                filter: 'mks2013',
                quality: isJpg(inputImage.filename) ? 0.9 : 1,
            }
        );
    }

    if (checkForDuplicate) {
        const currentImages = useOutputImages.getState().images;
        if (alreadyExists(id, currentImages)) return undefined;
    }

    const fullSrc = URL.createObjectURL(processedFull.blob);

    const index = useInputImages.getState().images.findIndex(i => i.id === inputImage.id);

    const finalOutputImage = {
        id,
        inputImage: {
            id: inputImage.id,
            index: index,
            filename: inputImage.filename,
            size: inputImage.image.full.file.size,
            dimensions: {
                width: inputImage.dimensions.width,
                height: inputImage.dimensions.height,
            },
        },
        variantId: variant.id,

        image: {
            full: {
                file: processedFull.blob,
                src: fullSrc,
            },
            thumbnail: {
                file: processedThumbnail.blob,
                src: needsThumbnail ? URL.createObjectURL(processedThumbnail.blob) : fullSrc,
            },
        },

        dimensions: {
            width: processedFull.dimensions.width,
            height: processedFull.dimensions.height,
        },

        filename: '',

        crop: cropData,
        resampling: resamplingData,
        sharpening: sharpeningData,
    };

    let filename = getVariantFilenameForOutputImage(variant, finalOutputImage);
    if (extension === 'jpeg') {
        filename = filenameToJpg(filename);
    }
    finalOutputImage.filename = filename;

    return finalOutputImage;
}

function handlePattern(pattern: string, outputImage: OutputImageData): string {
    const regex = /{([\w,]+)}/g;
    let finalFilename = pattern + '.' + getFileExtension(outputImage.inputImage.filename);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(finalFilename)) !== null) {
        const full = match[0];
        const keyword = match[1];
        const startIndex = match.index;
        const matchLength = match[0].length;

        const replacement = getReplacementForKeyword(keyword, outputImage, full);

        finalFilename =
            finalFilename.slice(0, startIndex) +
            replacement +
            finalFilename.slice(startIndex + matchLength);

        regex.lastIndex = startIndex + replacement.length;
    }

    return finalFilename;
}

function handleNoPattern(variant: Variant, outputImage: OutputImageData): string {
    const filename = outputImage.inputImage.filename;
    const period = filename.lastIndexOf('.');
    const newFilename = filename.substring(0, period);
    const extension = filename.substring(period);

    return variant.prefix + newFilename + variant.suffix + extension;
}

export const MAX_PAD = 5;

function getReplacementForKeyword(
    keyword: string,
    outputImage: OutputImageData,
    full: string
): string {
    if (keyword === PatternKeyword.FILENAME) {
        return getFileNameWithoutExtension(outputImage.inputImage.filename);
    } else if (keyword.startsWith(PatternKeyword.INDEX)) {
        let idx = (outputImage.inputImage.index + 1).toString();

        if (keyword.includes(',')) {
            const padLength = parseInt(keyword.split(',')[1], 10);
            if (!isNaN(padLength)) {
                idx = idx.padStart(Math.min(MAX_PAD, padLength), '0');
            }
        }

        return idx;
    } else if (keyword === PatternKeyword.WIDTH) {
        return outputImage.dimensions.width.toString();
    } else if (keyword === PatternKeyword.HEIGHT) {
        return outputImage.dimensions.height.toString();
    }

    return full;
}

export function getVariantFilenameForOutputImage(
    variant: Variant,
    outputImage: OutputImageData
): string {
    const { pattern } = variant;

    if (pattern) {
        return handlePattern(pattern, outputImage);
    }

    return handleNoPattern(variant, outputImage);
}
