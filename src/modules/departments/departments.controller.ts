import { Request, Response, NextFunction } from 'express';
import { departmentsService } from './departments.service';
import { sendSuccess } from '../../utils/response';

export class DepartmentsController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name } = req.body;
            const department = await departmentsService.createDepartment(name);
            sendSuccess(res, 'Department created successfully', department, 201);
        } catch (error) {
            next(error);
        }
    }

    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const onlyActive = req.query.onlyActive === 'true';
            const departments = await departmentsService.getAllDepartments(onlyActive);
            sendSuccess(res, 'Departments fetched successfully', departments);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const department = await departmentsService.getDepartmentById(id);
            sendSuccess(res, 'Department fetched successfully', department);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const { name, isActive } = req.body;
            const department = await departmentsService.updateDepartment(id, { name, isActive });
            sendSuccess(res, 'Department updated successfully', department);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            await departmentsService.deleteDepartment(id);
            sendSuccess(res, 'Department deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const departmentsController = new DepartmentsController();
