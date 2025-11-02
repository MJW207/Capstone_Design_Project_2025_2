/**
 * 패널 북마크 관리 유틸리티
 * LocalStorage 기반 북마크 저장/로드
 */

export interface PanelBookmark {
  panelId: string;
  title?: string;
  timestamp: number;
  metadata?: {
    gender?: string;
    age?: number;
    region?: string;
    tags?: string[];
  };
}

const BOOKMARKS_STORAGE_KEY = 'panel_bookmarks';

export const bookmarkManager = {
  /**
   * localStorage에서 북마크 로드
   */
  loadBookmarks(): PanelBookmark[] {
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      return [];
    }
  },

  /**
   * localStorage에 북마크 저장
   */
  saveBookmarks(bookmarks: PanelBookmark[]): void {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  },

  /**
   * 북마크 추가/업데이트
   */
  addBookmark(bookmark: PanelBookmark): PanelBookmark[] {
    const bookmarks = this.loadBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.panelId === bookmark.panelId);
    
    if (existingIndex >= 0) {
      // 기존 북마크 업데이트
      bookmarks[existingIndex] = bookmark;
    } else {
      // 새 북마크 추가
      bookmarks.push(bookmark);
    }
    
    // 최신순으로 정렬
    bookmarks.sort((a, b) => b.timestamp - a.timestamp);
    
    this.saveBookmarks(bookmarks);
    return bookmarks;
  },

  /**
   * 북마크 제거
   */
  removeBookmark(panelId: string): PanelBookmark[] {
    const bookmarks = this.loadBookmarks();
    const filtered = bookmarks.filter(b => b.panelId !== panelId);
    this.saveBookmarks(filtered);
    return filtered;
  },

  /**
   * 북마크 확인
   */
  isBookmarked(panelId: string): boolean {
    const bookmarks = this.loadBookmarks();
    return bookmarks.some(b => b.panelId === panelId);
  },

  /**
   * 특정 북마크 조회
   */
  getBookmark(panelId: string): PanelBookmark | undefined {
    const bookmarks = this.loadBookmarks();
    return bookmarks.find(b => b.panelId === panelId);
  },

  /**
   * 모든 북마크 제거
   */
  clearAll(): void {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  },
};

