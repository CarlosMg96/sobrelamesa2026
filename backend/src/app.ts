import authModule from "./modules/auth";
import eventModule from "./modules/events";
import productModule from "./modules/products";
import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth", authModule.routes);
app.use("/api/events", eventModule.routes);
app.use("/api/products", productModule.routes);

export default app;