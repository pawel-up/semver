// [range, version, options]
// Version should be less than range
export default [
  ['~1.2.2', '1.2.1'],
  ['~0.6.1-1', '0.6.1-0'],
  ['1.0.0 - 2.0.0', '0.0.1'],
  ['1.0.0-beta.2', '1.0.0-beta.1'],
  ['1.0.0', '0.0.0'],
  ['>=2.0.0', '1.1.1'],
  ['>=2.0.0', '1.2.9'],
  ['>2.0.0', '2.0.0'],
  ['0.1.20 || 1.2.4', '0.1.5'],
  ['2.x.x', '1.0.0'],
  ['1.2.x', '1.1.0'],
  ['1.2.x || 2.x', '1.0.0'],
  ['2.*.*', '1.0.1'],
  ['1.2.*', '1.1.3'],
  ['1.2.* || 2.*', '1.1.9999'],
  ['2', '1.0.0'],
  ['2.3', '2.2.2'],
  ['~2.4', '2.3.0'], // >=2.4.0 <2.5.0
  ['~2.4', '2.3.5'],
  ['~>3.2.1', '3.2.0'], // >=3.2.1 <3.3.0
  ['~1', '0.2.3'], // >=1.0.0 <2.0.0
  ['~>1', '0.2.4'],
  ['~> 1', '0.2.3'],
  ['~1.0', '0.1.2'], // >=1.0.0 <1.1.0
  ['~ 1.0', '0.1.0'],
  ['>1.2', '1.2.0'],
  ['> 1.2', '1.2.1'],
  ['1', '0.0.0beta', true],
  ['~v0.5.4-pre', '0.5.4-alpha'],
  ['=0.7.x', '0.6.0'],
  ['=0.7.x', '0.6.0-asdf'],
  ['>=0.7.x', '0.6.0'],
  ['1.0.0 - 2.0.0', '0.2.3'],
  ['1.0.0', '0.0.1'],
  ['>=2.0.0', '1.0.0'],
  ['>=2.0.0', '1.9999.9999'],
  ['>2.0.0', '1.2.9'],
  ['2.x.x', '1.1.3'],
  ['1.2.x', '1.1.3'],
  ['1.2.x || 2.x', '1.1.3'],
  ['2.*.*', '1.1.3'],
  ['1.2.* || 2.*', '1.1.3'],
  ['2', '1.9999.9999'],
  ['2.3', '2.2.1'],
  ['~>3.2.1', '2.3.2'], // >=3.2.1 <3.3.0
  ['~>1', '0.2.3'],
  ['~1.0', '0.0.0'], // >=1.0.0 <1.1.0
  ['>1', '1.0.0'],
  ['2', '1.0.0beta', true],
  ['>1', '1.0.0beta', true],
  ['> 1', '1.0.0beta', true],
  ['=0.7.x', '0.6.2'],
  ['=0.7.x', '0.7.0-asdf'],
  ['^1', '1.0.0-0'],
  ['>=0.7.x', '0.7.0-asdf'],
  ['1', '1.0.0beta', true],
  ['>=0.7.x', '0.6.2'],
  ['>1.2.3', '1.3.0-alpha'],
] as [string, string, boolean?][]
