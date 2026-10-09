// tara.mjs için modül çözümleyiciyi kaydeder ("@/..." → src/; testlerdeki hooks.mjs)
import { register } from "node:module";
register(new URL("../hooks.mjs", import.meta.url));
