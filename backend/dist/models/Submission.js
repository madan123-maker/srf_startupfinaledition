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
exports.Submission = exports.SubmissionStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var SubmissionStatus;
(function (SubmissionStatus) {
    SubmissionStatus["DRAFT"] = "DRAFT";
    SubmissionStatus["SUBMITTED"] = "SUBMITTED";
    SubmissionStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    SubmissionStatus["APPROVED"] = "APPROVED";
    SubmissionStatus["REJECTED"] = "REJECTED";
})(SubmissionStatus || (exports.SubmissionStatus = SubmissionStatus = {}));
const SubmissionSchema = new mongoose_1.Schema({
    editionId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Edition',
        required: true,
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stateName: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(SubmissionStatus),
        default: SubmissionStatus.DRAFT,
    },
    totalScore: {
        type: Number,
        default: 0,
    },
    adminRemarks: {
        type: String,
    },
    reviewedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
    },
    responses: [
        {
            questionId: { type: String, required: true },
            fieldResponses: [
                {
                    fieldId: { type: String, required: true },
                    value: { type: mongoose_1.default.Schema.Types.Mixed },
                    fileUrl: { type: String },
                    fileName: { type: String }
                }
            ]
        }
    ]
}, {
    timestamps: true,
});
exports.Submission = mongoose_1.default.model('Submission', SubmissionSchema);
