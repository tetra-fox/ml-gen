# ml-gen

MelonLoader's toolchain, but as a GitHub Action. Useful for CI builds of MelonLoader mods.

# Usage

```yml
# .NET is required
- name: Setup .NET
  uses: actions/setup-dotnet@v2
  with:
    dotnet-version: 5.0.x

- name: Generate libraries
  uses: tetra-fox/ml-gen@latest
  with:
    game: among-us
    game_path: ${{ github.workspace }}/Among Us
    game_executable: Among Us
```

# Notes

- **You must provide your own game binaries.** You can automate this process with tools such as [DepotDownloader](https://github.com/SteamRE/DepotDownloader).
  - I personally use the [Steamfetch](https://github.com/marketplace/actions/steamfetch) action to accomplish this.
  - The specific binaries you need are the following:
    - Executable (e.g. `Among Us.exe`)
    - `GameAssembly.dll`
    - `[game]_Data/il2cpp_data/Metadata/global-metadata.dat`
    - `UnityPlayer.dll` **_(Windows runners only)_**
    - `[game]_Data/globalgamemanagers` **OR** `[game]_Data/data.unity3d`, whichever your game has. **_(Linux & macOS runners only)_**
  - You must leave the directory structure intact.
- You can figure out what your game's `gameSlug` is [here](https://api.melonloader.com/api/v1/game/).
- This action mimics the directory structure of a game with MelonLoader installed, with the output `.dll`s in the `MelonLoader/Managed` directory, and tools in `MelonLoader/Dependencies/Il2CppAssemblyGenerator`.

# Inputs

| Name              | Description                                                                 | Default                           | Example           | Type     | Required |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------- | ----------------- | -------- | -------- |
| `game`            | `gameSlug` from [MelonLoader API](https://api.melonloader.com/api/v1/game/) |                                   | `among-us`        | `string` | &check;  |
| `game_path`       | Path to your Unity game                                                     |                                   | `/Games/Among Us` | `string` | &check;  |
| `game_executable` | Your Unity game's executable name                                           |                                   | `Among Us`        | `string` | &check;  |
| `unity_version`   | Override Unity version (If it was not automatically found)                  |                                   | `2020.3.22`       | `string` | &cross;  |
| `work_path`       | Temp directory                                                              | `${{ github.workspace }}/ml-gen`  | `./cool-tools`    | `string` | &cross;  |
| `output_path`     | Output directory for libraries                                              | `[game_path]/MelonLoader/Managed` | `./here/go/libs`  | `string` | &cross;  |
| `ml_version`      | MelonLoader release tag name                                                | `'latest'`                        | `v0.4.2`          | `string` | &cross;  |
