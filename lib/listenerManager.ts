// listenerManager.ts
type UnsubscribeFn = () => void;

const listeners: UnsubscribeFn[] = [];

/**
 * Thêm 1 listener mới vào danh sách quản lý
 */
export const addListener = (unsub: UnsubscribeFn) => {
  listeners.push(unsub);
};

/**
 * Hủy tất cả listener đã đăng ký
 */
export const clearListeners = () => {
  listeners.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      console.warn("Error while unsubscribing listener:", e);
    }
  });
  listeners.length = 0;
  console.log("🔥 All Firestore listeners cleared");
};
