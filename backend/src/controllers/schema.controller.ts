import { Request, Response } from 'express';
import { schemaService } from '../services/schema.service';

export const getSchema = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    const schema = await schemaService.getSchemaByEditionId(editionId);
    return res.status(200).json(schema);
  } catch (error: any) {
    console.error('Error fetching schema:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch schema' });
  }
};

export const updateSchema = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    const schemaData = req.body;
    const updatedSchema = await schemaService.updateSchema(editionId, schemaData);
    return res.status(200).json(updatedSchema);
  } catch (error: any) {
    console.error('Error updating schema:', error);
    return res.status(500).json({ error: error.message || 'Failed to update schema' });
  }
};
