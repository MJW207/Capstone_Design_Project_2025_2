import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

interface RegionGroupsProps {
  value: string[];
  onChange: (value: string[]) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isDark?: boolean;
}

const regionGroups = {
  수도권: ['서울', '경기', '인천', '세종'],
  광역시: ['부산', '대구', '광주', '대전', '울산'],
  도: ['강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
  기타: ['기타'],
};

export function RegionGroups({
  value,
  onChange,
  searchQuery = '',
  onSearchChange,
  isDark = false,
}: RegionGroupsProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleQueryChange = (query: string) => {
    setLocalQuery(query);
    onSearchChange?.(query);
  };

  const toggleRegion = (region: string) => {
    if (value.includes(region)) {
      onChange(value.filter((r) => r !== region));
    } else {
      onChange([...value, region]);
    }
  };

  const isRegionVisible = (region: string) => {
    if (!localQuery) return true;
    return region.toLowerCase().includes(localQuery.toLowerCase());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {onSearchChange && (
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            color: isDark ? '#9CA3AF' : '#64748B',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="지역 검색..."
            style={{
              width: '100%',
              padding: '10px 32px 10px 36px',
              borderRadius: '8px',
              border: isDark 
                ? '2px solid rgba(255, 255, 255, 0.1)' 
                : '2px solid rgba(255, 255, 255, 0.4)',
              background: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              color: isDark ? '#F9FAFB' : '#111827',
              outline: 'none',
              transition: 'border 120ms',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
            onBlur={(e) => e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)'}
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#9CA3AF' : '#64748B',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(regionGroups).map(([groupName, regions]) => (
          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h5 style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#9CA3AF' : '#64748B',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {groupName}
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {regions.map((region) => {
                const isSelected = value.includes(region);
                const isVisible = isRegionVisible(region);
                return (
                  <motion.button
                    key={region}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleRegion(region)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'rgba(37, 99, 235, 0.2)' 
                        : isDark 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(255, 255, 255, 0.5)',
                      border: isSelected 
                        ? '1px solid rgba(37, 99, 235, 0.4)' 
                        : isDark 
                          ? '1px solid rgba(255, 255, 255, 0.1)' 
                          : '1px solid rgba(255, 255, 255, 0.4)',
                      color: isSelected 
                        ? '#2563EB' 
                        : isDark ? '#9CA3AF' : '#475569',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 500,
                      opacity: isVisible ? 1 : 0.3,
                      transition: 'all 120ms',
                    }}
                  >
                    {region}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
