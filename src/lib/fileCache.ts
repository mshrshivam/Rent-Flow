//---------------------------------------------
// FILE CACHE SERVICE
// Uses IndexedDB to cache uploaded files
//---------------------------------------------

interface CachedFile {
  id: string;
  file: File;
  uploadedUrl?: string;
  timestamp: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

class FileCache {
  private dbName = 'fileUploadCache';
  private storeName = 'files';
  private db: IDBDatabase | null = null;
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async cacheFile(file: File): Promise<string> {
    const db = await this.ensureDB();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cachedFile: CachedFile = {
      id,
      file,
      timestamp: Date.now(),
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(cachedFile);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedFile(id: string): Promise<CachedFile | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as CachedFile | undefined;
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateFileStatus(
    id: string, 
    status: CachedFile['status'], 
    uploadedUrl?: string,
    error?: string
  ): Promise<void> {
    const db = await this.ensureDB();
    const cachedFile = await this.getCachedFile(id);
    
    if (!cachedFile) {
      throw new Error('Cached file not found');
    }

    cachedFile.status = status;
    if (uploadedUrl) cachedFile.uploadedUrl = uploadedUrl;
    if (error) cachedFile.error = error;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(cachedFile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedFiles(): Promise<CachedFile[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as CachedFile[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingFiles(): Promise<CachedFile[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result as CachedFile[]);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldCache(): Promise<void> {
    const db = await this.ensureDB();
    const cutoffTime = Date.now() - this.maxCacheAge;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const fileCache = new FileCache();
