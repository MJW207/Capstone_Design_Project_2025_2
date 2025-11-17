import { Clock, RefreshCw, X } from 'lucide-react';
import { PIButton } from './PIButton';

export type UserRole = 'viewer' | 'admin';

interface PIOutdatedBannerProps {
  userRole?: UserRole;
  onRefresh?: () => void;
  onRequestRetrain?: () => void;
  onDismiss?: () => void;
}

export function PIOutdatedBanner({
  userRole = 'viewer',
  onRefresh,
  onRequestRetrain,
  onDismiss,
}: PIOutdatedBannerProps) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl animate-in fade-in slide-in-from-top-2"
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        animationDuration: '180ms',
      }}
    >
      <div className="flex items-start gap-3 flex-1">
        <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#D97706', marginBottom: '4px' }}>
            새 응답이 많아 모델이 오래되었습니다.
          </p>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#D97706' }}>
            운영자가 재학습을 진행하면 자동 반영됩니다.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {userRole === 'viewer' ? (
          <PIButton variant="ghost" size="small" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            새로고침
          </PIButton>
        ) : (
          <PIButton variant="secondary" size="small" onClick={onRequestRetrain}>
            재학습 요청
          </PIButton>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#D97706' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
