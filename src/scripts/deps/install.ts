/* eslint-disable @typescript-eslint/ban-ts-ignore */

// @ts-ignore
import downloadNpmPackage from 'download-npm-package'
import fs from 'fs'
import { DependencyMap, PackageInstallStatus } from './types'
import { BaseLogger } from 'pino'

interface Config {
  nodeModules: string;
  packageJSON: string;
}

export function Dependencies (packageJsonPath: string): DependencyMap|undefined {
  if (!fs.existsSync(packageJsonPath)) {
    return undefined
  }

  const packageJson = fs.readFileSync(packageJsonPath)
  const pkg = JSON.parse(packageJson.toString())
  return Object.assign(
    {},
    pkg.dependencies,
    pkg.devDependencies,
  )
}

/**
 * Downloads NPM package
 *
 * @param {string } arg Name of the package to be downloaded
 * @param {string} dir path to node_modules
 * @constructor
 */
export async function Download (arg: string, dir: string): Promise<unknown> {
  return downloadNpmPackage({ arg, dir })
}

/**
 * Orchestrates download and install of NPM packages from package.json
 *
 * @todo should be able verify (from first/previous run) what was installed and if there are changes.
 * @todo do not blindly install packages -- should verify corredor's packages so that we do not
 *       cause any unwanted downgrades/upgrades of packages
 */
export async function Install (logger: BaseLogger, c: Config): Promise<PackageInstallStatus[]> {
  const pp: Promise<PackageInstallStatus>[] = []
  const deps = Dependencies(c.packageJSON)

  if (deps === undefined) {
    throw Error('No dependencies found')
  }

  for (const name in deps) {
    if (!Object.prototype.hasOwnProperty.call(deps, name)) {
      continue
    }

    pp.push(Download(`${name}@${deps[name]}`, c.nodeModules).then((): PackageInstallStatus => {
      logger.debug('package installed', { name, version: deps[name] })
      return { name, version: deps[name], installed: true }
    }))
  }

  return Promise.all(pp)
}
