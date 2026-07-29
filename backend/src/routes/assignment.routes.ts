import { Router } from 'express';
import {
  createAssignment,
  getAllAssignments,
  getUserAssignments,
  getMyAssignments,
  getMySubmissions,
  deleteAssignment,
  getAssignmentSchema,
  getEditionAssignmentSchema,
  submitAssignment,
  submitEditionAssignment,
  getSubmittedAssignments,
  evaluateAssignment,
  getAdminAssignmentDetails,
  reassignAssignment,
} from '../controllers/assignment.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// User routes
router.get('/my', protect as any, getMyAssignments);
router.get('/my-submissions', protect as any, getMySubmissions);
router.get('/edition/:editionId/schema', protect as any, getEditionAssignmentSchema);
router.put('/edition/:editionId/submit', protect as any, submitEditionAssignment);
router.get('/:id/schema', protect as any, getAssignmentSchema);
router.put('/:id/submit', protect as any, submitAssignment);

// Admin routes
router.get('/submitted', protect as any, adminOnly as any, getSubmittedAssignments);
router.get('/', protect as any, adminOnly as any, getAllAssignments);
router.post('/', protect as any, adminOnly as any, createAssignment);
router.get('/:id/admin-details', protect as any, adminOnly as any, getAdminAssignmentDetails);
router.get('/user/:userId', protect as any, adminOnly as any, getUserAssignments);
router.delete('/:id', protect as any, adminOnly as any, deleteAssignment);
router.put('/:id/evaluate', protect as any, adminOnly as any, evaluateAssignment);
router.put('/:id/reassign', protect as any, adminOnly as any, reassignAssignment);

export default router;
