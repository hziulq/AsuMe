import { parseCSV } from './csvParser';

describe('CSV Parser', () => {
  it('parses valid CSV string correctly', async () => {
    const csvContent = `paragraphs,words,japanese,phonetic
The level of _.,ambiguity,曖昧さ,æmbɪˈgjuːəti
,twofold,二面的な,`;

    const result = await parseCSV(csvContent);
    expect(result).toHaveLength(2);

    // 1行目の検証
    expect(result[0].word).toBe('ambiguity');
    expect(result[0].japanese).toBe('曖昧さ');
    expect(result[0].paragraph).toBe('The level of _.');
    expect(result[0].phonetic).toBe('æmbɪˈgjuːəti');
    expect(result[0].id).toBeDefined();

    // 2行目の検証（空欄がある場合）
    expect(result[1].word).toBe('twofold');
    expect(result[1].japanese).toBe('二面的な');
    expect(result[1].paragraph).toBe(''); // paragraphsが空の場合は空文字になることを期待
    expect(result[1].phonetic).toBe(''); // phoneticが空の場合も空文字
  });

  it('rejects on invalid CSV format (e.g. empty content)', async () => {
    const csvContent = ``;
    const result = await parseCSV(csvContent);
    expect(result).toHaveLength(0); // skipEmptyLines: true の場合は0件を返す
  });
});
