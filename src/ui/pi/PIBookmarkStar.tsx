import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface PIBookmarkStarProps {
  panelId: string;
  isBookmarked: boolean;
  onToggle: (panelId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 14,
  md: 18,
  lg: 22,
};

export function PIBookmarkStar({ 
  panelId, 
  isBookmarked, 
  onToggle, 
  size = 'md',
  className = '' 
}: PIBookmarkStarProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(panelId);
      }}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={isBookmarked ? '북마크 해제' : '북마크'}
    >
      <motion.div
        animate={{
          rotate: isBookmarked ? [0, -10, 10, -10, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        <Star
          size={sizes[size]}
          fill={isBookmarked ? '#F59E0B' : 'none'}
          stroke={isBookmarked ? '#F59E0B' : '#94A3B8'}
          strokeWidth={2}
        />
      </motion.div>
    </motion.button>
  );
}

