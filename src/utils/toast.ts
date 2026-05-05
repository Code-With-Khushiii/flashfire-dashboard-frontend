import toast from 'react-hot-toast';

export const toastUtils = {
  // Success toasts
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
    });
  },

  // Error toasts
  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      // Prevent stacking identical errors (e.g. many failing API calls at once)
      id: `error:${message}`,
    });
  },

  // Loading toasts
  loading: (message: string) => {
    return toast.loading(message, {
      duration: Infinity,
    });
  },

  // Promise toasts for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  // Custom toasts
  custom: (message: string, type: 'success' | 'error' | 'loading' | 'info' = 'success') => {
    switch (type) {
      case 'success':
        return toast.success(message, { id: `success:${message}` });
      case 'error':
        return toast.error(message, { id: `error:${message}` });
      case 'loading':
        return toast.loading(message);
      case 'info':
        return toast(message, {
          icon: 'ℹ️',
          duration: 4000,
          id: `info:${message}`,
        });
      default:
        return toast(message);
    }
  },

  // Dismiss all toasts
  dismiss: () => {
    toast.dismiss();
  },

  // Dismiss specific toast
  dismissToast: (toastId: string) => {
    toast.dismiss(toastId);
  },
};

// Specific toast messages for common operations
export const toastMessages = {
  loginSuccess: 'Welcome back! Login successful.',
  loginError: 'Login failed. Please check your credentials.',
  logoutSuccess: 'You have been logged out successfully.',
  
  jobAdded: 'Job application added successfully!',
  jobUpdated: 'Job application updated successfully!',
  jobDeleted: 'Job application deleted successfully!',
  jobError: 'Failed to process job application. Please try again.',
  
  profileUpdated: 'Profile updated successfully!',
  profileError: 'Failed to update profile. Please try again.',
  
  // File operations
  fileUploaded: 'File uploaded successfully!',
  fileUploadError: 'Failed to upload file. Please try again.',
  fileDeleted: 'File deleted successfully!',
  
  // Resume operations
  resumeOptimized: 'Resume optimized successfully!',
  resumeOptimizationError: 'Failed to optimize resume. Please try again.',
  
  // General
  operationSuccess: 'Operation completed successfully!',
  operationError: 'Operation failed. Please try again.',
  networkError: 'Network error. Please check your connection.',
  unauthorizedError: 'Session expired. Please login again.',
  validationError: 'Please fill in all required fields.',
  
  // Loading messages
  loggingIn: 'Logging in...',
  savingJob: 'Saving job application...',
  updatingProfile: 'Updating profile...',
  uploadingFile: 'Uploading file...',
  optimizingResume: 'Optimizing resume...',
  loading: 'Loading...',
};
