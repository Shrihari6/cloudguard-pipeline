import React from 'react';
import { SecurityCheck } from '@/types';

interface SecurityStripProps {
  checks: SecurityCheck[];
}

export const SecurityStrip: React.FC<SecurityStripProps> = ({ checks }) => {
  const getCheckStatus = (category: 'IAM' | 'Encryption' | 'Threat Detection') => {
    const item = checks.find((c) => c.category === category);
    return item ? item.checked : false;
  };

  const iamChecked = getCheckStatus('IAM');
  const encChecked = getCheckStatus('Encryption');
  const detectChecked = getCheckStatus('Threat Detection');

  return (
    <div className="flex items-center gap-1.5 pt-1.5 border-t border-black/10 dark:border-white/10 mt-1.5">
      <span
        title={`IAM: ${iamChecked ? 'Configured' : 'Unchecked'}`}
        className="w-2 h-2 rounded-full transition-opacity duration-150"
        style={{
          backgroundColor: 'var(--color-check-iam, #DD344C)',
          opacity: iamChecked ? 1 : 0.25,
        }}
      />
      <span
        title={`Encryption: ${encChecked ? 'Configured' : 'Unchecked'}`}
        className="w-2 h-2 rounded-full transition-opacity duration-150"
        style={{
          backgroundColor: 'var(--color-check-enc, #8C4FFF)',
          opacity: encChecked ? 1 : 0.25,
        }}
      />
      <span
        title={`Threat Detection: ${detectChecked ? 'Configured' : 'Unchecked'}`}
        className="w-2 h-2 rounded-full transition-opacity duration-150"
        style={{
          backgroundColor: 'var(--color-check-detect, #FF9900)',
          opacity: detectChecked ? 1 : 0.25,
        }}
      />
    </div>
  );
};
