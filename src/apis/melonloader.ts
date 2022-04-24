import * as core from "@actions/core";
import * as rm from "typed-rest-client/RestClient";

interface GameInfo {
  gameSlug: string;
  gameName: string;
  mappingUrl: null | string;
  mappingFileSHA512: null | string;
  forceCpp2IlVersion: null | string;
  forceUnhollowerVersion: null | string;
  obfuscationRegex: null | string;
}

export default class MelonLoader {
  static readonly version = "v1";
  static readonly mirrors = [
    "https://api.melonloader.com",
    "https://api-1.melonloader.com",
    "https://api-2.melonloader.com",
    "https://melon.samboy.dev"
  ];
  static readonly endpoint = `/api/${this.version}/game`;
  static async fetchGameJson(gameSlug: string): Promise<GameInfo | null> {
    core.info("Contacting MelonLoader API...");
    for (const mirror of this.mirrors) {
      core.info(`Getting game info from ${mirror}${this.endpoint}/${gameSlug}`);
      const rest: rm.RestClient = new rm.RestClient("ml-gen", mirror);
      const res: rm.IRestResponse<GameInfo> = await rest.get<GameInfo>(
        `/${this.endpoint}/${gameSlug}`
      );
      if (res.statusCode === 200 && res.result) return res.result;
    }
    throw new Error(
      "Failed to contact all MelonLoader API mirrors.\nSomething must have gone horribly wrong! Has the internet finally gone offline?"
    );
  }
}
