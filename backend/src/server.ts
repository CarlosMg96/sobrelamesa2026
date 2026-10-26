import { initLogger } from "./utils/logger";
import app from "./app";

initLogger();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
