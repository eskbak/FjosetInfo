// Utility function for making robust API calls with timeout and error handling
export async function robustFetch(
  url: string, 
  options: RequestInit & { timeout?: number } = {}
): Promise<Response | null> {
  const { timeout = 10000, ...fetchOptions } = options;
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: AbortSignal.timeout(timeout),
    });
    
    if (!response.ok) {
      console.warn(`API call failed: ${url} returned ${response.status} ${response.statusText}`);
      return null;
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(`API call timed out: ${url} (${timeout}ms)`);
    } else if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`API call aborted: ${url}`);
    } else {
      console.warn(`API call error: ${url}`, error);
    }
    return null;
  }
}

// Utility for making JSON API calls with automatic parsing and fallback
export async function robustJsonFetch<T>(
  url: string, 
  options: RequestInit & { timeout?: number } = {},
  fallback: T
): Promise<T> {
  const response = await robustFetch(url, options);
  
  if (!response) {
    return fallback;
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.warn(`Failed to parse JSON from ${url}:`, error);
    return fallback;
  }
}