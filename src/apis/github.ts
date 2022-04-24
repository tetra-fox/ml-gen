import * as core from "@actions/core";
import * as rm from "typed-rest-client/RestClient";

import cmd from "../tools/cmds";
import inputs from "../inputs";

// There are many more properties, but this is just what we need.
interface Release {
  assets: Asset[];
}

interface Asset {
  name: string;
  browser_download_url: string;
}

export default class GitHub {
  static readonly root = "https://api.github.com";
  static async getRelease(
    repo: string,
    tag?: string | null | undefined
  ): Promise<Release | null> {
    core.info(`Geting release info for ${repo}@${tag || "latest"}...`);
    const rest: rm.RestClient = new rm.RestClient("ml-gen", this.root);
    const res: rm.IRestResponse<Release> = await rest.get<Release>(
      `${this.root}/repos/${repo}/releases/${
        tag && tag !== "latest" ? `tags/${tag}` : "latest"
      }`
    );
    if (res.statusCode === 200 && res.result) return res.result;
    throw new Error("Failed to get release from GitHub API");
  }

  static async downloadReleaseAsset(
    release: Release,
    assetName: string,
    destination: string = inputs.tmpPath.value
  ): Promise<void> {
    const assetUrl = release.assets.filter(asset => asset.name === assetName)[0]
      .browser_download_url;

    if (!assetUrl)
      throw new Error(`Could not find asset ${assetName} in release`);

    core.info(`Downloading ${assetName}...`);
    await cmd.wget(assetUrl, destination);
  }
}
