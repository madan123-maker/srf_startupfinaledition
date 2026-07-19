"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const seed_1 = require("./utils/seed");
const PORT = process.env.PORT || 5001;
const startServer = async () => {
    await (0, db_1.connectDB)();
    await (0, seed_1.seedSuperAdmin)();
    app_1.default.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};
startServer();
