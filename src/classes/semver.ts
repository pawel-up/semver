import debug from '../internal/debug.js'
import { MAX_LENGTH, MAX_SAFE_INTEGER } from '../internal/constants.js'
import { safeRe as re, t } from '../internal/re.js'
import parseOptions, { type Options } from '../internal/parse-options.js'
import { compareIdentifiers } from '../internal/identifiers.js'

export type ReleaseType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'prerelease'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'release'
  | 'pre'

/**
 * Represents a semantic version (SemVer) object.
 *
 * A SemVer object encapsulates a version string conforming to the Semantic
 * Versioning specification (SemVer). It provides methods for comparing,
 * incrementing, and manipulating versions.
 */
export default class SemVer {
  /**
   * Indicates whether loose parsing is enabled.
   * @default false
   */
  loose = false
  /**
   * Indicates whether to include prerelease versions in comparisons.
   * @default false
   */
  includePrerelease = false
  /**
   * The formatted version string.
   */
  version!: string
  /**
   * The options used to construct the SemVer object.
   */
  options!: Options
  /**
   * The raw version string provided during construction.
   */
  raw!: string
  /**
   * The major version number.
   */
  major = 0
  /**
   * The minor version number.
   */
  minor = 0
  /**
   * The patch version number.
   */
  patch = 0
  /**
   * An array of prerelease identifiers (strings or numbers).
   */
  prerelease: (string | number)[] = []
  /**
   * An array of build metadata identifiers (strings).
   */
  build: string[] = []

