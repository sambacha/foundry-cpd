## `foundry-toolchain` Action

This GitHub Action installs [Foundry](https://github.com/foundry-rs/foundry), the blazing fast, portable and modular
toolkit for Ethereum application development. It provides enhanced caching capabilities and gas snapshot tracking to improve your development workflow.

### Example workflow

```yml
on: [push]

name: test

jobs:
  check:
    name: Foundry project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Run tests
        run: forge test -vvv

      - name: Run snapshot
        run: forge snapshot
```

### Example workflow with Gas Snapshot Tracking

```yml
on: [pull_request]

name: test-with-gas-tracking

jobs:
  check:
    name: Foundry project with gas tracking
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          gas-snapshot: true
          gas-snapshot-pr-comment: true

      - name: Run tests
        run: forge test -vvv
```

### Inputs

| **Name**                   | **Required** | **Default**                           | **Description**                                                 | **Type** |
| -------------------------- | ------------ | ------------------------------------- | --------------------------------------------------------------- | -------- |
| `cache`                    | No           | `true`                                | Whether to enable caching for RPC responses and artifacts.       | bool     |
| `version`                  | No           | `stable`                              | Version to install, e.g. `stable`, `rc`, `nightly` or `v0.3.0`. | string   |
| `cache-key`                | No           | `${{ github.job }}-${{ github.sha }}` | The cache key to use for caching.                               | string   |
| `cache-restore-keys`       | No           | `[${{ github.job }}-]`                | The cache keys to use for restoring the cache.                  | string[] |
| `gas-snapshot`             | No           | `false`                               | Whether to enable gas snapshot tracking.                        | bool     |
| `gas-snapshot-test-pattern`| No           | `""`                                  | Test pattern to use for gas snapshots.                          | string   |
| `gas-snapshot-pr-comment`  | No           | `true`                                | Whether to post gas snapshot comparison as a PR comment.        | bool     |
| `github-token`             | No           | `${{ github.token }}`                 | GitHub token to use for API operations.                         | string   |

### RPC Caching

By default, this action matches Forge's behavior and caches all RPC responses in the `~/.foundry/cache/rpc` directory.
This is done to speed up the tests and avoid hitting the rate limit of your RPC provider.

The logic of the caching is as follows:

- Always load the latest valid cache, and always create a new one with the updated cache.
- When there are no changes to the fork tests, the cache does not change but the key does, since the key is based on the
  commit hash.
- When the fork tests are changed, both the cache and the key are updated.

If you would like to disable the caching (e.g. because you want to implement your own caching mechanism), you can set
the `cache` input to `false`, like this:

```yml
- name: Install Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    cache: false
```

### Custom Cache Keys

You have the ability to define custom cache keys by utilizing the `cache-key` and `cache-restore-keys` inputs. This
feature is particularly beneficial when you aim to tailor the cache-sharing strategy across multiple jobs. It is
important to ensure that the `cache-key` is unique for each execution to prevent conflicts and guarantee successful
cache saving.

For instance, if you wish to utilize a shared cache between two distinct jobs, the following configuration can be
applied:

```yml
- name: Install Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    cache-key: custom-seed-test-${{ github.sha }}
    cache-restore-keys: |-
      custom-seed-test-
      custom-seed-
---
- name: Install Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    cache-key: custom-seed-coverage-${{ github.sha }}
    cache-restore-keys: |-
      custom-seed-coverage-
      custom-seed-
```

#### Deleting Caches

You can delete caches via the GitHub Actions user interface. Just go to your repo's "Actions" page:

```text
https://github.com/<OWNER>/<REPO>/actions/caches
```

Then, locate the "Management" section, and click on "Caches". You will see a list of all of your current caches, which
you can delete by clicking on the trash icon.

For more detail on how to delete caches, read GitHub's docs on
[managing caches](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#managing-caches).

#### Fuzzing

Note that if you are fuzzing in your fork tests, the RPC cache strategy above will not work unless you set a
[fuzz seed](https://book.getfoundry.sh/reference/config/testing#seed). You might also want to reduce your number of RPC
calls by using [Multicall](https://github.com/mds1/multicall).

### Gas Snapshot Tracking

This action now includes built-in gas snapshot tracking capabilities, allowing you to monitor gas usage across your Solidity contracts over time. When enabled, the action will:

1. Capture gas snapshots from your Forge tests
2. Compare them with previous snapshots
3. Track historical gas usage data
4. Generate reports highlighting gas changes
5. Optionally post these reports as comments on pull requests

This feature is particularly useful for:
- Identifying gas regressions in your code
- Optimizing contract gas usage
- Ensuring gas efficiency across your codebase
- Documenting gas improvements in PRs

To enable gas snapshot tracking, set the `gas-snapshot` input to `true`:

```yml
- name: Install Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    gas-snapshot: true
```

You can also filter which tests are included in the gas snapshot by using the `gas-snapshot-test-pattern` input:

```yml
- name: Install Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    gas-snapshot: true
    gas-snapshot-test-pattern: "test_gas_*"
```

When running on pull requests, the action can automatically post a comment with a gas comparison report. This is enabled by default when gas snapshot tracking is enabled, but you can disable it by setting `gas-snapshot-pr-comment` to `false`.

The gas snapshot data is cached between workflow runs, allowing for historical tracking and comparison over time.

### Summaries

You can add the output of Forge and Cast commands to GitHub step summaries. The summaries support GitHub flavored
Markdown.

For example, to add the output of `forge snapshot` to a summary, you would change the snapshot step to:

```yml
- name: Run snapshot
  run: NO_COLOR=1 forge snapshot >> $GITHUB_STEP_SUMMARY
```

See the official
[GitHub docs](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)
for more information.

### Building

When opening a PR, you must build the action exactly following the below steps for CI to pass:

```console
$ npm ci
$ npm run build
```

You **have** to use Node.js 20.x.
