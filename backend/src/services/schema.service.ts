import { FormSchemaModel, IFormSchema } from '../models/FormSchema';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { SEED_SCHEMA } from '../utils/schemaData';
import { Edition } from '../models/Edition';

export class SchemaService {
  async getSchemaByEditionId(editionId: string) {
    const cleanId = editionId.trim();
    let schema = await FormSchemaModel.findOne({ editionId: cleanId }).lean();
    const edition = await Edition.findById(cleanId).select('guidelineFileId guidelineFileName').lean();
    
    if (!schema) {
      // Return a default empty schema if not found
      return {
        editionId: cleanId,
        areas: [],
        guidelineFileId: edition?.guidelineFileId || null,
        guidelineFileName: edition?.guidelineFileName || null
      };
    }
    
    // Return clean stored schema
    return {
      ...schema,
      guidelineFileId: edition?.guidelineFileId || null,
      guidelineFileName: edition?.guidelineFileName || null
    };
  }

  async updateSchema(editionId: string, schemaData: Partial<IFormSchema>, userId: string) {
    const cleanId = editionId.trim();
    
    let schema = await FormSchemaModel.findOne({ editionId: cleanId });
    
    if (!schema) {
      schema = new FormSchemaModel({
        editionId: cleanId,
        areas: schemaData.areas || []
      });
    } else {
      // Find deleted areas and action points
      const newAreas = schemaData.areas || [];
      const newAreaIds = new Set(newAreas.map(a => a.id));
      
      const deletedAreas = schema.areas.filter(a => !newAreaIds.has(a.id));
      for (const area of deletedAreas) {
        await RecycleBin.create({
          originalId: area.id,
          entityType: EntityType.REFORM_AREA,
          entityName: area.title,
          data: { ...area, editionId: cleanId },
          deletedBy: userId
        });
      }

      // For areas that still exist, check for deleted action points
      for (const oldArea of schema.areas) {
        const newArea = newAreas.find(a => a.id === oldArea.id);
        if (newArea) {
          const newApIds = new Set((newArea.actionPoints || []).map(ap => ap.id));
          const deletedAps = oldArea.actionPoints.filter(ap => !newApIds.has(ap.id));
          for (const ap of deletedAps) {
            await RecycleBin.create({
              originalId: ap.id,
              entityType: EntityType.ACTION_POINT,
              entityName: ap.title,
              data: { ...ap, editionId: cleanId, reformAreaId: oldArea.id },
              deletedBy: userId
            });
          }
        }
      }

      schema.areas = schemaData.areas || [];
    }

    await schema.save();
    return schema;
  }
}

export const schemaService = new SchemaService();