  /**
   * Constructs a new SemVer object.
   *
   * @param version The version string or an existing SemVer object.
   * @param options Options for parsing and comparison, or a boolean value for loose parsing.
   * @throws {TypeError} If the version is invalid or not a string.
   * @throws {TypeError} If any of the major, minor, or patch versions are invalid.
   */
  constructor(version: string | SemVer, options?: Options | boolean) {
    options = parseOptions(options)

    if (version instanceof SemVer) {
      if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
        return version
      } else {
        version = version.version
      }
    } else if (typeof version !== 'string') {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`)
    }

    if (version.length > MAX_LENGTH) {
      throw new TypeError(`version is longer than ${MAX_LENGTH} characters`)
    }

    debug('SemVer', version, options)
    this.options = options
    this.loose = !!options.loose
    // this isn't actually relevant for versions, but keep it so that we
    // don't run into trouble passing this.options around.
    this.includePrerelease = !!options.includePrerelease

    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL])

    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`)
    }

    this.raw = version

    // these are actually numbers
    this.major = +m[1]
    this.minor = +m[2]
    this.patch = +m[3]

    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError('Invalid major version')
    }

    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError('Invalid minor version')
    }

    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError('Invalid patch version')
    }

    // numberify any prerelease numeric ids
    if (!m[4]) {
      this.prerelease = []
    } else {
      this.prerelease = m[4].split('.').map((id) => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num
          }
        }
        return id
      })
    }

    this.build = m[5] ? m[5].split('.') : []
    this.format()
  }

  /**
   * Formats the SemVer object into a version string.
   *
   * This method updates the `version` property with the formatted string
   * and returns it.
   *
   * @returns The formatted version string.
   */
  format() {
    this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join('.')}`
    }
    return this.version
  }

  /**
   * Returns the formatted version string.
   *
   * This method is an alias for `format()`.
   *
   * @returns The formatted version string.
   */
  toString() {
    return this.version
  }

  /**
   * Compares this SemVer object to another version.
   *
   * @param other The version to compare against (string or SemVer object).
   * @returns 0 if the versions are equal, a positive number if this version is greater,
   *          and a negative number if this version is less.
   */
  compare(other: string | SemVer): number {
    debug('SemVer.compare', this.version, this.options, other)
    if (!(other instanceof SemVer)) {
      if (typeof other === 'string' && other === this.version) {
        return 0
      }
      other = new SemVer(other, this.options)
    }

    if (other.version === this.version) {
      return 0
    }

    return this.compareMain(other) || this.comparePre(other)
  }

  /**
   * Compares the main parts (major, minor, patch) of two versions.
   *
   * @param other The version to compare against (string or SemVer object).
   * @returns 0 if the main parts are equal, a positive number if this version is greater,
   *          and a negative number if this version is less.
   */
  compareMain(other: string | SemVer): number {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    return (
      compareIdentifiers(this.major, other.major) ||
      compareIdentifiers(this.minor, other.minor) ||
      compareIdentifiers(this.patch, other.patch)
    )
  }

  /**
   * Compares the prerelease identifiers of two versions.
   *
   * @param other The version to compare against (string or SemVer object).
   * @returns 0 if the prerelease identifiers are equal, a positive number if this version is greater,
   *          and a negative number if this version is less.
   */
  comparePre(other: string | SemVer): number {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    // NOT having a prerelease is > having one
    if (this.prerelease.length && !other.prerelease.length) {
      return -1
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0
    }

    let i = 0
    do {
      const a = this.prerelease[i]
      const b = other.prerelease[i]
      debug('prerelease compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
    // This won't be reached but TS compiler complains about missing return
    return 0
  }

  /**
   * Compares the build metadata identifiers of two versions.
   *
   * @param other The version to compare against (string or SemVer object).
   * @returns 0 if the build metadata identifiers are equal, a positive number if this version is greater,
   *          and a negative number if this version is less.
   */
  compareBuild(other: string | SemVer): number {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    let i = 0
    do {
      const a = this.build[i]
      const b = other.build[i]
      debug('build compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
    // This won't be reached but TS compiler complains about missing return
    return 0
  }

  /**
   * Increments the version by the specified release type.
   *
   * @param release The release type to increment (e.g., "major", "minor", "patch", "prerelease").
   * @param identifier An optional identifier for prerelease versions.
   * @param identifierBase A boolean indicating whether the identifier should be treated as a base
   *                       identifier for prerelease increments.
   * @returns The incremented SemVer object.
   * @throws {Error} If the release type is invalid or if an identifier is required but not provided.
   */
  inc(release: ReleaseType, identifier: string, identifierBase?: boolean): SemVer {
    if (release.startsWith('pre')) {
      if (!identifier && identifierBase === false) {
        throw new Error('invalid increment argument: identifier is empty')
      }
      // Avoid an invalid semver results
      if (identifier) {
        const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE])
        if (!match || match[1] !== identifier) {
          throw new Error(`invalid identifier: ${identifier}`)
        }
      }
    }

    switch (release) {
      case 'premajor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor = 0
        this.major++
        this.inc('pre', identifier, identifierBase)
        break
      case 'preminor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor++
        this.inc('pre', identifier, identifierBase)
        break
      case 'prepatch':
        // If this is already a prerelease, it will bump to the next version
        // drop any prereleases that might already exist, since they are not
        // relevant at this point.
        this.prerelease.length = 0
        this.inc('patch', identifier, identifierBase)
        this.inc('pre', identifier, identifierBase)
        break
      // If the input is a non-prerelease version, this acts the same as
      // prepatch.
      case 'prerelease':
        if (this.prerelease.length === 0) {
          this.inc('patch', identifier, identifierBase)
        }
        this.inc('pre', identifier, identifierBase)
        break
      case 'release':
        if (this.prerelease.length === 0) {
          throw new Error(`version ${this.raw} is not a prerelease`)
        }
        this.prerelease.length = 0
        break

      case 'major':
        // If this is a pre-major version, bump up to the same major version.
        // Otherwise increment major.
        // 1.0.0-5 bumps to 1.0.0
        // 1.1.0 bumps to 2.0.0
        if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
          this.major++
        }
        this.minor = 0
        this.patch = 0
        this.prerelease = []
        break
      case 'minor':
        // If this is a pre-minor version, bump up to the same minor version.
        // Otherwise increment minor.
        // 1.2.0-5 bumps to 1.2.0
        // 1.2.1 bumps to 1.3.0
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++
        }
        this.patch = 0
        this.prerelease = []
        break
      case 'patch':
        // If this is not a pre-release version, it will increment the patch.
        // If it is a pre-release it will bump up to the same patch version.
        // 1.2.0-5 patches to 1.2.0
        // 1.2.0 patches to 1.2.1
        if (this.prerelease.length === 0) {
          this.patch++
        }
        this.prerelease = []
        break
      // This probably shouldn't be used publicly.
      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
      case 'pre': {
        const base = Number(identifierBase) ? 1 : 0

        if (this.prerelease.length === 0) {
          this.prerelease = [base]
        } else {
          let i = this.prerelease.length
          while (--i >= 0) {
            if (typeof this.prerelease[i] === 'number') {
              ;(this.prerelease[i] as number)++
              i = -2
            }
          }
          if (i === -1) {
            // didn't increment anything
            if (identifier === this.prerelease.join('.') && identifierBase === false) {
              throw new Error('invalid increment argument: identifier already exists')
            }
            this.prerelease.push(base)
          }
        }
        if (identifier) {
          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
          let prerelease = [identifier, base]
          if (identifierBase === false) {
            prerelease = [identifier]
          }
          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
            if (isNaN(this.prerelease[1] as number)) {
              this.prerelease = prerelease
            }
          } else {
            this.prerelease = prerelease
          }
        }
        break
      }
      default:
        throw new Error(`invalid increment argument: ${release}`)
    }
    this.raw = this.format()
    if (this.build.length) {
      this.raw += `+${this.build.join('.')}`
    }
    return this
  }
}
