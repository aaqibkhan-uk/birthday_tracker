// Placeholder so the Jest setup can be verified. Remove once real domain tests exist (Milestone 1).
describe('test setup', () => {
  it('runs TypeScript tests with jest-expo', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
