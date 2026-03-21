export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    if (!url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the `react-easy-crop` example.
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string | null> {
  console.log('getCroppedImg started', { pixelCrop, rotation });
  const image = await createImage(imageSrc);
  
  // Limit source image size to prevent memory issues
  const MAX_SOURCE_SIZE = 4096;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let scaleX = 1;
  let scaleY = 1;

  if (sourceWidth > MAX_SOURCE_SIZE || sourceHeight > MAX_SOURCE_SIZE) {
    const scale = Math.min(MAX_SOURCE_SIZE / sourceWidth, MAX_SOURCE_SIZE / sourceHeight);
    sourceWidth *= scale;
    sourceHeight *= scale;
    scaleX = scale;
    scaleY = scale;
    console.log('Downscaling source image for processing', { scale });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    sourceWidth,
    sourceHeight,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-sourceWidth / 2, -sourceHeight / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  // Create a second canvas for the actual crop
  const cropCanvas = document.createElement('canvas');
  
  // Adjust pixelCrop based on source downscaling
  const targetX = pixelCrop.x * scaleX;
  const targetY = pixelCrop.y * scaleY;
  const targetWidth = pixelCrop.width * scaleX;
  const targetHeight = pixelCrop.height * scaleY;

  cropCanvas.width = targetWidth;
  cropCanvas.height = targetHeight;
  const cropCtx = cropCanvas.getContext('2d');

  if (!cropCtx) {
    return null;
  }

  // Draw the cropped area from the first canvas to the second
  cropCtx.drawImage(
    canvas,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Final resize if still too large for web use (staying under reasonable limits)
  const MAX_FINAL_DIMENSION = 1600;
  if (cropCanvas.width > MAX_FINAL_DIMENSION || cropCanvas.height > MAX_FINAL_DIMENSION) {
    const scale = Math.min(MAX_FINAL_DIMENSION / cropCanvas.width, MAX_FINAL_DIMENSION / cropCanvas.height);
    const finalWidth = cropCanvas.width * scale;
    const finalHeight = cropCanvas.height * scale;

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = finalWidth;
    resizeCanvas.height = finalHeight;
    const resizeCtx = resizeCanvas.getContext('2d');
    if (resizeCtx) {
      resizeCtx.drawImage(cropCanvas, 0, 0, finalWidth, finalHeight);
      console.log('Final resize applied');
      return resizeCanvas.toDataURL('image/jpeg', 0.85);
    }
  }

  console.log('getCroppedImg finished');
  return cropCanvas.toDataURL('image/jpeg', 0.85);
}
