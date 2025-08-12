// Network error logger to help identify 500 errors
export const setupNetworkLogging = () => {
  // Log fetch errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (response.status === 500) {
        console.error('500 Error detected:', {
          url: args[0],
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      return response;
    } catch (error) {
      console.error('Fetch error:', error, 'URL:', args[0]);
      throw error;
    }
  };

  // Log failed resource loads
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      console.error('Resource loading error:', {
        type: event.target.tagName,
        src: event.target.src || event.target.href,
        message: event.message
      });
    }
  }, true);

  // Log unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  console.log('Network logging enabled');
};