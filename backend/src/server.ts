import { initLogger } from "./utils/logger";
import app from "./app";

initLogger();

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
