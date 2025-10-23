/**
 * Unified Upload Service
 * Handles file uploads through backend API (supports both R2 and Cloudinary)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface UploadResult {
  success: boolean;
  url?: string;
  secure_url?: string;
  key?: string;
  storage?: 'r2' | 'cloudinary';
  error?: string;
}

/**
 * Helper function to get authentication token from localStorage
 * Consistent with app's auth pattern
 */
function getAuthToken(): string | null {
  try {
    const userAuth = JSON.parse(localStorage.getItem('userAuth') || '{}');
    return userAuth.token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Upload file using FormData (multipart/form-data)
 * @param file - File to upload
 * @param folder - Optional folder path
 * @returns Upload result with URL
 */
export async function uploadFile(file: File, folder?: string): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    // Optional: Send token if available (but not required)
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload-file`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url || data.secure_url,
      secure_url: data.secure_url || data.url,
      key: data.key,
      storage: data.storage,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload file using base64 encoding
 * @param file - File to upload
 * @param folder - Optional folder path
 * @returns Upload result with URL
 */
export async function uploadBase64File(file: File, folder?: string): Promise<UploadResult> {
  try {
    const base64Data = await fileToBase64(file);

    // Optional: Send token if available (but not required)
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload-base64`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileData: base64Data,
        filename: file.name,
        folder: folder || 'flashfire-uploads',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url || data.secure_url,
      secure_url: data.secure_url || data.url,
      key: data.key,
      storage: data.storage,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload resume or cover letter
 * @param file - File to upload
 * @param fileType - Type of file (resume, coverLetter, transcript)
 * @returns URL of uploaded file
 */
export async function uploadProfileFile(
  file: File,
  fileType: 'resume' | 'coverLetter' | 'transcript'
): Promise<string> {
  const folder = fileType === 'resume' ? 'flashfire-resumes' : 
                 fileType === 'coverLetter' ? 'flashfire-coverletters' :
                 'flashfire-transcripts';
  
  const result = await uploadFile(file, folder);
  
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return result.url;
}

/**
 * Upload image or attachment
 * @param file - File to upload
 * @param folder - Optional folder path
 * @returns URL of uploaded file
 */
export async function uploadAttachment(file: File, folder = 'flashfire-attachments'): Promise<string> {
  const result = await uploadFile(file, folder);
  
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return result.url;
}

/**
 * Helper function to convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Legacy Cloudinary upload (for backward compatibility)
 * This is kept for components that still use direct Cloudinary uploads
 */
export async function uploadToCloudinary(
  file: File,
  options: {
    resourceType?: 'image' | 'raw' | 'video' | 'auto';
    folder?: string;
  } = {}
): Promise<{ secure_url: string }> {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = 
    options.resourceType === 'raw' || file.type === 'application/pdf'
      ? import.meta.env.VITE_CLOUDINARY_CLOUD_PRESET_PDF
      : import.meta.env.VITE_CLOUDINARY_CLOUD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    // Fallback to backend upload if Cloudinary is not configured
    const result = await uploadFile(file, options.folder);
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Upload failed');
    }
    return { secure_url: result.url };
  }

  const resourceType = options.resourceType || 'auto';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (options.folder) {
    formData.append('folder', options.folder);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Cloudinary upload failed');
  }

  const data = await response.json();
  return data;
}

export default {
  uploadFile,
  uploadBase64File,
  uploadProfileFile,
  uploadAttachment,
  uploadToCloudinary,
};

