import fs from "fs";
import path from "path";

import * as core from "@actions/core";

export default class Inputs {
  static readonly game = {value: core.getInput("game"), required: true};
  static readonly gamePath = {
    value: path.normalize(core.getInput("game_path")),
    required: true
  };
  static readonly gameExe = {
    value: core.getInput("game_executable").replace(/\.exe|\.app$/, ""), // Remove extension
    required: true
  };
  static readonly unityVersion = {
    value: core.getInput("unity_version"),
    required: false
  };
  static readonly tmpPath = {
    value: path.normalize(core.getInput("work_path")),
    required: false
  };
  static readonly outPath = {
    value: path.normalize(
      core.getInput("output_path") ||
        path.resolve(this.gamePath.value, "MelonLoader", "Managed") // Default value
    ),
    required: false
  };
  static readonly mlVersion = {
    value: core.getInput("ml_version"),
    required: false
  };
  static validate(): void {
    core.info("Validating inputs...");

    // Prepend 'v' if it's not already there
    if (
      this.mlVersion.value && // if it is set
      this.mlVersion.value !== "latest" && // and also not "latest"
      !this.mlVersion.value.startsWith("v") // and not already prefixed
    )
      this.mlVersion.value = `v${this.mlVersion.value}`;

    // Make sure we have all the required inputs
    // for (const input of Object.values(Inputs)) {
    //   if (input.required && !input.value)
    //     throw new Error(`Input ${input.name} is required`);
    // }

    // Make sure game_path exists
    if (!fs.existsSync(this.gamePath.value))
      throw new Error(
        `Input "game_path" does not point to an existing directory. Value: ${this.gamePath.value}`
      );

    core.info("Inputs look good!");
  }
}
