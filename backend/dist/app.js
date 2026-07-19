"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const edition_routes_1 = __importDefault(require("./routes/edition.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auditlog_routes_1 = __importDefault(require("./routes/auditlog.routes"));
const data_routes_1 = __importDefault(require("./routes/data.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const department_routes_1 = __importDefault(require("./routes/department.routes"));
const submission_routes_1 = __importDefault(require("./routes/submission.routes"));
const schema_routes_1 = __importDefault(require("./routes/schema.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/editions', edition_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/audit-logs', auditlog_routes_1.default);
app.use('/api/data', data_routes_1.default);
app.use('/api/messages', message_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/submissions', submission_routes_1.default);
app.use('/api/schemas', schema_routes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});
exports.default = app;
