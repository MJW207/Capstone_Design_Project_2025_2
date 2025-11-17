import React from 'react';
import { motion } from 'motion/react';

interface IncomeChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const incomeRanges = ['~200', '200~300', '300~400', '400~600', '600~'];

export function IncomeChips({ value, onChange }: IncomeChipsProps) {
  const toggleIncome = (income: string) => {
    if (value.includes(income)) {
      onChange(value.filter((i) => i !== income));
    } else {
      onChange([...value, income]);
    }
  };

  return (
    <div className="pi-income">
      {incomeRanges.map((income) => {
        const isSelected = value.includes(income);
        return (
          <motion.button
            key={income}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleIncome(income)}
            className={`pi-chip ${isSelected ? 'is-selected' : ''}`}
          >
            <span className="startbar" />
            {income}만원
          </motion.button>
        );
      })}
    </div>
  );
}

