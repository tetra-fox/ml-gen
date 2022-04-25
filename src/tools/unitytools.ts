import fs from "fs";
import os from "os";
import path from "path";

import inputs from "../inputs";

export const VERSION_REGEX = /(\d{4}\.\d\.\d{2})(?:f\d)*/; // Captures "2018.3.0" from version strings like "2018.3.0f3" or "2018.3.0"

// Methods for acquiring version taken from Cpp2IL
// https://github.com/SamboyCoding/Cpp2IL/blob/12fd73ee294eba3cbaf3b2dfff1db6003a9a0bc4/Cpp2IL.Core/Cpp2IlApi.cs#L57-L154
export async function getUnityVersion(): Promise<string> {
  if (
    os.platform() === "win32" &&
    fs.existsSync(path.join(inputs.gamePath.value, "UnityPlayer.dll"))
  ) {
    const {FileVersionInfo} = await import("@tybys/windows-file-version-info");
    const versionInfo = FileVersionInfo.getVersionInfo(
      path.join(inputs.gamePath.value, "UnityPlayer.dll")
    );
    return `${versionInfo.fileMajorPart}.${versionInfo.fileMinorPart}.${versionInfo.fileBuildPart}`;
  }

  // globalgamemanagers
  const ggmPath = path.join(
    inputs.gamePath.value,
    `${inputs.gameExe.value}_Data`,
    "globalgamemanagers"
  );
  if (fs.existsSync(ggmPath)) {
    const bytes = await fs.promises.readFile(ggmPath);
    let version = "";
    let idx = 0x14;
    while (bytes[idx] !== 0) {
      version += String.fromCharCode(bytes[idx]);
      idx++;
    }

    if (!version.includes("f")) {
      version = "";
      idx = 0x30;
      while (bytes[idx] !== 0) {
        version += String.fromCharCode(bytes[idx]);
        idx++;
      }
    }

    return version.substring(0, version.indexOf("f"));
  }

  // data.unity3d
  const dataPath = path.join(
    inputs.gamePath.value,
    `${inputs.gameExe.value}_Data`,
    "data.unity3d"
  );
  if (fs.existsSync(dataPath)) {
    return "0.0.0";
  }

  throw new Error(
    "Could not find Unity version. Try specifying the 'unity_version' input."
  );
}
