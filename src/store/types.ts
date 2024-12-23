import { DimensionMode } from '../types';

export type UploadedImage = { file: File; width: number; height: number };

export type InputImageData = {
    id: string;

    image: {
        full: {
            file: File;
            src: string;
        };
        thumbnail: {
            file: Blob;
            src: string;
        };
    };

    filename: string;
    dimensions: {
        width: number;
        height: number;
    };
};

export type OutputImageData = {
    id: string;
    filename: string;
    inputImage: {
        id: string;
        index: number;
        filename: string;
        size: number;
        dimensions: {
            width: number;
            height: number;
        };
    };
    variantId: string;

    crop: {
        x: number;
        y: number;
        zoom: number;
        minZoom: number;
    };

    image: {
        full: {
            file: Blob;
            src: string;
        };
        thumbnail: {
            file: Blob;
            src: string;
        };
    };

    resampling: {
        enabled: boolean;
        filter: PicaFilter;
        quality: number;
    };

    sharpening: {
        enabled: boolean;
        amount: number;
        radius: number;
        threshold: number;
    };

    dimensions: {
        width: number;
        height: number;
    };
};

export type ImageData = InputImageData | OutputImageData;

export type PicaFilter = 'box' | 'hamming' | 'lanczos2' | 'lanczos3' | 'mks2013';

export type Variant = {
    id: string;
    name: string;
    width: {
        mode: DimensionMode;
        value?: number;
    };
    height: {
        mode: DimensionMode;
        value?: number;
    };
    prefix: string;
    suffix: string;
    pattern: string;
    crop: boolean;
    filter: PicaFilter;
    quality: number;
    sharpenAmount: number;
    sharpenRadius: number;
    sharpenThreshold: number;
    aspectRatio: {
        enabled: boolean;
        value: string;
    };
};

export type VariantUpdate = keyof Partial<Omit<Variant, 'id'>>;

export type SelectedItem =
    | {
          type: 'input';
          id: string;
      }
    | {
          type: 'output';
          id: string;
      };

export enum PatternKeyword {
    INDEX = 'index',
    FILENAME = 'filename',
    WIDTH = 'width',
    HEIGHT = 'height',
    
}
