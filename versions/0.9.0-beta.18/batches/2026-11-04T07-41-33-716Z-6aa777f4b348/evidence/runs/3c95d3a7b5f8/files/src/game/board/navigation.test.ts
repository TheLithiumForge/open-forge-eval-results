import { describe, expect, it } from 'vitest';
import { nextCard } from './navigation.ts';

describe('card focus navigation', () => {
  it('moves by one column or one whole row', () => {
    expect(nextCard(5, 4, 'ArrowLeft')).toBe(4);
    expect(nextCard(5, 4, 'ArrowRight')).toBe(6);
    expect(nextCard(5, 4, 'ArrowUp')).toBe(1);
    expect(nextCard(5, 4, 'ArrowDown')).toBe(9);
  });

  it('stops at edges without wrapping into another row', () => {
    expect(nextCard(4, 4, 'ArrowLeft')).toBe(4);
    expect(nextCard(7, 4, 'ArrowRight')).toBe(7);
    expect(nextCard(1, 4, 'ArrowUp')).toBe(1);
    expect(nextCard(14, 4, 'ArrowDown')).toBe(14);
    expect(nextCard(255, 16, 'ArrowRight')).toBe(255);
    expect(nextCard(255, 16, 'ArrowDown')).toBe(255);
  });

  it.each(['Tab', 'Home', 'End', 'PageDown', 'Enter', ' '])('leaves %j to native control handling', (key) => {
    expect(nextCard(5, 4, key)).toBeNull();
  });
});
