import * as core from "@actions/core";
import * as github from "@actions/github";
import {GraphqlResponseError} from "@octokit/graphql";

import cmd from "../tools/cmds";
import inputs from "../inputs";

export default class GitHub {
  static readonly octokit = github.getOctokit(inputs.githubToken);

  static async downloadReleaseAsset(
    repo: [string, string],
    tag = "latest",
    assetName: string,
    destination: string = inputs.tmpPath
  ): Promise<void> {
    const query = `
    query ($owner: String!, $repo: String!, $name: String!, $tagName: String!, $latest: Boolean!) {
      repository(owner: $owner, name: $repo) {
        release(tagName: $tagName) @skip(if: $latest) {
          releaseAssets(name: $name, last: 1) {
            edges {
              node {
                downloadUrl
              }
            }
          }
        }
        latestRelease @include(if: $latest) {
          releaseAssets(name: $name, last: 1) {
              edges {
                node {
                  downloadUrl
                }
              }
            }
        }
      }
    }`;

    try {
      const {repository} = await this.octokit.graphql(query, {
        owner: repo[0],
        repo: repo[1],
        name: assetName,
        tagName: tag,
        latest: tag === "latest"
      });

      let assetUrl: string;
      if (
        repository.latestRelease &&
        repository.latestRelease.releaseAssets.edges[0]
      ) {
        assetUrl =
          repository.latestRelease.releaseAssets.edges[0].node.downloadUrl;
      } else if (
        repository.release &&
        repository.release.releaseAssets.edges[0]
      ) {
        assetUrl = repository.release.releaseAssets.edges[0].node.downloadUrl;
      } else {
        throw new Error(`Could not find asset ${assetName} in release ${tag}`);
      }

      core.info(`Downloading ${assetName}...`);
      await cmd.wget(assetUrl, destination);
    } catch (err) {
      // rethrow as generic Error
      if (err instanceof GraphqlResponseError) throw new Error(err.message);
      if (err instanceof Error) throw err;
    }
  }
}
