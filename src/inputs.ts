import fs from "fs";
import path from "path";

import * as core from "@actions/core";

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
  static readonly unityVersion = core.getInput("unity_version");
  static readonly tmpPath = path.normalize(core.getInput("work_path"));
  static readonly outPath = path.normalize(
    core.getInput("output_path") ||
      path.resolve(this.gamePath, "MelonLoader", "Managed") // Default value
  );
  static mlVersion = core.getInput("ml_version");

  static validate(): void {
    core.info("Validating inputs...");

    // Prepend 'v' if it's not already there
    if (
      this.mlVersion && // if it is set
      this.mlVersion !== "latest" && // and also not "latest"
      !this.mlVersion.startsWith("v") // and not already prefixed
    )
      this.mlVersion = `v${this.mlVersion}`;

    // Make sure game_path exists on disk
    if (!fs.existsSync(this.gamePath))
      throw new Error(
        `Input "game_path" does not point to an existing directory. Value: ${this.gamePath}`
      );

    core.info("Inputs look good!");
  }
}
