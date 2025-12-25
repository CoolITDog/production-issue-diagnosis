// Performance optimization utilities

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function calls to once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memory-efficient file chunking for large file processing
 */
export class FileChunker {
  private chunkSize: number;
  
  constructor(chunkSize = 1024 * 1024) { // 1MB default
    this.chunkSize = chunkSize;
  }
  
  async *processFileInChunks(file: File): AsyncGenerator<{ chunk: string; progress: number; isLast: boolean }> {
    const totalSize = file.size;
    let offset = 0;
    
    while (offset < totalSize) {
      const chunkEnd = Math.min(offset + this.chunkSize, totalSize);
      const blob = file.slice(offset, chunkEnd);
      const chunk = await blob.text();
      
      const progress = (chunkEnd / totalSize) * 100;
      const isLast = chunkEnd >= totalSize;
      
      yield { chunk, progress, isLast };
      
      offset = chunkEnd;
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  async processLargeFile(
    file: File,
    processor: (chunk: string, isLast: boolean) => Promise<void>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    for await (const { chunk, progress, isLast } of this.processFileInChunks(file)) {
      await processor(chunk, isLast);
      if (onProgress) {
        onProgress(progress);
      }
    }
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private maxMemoryUsage: number;
  private currentUsage: number = 0;
  private warnings: ((usage: number, max: number) => void)[] = [];
  
  constructor(maxMemoryMB = 500) { // 500MB default limit
    this.maxMemoryUsage = maxMemoryMB * 1024 * 1024; // Convert to bytes
  }
  
  trackAllocation(sizeBytes: number): boolean {
    this.currentUsage += sizeBytes;
    
    if (this.currentUsage > this.maxMemoryUsage) {
      this.warnings.forEach(callback => callback(this.currentUsage, this.maxMemoryUsage));
      return false;
    }
    
    return true;
  }
  
  releaseAllocation(sizeBytes: number): void {
    this.currentUsage = Math.max(0, this.currentUsage - sizeBytes);
  }
  
  onMemoryWarning(callback: (usage: number, max: number) => void): void {
    this.warnings.push(callback);
  }
  
  getCurrentUsage(): { bytes: number; mb: number; percentage: number } {
    return {
      bytes: this.currentUsage,
      mb: this.currentUsage / (1024 * 1024),
      percentage: (this.currentUsage / this.maxMemoryUsage) * 100,
    };
  }
  
  reset(): void {
    this.currentUsage = 0;
  }
}

/**
 * Virtual scrolling utility for large lists
 */
export class VirtualScrollManager {
  private containerHeight: number;
  private itemHeight: number;
  private totalItems: number;
  private scrollTop: number = 0;
  
  constructor(containerHeight: number, itemHeight: number, totalItems: number) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
  }
  
  getVisibleRange(scrollTop: number): { start: number; end: number; offsetY: number } {
    this.scrollTop = scrollTop;
    
    const start = Math.floor(scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const end = Math.min(start + visibleCount + 1, this.totalItems); // +1 for buffer
    
    const offsetY = start * this.itemHeight;
    
    return { start, end, offsetY };
  }
  
  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }
  
  updateTotalItems(count: number): void {
    this.totalItems = count;
  }
}

/**
 * Lazy loading utility for images and components
 */
export class LazyLoader {
  private observer: IntersectionObserver;
  private loadedElements = new Set<Element>();
  
  constructor(
    private onLoad: (element: Element) => void,
    options: IntersectionObserverInit = {}
  ) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      }
    );
  }
  
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadedElements.add(entry.target);
        this.onLoad(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }
  
  observe(element: Element): void {
    if (!this.loadedElements.has(element)) {
      this.observer.observe(element);
    }
  }
  
  unobserve(element: Element): void {
    this.observer.unobserve(element);
    this.loadedElements.delete(element);
  }
  
  disconnect(): void {
    this.observer.disconnect();
    this.loadedElements.clear();
  }
}

/**
 * Web Worker utility for offloading heavy computations
 */
export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  
  createWorker(name: string, workerScript: string): Worker {
    if (this.workers.has(name)) {
      return this.workers.get(name)!;
    }
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    this.workers.set(name, worker);
    
    // Clean up URL when worker is terminated
    worker.addEventListener('error', () => {
      URL.revokeObjectURL(workerUrl);
    });
    
    return worker;
  }
  
  async runTask<T>(workerName: string, data: any): Promise<T> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found`);
    }
    
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        resolve(event.data);
      };
      
      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(error);
      };
      
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(data);
    });
  }
  
  terminateWorker(name: string): void {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }
  
  terminateAll(): void {
    this.workers.forEach((worker, name) => {
      worker.terminate();
    });
    this.workers.clear();
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();
  
  startTiming(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      this.metrics.get(label)!.push(duration);
    };
  }
  
  getMetrics(label: string): { avg: number; min: number; max: number; count: number } | null {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) {
      return null;
    }
    
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { avg, min, max, count: times.length };
  }
  
  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((times, label) => {
      const metrics = this.getMetrics(label);
      if (metrics) {
        result[label] = metrics;
      }
    });
    
    return result;
  }
  
  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}

// Global instances
export const memoryMonitor = new MemoryMonitor();
export const performanceMetrics = new PerformanceMetrics();
export const workerManager = new WorkerManager();

// Browser capability detection
export const browserCapabilities = {
  supportsFileSystemAccess: 'showDirectoryPicker' in window,
  supportsWebWorkers: typeof Worker !== 'undefined',
  supportsIntersectionObserver: 'IntersectionObserver' in window,
  supportsResizeObserver: 'ResizeObserver' in window,
  supportsOffscreenCanvas: 'OffscreenCanvas' in window,
  maxMemory: (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 : 4096, // MB
  hardwareConcurrency: navigator.hardwareConcurrency || 4,
};