export const MAX_PHOTO_EDGE = 512
const JPEG_QUALITY = 0.85

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })

/**
 * Shrinks a photo before it reaches form state. Drafts autosave into localStorage,
 * whose few-megabyte quota a full-resolution photo would exhaust on its own.
 * Falls back to the original data URL whenever the canvas path is unavailable.
 */
export const downscaleDataUrl = (
  dataUrl: string,
  maxEdge: number = MAX_PHOTO_EDGE,
): Promise<string> =>
  new Promise((resolve) => {
    const image = new Image()

    image.onload = () => {
      const longestEdge = Math.max(image.width, image.height)
      if (longestEdge === 0 || longestEdge <= maxEdge) {
        resolve(dataUrl)
        return
      }

      const scale = maxEdge / longestEdge
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)

      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      try {
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      } catch {
        resolve(dataUrl)
      }
    }

    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
