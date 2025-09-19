// Safe localStorage utility with error handling and fallbacks
class SafeLocalStorage {
  constructor() {
    this.isAvailable = this.checkAvailability();
    this.memoryStorage = new Map();
  }

  checkAvailability() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage is not available, using memory storage fallback');
      return false;
    }
  }

  setItem(key, value) {
    try {
      if (this.isAvailable) {
        localStorage.setItem(key, value);
      } else {
        this.memoryStorage.set(key, value);
      }
    } catch (error) {
      console.error('Error setting localStorage item:', error);
      // Fallback to memory storage
      this.memoryStorage.set(key, value);
    }
  }

  getItem(key) {
    try {
      if (this.isAvailable) {
        return localStorage.getItem(key);
      } else {
        return this.memoryStorage.get(key) || null;
      }
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      // Fallback to memory storage
      return this.memoryStorage.get(key) || null;
    }
  }

  removeItem(key) {
    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      } else {
        this.memoryStorage.delete(key);
      }
    } catch (error) {
      console.error('Error removing localStorage item:', error);
      // Fallback to memory storage
      this.memoryStorage.delete(key);
    }
  }

  clear() {
    try {
      if (this.isAvailable) {
        localStorage.clear();
      } else {
        this.memoryStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      // Fallback to memory storage
      this.memoryStorage.clear();
    }
  }
}

// Create a singleton instance
const safeLocalStorage = new SafeLocalStorage();

export default safeLocalStorage;
