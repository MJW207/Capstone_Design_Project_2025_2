import React from 'react';
import { motion } from 'motion/react';

interface GenderChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function GenderChips({ value, onChange }: GenderChipsProps) {
  const toggleGender = (gender: string) => {
    if (value.includes(gender)) {
      onChange(value.filter((g) => g !== gender));
    } else {
      onChange([...value, gender]);
    }
  };

  return (
    <div className="pi-gender">
      {['여성', '남성'].map((gender) => {
        const isSelected = value.includes(gender);
        return (
          <motion.button
            key={gender}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleGender(gender)}
            className={`pi-chip ${isSelected ? 'is-selected' : ''}`}
          >
            {gender}
          </motion.button>
        );
      })}
    </div>
  );
}

