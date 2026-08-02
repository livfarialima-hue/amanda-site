import { runIndexNow } from "../../../scripts/submit-indexnow.mjs";

export const onSuccess = async function({ constants }) {
  try {
    const result = await runIndexNow({
      rootDir: constants.PUBLISH_DIR,
      gitRoot: process.cwd(),
    });

    if (result.status === "skipped") {
      console.log("IndexNow: nenhuma página publicada ou alterada para enviar.");
      return;
    }
    console.log(`IndexNow: ${result.urlCount} página(s) enviada(s) após o deploy de produção.`);
  } catch (error) {
    console.warn(`IndexNow: o deploy foi concluído, mas a notificação falhou: ${error instanceof Error ? error.message : String(error)}`);
  }
};
