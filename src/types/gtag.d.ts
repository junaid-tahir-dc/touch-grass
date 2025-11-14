// Type declaration for Google Analytics gtag function
interface Window {
  gtag?: (
    command: string,
    targetId: string | Date,
    config?: Record<string, any>
  ) => void;
  dataLayer?: any[];
}
