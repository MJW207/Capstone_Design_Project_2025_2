import { useState, useEffect } from 'react';
import { PIQuickMenuPopover } from './PIQuickMenuPopover';
import { PITextField } from './PITextField';
import { PIButton } from './PIButton';
import { Bookmark, ExternalLink, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BookmarkItem {
  id: string;
  title: string;
  query: string;
  date: string;
  url: string;
  filters?: any;  // 필터 정보도 저장
}

interface PIBookmarkMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery?: string;
  currentFilters?: any;  // 현재 필터 정보
  onOpen?: (bookmark: BookmarkItem) => void;
}

const BOOKMARKS_STORAGE_KEY = 'panel_insight_bookmarks';

export function PIBookmarkMenu({ isOpen, onClose, currentQuery, currentFilters, onOpen }: PIBookmarkMenuProps) {
  const [newTitle, setNewTitle] = useState('');
  
  // localStorage에서 북마크 로드
  const loadBookmarks = (): BookmarkItem[] => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      return [];
    }
  };

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(loadBookmarks);

  // bookmarks 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }, [bookmarks]);

  const handleSave = () => {
    // 검색어나 필터 중 하나라도 있으면 저장 가능
    const hasQuery = currentQuery && currentQuery.trim().length > 0;
    const hasFilters = currentFilters && (
      (currentFilters.selectedGenders && currentFilters.selectedGenders.length > 0) ||
      (currentFilters.selectedRegions && currentFilters.selectedRegions.length > 0) ||
      (currentFilters.selectedIncomes && currentFilters.selectedIncomes.length > 0) ||
      (currentFilters.ageRange && (currentFilters.ageRange[0] > 15 || currentFilters.ageRange[1] < 80)) ||
      currentFilters.quickpollOnly === true
    );

    if (!hasQuery && !hasFilters) {
      toast.error('저장할 검색어나 필터가 없습니다');
      return;
    }

    const bookmarkTitle = newTitle.trim() || currentQuery || '저장된 검색';
    
    // 중복 체크 (같은 제목과 쿼리가 있으면 제거)
    const existingIndex = bookmarks.findIndex(
      b => b.title === bookmarkTitle && b.query === (currentQuery || '')
    );
    
    const updatedBookmarks = existingIndex >= 0 
      ? bookmarks.filter((_, i) => i !== existingIndex)
      : [...bookmarks];

    const newBookmark: BookmarkItem = {
      id: Date.now().toString(),
      title: bookmarkTitle,
      query: currentQuery || '',
      date: new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace('.', ''),
      url: `/results?q=${encodeURIComponent(currentQuery || '')}`,
      filters: currentFilters || {},  // 필터 정보도 함께 저장
    };

    setBookmarks([newBookmark, ...updatedBookmarks]);
    setNewTitle('');
    toast.success('북마크가 저장되었습니다');
  };

  const handleOpen = (bookmark: BookmarkItem) => {
    onOpen?.(bookmark);
    onClose();
  };

  const handleCopyLink = (bookmark: BookmarkItem) => {
    navigator.clipboard.writeText(bookmark.url);
    toast.success('링크가 복사되었습니다');
  };

  const handleDelete = (id: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    toast.success('북마크가 삭제되었습니다');
  };

  return (
    <PIQuickMenuPopover
      isOpen={isOpen}
      onClose={onClose}
      title="북마크"
    >
      {/* Save current search */}
      <div 
        className="flex items-center gap-2 p-3 rounded-lg"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex-1">
          <PITextField
            placeholder="제목 (선택)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <PIButton
          variant="secondary"
          size="small"
          onClick={handleSave}
          disabled={
            !currentQuery && 
            !(currentFilters && (
              (currentFilters.selectedGenders && currentFilters.selectedGenders.length > 0) ||
              (currentFilters.selectedRegions && currentFilters.selectedRegions.length > 0) ||
              (currentFilters.selectedIncomes && currentFilters.selectedIncomes.length > 0) ||
              (currentFilters.ageRange && (currentFilters.ageRange[0] > 15 || currentFilters.ageRange[1] < 80)) ||
              currentFilters.quickpollOnly === true
            ))
          }
        >
          저장
        </PIButton>
      </div>

      {/* Bookmark List */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(124, 58, 237, 0.15)',
            }}
          >
            <Bookmark className="w-6 h-6" style={{ color: 'var(--brand-purple-300)' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
              북마크가 없습니다.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)', marginTop: '4px' }}>
              현재 검색을 저장하세요.
            </p>
          </div>
        </div>
      ) : (
        bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="flex items-start gap-3 p-3 rounded-lg transition-all"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-primary)',
              animationDuration: '180ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {bookmark.title || bookmark.query}
              </div>
              <div 
                className="mt-1 truncate"
                style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}
              >
                {bookmark.title && <>{bookmark.query} - </>}
                {bookmark.date}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleOpen(bookmark)}
                className="btn--ghost w-8 h-8 flex items-center justify-center rounded-lg transition-fast"
                style={{ color: 'var(--muted-foreground)' }}
                title="열기"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopyLink(bookmark)}
                className="btn--ghost w-8 h-8 flex items-center justify-center rounded-lg transition-fast"
                style={{ color: 'var(--muted-foreground)' }}
                title="링크 복사"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(bookmark.id)}
                className="btn--ghost w-8 h-8 flex items-center justify-center rounded-lg transition-fast"
                style={{ color: 'var(--error-500)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </PIQuickMenuPopover>
  );
}
