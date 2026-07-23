import { FormSchemaModel, IFormSchema } from '../models/FormSchema';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { SEED_SCHEMA } from '../utils/schemaData';

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
    
    if (schema && schema.areas && schema.areas.length > 0) {
      const ap1 = schema.areas[0]?.actionPoints?.[0];
      if (ap1 && ap1.questions && !ap1.questions.some((q: any) => q.id === 'q_1_1')) {
        const q11 = SEED_SCHEMA.areas[0].actionPoints[0].questions[0];
        ap1.questions.unshift(q11 as any);
        await FormSchemaModel.updateOne(
          { editionId: cleanId },
          { $set: { areas: schema.areas } }
        );
      }
    }
    
    return schema;
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
        if (newAreaIds.has(oldArea.id)) {
          const newArea = newAreas.find(a => a.id === oldArea.id);
          const newApIds = new Set(newArea?.actionPoints?.map(ap => ap.id) || []);
          
          const deletedAps = oldArea.actionPoints?.filter(ap => !newApIds.has(ap.id)) || [];
          for (const ap of deletedAps) {
            await RecycleBin.create({
              originalId: ap.id,
              entityType: EntityType.ACTION_POINT,
              entityName: ap.title,
              data: { ...ap, editionId: cleanId, areaId: oldArea.id },
              deletedBy: userId
            });
          }
        }
      }

      schema.areas = newAreas;
    }
    
    await schema.save();
    return schema;
  }
}

export const schemaService = new SchemaService();
