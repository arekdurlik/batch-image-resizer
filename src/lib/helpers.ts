export function insertSuffixToFilename(input: string, suffix: string) {
    const period = input.lastIndexOf('.');
    const filename = input.substring(0, period);
    const extension = input.substring(period);

    return filename + suffix + extension;
}

export function filenameToJpg(input: string) {
    const period = input.lastIndexOf('.');
    const filename = input.substring(0, period);

    return filename + '.jpg';
}

export function getFileExtension(filename: string) {
    const lastPeriod = filename.lastIndexOf('.');
    return filename.substring(lastPeriod + 1);
}

export function getFileNameWithoutExtension(filename: string) {
    const lastPeriod = filename.lastIndexOf('.');
    return filename.substring(0, lastPeriod);
}

export function isJpg(filename: string) {
    return ['jpg', 'jpeg', 'jfif'].includes(getFileExtension(filename));
}

export function changeFilename(file: string, newFilename: string) {
    const lastPeriod = file.lastIndexOf('.');
    const extension = file.substring(lastPeriod);

    return newFilename + extension;
}

export function compare(a: string | number, b: string | number) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

export function compareTwo(
    a1: string | number,
    b1: string | number,
    a2: string | number,
    b2: string | number
) {
    if (a1 < b1 || a2 < b2) {
        return -1;
    }
    if (a1 > b1 || a2 > b2) {
        return 1;
    }
    return 0;
}

export function bytesToSizeFormatted(bytes: number) {
    const kb = bytes < 100000;

    const size = bytes * (kb ? 0.001 : 0.000001);

    return `${Math.round(size * 100) / 100}${kb ? ' KB' : ' MB'}`;
}

export function difference(a: number, b: number) {
    return Math.abs(a - b);
}

export function clamp(a: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, a));
}
