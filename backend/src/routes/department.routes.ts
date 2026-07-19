import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

router.use(protect as any, adminOnly as any);

router.get('/', getDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
