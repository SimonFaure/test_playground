/// <reference types="vite/client" />

interface Window {
  electron?: {
    getComputerName: () => Promise<string>;
  };
}
