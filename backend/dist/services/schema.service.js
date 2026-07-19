"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaService = exports.SchemaService = void 0;
const FormSchema_1 = require("../models/FormSchema");
class SchemaService {
    async getSchemaByEditionId(editionId) {
        const cleanId = editionId.trim();
        let schema = await FormSchema_1.FormSchemaModel.findOne({ editionId: cleanId }).lean();
        if (!schema) {
            // Return a default empty schema if not found
            return {
                editionId: cleanId,
                areas: []
            };
        }
        return schema;
    }
    async updateSchema(editionId, schemaData) {
        const cleanId = editionId.trim();
        let schema = await FormSchema_1.FormSchemaModel.findOne({ editionId: cleanId });
        if (!schema) {
            schema = new FormSchema_1.FormSchemaModel({
                editionId: cleanId,
                areas: schemaData.areas || []
            });
        }
        else {
            schema.areas = schemaData.areas || [];
        }
        await schema.save();
        return schema;
    }
}
exports.SchemaService = SchemaService;
exports.schemaService = new SchemaService();
