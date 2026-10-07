// Tanımsız ad denetimi: silinen bir değişken kodda kalırsa derleme geçer ama sayfa açılınca çöker
// ("This page couldn't load"). Lint'teki eski hatalara takılmadan yalnız no-undef'e bakar.
import { ESLint } from "eslint";

const eslint = new ESLint();
const results = await eslint.lintFiles(["src"]);
const bad = results.flatMap((r) => r.messages.filter((m) => m.ruleId === "no-undef").map((m) => `${r.filePath.replace(process.cwd() + "/", "")}:${m.line}  ${m.message}`));
if (bad.length) {
  console.log(bad.join("\n"));
  console.log(`\n✗ ${bad.length} tanımsız ad: sayfa açılınca çöker`);
  process.exit(1);
}
console.log("✓ Tanımsız ad yok");
