import { FormSchemaModel, IFormSchema } from '../models/FormSchema';

export class SchemaService {
  async getSchemaByEditionId(editionId: string) {
    const cleanId = editionId.trim();
    let schema = await FormSchemaModel.findOne({ editionId: cleanId }).lean();
    
    if (!schema) {
      // Return a default empty schema if not found
      return {
        editionId: cleanId,
        areas: []
      };
    }
    
    return schema;
  }

  async updateSchema(editionId: string, schemaData: Partial<IFormSchema>) {
    const cleanId = editionId.trim();
    
    let schema = await FormSchemaModel.findOne({ editionId: cleanId });
    
    if (!schema) {
      schema = new FormSchemaModel({
        editionId: cleanId,
        areas: schemaData.areas || []
      });
    } else {
      schema.areas = schemaData.areas || [];
    }
    
    await schema.save();
    return schema;
  }
}

export const schemaService = new SchemaService();
