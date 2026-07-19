"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEditionById = exports.deleteEdition = exports.getPublicEditions = exports.toggleEditionStatus = exports.getAllEditions = exports.createEdition = void 0;
const edition_service_1 = require("../services/edition.service");
const editionService = new edition_service_1.EditionService();
const createEdition = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }
        // Only SUPER_ADMIN can create editions based on the prompt rules
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can create new Editions.' });
        }
        const newEdition = await editionService.createEdition(req.body, req.user.id);
        return res.status(201).json(newEdition);
    }
    catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to create edition' });
    }
};
exports.createEdition = createEdition;
const getAllEditions = async (req, res) => {
    try {
        const editions = await editionService.getAllEditions();
        return res.status(200).json(editions);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch editions' });
    }
};
exports.getAllEditions = getAllEditions;
const toggleEditionStatus = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can toggle publish status.' });
        }
        const updatedEdition = await editionService.togglePublishStatus(req.params.id);
        return res.status(200).json(updatedEdition);
    }
    catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to toggle status' });
    }
};
exports.toggleEditionStatus = toggleEditionStatus;
const getPublicEditions = async (req, res) => {
    try {
        const editions = await editionService.getPublicEditions();
        return res.status(200).json(editions);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch public editions' });
    }
};
exports.getPublicEditions = getPublicEditions;
const deleteEdition = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can delete Editions.' });
        }
        const result = await editionService.deleteEdition(req.params.id);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to delete edition' });
    }
};
exports.deleteEdition = deleteEdition;
const getEditionById = async (req, res) => {
    try {
        const edition = await editionService.getEditionById(req.params.id);
        return res.status(200).json(edition);
    }
    catch (error) {
        return res.status(404).json({ error: error.message || 'Edition not found' });
    }
};
exports.getEditionById = getEditionById;
