import os from "os";

import * as exec from "@actions/exec";

// Aliases for common commands
const cmd = {
  async extract(src: string, dest: string): Promise<void> {
    await exec.exec(`unzip "${src}" -d "${dest}"`);
  },
  async wget(url: string, path: string): Promise<void> {
    await exec.exec(
      `${
        os.platform() === "win32" ? "C:\\msys64\\usr\\bin\\wget.exe" : "wget"
      } -q -P "${path}" "${url}"`
    );
  }
};

export default cmd;
