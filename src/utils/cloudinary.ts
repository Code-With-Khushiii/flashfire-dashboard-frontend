/**
 * Legacy cloudinary.ts file - now uses the unified upload service
 * This file is kept for backward compatibility
 */
import { uploadProfileFile } from './uploadService';

// Local file upload configuration
export const FILE_UPLOAD_CONFIG = {
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
};

/**
 * Upload file locally (via backend API)
 * Automatically uses R2 or Cloudinary based on backend configuration
 */
export async function uploadFileLocally(
  file: File, 
  fileType: 'resume' | 'coverLetter' | 'transcript'
): Promise<string> {
  return await uploadProfileFile(file, fileType);
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export { fileToBase64 };
