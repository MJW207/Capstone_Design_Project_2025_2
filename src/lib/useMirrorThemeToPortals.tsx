/**
 * 🌓 Portal Theme Mirror Hook
 * 
 * React Portal로 렌더링된 요소들이 테마를 올바르게 상속받도록 보장
 * 사용자가 제공한 프롬프트에 따라 개선된 버전
 */

import { useEffect } from 'react';
import { useDarkMode } from './DarkModeSystem';

export function useMirrorThemeToPortals() {
  const { isDark } = useDarkMode();
  const actual: 'light' | 'dark' = isDark ? 'dark' : 'light';

  useEffect(() => {
    const apply = (el: Element) => {
      if (el instanceof HTMLElement) {
        el.classList.remove('light', 'dark');
        el.classList.add(actual);
        el.setAttribute('data-theme', actual);
      }
    };

    const selectors = [
      '#modal-root',
      '#drawer-root',
      '[data-portal]',
      '[data-slot="dialog-portal"]',
      '[data-slot="drawer-portal"]',
      '[data-slot="dialog-content"]',
      '[data-slot="drawer-content"]',
      '.ant-portal',
      '.chakra-portal',
      '.MuiModal-root',
    ];

    const sync = () => {
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          apply(el);
          // 자식 요소들도 업데이트
          const children = el.querySelectorAll('*');
          children.forEach((child) => {
            if (child instanceof HTMLElement) {
              apply(child);
            }
          });
        });
      });
    };

    // 초기 동기화
    sync();

    // MutationObserver로 DOM 변경 감지
    const obs = new MutationObserver(() => {
      sync();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      obs.disconnect();
    };
  }, [actual]);
}

