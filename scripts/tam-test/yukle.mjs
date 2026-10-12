// Mac'te çalışan tam testin sonucunu GitHub'a gönderir: depodaki test-sonuclari dalına son.txt ve gecmis/<zaman>.txt.
// Çalışma klasörüne, dallara ve dosyalara dokunmaz (geçici bir git dizini kullanır). Olmazsa false döner.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BRANCH = "test-sonuclari";

export function uploadResult(root, text) {
  const tmp = mkdtempSync(join(tmpdir(), "tam-test-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(tmp, "index") };
  const git = (args, input) => execFileSync("git", args, { cwd: root, env, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  try {
    const now = new Date();
    const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .format(now)
      .replace(" ", "-")
      .replace(":", "");
    const sha = git(["rev-parse", "--short", "HEAD"]);
    const msg = git(["log", "-1", "--format=%s"]);
    const dirty = git(["status", "--porcelain", "--untracked-files=no"]) ? " (kaydedilmemiş değişiklikle)" : "";
    const body = `Commit: ${sha}${dirty} · ${msg}\nZaman: ${stamp} (İstanbul)\nÇalıştırma: Mac (npm run test:hepsi)\n\n${text}`;
    for (let i = 0; i < 2; i++) {
      let parent = "";
      try {
        git(["fetch", "--quiet", "origin", `+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`]);
        parent = git(["rev-parse", `refs/remotes/origin/${BRANCH}`]);
      } catch {}
      const blob = git(["hash-object", "-w", "--stdin"], body);
      if (parent) git(["read-tree", parent]);
      else git(["read-tree", "--empty"]);
      git(["update-index", "--add", "--cacheinfo", `100644,${blob},son.txt`]);
      git(["update-index", "--add", "--cacheinfo", `100644,${blob},gecmis/${stamp}-${sha}-mac.txt`]);
      const tree = git(["write-tree"]);
      const commit = git(["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", `Test sonucu ${stamp} (${sha}, Mac)`]);
      try {
        git(["push", "--quiet", "origin", `${commit}:refs/heads/${BRANCH}`]);
        return true;
      } catch (e) {
        if (i) throw e;
      }
    }
  } catch (e) {
    console.log(`GitHub'a gönderilemedi: ${String(e.stderr || e.message).split("\n")[0]}`);
    return false;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return false;
}
