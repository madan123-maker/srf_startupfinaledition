"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSchemaModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FormFieldSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }]
}, { _id: false });
const QuestionSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    questionNumber: { type: String, required: true },
    weightage: { type: Number, default: 0 },
    title: { type: String, required: true },
    requiredDocuments: { type: String, default: '' },
    guidelinesRef: { type: String, default: '' },
    scoringCriteria: { type: String, default: '' },
    fields: [FormFieldSchema]
}, { _id: false });
const ActionPointSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    questions: [QuestionSchema]
}, { _id: false });
const ReformAreaSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actionPoints: [ActionPointSchema]
}, { _id: false });
const FormSchemaSchema = new mongoose_1.Schema({
    editionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Edition', required: true, unique: true },
    areas: [ReformAreaSchema]
}, { timestamps: true });
exports.FormSchemaModel = mongoose_1.default.model('FormSchema', FormSchemaSchema);
