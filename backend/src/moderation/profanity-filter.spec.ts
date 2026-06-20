import { containsProfanity } from './profanity-filter';

describe('containsProfanity', () => {
  it('flags an explicit slur embedded in an otherwise normal sentence', () => {
    expect(containsProfanity('You are such a fucking idiot.')).toBe(true);
  });

  it('flags a self-harm phrase regardless of spacing', () => {
    expect(containsProfanity('Just kill yourself already.')).toBe(true);
  });

  it('does not flag clean, ordinary text', () => {
    expect(
      containsProfanity('Excited for the robotics meeting tomorrow!'),
    ).toBe(false);
  });

  it('does not flag substrings inside unrelated words', () => {
    expect(containsProfanity('The class is studying classic literature.')).toBe(
      false,
    );
  });
});
