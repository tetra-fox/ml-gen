import fs from "fs";
import path from "path";

import * as core from "@actions/core";

import {VERSION_REGEX} from "./tools/unitytools";

export default class Inputs {
  static readonly game = core.getInput("game", {
    required: true,
    trimWhitespace: true
  });
  static readonly gamePath = path.normalize(
    core.getInput("game_path", {required: true, trimWhitespace: true})
  );
  static readonly gameExe = core
    .getInput("game_executable", {required: true, trimWhitespace: true})
    .replace(/\.exe|\.app$/, ""); // Remove extension
  static unityVersion = core.getInput("unity_version");
  static readonly tmpPath = path.normalize(core.getInput("work_path"));
  static readonly outPath = path.normalize(
    core.getInput("output_path") ||
      path.resolve(this.gamePath, "MelonLoader", "Managed") // Default value
  );
  static mlVersion = core.getInput("ml_version");

  static validate(): void {
    core.info("Validating inputs...");

    // Validate unity_version
    const matches = this.unityVersion.match(VERSION_REGEX);
    if (!matches && this.unityVersion)
      throw new Error("unity_version is invalid (e.g. 2018.3.0)");
    else if (matches) this.unityVersion = matches[1];

    // Prepend 'v' to ml_version if it doesn't have it
    if (this.mlVersion !== "latest" && !this.mlVersion.startsWith("v"))
      this.mlVersion = `v${this.mlVersion}`;

    // Make sure game_path exists on disk
    if (!fs.existsSync(this.gamePath))
      throw new Error(
        `Input "game_path" does not point to an existing directory. Value: ${this.gamePath}`
      );

    core.info("Inputs look good!");
  }
}
