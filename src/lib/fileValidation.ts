// File upload validation utilities

export const FILE_LIMITS = {
  // Maximum file size in bytes (20MB)
  MAX_FILE_SIZE: 20 * 1024 * 1024,
  // Maximum number of images per post
  MAX_IMAGES_PER_POST: 5,
  // Maximum number of videos per post
  MAX_VIDEOS_PER_POST: 1,
  // Supported image formats
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] as const,
  // Supported video formats
  SUPPORTED_VIDEO_FORMATS: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'] as const,
} as const;

export interface FileValidationError {
  type: 'size' | 'format' | 'count';
  message: string;
  fileName?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: FileValidationError[];
  validFiles: File[];
}

/**
 * Validates files for upload
 */
export function validateFiles(
  files: File[],
  type: 'image' | 'video',
  existingFileCount: number = 0
): FileValidationResult {
  const errors: FileValidationError[] = [];
  const validFiles: File[] = [];

  const supportedFormats = type === 'image' 
    ? [...FILE_LIMITS.SUPPORTED_IMAGE_FORMATS] 
    : [...FILE_LIMITS.SUPPORTED_VIDEO_FORMATS];
  
  const maxCount = type === 'image' 
    ? FILE_LIMITS.MAX_IMAGES_PER_POST 
    : FILE_LIMITS.MAX_VIDEOS_PER_POST;

  // Check total count
  if (existingFileCount + files.length > maxCount) {
    errors.push({
      type: 'count',
      message: `Maximum ${maxCount} ${type}${maxCount > 1 ? 's' : ''} allowed per post`
    });
  }

  for (const file of files) {
    // Check file size
    if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
      errors.push({
        type: 'size',
        message: `"${file.name}" is too large. Maximum size is ${formatFileSize(FILE_LIMITS.MAX_FILE_SIZE)}`,
        fileName: file.name
      });
      continue;
    }

    // Check file format
    if (!(supportedFormats as readonly string[]).includes(file.type)) {
      const formatList = supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ');
      errors.push({
        type: 'format',
        message: `"${file.name}" format not supported. Supported formats: ${formatList}`,
        fileName: file.name
      });
      continue;
    }

    validFiles.push(file);
  }

  return {
    isValid: errors.length === 0,
    errors,
    validFiles: existingFileCount + validFiles.length <= maxCount 
      ? validFiles 
      : validFiles.slice(0, maxCount - existingFileCount)
  };
}

/**
 * Validates a single image file (for avatars, challenge submissions, etc.)
 */
export function validateSingleImage(file: File): FileValidationResult {
  return validateFiles([file], 'image', 0);
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Gets the display text for file limits
 */
export function getFileLimitText(type: 'image' | 'video'): string {
  const maxSize = formatFileSize(FILE_LIMITS.MAX_FILE_SIZE);
  const maxCount = type === 'image' ? FILE_LIMITS.MAX_IMAGES_PER_POST : FILE_LIMITS.MAX_VIDEOS_PER_POST;
  
  if (type === 'image') {
    return `Up to ${maxCount} images, ${maxSize} max per file`;
  } else {
    return `${maxCount} video, ${maxSize} max`;
  }
}

/**
 * Gets accept attribute for file input
 */
export function getAcceptAttribute(type: 'image' | 'video'): string {
  if (type === 'image') {
    return [...FILE_LIMITS.SUPPORTED_IMAGE_FORMATS].join(',');
  } else {
    return [...FILE_LIMITS.SUPPORTED_VIDEO_FORMATS].join(',');
  }
}