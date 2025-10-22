// Local file upload configuration
export const FILE_UPLOAD_CONFIG = {
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
};

export async function uploadFileLocally(file: File, fileType: 'resume' | 'coverLetter' | 'transcript'): Promise<string> {
  // Convert file to base64
  const base64 = await fileToBase64(file);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('token');
  const userAuth = JSON.parse(localStorage.getItem('userAuth') || '{}');
  const email = userAuth.userDetails?.email;
  
  if (!token || !email) {
    throw new Error("Authentication required");
  }

  const response = await fetch(`${API_BASE_URL}/upload-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: email,
      fileType: fileType,
      fileData: base64
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }

  const data = await response.json();
  return data.url;
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
