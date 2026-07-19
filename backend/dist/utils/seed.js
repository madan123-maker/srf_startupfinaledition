"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = void 0;
const User_1 = require("../models/User");
const Edition_1 = require("../models/Edition");
const Submission_1 = require("../models/Submission");
const FormSchema_1 = require("../models/FormSchema");
const schemaData_1 = require("./schemaData");
const bcrypt_1 = __importDefault(require("bcrypt"));
const seedSuperAdmin = async () => {
    try {
        const superAdminExists = await User_1.User.findOne({ role: User_1.Role.SUPER_ADMIN });
        let adminId;
        if (!superAdminExists) {
            console.log('No Super Admin found. Seeding default Super Admin...');
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash('Admin@123', salt);
            const newAdmin = await User_1.User.create({
                email: 'superadmin@srf.gov.in',
                passwordHash: hashedPassword,
                role: User_1.Role.SUPER_ADMIN,
                isActive: true,
            });
            adminId = newAdmin._id;
            console.log('Default Super Admin seeded successfully (email: superadmin@srf.gov.in)');
        }
        else {
            adminId = superAdminExists._id;
            console.log('Super Admin already exists.');
        }
        // Seed Dummy Data for Dashboard Visualization
        const editionExists = await Edition_1.Edition.findOne({ name: 'SRF 6.0' });
        if (!editionExists && adminId) {
            console.log('Seeding SRF 6.0 Edition and dummy Submissions for dashboard...');
            const edition = await Edition_1.Edition.create({
                name: 'SRF 6.0',
                version: '6.0',
                description: 'States Startup Ranking Framework 6th Edition',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2026-05-31'),
                status: Edition_1.EditionStatus.PUBLISHED,
                publishedAt: new Date(),
                createdBy: adminId
            });
            // Create a dummy user
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash('User@123', salt);
            const dummyUser = await User_1.User.create({
                email: 'user@state.gov.in',
                passwordHash: hashedPassword,
                role: User_1.Role.USER,
                state: 'Karnataka',
                isActive: true
            });
            // Seed dummy submissions (1 Draft, 2 Submitted/Pending, 3 Approved, 1 Rejected)
            const submissions = [
                { status: Submission_1.SubmissionStatus.DRAFT, stateName: 'Maharashtra' },
                { status: Submission_1.SubmissionStatus.UNDER_REVIEW, stateName: 'Gujarat' },
                { status: Submission_1.SubmissionStatus.UNDER_REVIEW, stateName: 'Kerala' },
                { status: Submission_1.SubmissionStatus.APPROVED, stateName: 'Karnataka' },
                { status: Submission_1.SubmissionStatus.APPROVED, stateName: 'Tamil Nadu' },
                { status: Submission_1.SubmissionStatus.APPROVED, stateName: 'Telangana' },
                { status: Submission_1.SubmissionStatus.REJECTED, stateName: 'Bihar' },
            ];
            for (const sub of submissions) {
                await Submission_1.Submission.create({
                    editionId: edition._id,
                    userId: dummyUser._id,
                    stateName: sub.stateName,
                    status: sub.status,
                    totalScore: sub.status === Submission_1.SubmissionStatus.APPROVED ? 50 : 0
                });
            }
            console.log('Dummy Submissions seeded successfully.');
            // Seed Form Schema
            console.log('Seeding SRF 6.0 Form Schema...');
            await FormSchema_1.FormSchemaModel.create({
                editionId: edition._id,
                areas: schemaData_1.SEED_SCHEMA.areas
            });
            console.log('SRF 6.0 Form Schema seeded successfully!');
        }
    }
    catch (error) {
        console.error('Error seeding Super Admin:', error);
    }
};
exports.seedSuperAdmin = seedSuperAdmin;
