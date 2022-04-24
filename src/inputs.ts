import * as core from "@actions/core";
import fs from "fs";
import path from "path";

export default class Inputs {
  static readonly game = {value: core.getInput("game"), required: true};
  static readonly gamePath = {
    value: path.normalize(core.getInput("game_path")),
    required: true
  };
  static readonly gameExe = {
    value: core.getInput("game_executable"),
    required: true
  };
  static readonly unityVersion = {
    value: core.getInput("unity_version"),
    required: true
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

    // Remove extension from game_executable
    if (
      this.gameExe.value.endsWith(".exe") ||
      this.gameExe.value.endsWith(".app")
    )
      this.gameExe.value.split(".").slice(0, -1).join(".");

    // Make sure we have all the required inputs
    for (const input of Object.values(Inputs)) {
      if (input.required && !input.value)
        throw new Error(`Input ${input.value} is required`);
    }

    // Make sure game_path exists
    if (!fs.existsSync(this.gamePath.value))
      throw new Error(
        `Input "game_path" does not point to an existing directory. Value: ${this.gamePath.value}`
      );

    core.info("Inputs look good!");
  }
}
