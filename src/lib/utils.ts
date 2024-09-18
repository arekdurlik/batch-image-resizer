import pica from 'pica'
import { getFileExtension } from './helpers'
import { lerp } from '../helpers'
import { DimensionMode } from '../types'
import { CropSettings } from './config'

const resizer = new pica({ features: ['js', 'wasm', 'ww']});

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    try {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = URL.createObjectURL(file);
    } catch {
      throw new Error(`Error loading image from file "${file.name}".`);
    }
  });
}

export function resizeImage(
  image: HTMLCanvasElement | HTMLImageElement, 
  width: number | undefined, 
  height: number | undefined,
): Promise<HTMLCanvasElement> {
  return new Promise(resolve => {
    try {
      const offScreenCanvas = document.createElement('canvas');

      let newWidth = image.width;
      let newHeight = image.height;
      const ratio = image.width / image.height;

      if (width) {
        newWidth = width;
      } else {
        newWidth = Math.ceil(newHeight * ratio);
      }
      
      if (height) {
        newHeight = height;
      } else {
        newHeight = Math.ceil(newWidth / ratio);
      }

      offScreenCanvas.width = newWidth;
      offScreenCanvas.height = newHeight;
      const resized = resizer.resize(image, offScreenCanvas, { filter: 'lanczos3' });
      resolve(resized);
    } catch {
      throw new Error('Failed to resize image.');
    }
  });
}

export function cropImage(image: HTMLImageElement, width: number, height: number, x = 0.5, y = 0.5, scale = 1) {
  const cropCanvas = document.createElement('canvas');
  const cropContext = cropCanvas.getContext('2d')!;

  const inputAspectRatio = image.width / image.height;
  const outputAspectRatio = width / height;

  let cropWidth = image.width, cropHeight = image.height;

  
  if (inputAspectRatio > outputAspectRatio) {
    cropWidth = image.height * outputAspectRatio;
    cropHeight = image.height;
  } else {
    cropWidth = image.width;
    cropHeight = image.width / outputAspectRatio;
  }

  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  const min = 0;

  const maxX = -(image.width * scale) + cropWidth;
  const xPos = lerp(min, maxX, x);

  const maxY = -(image.height * scale) + cropHeight;
  const yPos = lerp(min, maxY, y);

  cropContext.drawImage(
    image, 
    0, 0, image.width, image.height, 
    xPos, yPos, image.width * scale, image.height * scale
  );

  return cropCanvas;
}

export function calculateOuputDimensions(
  image: HTMLImageElement,
  settings?: {
    width: number | undefined,
    height: number | undefined,
    widthMode: DimensionMode,
    heightMode: DimensionMode
  }
) {
  const outputWidth = settings?.width ?? 0;  
  const outputHeight = settings?.height ?? 0;

  let finalWidth = outputWidth; 
  let finalHeight = outputHeight;

  if (!settings) return { width: finalWidth, height: finalHeight };

  if (outputWidth && outputHeight) {
    // both width and height are provided
    if (settings.widthMode === 'exact' && settings.heightMode === 'exact') {
        finalWidth = outputWidth;
        finalHeight = outputHeight;
    } else if (settings.widthMode === 'exact' && settings.heightMode === 'upto') {
        finalWidth = outputWidth;
        finalHeight = Math.min(outputHeight, outputWidth * image.height / image.width);
    } else if (settings.widthMode === 'upto' && settings.heightMode === 'exact') {
        finalHeight = outputHeight;
        finalWidth = Math.min(outputWidth, outputHeight * image.width / image.height);
    } else if (settings.widthMode === 'upto' && settings.heightMode === 'upto') {
        // both dimensions flexible (preserve aspect ratio)
        if (image.width / image.height > outputWidth / outputHeight) {
            finalWidth = Math.min(outputWidth, image.width);
            finalHeight = finalWidth * image.height / image.width;
        } else {
            finalHeight = Math.min(outputHeight, image.height);
            finalWidth = finalHeight * image.width / image.height;
        }
    }
} else if (outputWidth) {
    // only width is provided
    if (settings.widthMode === 'exact') {
        finalWidth = outputWidth;
        finalHeight = outputWidth * image.height / image.width;
    } else if (settings.widthMode === 'upto') {
        finalWidth = Math.min(outputWidth, image.width);
        finalHeight = finalWidth * image.height / image.width;
    }
} else if (outputHeight) {
    // only height is provided
    if (settings.heightMode === 'exact') {
        finalHeight = outputHeight;
        finalWidth = outputHeight * image.width / image.height;
    } else if (settings.heightMode === 'upto') {
        finalHeight = Math.min(outputHeight, image.height);
        finalWidth = finalHeight * image.width / image.height;
    }
} else {
    // no output dimensions provided, return original input size
    finalWidth = image.width;
    finalHeight = image.height;
}

  return { width: finalWidth, height: finalHeight };
}

function canvasToBlob(image: HTMLCanvasElement, quality: number, extension: string): Promise<Blob> {
  return new Promise(resolve => {
    try {
      const blob = resizer.toBlob(image, `image/${extension}`, quality);
      resolve(blob);
    } catch {
      throw new Error('Failed to convert image to blob.');
    }
  });
}

// TODO: maybe store the image on file upload so it doesn't have to be loaded again
export async function processImage(
  image: HTMLImageElement, 
  filename: string, 
  quality: number, 
  width: number, 
  height: number, 
  crop?: CropSettings
) {
  let cropped: HTMLCanvasElement | HTMLImageElement = image;

  if (crop) {
    cropped = cropImage(image, width, height, crop.x, crop.y, crop.scale);
  }
  
  const resized = await resizeImage(cropped, width, height);

  const extension = quality < 1 ? 'jpeg' : getFileExtension(filename);

  const blob = await canvasToBlob(resized, quality, extension);

  return {
    blob, 
    dimensions: {
      width: resized.width,
      height: resized.height
    }
  }
}