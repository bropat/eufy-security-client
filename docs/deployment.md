# Deployment instructions

## Dependency tree

There are two integrations that depend on eufy-security-ckient, one for Home Assistant and another one for Homey.

The dependency tree between all the involved repos looks like this:

- Base library (this repo): [bropat/eufy-security-client](https://github.com/bropat/eufy-security-client)
  - WebSocket server wrapper: [bropat/eufy-security-ws](https://github.com/bropat/eufy-security-ws)
    - Homey integration: [martinjpoppen/com.eufylife.security](https://github.com/martijnpoppen/com.eufylife.security)
    - Home Assistant Add-on: [bropat/hassio-eufy-security-ws](https://github.com/bropat/hassio-eufy-security-ws)
      - Home Assistant integration [fuatakgun/eufy_security](https://github.com/fuatakgun/eufy_security)

The instructions below apply only to the bropat repos.

## eufy-security-client

How to deploy a new version of eufy-security-client:

1. Update all the npm dependencies.
2. Run `sh scrtips/cut_release <version>` to update the version and create a PR
2. Review and merge into the [develop](https://github.com/bropat/eufy-security-client/tree/develop) branch the PRs that should be included in the next release.
3. Merge everything from `develop` into [master](https://github.com/bropat/eufy-security-client/tree/master).
4. Publish a new [release and tag](https://github.com/bropat/eufy-security-client/releases/new) out of the latest changes merged into `master`.
5. Generate the changelog entries by running `sh scripts/generate_changelog.sh <last_release_pr_number>`, where `<last_release_pr_number>` is the PR number of the previous release. This will output formatted entries grouped by Feature, Fix, and Chore. Paste the output into the [Changelog](https://github.com/bropat/eufy-security-client?tab=readme-ov-file#changelog) section of the README.md under the new version heading.
6. Submit a PR with those changes and merge them.
7. Using that new release from `master`, publish a new [eufy-security-client npm package version](https://www.npmjs.com/package/eufy-security-client). but using `npm publish` locally

Next steps:
1. Release a new version of [bropat/eufy-security-ws](https://github.com/bropat/eufy-security-ws) 
2. Release a new version of [bropat/hassio-eufy-security-ws](https://github.com/bropat/hassio-eufy-security-ws)

## eufy-security-ws

[Instructions](https://github.com/bropat/eufy-security-ws/tree/develop/docs/deployment.md).

## hassio-eufy-security-ws

[Instructions](https://github.com/bropat/hassio-eufy-security-ws/tree/develop/eufy-security-ws/deployment.md).
