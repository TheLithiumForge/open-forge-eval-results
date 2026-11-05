import type { Page } from '@playwright/test';

const SCALE_PX = [0, 4, 6, 8, 12, 16, 24, 32];

// Lists each computed margin, padding and gap that is off the scale and isn't auto or normal.
// Options belong to the native select, so their internals aren't covered.
export function offScale(page: Page): Promise<string[]> {
  return page.evaluate((scale) => {
    const properties = ['top', 'right', 'bottom', 'left'].flatMap((side) => [
      `margin-${side}`,
      `padding-${side}`,
    ]);
    const found = new Set<string>();
    for (const element of document.querySelectorAll('body, body *')) {
      if (element.closest('option, optgroup')) continue;
      const style = element.computedStyleMap();
      for (const property of [...properties, 'row-gap', 'column-gap']) {
        const value = style.get(property)?.toString() ?? '';
        if (value === 'auto' || value === 'normal' || scale.includes(parseFloat(value))) continue;
        found.add(
          `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''} ${property} ${value}`,
        );
      }
    }
    return [...found];
  }, SCALE_PX);
}
