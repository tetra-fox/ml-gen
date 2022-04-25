import fs from "fs";
import os from "os";
import path from "path";

import semverLte from "semver/functions/lte";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";

import inputs from "./inputs";
import cmd from "./tools/cmds";
import {getUnityVersion} from "./tools/unitytools";
import GitHub from "./apis/github";
import MelonLoader from "./apis/melonloader";

async function run(): Promise<void> {
  try {
    inputs.validate();
    const gameInfo = await MelonLoader.fetchGameJson(inputs.game);
    const asmGenRoot = path.join(
      inputs.gamePath,
      "MelonLoader",
      "Dependencies",
      "Il2CppAssemblyGenerator"
    );

    // #region Setup MelonLoader
    core.startGroup("Setup MelonLoader");
    const mlAssetName = "MelonLoader.x64.zip";
    const mlRelease = await GitHub.getRelease(
      "LavaGang/MelonLoader",
      inputs.mlVersion
    );
    await GitHub.downloadReleaseAsset(mlRelease!, mlAssetName);
    await cmd.extract(
      path.join(inputs.tmpPath, mlAssetName),
      inputs.gamePath
    );
    core.endGroup();
    // #endregion

    // #region Setup Cpp2IL
    core.startGroup("Setup Cpp2IL");
    // Not sure of the specifics behind this, but it's in MelonLoader, so it should be here too.
    // https://github.com/LavaGang/MelonLoader/blob/2db3925134380b5763cf698792d5ed6cada29e0e/Dependencies/Il2CppAssemblyGenerator/RemoteAPI.cs#L102-L103
    if (
      gameInfo!.forceCpp2IlVersion &&
      semverLte(gameInfo!.forceCpp2IlVersion, "2022.0.2")
    )
      gameInfo!.forceCpp2IlVersion = "2022.1.0-pre-release.3";

    const cpp2IlPath = path.join(asmGenRoot, "Cpp2IL");
    const cpp2IlRelease = await GitHub.getRelease(
      "SamboyCoding/Cpp2IL",
      gameInfo!.forceCpp2IlVersion
    );
    let cpp2IlAssetName = `Cpp2IL-${gameInfo!.forceCpp2IlVersion}-`;

    if (os.platform() === "win32")
      cpp2IlAssetName += "Windows-Netframework472.zip";
    else if (os.platform() === "darwin") cpp2IlAssetName += "OSX";
    else if (os.platform() === "linux") cpp2IlAssetName += "Linux";
    else throw new Error("Unsupported platform");

    await GitHub.downloadReleaseAsset(cpp2IlRelease!, cpp2IlAssetName);

    if (os.platform() === "win32") {
      await cmd.extract(
        path.join(inputs.tmpPath, cpp2IlAssetName),
        cpp2IlPath
      );
    } else {
      // Linux and MacOS use self-contained binaries, just move it
      await io.mv(
        path.join(inputs.tmpPath, cpp2IlAssetName),
        path.join(cpp2IlPath, cpp2IlAssetName)
      );
      await exec.exec("chmod", ["+x", path.join(cpp2IlPath, cpp2IlAssetName)]);
    }
    core.endGroup();
    // #endregion

    // #region Setup AssemblyUnhollower
    core.startGroup("Setup AssemblyUnhollower");
    const unhollowerPath = path.join(asmGenRoot, "Il2CppAssemblyUnhollower");
    const unhollowerRelease = await GitHub.getRelease(
      "knah/Il2CppAssemblyUnhollower",
      `v${gameInfo!.forceUnhollowerVersion}`
    );
    const unhollowerAssetName = `Il2CppAssemblyUnhollower.${
      gameInfo!.forceUnhollowerVersion
    }.zip`;
    await GitHub.downloadReleaseAsset(unhollowerRelease!, unhollowerAssetName);
    await cmd.extract(
      path.join(inputs.tmpPath, unhollowerAssetName),
      unhollowerPath
    );
    core.endGroup();
    // #endregion

    // #region Download Unity libraies
    core.startGroup("Download Unity libraries");
    const unityVersion = inputs.unityVersion || (await getUnityVersion());
    await cmd.wget(
      `https://github.com/LavaGang/Unity-Runtime-Libraries/raw/master/${unityVersion}.zip`,
      inputs.tmpPath
    );
    await cmd.extract(
      path.join(inputs.tmpPath, `${unityVersion}.zip`),
      path.join(asmGenRoot, "UnityDependencies")
    );
    core.endGroup();
    // #endregion

    // #region Download deobfuscation map
    const hasMap = !!gameInfo!.mappingUrl;
    if (hasMap) {
      core.startGroup("Download deobfuscation map");
      await cmd.wget(gameInfo!.mappingUrl!, asmGenRoot);
      core.endGroup();
    }
    // #endregion

    io.rmRF(inputs.tmpPath);

    // #region Run Cpp2IL
    core.startGroup("Run Cpp2IL");
    let cpp2IlArgs = [
      `--game-path "${inputs.gamePath}"`,
      `--exe-name "${inputs.gameExe}"`
    ];

    // Flags are different in the rewrite of Cpp2IL
    // https://github.com/LavaGang/MelonLoader/blob/c8a1c8619121fe1130f949ca09eedda8951e8a42/Dependencies/Il2CppAssemblyGenerator/Packages/Cpp2IL.cs#L37-L84
    if (
      gameInfo!.forceCpp2IlVersion &&
      semverLte(gameInfo!.forceCpp2IlVersion, "2022.0.999")
    ) {
      // ExecuteOld
      cpp2IlArgs = cpp2IlArgs.concat([
        "--skip-analysis",
        "--skip-metadata-txts",
        "--disable-registration-prompts",
        `--output-root "${path.join(cpp2IlPath, "cpp2il_out")}"`
      ]);
    } else {
      // ExecuteNew
      cpp2IlArgs = cpp2IlArgs.concat([
        "--use-processor attributeinjector",
        "--output-as dummydll",
        `--output-to "${path.join(cpp2IlPath, "cpp2il_out")}"`
      ]);
    }

    await exec.exec(
      `"${path.join(
        cpp2IlPath,
        os.platform() === "win32" ? "Cpp2IL.exe" : cpp2IlAssetName
      )}" ${cpp2IlArgs.join(" ")}` // Cpp2IL doesn't like flags wrapped in quotes for some reason
    );
    core.endGroup();
    // #endregion

    // #region Run AssemblyUnhollower
    core.startGroup("Run AssemblyUnhollower");
    const unhollowerArgs = [
      `--input=${path.join(cpp2IlPath, "cpp2il_out")}`,
      `--output=${inputs.outPath}`,
      `--mscorlib=${path.join(
        inputs.gamePath,
        "MelonLoader",
        "Managed",
        "mscorlib.dll"
      )}`,
      `--unity=${path.join(asmGenRoot, "UnityDependencies")}`,
      `--gameassembly=${path.join(inputs.gamePath, "GameAssembly.dll")}`,
      "--add-prefix-to=ICSharpCode",
      "--add-prefix-to=Newtonsoft",
      "--add-prefix-to=TinyJson",
      "--add-prefix-to=Valve.Newtonsoft"
    ];

    if (hasMap)
      unhollowerArgs.push(
        `--rename-map=${path.join(
          asmGenRoot,
          gameInfo!.mappingUrl!.split("/").pop()!
        )}`
      );

    if (gameInfo!.obfuscationRegex)
      unhollowerArgs.push(`--obf-regex ${gameInfo!.obfuscationRegex}`);

    // Tell .NET what runtime to use so we can use this tool on non-Windows runners as well
    await fs.promises.writeFile(
      path.join(unhollowerPath, "AssemblyUnhollower.runtimeconfig.json"),
      JSON.stringify({
        runtimeOptions: {
          tfm: "net5.0",
          rollForward: "LatestMinor",
          framework: {
            name: "Microsoft.NETCore.App",
            version: "5.0.0"
          }
        }
      }),
      "utf8"
    );

    // Finally, execute AssemblyUnhollower and we'll have our dlls!
    await exec.exec(
      `dotnet ${path.join(unhollowerPath, "AssemblyUnhollower.exe")}`,
      unhollowerArgs
    );
    core.endGroup();
    // #endregion
  } catch (err) {
    if (err instanceof Error) core.setFailed(err.message);
  }
}

run();
