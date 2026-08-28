# Releasing mbremote

This checklist prepares and publishes one immutable npm version. Run every command from the package directory, `packages/mbremote/`. Git commands still operate on the containing repository.

## 1. Prepare the version

1. Update `version` in `package.json` and the matching workspace entry in `../../package-lock.json`.
2. Add the same version and release date to `CHANGELOG.md`.
3. Commit all intended files and verify that `git status --short` is empty.
4. Run the non-publishing release checks:

   ```sh
   npm run release:check
   ```

The check runs unit tests and the PicoRuby firmware smoke build, verifies version and changelog consistency, inspects the packed files, and installs the tarball into a temporary directory to run `mbremote --version`. It does not publish. The PicoRuby build requires Git, Ruby with Rake, GNU Make, CMake, and the Arm GNU Toolchain.

## 2. Prepare publishing services

The repository must have an `origin` remote. Confirm it and authenticate with npm and GitHub before releasing:

```sh
git remote -v
npm whoami
gh auth status
```

For a first release, confirm that the `mbremote` package name is available on npm and that the publishing account has permission to publish it. Do not store npm tokens in the repository.

## 3. Publish deliberately

Create and push the annotated version tag only after the checks pass and the working tree is clean:

```sh
git tag -a v0.5.0 -m "mbremote v0.5.0"
git push origin main --follow-tags
```

Publish the package to npm. The package `prepublishOnly` script runs its release checks again before npm uploads the package:

```sh
npm publish
```

After npm accepts the package and the tag exists on GitHub, create the GitHub Release. `--verify-tag` prevents GitHub CLI from creating a tag at another commit:

```sh
gh release create v0.5.0 --verify-tag --generate-notes
```

Finally, verify the published version in a fresh environment:

```sh
npm view mbremote version
npx --yes mbremote@0.5.0 --version
```
