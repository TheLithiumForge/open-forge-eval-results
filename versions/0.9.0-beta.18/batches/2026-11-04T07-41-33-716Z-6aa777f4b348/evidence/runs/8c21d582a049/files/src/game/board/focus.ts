export function revealFocus(card: HTMLButtonElement, area: HTMLDivElement): void {
  card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const target = card.getBoundingClientRect();
  const viewport = area.getBoundingClientRect();
  const left = viewport.left + area.clientLeft + 6;
  const top = viewport.top + area.clientTop + 6;
  const right = viewport.left + area.clientLeft + area.clientWidth - 6;
  const bottom = viewport.top + area.clientTop + area.clientHeight - 6;
  area.scrollLeft += target.left < left ? target.left - left : Math.max(0, target.right - right);
  area.scrollTop += target.top < top ? target.top - top : Math.max(0, target.bottom - bottom);
}
