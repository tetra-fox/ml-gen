import fs from "fs";
import os from "os";
import path from "path";

import inputs from "../inputs";

// Captures "2018.3.0" from version strings like "2018.3.0f3" or "2018.3.0"
export const VERSION_REGEX = /^(\d{4}\.\d\.\d{2})(?:f\d)*$/;

// Methods for acquiring version taken from Cpp2IL
// https://github.com/SamboyCoding/Cpp2IL/blob/12fd73ee294eba3cbaf3b2dfff1db6003a9a0bc4/Cpp2IL.Core/Cpp2IlApi.cs#L57-L154
export async function getUnityVersion(): Promise<string> {
  // WINDOWS ONLY: get file version from UnityPlayer.dll
  // This works by using Windows APIs (winver.h) to get the version of UnityPlayer.dll
  if (
    os.platform() === "win32" &&
    fs.existsSync(path.join(inputs.gamePath, "UnityPlayer.dll"))
  ) {
    const {FileVersionInfo} = await import("@tybys/windows-file-version-info");
    const versionInfo = FileVersionInfo.getVersionInfo(
      path.join(inputs.gamePath, "UnityPlayer.dll")
    );
    return `${versionInfo.fileMajorPart}.${versionInfo.fileMinorPart}.${versionInfo.fileBuildPart}`;
  }

  // All other platforms (Read file headers)
  let version = "";
  // globalgamemanagers (0x14 or 0x30)
  const ggmPath = path.join(
    inputs.gamePath,
    `${inputs.gameExe}_Data`,
    "globalgamemanagers"
  );
  const dataPath = path.join(
    inputs.gamePath,
    `${inputs.gameExe}_Data`,
    "data.unity3d"
  );
  const exePath = path.join(inputs.gamePath, `${inputs.gameExe}.exe`);
  if (fs.existsSync(ggmPath)) {
    version =
      (await bytesToString(ggmPath, 0x14, 11)) ||
      (await bytesToString(ggmPath, 0x30, 11));
  } else if (fs.existsSync(dataPath)) {
    version = await bytesToString(dataPath, 0x12, 11);
  } else if (fs.existsSync(exePath)) {
    // Last resort, read from .exe (0x998 bytes from end)
    if (fs.existsSync(exePath))
      version = await bytesToString(
        exePath,
        (await fs.promises.stat(exePath)).size - 0x998,
        17
      );
  }

  const matches = version.match(VERSION_REGEX);
  if (matches) return matches[1];

  throw new Error(
    "Could not find Unity version. Try specifying the 'unity_version' input."
  );
}

async function bytesToString(
  filePath: string,
  begin: fs.ReadPosition | null,
  length: number
): Promise<string> {
  const handle = await fs.promises.open(filePath, "r");
  const buffer = Buffer.alloc(length);
  fs.read(handle.fd, buffer, 0, length, begin, function (err) {
    if (err) throw err;
  });
  handle.close();

  return buffer.toString();
}
