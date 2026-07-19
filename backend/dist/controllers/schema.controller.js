"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSchema = exports.getSchema = void 0;
const schema_service_1 = require("../services/schema.service");
const getSchema = async (req, res) => {
    try {
        const { editionId } = req.params;
        const schema = await schema_service_1.schemaService.getSchemaByEditionId(editionId);
        return res.status(200).json(schema);
    }
    catch (error) {
        console.error('Error fetching schema:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch schema' });
    }
};
exports.getSchema = getSchema;
const updateSchema = async (req, res) => {
    try {
        const { editionId } = req.params;
        const schemaData = req.body;
        const updatedSchema = await schema_service_1.schemaService.updateSchema(editionId, schemaData);
        return res.status(200).json(updatedSchema);
    }
    catch (error) {
        console.error('Error updating schema:', error);
        return res.status(500).json({ error: error.message || 'Failed to update schema' });
    }
};
exports.updateSchema = updateSchema;
