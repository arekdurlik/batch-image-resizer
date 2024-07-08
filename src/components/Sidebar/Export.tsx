import JSZip from 'jszip'
import { useAppStore } from '../../store/appStore'
import { Button } from '../styled/globals'
import styled from 'styled-components'
import pica from 'pica'
import { filenameToJpg, insertSuffixToFilename } from '../../helpers'

type ImageData = { blob: Blob, name: string, prefix?: string, suffix?: string }

const resizer = new pica({ features: ['js', 'wasm', 'ww']});

export function Export() {
  const images = useAppStore(state => state.images);
  const variants = useAppStore(state => state.variants);

  function loadImage(file: File): Promise<HTMLImageElement> {
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

  function imageToCanvas(image: HTMLImageElement, width?: number, height?: number): Promise<HTMLCanvasElement> {
    return new Promise(resolve => {
      try {
        const offScreenCanvas = document.createElement('canvas');

        let newWidth = image.width;
        let newHeight = image.height;
        const ratio = image.width / image.height;

        if (width) {
          newWidth = width;
          newHeight = Math.ceil(newWidth / ratio);
        } else if (height) {
          newHeight = height;
          newWidth = Math.ceil(newHeight * ratio);
        }

        offScreenCanvas.width = newWidth;
        offScreenCanvas.height = newHeight;
        const resized = resizer.resize(image, offScreenCanvas);
        resolve(resized);
      } catch {
        throw new Error('Failed to resize image.');
      }
    });
  }

  function canvasToBlob(image: HTMLCanvasElement): Promise<Blob> {
    return new Promise(resolve => {
      try {
        const blob = resizer.toBlob(image, 'image/jpeg', 80);
        resolve(blob);
      } catch {
        throw new Error('Failed to convert image to blob.');
      }
    });
  }
  
  async function blobItUp(): Promise<ImageData[]> {
    const promises: Promise<ImageData>[] = [];

    for (let i = 0; i < images.length; i++) {
      for (let j = 0; j < variants.length; j++) {
        const { prefix, suffix, width, height } = variants[j];
        const file = images[i].file;

        const image = await loadImage(file);
        const resized = await imageToCanvas(image, width, height);
        const blob = await canvasToBlob(resized);
        promises.push(new Promise((resolve) => resolve({ blob, name: file.name, prefix, suffix })));
      }
    }
    return Promise.all(promises);
  }
  
  function zipItUp(zip: JSZip, blobs: ImageData[]): Promise<JSZip[]> {
    const promises: Promise<JSZip>[] = [];
    
    blobs.forEach(({ blob, name, prefix, suffix }) => {
      promises.push(new Promise(resolve => {
        try {
          let filename = filenameToJpg(name);

          if (prefix) {
            filename = prefix + name;
          }

          if (suffix) {
            filename = insertSuffixToFilename(filename, suffix);
          }

          resolve(zip.file(filename, blob));
        } catch {
          throw new Error(`Failed to add file ${name} to the archive.`);
        }
      }));
    });
    return Promise.all(promises);
  }
  
  async function handleClick() {
    if (!images.length) return;
    
    let blobs: ImageData[];
    try {
      blobs = await blobItUp();
    } catch (error) {
      console.error(error);
      return;
    }
    
    const zip = new JSZip();
    
    try {
      await zipItUp(zip, blobs);
    } catch (error) {
      console.error(error);
      return;
    }

    const blob = await zip.generateAsync({ type: 'blob', streamFiles: true });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `image_batch_${Date.now()}`;
    a.click();
  }

  return <Wrapper>
    <StyledButton onClick={handleClick}>
      Export
    </StyledButton>
  </Wrapper>
}

const Wrapper = styled.div`
border-top: 1px solid ${props => props.theme.border};
display: grid;
place-items: center;
z-index: 2;
`

const StyledButton = styled(Button)`
background-color: #267e32;
color: ${props => props.theme.background};
margin: 10px;
 
svg {
  fill: ${props => props.theme.background};
}

&:hover {
  background-color: #28a539;
}
`