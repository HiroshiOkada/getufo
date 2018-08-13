const { nameLookup, toEdinetCode, getFiles } = require('./getufo_utils.js')

describe('nameLookup', () => {
  it('shoud return expected data when match string given', () => {
    const resultsFromName = nameLookup('自動車')
    expect(resultsFromName.length).toBeGreaterThan(1)
    resultsFromName.forEach(item => {
      expect(item.name).toEqual(expect.stringContaining('自動車'))
    })
    const resultsFromRuby = nameLookup('カブシキガイシャ')
    expect(resultsFromRuby.length).toBeGreaterThan(10)
    resultsFromRuby.forEach(item => {
      expect(item.ruby).toEqual(expect.stringContaining('カブシキガイシャ'))
    })
    const resultsFromEnglishName = nameLookup('INC.')
    expect(resultsFromEnglishName.length).toBeGreaterThan(10)
    resultsFromEnglishName.forEach(item => {
      expect(item.englishName).toEqual(
        expect.stringMatching(/[Ii][Nn][Cc]/)
      )
    })
  })
  it('shoud return same results not normailze data', () => {
    const resultsFromZenkaku = nameLookup('ｆ')
    const resultsFromHankaku = nameLookup('F')
    expect(resultsFromZenkaku).toEqual(resultsFromHankaku)
  })
})

describe('toEdinetCode', () => {
  it('return EDINET code if EDINET code given', () => {
    expect(toEdinetCode('E02144')).toBe('E02144')
    expect(toEdinetCode('e02144')).toBe('E02144')
  })
  it('return FUND code if FUND code given', () => {
    expect(toEdinetCode('G08338')).toBe('G08338')
    expect(toEdinetCode('g08338')).toBe('G08338')
  })
  it('return EDINET code if SEC code given', () => {
    expect(toEdinetCode('7203')).toBe('E02144')
    expect(toEdinetCode('72030')).toBe('E02144')
  })
  it('return null if code is illigal format', () => {
    expect(toEdinetCode('E0214')).toBeFalsy()
    expect(toEdinetCode('e021440')).toBeFalsy()
    expect(toEdinetCode('720')).toBeFalsy()
    expect(toEdinetCode('720304')).toBeFalsy()
    expect(toEdinetCode('G083389')).toBeFalsy()
    expect(toEdinetCode('g0833')).toBeFalsy()
  })
  it('return null if sec code does not exist', () => {
    expect(toEdinetCode('9999')).toBeFalsy()
    expect(toEdinetCode('99990')).toBeFalsy()
  })
})

describe('getFiles', () => {
  it('return array contain this file when search this folder', () => {
    expect(getFiles(__dirname, /.*.js$/)).toContain(__filename)
  })
})
