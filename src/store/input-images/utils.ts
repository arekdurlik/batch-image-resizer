import { THUMBNAIL_SIZE } from '../../lib/constants';
import { Log } from '../../lib/log';
import { InputImageData, UploadedImage } from '../types';
import { nanoid } from 'nanoid';
import { calculateOuputDimensions, loadImage, processImage } from '../utils';

export async function generateInputImage(image: UploadedImage): Promise<InputImageData | null> {
    Log.debug_verbose('Generating input image', { image });
    let inputImage: InputImageData | null = null;

    const id = nanoid();
    const { file, height, width } = image;

    const needsThumbnail = width > THUMBNAIL_SIZE || height > THUMBNAIL_SIZE;

    let thumbnailFile: Blob | File = file;

    if (needsThumbnail) {
        const image = await loadImage(file);
        const finalDimensions = calculateOuputDimensions(image, {
            widthMode: 'upto',
            width: THUMBNAIL_SIZE,
            heightMode: 'upto',
            height: THUMBNAIL_SIZE,
            aspectRatioEnabled: false,
        });

        thumbnailFile = (
            await processImage(image, file.name, finalDimensions.width, finalDimensions.height)
        ).blob;
    }

    const fullSrc = URL.createObjectURL(file);

    inputImage = {
        id,
        image: {
            full: {
                file,
                src: fullSrc,
            },
            thumbnail: {
                file: thumbnailFile,
                src: needsThumbnail ? URL.createObjectURL(thumbnailFile) : fullSrc,
            },
        },
        filename: file.name,
        dimensions: {
            width,
            height,
        },
    };

    return inputImage;
}
