import { useState } from 'react';
import { PIQuickMenuPopover } from './PIQuickMenuPopover';
import { PITextField } from './PITextField';
import { PIButton } from './PIButton';
import { Bookmark, ExternalLink, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BookmarkItem {
  id: string;
  title: string;
  query: string;
  date: string;
  url: string;
}

interface PIBookmarkMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery?: string;
  onOpen?: (bookmark: BookmarkItem) => void;
}

export function PIBookmarkMenu({ isOpen, onClose, currentQuery, onOpen }: PIBookmarkMenuProps) {
  const [newTitle, setNewTitle] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([
    {
      id: '1',
      title: '20-30대 여성 패널',
      query: '여성, 20-30대, 서울 거주',
      date: '2025.10.12',
      url: '/results?q=...',
    },
    {
      id: '2',
      title: '',
      query: 'Quickpoll 보유 패널',
      date: '2025.10.10',
      url: '/results?q=...',
    },
  ]);

  const handleSave = () => {
    if (!currentQuery) return;

    const newBookmark: BookmarkItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      query: currentQuery,
      date: new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace('.', ''),
      url: `/results?q=${encodeURIComponent(currentQuery)}`,
    };

    setBookmarks([newBookmark, ...bookmarks]);
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
    setBookmarks(bookmarks.filter(b => b.id !== id));
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
          background: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(17, 24, 39, 0.08)',
        }}
      >
        <div className="flex-1">
          <PITextField
            placeholder="제목 (선택)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            size="small"
          />
        </div>
        <PIButton
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={!currentQuery}
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
              background: 'rgba(124, 58, 237, 0.08)',
            }}
          >
            <Bookmark className="w-6 h-6" style={{ color: '#7C3AED' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}>
              북마크가 없습니다.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginTop: '4px' }}>
              현재 검색을 저장하세요.
            </p>
          </div>
        </div>
      ) : (
        bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-all"
            style={{
              border: '1px solid rgba(17, 24, 39, 0.06)',
              animationDuration: '180ms',
            }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                {bookmark.title || bookmark.query}
              </div>
              <div 
                className="mt-1 truncate"
                style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}
              >
                {bookmark.title && <>{bookmark.query} - </>}
                {bookmark.date}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleOpen(bookmark)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/80 transition-colors"
                style={{ color: '#64748B' }}
                title="열기"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopyLink(bookmark)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/80 transition-colors"
                style={{ color: '#64748B' }}
                title="링크 복사"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(bookmark.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: '#64748B' }}
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
