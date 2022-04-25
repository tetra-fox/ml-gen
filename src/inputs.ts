import fs from "fs";
import path from "path";

import * as core from "@actions/core";

// i'll use this later
interface Input {
  name: string;
  value: string;
  required: boolean;
}

export default class Inputs {
  // We need to specify the name because once minified, input.name is lost
  static readonly game: Input = {
    name: "game",
    value: core.getInput("game"),
    required: true
  };
  static readonly gamePath: Input = {
    name: "game_path",
    value: path.normalize(core.getInput("game_path")),
    required: true
  };
  static readonly gameExe: Input = {
    name: "game_executable",
    value: core.getInput("game_executable").replace(/\.exe|\.app$/, ""), // Remove extension
    required: true
  };
  static readonly unityVersion: Input = {
    name: "unity_version",
    value: core.getInput("unity_version"),
    required: false
  };
  static readonly tmpPath: Input = {
    name: "work_path",
    value: path.normalize(core.getInput("work_path")),
    required: false
  };
  static readonly outPath: Input = {
    name: "output_path",
    value: path.normalize(
      core.getInput("output_path") ||
        path.resolve(this.gamePath.value, "MelonLoader", "Managed") // Default value
    ),
    required: false
  };
  static readonly mlVersion: Input = {
    name: "ml_version",
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
    for (const input of Object.values(Inputs)) {
      if (input.required && !input.value)
        throw new Error(`Input ${input.name} is required`);
    }

    // Make sure game_path exists
    if (!fs.existsSync(this.gamePath.value))
      throw new Error(
        `Input "game_path" does not point to an existing directory. Value: ${this.gamePath.value}`
      );

    core.info("Inputs look good!");
  }
}
