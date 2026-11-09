// Iconos SVG inline.
export const P={
  flame:'M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.5 1 2.3 2 2.5C10.5 8 11 5 12 2z',
  bolt:'M13 2 4 14h6l-1 8 9-12h-6z',
  star:'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z',
  bars:'M4 20v-8h4v8zm6 0V4h4v16zm6 0v-5h4v5z',
  heart:'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
};
export const SP='fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
export const ico=(k,cls='')=>`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}" fill="currentColor"/></svg>`;
export const icoX=`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" ${SP}/></svg>`;
export const icoOk=`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" ${SP}/></svg>`;
export const LOGO=`<svg viewBox="0 0 18 26" aria-hidden="true"><line class="w" x1="9" x2="9" y1="1" y2="25"/><rect class="b" x="2" y="7" width="14" height="12" rx="3"/></svg>`;
