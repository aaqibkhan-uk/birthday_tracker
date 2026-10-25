import { INSIDE_MESSAGE_MAX_LENGTH } from '../config';
import { getInsideMessageFontSize, INSIDE_LINE_HEIGHT } from './insideMessage';

const WIDTH = 180;

describe('getInsideMessageFontSize', () => {
  it('uses the largest size for a short message', () => {
    expect(getInsideMessageFontSize('Happy birthday!', WIDTH)).toBe(15);
  });

  it('gets smaller as the message gets longer', () => {
    const sizes = [20, 100, 250, INSIDE_MESSAGE_MAX_LENGTH].map((length) =>
      getInsideMessageFontSize('word '.repeat(length / 5), WIDTH),
    );
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]!);
    expect(sizes.at(-1)).toBeLessThan(sizes[0]! / 1.5);
  });

  it('counts line breaks as extra lines', () => {
    const flat = getInsideMessageFontSize('a b c d e f g h', WIDTH);
    const stacked = getInsideMessageFontSize('a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl\nm\nn', WIDTH);
    expect(stacked).toBeLessThan(flat);
  });

  it('fits the longest allowed message inside the page', () => {
    const size = getInsideMessageFontSize('m'.repeat(INSIDE_MESSAGE_MAX_LENGTH), WIDTH);
    const innerWidth = WIDTH * 0.8;
    const innerHeight = WIDTH * 1.4 - WIDTH * 0.2;
    // Even at a wide average glyph (0.6 em) the text fits the inner height.
    const lines = Math.ceil(INSIDE_MESSAGE_MAX_LENGTH / Math.floor(innerWidth / (size * 0.6)));
    expect(lines * size * INSIDE_LINE_HEIGHT).toBeLessThanOrEqual(innerHeight);
  });

  it('scales with the page width', () => {
    expect(getInsideMessageFontSize('Hello', WIDTH * 2)).toBeGreaterThan(
      getInsideMessageFontSize('Hello', WIDTH),
    );
  });
});
