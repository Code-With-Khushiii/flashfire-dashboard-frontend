/**
 * Image Caching Utility
 * Provides cached access to R2 images to reduce operations costs
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Get cached image URL
 * Uses backend proxy to serve cached presigned URLs
 * @param {string} originalUrl - The original R2 URL
 * @returns {string} Cached proxy URL
 */
export function getCachedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  
  // If it's not an R2 URL, return as-is
  if (!originalUrl.includes('.r2.cloudflarestorage.com')) {
    return originalUrl;
  }
  
  // Return proxy URL that will serve cached version
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Check if URL is from R2
 * @param {string} url - URL to check
 * @returns {boolean} True if R2 URL
 */
export function isR2Url(url: string): boolean {
  return url.includes('.r2.cloudflarestorage.com');
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache stats
 */
export async function getCacheStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/cache-stats`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

/**
 * Clear cache
 * @returns {Promise<boolean>} Success status
 */
export async function clearCache(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/clear-cache`, {
      method: 'POST',
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

/**
 * Optimize image URL for caching
 * Automatically converts R2 URLs to cached versions
 * @param {string} url - Original URL
 * @returns {string} Optimized URL
 */
export function optimizeImageUrl(url: string): string {
  if (!url) return '';
  
  // If it's an R2 URL, use cached version
  if (isR2Url(url)) {
    return getCachedImageUrl(url);
  }
  
  // For non-R2 URLs (like Cloudinary), return as-is
  return url;
}

/**
 * Batch optimize multiple URLs
 * @param {string[]} urls - Array of URLs
 * @returns {string[]} Array of optimized URLs
 */
export function optimizeImageUrls(urls: string[]): string[] {
  return urls.map(optimizeImageUrl);
}

export default {
  getCachedImageUrl,
  isR2Url,
  getCacheStats,
  clearCache,
  optimizeImageUrl,
  optimizeImageUrls,
};
