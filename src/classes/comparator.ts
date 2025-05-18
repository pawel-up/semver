import parseOptions, { type Options } from '../internal/parse-options.js'
import { safeRe as re, t } from '../internal/re.js'
import cmp from '../functions/cmp.js'
import debug from '../internal/debug.js'
import SemVer from './semver.js'
import Range from './range.js'

const ANY = Symbol('SemVer ANY')

/**
 * Represents a SemVer comparator.
 *
 * A Comparator object represents a comparison between a version and a
 * specific value or range. It encapsulates an operator (e.g., "<", ">=", "=")
 * and a SemVer object.
 */
export default class Comparator {
  /**
   * Indicates whether loose parsing is enabled.
   * @default false
   */
  loose = false
  /**
   * The comparator string value (e.g., ">=1.2.3").
   */
  value = ''
  /**
   * The SemVer object being compared, or the ANY symbol if the comparator
   * allows any version (e.g., ">" or "<" without a specific version).
   */
  semver: typeof ANY | SemVer = ANY
  /**
   * The comparison operator (e.g., ">=", "<", "=").
   */
  operator = ''
  /**
   * The ANY symbol, representing a comparator that allows any version.
   */
  static get ANY() {
    return ANY
  }

  /**
   * Checks if the value is a SemVer instance or the ANY symbol.
   *
   * @param value The value to check.
   * @returns True if the value is a SemVer instance, false otherwise.
   */
  static isSemver(value: typeof ANY | SemVer): value is SemVer {
    return value !== ANY
  }

  /**
   * The options used to construct the Comparator object.
   */
  options: Options = {}

  /**
   * Constructs a new Comparator object.
   *
   * @param comp The comparator string (e.g., ">=1.2.3") or an existing Comparator object.
   * @param options Options for parsing and comparison, or a boolean value for loose parsing.
   * @throws {TypeError} If the comparator string is invalid.
   */
  constructor(comp: string | Comparator, options?: Options | boolean) {
    const opts = parseOptions(options)

    if (comp instanceof Comparator) {
      if (comp.loose === !!opts.loose) {
        return comp
      } else {
        comp = comp.value
      }
    }

    comp = comp.trim().split(/\s+/).join(' ')
    debug('comparator', comp, opts)
    this.options = opts
    this.loose = !!opts.loose
    this.parse(comp)

    if (this.semver === ANY) {
      this.value = ''
    } else {
      this.value = this.operator + this.semver.version
    }

    debug('comp', this)
  }

  /**
   * Parses a comparator string.
   *
   * This method is used internally by the constructor to parse the input
   * comparator string and extract the operator and SemVer object.
   *
   * @param comp The comparator string to parse.
   * @throws {TypeError} If the comparator string is invalid.
   */
  parse(comp: string): void {
    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR]
    const m = comp.match(r)

    if (!m) {
      throw new TypeError(`Invalid comparator: ${comp}`)
    }

    this.operator = m[1] !== undefined ? m[1] : ''
    if (this.operator === '=') {
      this.operator = ''
    }

    // if it literally is just '>' or '' then allow anything.
    if (!m[2]) {
      this.semver = ANY
    } else {
      this.semver = new SemVer(m[2], this.options.loose)
    }
  }

  /**
   * Returns the comparator string value.
   *
   * @returns The comparator string value.
   */
  toString(): string {
    return this.value
  }

  /**
   * Tests if a version satisfies the comparator.
   *
   * @param version The version to test (string, SemVer object, or the ANY symbol).
   * @returns True if the version satisfies the comparator, false otherwise.
   *
   * @example
   * ```
   * const comparator = new Comparator('>=1.2.3');
   * comparator.test('1.2.4'); // returns true
   * comparator.test('1.2.2'); // returns false
   * ```
   */
  test(version: string | symbol | SemVer): boolean {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY || version === ANY) {
      return true
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch {
        return false
      }
    }

    return cmp(version as SemVer, this.operator, this.semver, this.options)
  }

  /**
   * Checks if this comparator intersects with another comparator.
   * Two comparators intersect if there is a version that satisfies both.
   *
   * @param comp The comparator to check for intersection.
   * @param options Options for comparison, or a boolean value for loose parsing.
   * @returns True if the comparators intersect, false otherwise.
   * @throws {TypeError} If `comp` is not a Comparator instance.
   *
   * @example
   * ```
   * const comparator1 = new Comparator('>=1.2.0 <2.0.0');
   * const comparator2 = new Comparator('>=1.5.0 <1.8.0');
   * comparator1.intersects(comparator2); // returns true
   *
   * const comparator3 = new Comparator('>=1.2.0 <1.5.0');
   * const comparator4 = new Comparator('>=1.8.0 <2.0.0');
   * comparator3.intersects(comparator4); // returns false
   * ```
   */
  intersects(comp: Comparator, options?: Options | boolean): boolean {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (this.operator === '') {
      if (this.value === '') {
        return true
      }
      return new Range(comp.value, options).test(this.value)
    } else if (comp.operator === '') {
      if (comp.value === '') {
        return true
      }
      return new Range(this.value, options).test(comp.semver as SemVer)
    }

    options = parseOptions(options)

    // Special cases where nothing can possibly be lower
    if (options.includePrerelease && (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
      return false
    }
    if (!options.includePrerelease && (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
      return false
    }

    // Same direction increasing (> or >=)
    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
      return true
    }
    // Same direction decreasing (< or <=)
    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
      return true
    }
    // same SemVer and both sides are inclusive (<= or >=)
    if (
      (this.semver as SemVer).version === (comp.semver as SemVer).version &&
      this.operator.includes('=') &&
      comp.operator.includes('=')
    ) {
      return true
    }
    // opposite directions less than
    if (
      cmp(this.semver as SemVer, '<', comp.semver as SemVer, options) &&
      this.operator.startsWith('>') &&
      comp.operator.startsWith('<')
    ) {
      return true
    }
    // opposite directions greater than
    if (
      cmp(this.semver as SemVer, '>', comp.semver as SemVer, options) &&
      this.operator.startsWith('<') &&
      comp.operator.startsWith('>')
    ) {
      return true
    }
    return false
  }
}
